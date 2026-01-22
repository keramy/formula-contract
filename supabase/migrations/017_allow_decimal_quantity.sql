-- Migration: Allow decimal quantities for scope items
-- Purpose: Change quantity from INTEGER to NUMERIC to support values like 4.8
-- This is needed for materials measured in meters, square meters, etc.

-- Step 1: Drop the old trigger that depends on quantity column
-- This trigger was calculating total_price from unit_price * quantity
-- but those columns have been restructured, so we remove it
DROP TRIGGER IF EXISTS calculate_scope_item_total ON scope_items;

-- Step 2: Change quantity column type from integer to numeric
ALTER TABLE scope_items
ALTER COLUMN quantity TYPE NUMERIC(10,2) USING quantity::NUMERIC(10,2);

-- Step 3: Add a comment explaining the change
COMMENT ON COLUMN scope_items.quantity IS 'Quantity of the item - supports decimals (e.g., 4.8 meters)';

-- Note: The calculate_item_total() function is no longer needed as we now
-- calculate totals (initial_total_cost, actual_total_cost, total_sales_price)
-- in the application layer for better control and flexibility.
