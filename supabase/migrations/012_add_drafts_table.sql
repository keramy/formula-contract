-- ============================================================================
-- Migration: Add Drafts Table for Autosave
-- Purpose: Store form draft data for long forms (reports, scope items)
-- ============================================================================

-- Create drafts table
CREATE TABLE IF NOT EXISTS drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- 'project', 'report', 'scope_item'
  entity_id UUID, -- NULL for new entities, set for editing existing
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one draft per user per entity type/id combination
  UNIQUE(user_id, entity_type, entity_id)
);

-- Create index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_drafts_user_id ON drafts(user_id);

-- Create index for entity type lookups
CREATE INDEX IF NOT EXISTS idx_drafts_entity_type ON drafts(entity_type);

-- Create composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_drafts_user_entity
  ON drafts(user_id, entity_type, entity_id);

-- Enable RLS
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own drafts
CREATE POLICY "Users can manage own drafts"
  ON drafts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_draft_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger to update timestamp on changes
DROP TRIGGER IF EXISTS drafts_updated_at ON drafts;
CREATE TRIGGER drafts_updated_at
  BEFORE UPDATE ON drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_draft_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON drafts TO authenticated;

COMMENT ON TABLE drafts IS 'Stores autosaved form drafts for users';
COMMENT ON COLUMN drafts.entity_type IS 'Type of entity being drafted: project, report, scope_item';
COMMENT ON COLUMN drafts.entity_id IS 'ID of existing entity if editing, NULL if creating new';
COMMENT ON COLUMN drafts.data IS 'JSON form data to be restored';
