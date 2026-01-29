-- Migration 029: Add shipped tracking to scope_items
-- Tracks when items are shipped from factory to installation site

-- Add shipped columns to scope_items
ALTER TABLE scope_items
ADD COLUMN IF NOT EXISTS is_shipped BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ;

-- Create index for filtering shipped items
CREATE INDEX IF NOT EXISTS idx_scope_items_is_shipped
ON scope_items (project_id, is_shipped)
WHERE is_deleted = FALSE;

-- Add comment for documentation
COMMENT ON COLUMN scope_items.is_shipped IS 'Whether the item has been shipped to the installation site';
COMMENT ON COLUMN scope_items.shipped_at IS 'Timestamp when the item was marked as shipped';
