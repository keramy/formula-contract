-- ============================================================================
-- Migration 055: Link invoices to projects (optional)
--
-- Adds project_id to finance_invoices for project-level expense tracking.
-- NULL means general expense (not tied to a project).
-- ============================================================================

ALTER TABLE finance_invoices ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);
CREATE INDEX IF NOT EXISTS idx_finance_invoices_project ON finance_invoices(project_id) WHERE is_deleted = false AND project_id IS NOT NULL;
