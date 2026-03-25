-- ============================================================================
-- Migration 053: Finance Invoice Installments
--
-- Adds installment plan support for invoices. Each invoice can optionally
-- have multiple installments with different amounts and due dates.
-- ============================================================================

-- Add has_installments flag to invoices
ALTER TABLE finance_invoices ADD COLUMN IF NOT EXISTS has_installments BOOLEAN DEFAULT false;

-- Installments table
CREATE TABLE public.finance_invoice_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES finance_invoices(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  due_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'overdue')) DEFAULT 'pending',
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(invoice_id, installment_number)
);

COMMENT ON TABLE public.finance_invoice_installments IS 'Finance: Installment schedule for invoices with multiple payment dates';

-- RLS (same whitelist pattern as other finance tables)
ALTER TABLE finance_invoice_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "finance_installments_select" ON finance_invoice_installments FOR SELECT TO authenticated
  USING ((SELECT has_finance_access()));

CREATE POLICY "finance_installments_insert" ON finance_invoice_installments FOR INSERT TO authenticated
  WITH CHECK ((SELECT has_finance_access()));

CREATE POLICY "finance_installments_update" ON finance_invoice_installments FOR UPDATE TO authenticated
  USING ((SELECT has_finance_access()))
  WITH CHECK ((SELECT has_finance_access()));

CREATE POLICY "finance_installments_delete" ON finance_invoice_installments FOR DELETE TO authenticated
  USING ((SELECT has_finance_access()));

-- Indexes
CREATE INDEX idx_finance_installments_invoice ON finance_invoice_installments(invoice_id) WHERE is_deleted = false;
CREATE INDEX idx_finance_installments_due_date ON finance_invoice_installments(due_date) WHERE is_deleted = false;
CREATE INDEX idx_finance_installments_status ON finance_invoice_installments(status) WHERE is_deleted = false;
