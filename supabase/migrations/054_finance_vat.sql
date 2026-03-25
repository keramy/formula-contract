-- ============================================================================
-- Migration 054: Add VAT support to finance invoices
--
-- Adds vat_rate and vat_amount columns to finance_invoices.
-- Amount tracking: total_amount stores VAT-inclusive total.
-- vat_rate stores the percentage (1, 10, 20).
-- vat_amount stores the calculated VAT portion.
-- ============================================================================

ALTER TABLE finance_invoices ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(5,2) DEFAULT 0;
ALTER TABLE finance_invoices ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(15,2) DEFAULT 0;
