-- Migration: Add cost tracking fields to scope_items
-- Purpose: Track Initial Cost, Actual Cost (aggregated), and Sales Price separately
--
-- Field definitions:
-- - unit_cost: What WE pay per unit (our cost)
-- - initial_total_cost: Locked snapshot when item first created (unit_cost × quantity)
-- - unit_sales_price: What CLIENT pays per unit (renamed from unit_price)
-- - total_sales_price: Client total (renamed from total_price)
-- - actual_total_cost: Calculated - for parents: sum of children, for leaf: unit_cost × quantity

-- Step 1: Add new cost tracking fields
ALTER TABLE scope_items ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(12,2);
ALTER TABLE scope_items ADD COLUMN IF NOT EXISTS initial_total_cost DECIMAL(12,2);

-- Step 2: Rename price fields to clarify they are "sales" prices (what client pays)
-- Note: PostgreSQL RENAME COLUMN is safe and doesn't require IF EXISTS
ALTER TABLE scope_items RENAME COLUMN unit_price TO unit_sales_price;
ALTER TABLE scope_items RENAME COLUMN total_price TO total_sales_price;

-- Step 3: Add index for efficient cost aggregation queries on parent-child relationships
CREATE INDEX IF NOT EXISTS idx_scope_items_parent_cost
ON scope_items(parent_id, unit_cost)
WHERE is_deleted = false;

-- Step 4: Add index for quick lookup of children by parent
CREATE INDEX IF NOT EXISTS idx_scope_items_children_lookup
ON scope_items(parent_id)
WHERE parent_id IS NOT NULL AND is_deleted = false;

-- Comments for documentation
COMMENT ON COLUMN scope_items.unit_cost IS 'Cost per unit - what WE pay (our expense)';
COMMENT ON COLUMN scope_items.initial_total_cost IS 'Locked snapshot of total cost when item was first created';
COMMENT ON COLUMN scope_items.unit_sales_price IS 'Price per unit charged to CLIENT';
COMMENT ON COLUMN scope_items.total_sales_price IS 'Total price charged to CLIENT (unit_sales_price × quantity)';
