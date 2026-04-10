-- ============================================
-- Add Supplier Fields to Scope Items
-- ============================================
--
-- Procurement items need to track which supplier provides them.
-- Links to the existing finance_suppliers table.
--
-- New columns:
--   supplier_id          — FK to finance_suppliers (who supplies this item)
--   po_number            — purchase order reference (free text)
--   expected_delivery_date — when delivery is expected
-- ============================================

BEGIN;

ALTER TABLE public.scope_items
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.finance_suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS po_number text,
  ADD COLUMN IF NOT EXISTS expected_delivery_date date;

-- Index for supplier lookup (which items does this supplier provide?)
CREATE INDEX IF NOT EXISTS idx_scope_items_supplier_id
  ON public.scope_items(supplier_id)
  WHERE supplier_id IS NOT NULL AND is_deleted = false;

COMMIT;

-- Allow PM/admin to read and create suppliers for scope item assignment
-- These are additive (PERMISSIVE) — don't affect existing finance_access policies
CREATE POLICY IF NOT EXISTS "pm_admin_read_suppliers" ON public.finance_suppliers
  FOR SELECT
  USING (
    (SELECT get_user_role()) IN ('admin'::user_role, 'pm'::user_role)
  );

CREATE POLICY IF NOT EXISTS "pm_admin_insert_suppliers" ON public.finance_suppliers
  FOR INSERT
  WITH CHECK (
    (SELECT get_user_role()) IN ('admin'::user_role, 'pm'::user_role)
  );

-- ============================================
-- Verification
-- ============================================
-- 1. SELECT supplier_id, po_number, expected_delivery_date
--    FROM scope_items LIMIT 1;
--    → All NULL (existing items have no supplier yet)
-- 2. Procurement items can now be linked to a supplier
-- 3. ON DELETE SET NULL: if supplier is deleted, items keep existing but lose the link
-- ============================================
