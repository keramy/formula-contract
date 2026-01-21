-- Migration: Add slug column to projects table
-- Purpose: Enable human-readable URLs like /projects/moodup instead of /projects/uuid

-- ============================================================================
-- STEP 1: Add slug column
-- ============================================================================

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS slug TEXT;

-- ============================================================================
-- STEP 2: Generate slugs for existing projects
-- ============================================================================

-- Create a function to generate URL-friendly slugs
CREATE OR REPLACE FUNCTION generate_slug(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        TRIM(input_text),
        '[^a-zA-Z0-9\s-]', '', 'g'  -- Remove special characters
      ),
      '\s+', '-', 'g'  -- Replace spaces with hyphens
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Update existing projects with slugs based on their names
UPDATE projects
SET slug = generate_slug(name)
WHERE slug IS NULL;

-- Handle duplicate slugs by appending project_code
WITH duplicates AS (
  SELECT id, slug, project_code,
         ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at) as rn
  FROM projects
)
UPDATE projects p
SET slug = p.slug || '-' || p.project_code
FROM duplicates d
WHERE p.id = d.id AND d.rn > 1;

-- ============================================================================
-- STEP 3: Add unique constraint and index
-- ============================================================================

-- Make slug unique (but allow NULL for backwards compatibility during migration)
CREATE UNIQUE INDEX IF NOT EXISTS projects_slug_unique_idx ON projects (slug) WHERE slug IS NOT NULL;

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS projects_slug_idx ON projects (slug);

-- ============================================================================
-- STEP 4: Create trigger to auto-generate slug on insert
-- ============================================================================

CREATE OR REPLACE FUNCTION set_project_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Generate base slug from name
  base_slug := generate_slug(NEW.name);
  final_slug := base_slug;

  -- Check for duplicates and append number if needed
  WHILE EXISTS (SELECT 1 FROM projects WHERE slug = final_slug AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  NEW.slug := final_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new projects
DROP TRIGGER IF EXISTS trigger_set_project_slug ON projects;
CREATE TRIGGER trigger_set_project_slug
  BEFORE INSERT ON projects
  FOR EACH ROW
  WHEN (NEW.slug IS NULL)
  EXECUTE FUNCTION set_project_slug();

-- ============================================================================
-- DONE! Projects now have URL-friendly slugs.
-- Example: "Moodup Project" becomes "moodup-project"
-- ============================================================================
