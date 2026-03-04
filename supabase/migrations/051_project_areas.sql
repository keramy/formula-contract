-- ============================================================================
-- Migration 051: Project Areas
--
-- Adds spatial organization to scope items:
--   project_areas — floor/room registry per project
--   scope_items.area_id — FK linking items to areas
--
-- Includes: updated_at trigger, RLS policies, indexes, admin view
-- ============================================================================

-- ============================================================================
-- 1. TABLE: project_areas
-- ============================================================================

CREATE TABLE public.project_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  floor TEXT NOT NULL,            -- "Floor 1", "Ground Floor", "Basement"
  name TEXT NOT NULL,             -- "Master Bedroom", "Kitchen"
  area_code TEXT NOT NULL,        -- "MB", "KT" (user-defined, unique per project)
  sort_order INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (project_id, area_code)  -- area_code unique within project
);

COMMENT ON TABLE public.project_areas IS 'Per-project area/room registry — floor → area_name → area_code';

-- Updated_at trigger (reuse existing function)
CREATE TRIGGER update_project_areas_updated_at
  BEFORE UPDATE ON public.project_areas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Performance index: find all areas for a project (excluding soft-deleted)
CREATE INDEX idx_project_areas_project_id
  ON public.project_areas (project_id)
  WHERE is_deleted = false;

-- ============================================================================
-- 2. ALTER scope_items: add area_id FK
-- ============================================================================

ALTER TABLE public.scope_items
  ADD COLUMN area_id UUID REFERENCES project_areas(id) ON DELETE SET NULL;

-- Index for filtering scope items by area
CREATE INDEX idx_scope_items_area_id
  ON public.scope_items (area_id)
  WHERE is_deleted = false;

-- ============================================================================
-- 3. RLS POLICIES (matches scope_items access pattern)
-- ============================================================================

ALTER TABLE public.project_areas ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated user assigned to the project can read areas
CREATE POLICY "View project areas" ON public.project_areas
  FOR SELECT
  USING (
    is_assigned_to_project(project_id)
    OR (SELECT get_user_role()) IN ('admin', 'management')
  );

-- INSERT: admin and PM can create areas
CREATE POLICY "Insert project areas" ON public.project_areas
  FOR INSERT
  WITH CHECK (
    (SELECT get_user_role()) IN ('admin', 'pm')
    AND is_assigned_to_project(project_id)
  );

-- UPDATE: admin and PM can update areas
CREATE POLICY "Update project areas" ON public.project_areas
  FOR UPDATE
  USING (
    (SELECT get_user_role()) IN ('admin', 'pm')
    AND is_assigned_to_project(project_id)
  );

-- DELETE: admin and PM can delete areas
CREATE POLICY "Delete project areas" ON public.project_areas
  FOR DELETE
  USING (
    (SELECT get_user_role()) IN ('admin', 'pm')
    AND is_assigned_to_project(project_id)
  );

-- ============================================================================
-- 4. ADMIN VIEW (for Supabase Studio browsing)
-- ============================================================================

CREATE VIEW public.v_project_areas WITH (security_invoker = true) AS
SELECT
  a.id,
  a.project_id,
  p.project_code,
  p.name AS project_name,
  a.floor,
  a.name AS area_name,
  a.area_code,
  a.sort_order,
  a.is_deleted,
  a.created_at,
  a.updated_at,
  (SELECT count(*) FROM scope_items si WHERE si.area_id = a.id AND si.is_deleted = false) AS scope_item_count
FROM project_areas a
JOIN projects p ON p.id = a.project_id
WHERE a.is_deleted = false;

COMMENT ON VIEW public.v_project_areas IS 'Admin view: project areas with project context and item counts';
