-- Migration: Restructure scope_items cost columns for clarity
--
-- Changes:
-- 1. Rename unit_cost → actual_unit_cost (what we actually pay per unit)
-- 2. Add initial_unit_cost (budgeted cost per unit - set once, never changes)
-- 3. Add actual_total_cost (actual_unit_cost × quantity)
--
-- Final structure:
-- - initial_unit_cost: Budgeted cost per unit (set at creation, immutable)
-- - initial_total_cost: qty × initial_unit_cost (set at creation, immutable)
-- - actual_unit_cost: Real cost per unit (entered later, editable)
-- - actual_total_cost: qty × actual_unit_cost (calculated, editable)
-- - unit_sales_price: Sale price per unit to client
-- - total_sales_price: qty × unit_sales_price

-- Step 1: Rename unit_cost to actual_unit_cost
ALTER TABLE scope_items
RENAME COLUMN unit_cost TO actual_unit_cost;

-- Step 2: Add initial_unit_cost column
ALTER TABLE scope_items
ADD COLUMN initial_unit_cost NUMERIC(12,2) NULL;

-- Step 3: Add actual_total_cost column
ALTER TABLE scope_items
ADD COLUMN actual_total_cost NUMERIC(12,2) NULL;

-- Step 4: Backfill initial_unit_cost from initial_total_cost / quantity where possible
-- This preserves existing data by calculating what the unit cost would have been
UPDATE scope_items
SET initial_unit_cost = CASE
  WHEN quantity > 0 AND initial_total_cost IS NOT NULL
  THEN ROUND(initial_total_cost / quantity, 2)
  ELSE NULL
END
WHERE initial_unit_cost IS NULL;

-- Step 5: Calculate actual_total_cost for existing records that have actual_unit_cost
UPDATE scope_items
SET actual_total_cost = ROUND(actual_unit_cost * quantity, 2)
WHERE actual_unit_cost IS NOT NULL AND actual_total_cost IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN scope_items.initial_unit_cost IS 'Budgeted cost per unit - set once at creation, never changes';
COMMENT ON COLUMN scope_items.initial_total_cost IS 'Budgeted total cost (qty × initial_unit_cost) - set once at creation, never changes';
COMMENT ON COLUMN scope_items.actual_unit_cost IS 'Actual cost per unit - entered manually when known';
COMMENT ON COLUMN scope_items.actual_total_cost IS 'Actual total cost (qty × actual_unit_cost) - calculated when actual cost entered';
COMMENT ON COLUMN scope_items.unit_sales_price IS 'Sale price per unit charged to client';
COMMENT ON COLUMN scope_items.total_sales_price IS 'Total sale price (qty × unit_sales_price)';
