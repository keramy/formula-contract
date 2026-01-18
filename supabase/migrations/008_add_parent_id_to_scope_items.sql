-- ============================================================================
-- Migration: Add parent_id column to scope_items for hierarchical split items
-- ============================================================================
--
-- This migration adds support for parent/child relationships between scope items.
-- When a scope item is "split" (e.g., Cabinet -> Cabinet + Marble Supply),
-- the new items will reference the original item as their parent.
--
-- User Requirements:
-- - Split items should be numbered as 14.1, 14.2 (based on parent row #)
-- - Children appear directly below their parent in the table
-- - Delete children when parent is deleted (CASCADE)
-- - No backfill of existing items - only new splits get parent_id

-- Add parent_id column with foreign key reference and cascade delete
ALTER TABLE scope_items
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES scope_items(id) ON DELETE CASCADE;

-- Add comment for documentation
COMMENT ON COLUMN scope_items.parent_id IS 'References the parent scope item when this item was created via split. NULL for root items.';

-- Create index for efficient querying of children by parent
-- Only index non-deleted items since we filter by is_deleted in most queries
CREATE INDEX IF NOT EXISTS idx_scope_items_parent_id
ON scope_items(parent_id)
WHERE is_deleted = false AND parent_id IS NOT NULL;

-- Create composite index for efficient hierarchy queries within a project
CREATE INDEX IF NOT EXISTS idx_scope_items_project_parent
ON scope_items(project_id, parent_id)
WHERE is_deleted = false;
