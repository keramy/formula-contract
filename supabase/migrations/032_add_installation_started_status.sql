-- ============================================================================
-- Migration 032: Add Installation Started Status
--
-- Adds tracking for when installation begins on site, capturing the workflow
-- step between "shipped" and "installed".
--
-- Workflow: Production → Shipped → Installation Started → Installed
-- ============================================================================

-- Add new columns for installation started tracking
ALTER TABLE scope_items
ADD COLUMN IF NOT EXISTS is_installation_started BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS installation_started_at TIMESTAMPTZ;

-- Add index for filtering by installation status
CREATE INDEX IF NOT EXISTS idx_scope_items_installation_started
ON scope_items (is_installation_started)
WHERE is_installation_started = true;

-- Add comment explaining the workflow
COMMENT ON COLUMN scope_items.is_installation_started IS
  'Indicates installation has begun on site but is not yet complete';
COMMENT ON COLUMN scope_items.installation_started_at IS
  'Timestamp when installation started on site';

-- ============================================================================
-- Workflow State Progression:
-- 1. Not started: production_percentage = 0
-- 2. In production: production_percentage > 0 AND < 100
-- 3. Ready to ship: production_percentage = 100 AND NOT is_shipped
-- 4. Shipped: is_shipped = true AND NOT is_installation_started
-- 5. Installation started: is_installation_started = true AND NOT is_installed
-- 6. Installed: is_installed = true
-- ============================================================================
