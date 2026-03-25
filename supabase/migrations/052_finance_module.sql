-- ============================================================================
-- Migration 052: Finance Module (Accounts Payable + Receivable)
--
-- Adds 8 tables for company-wide payment tracking:
--   finance_access, finance_categories, finance_suppliers,
--   finance_invoices, finance_receivables, finance_payments,
--   finance_recurring_templates, finance_documents
--
-- Access control: whitelist-based (finance_access table), NOT role-based.
-- Only users in finance_access can see/modify finance data.
-- Only admins can manage the whitelist itself.
--
-- Includes: helper functions, auto-code triggers, RLS policies,
--           indexes, admin views, seed categories, pg_cron job
-- ============================================================================

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- finance_access — Whitelist of users who can access the finance module
CREATE TABLE public.finance_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  can_approve BOOLEAN DEFAULT false,
  granted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

COMMENT ON TABLE public.finance_access IS 'Finance: Whitelist of users with access to the finance module';

-- finance_categories — Expense/income categories for classification
CREATE TABLE public.finance_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  color TEXT,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.finance_categories IS 'Finance: Expense and income categories for payment classification';

-- finance_suppliers — Vendor registry
CREATE TABLE public.finance_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  category TEXT CHECK (category IN ('material_supplier', 'service_provider', 'subcontractor')),
  tax_id TEXT,
  iban TEXT,
  bank_name TEXT,
  address TEXT,
  notes TEXT,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.finance_suppliers IS 'Finance: Supplier/vendor registry with bank details';

-- finance_invoices — Accounts Payable (what we owe to suppliers)
CREATE TABLE public.finance_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_code TEXT UNIQUE NOT NULL,
  supplier_id UUID NOT NULL REFERENCES finance_suppliers(id),
  category_id UUID REFERENCES finance_categories(id),
  invoice_number TEXT,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  total_amount NUMERIC(15,2) NOT NULL CHECK (total_amount > 0),
  currency TEXT NOT NULL CHECK (currency IN ('TRY', 'USD', 'EUR')) DEFAULT 'TRY',
  description TEXT,
  status TEXT NOT NULL CHECK (status IN
    ('pending', 'awaiting_approval', 'approved', 'partially_paid', 'paid', 'overdue', 'cancelled'))
    DEFAULT 'pending',
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.finance_invoices IS 'Finance: Accounts payable — invoices from suppliers';

-- finance_receivables — Accounts Receivable (what clients owe us)
CREATE TABLE public.finance_receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receivable_code TEXT UNIQUE NOT NULL,
  client_id UUID NOT NULL REFERENCES clients(id),
  category_id UUID REFERENCES finance_categories(id),
  reference_number TEXT,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  total_amount NUMERIC(15,2) NOT NULL CHECK (total_amount > 0),
  currency TEXT NOT NULL CHECK (currency IN ('TRY', 'USD', 'EUR')) DEFAULT 'TRY',
  description TEXT,
  status TEXT NOT NULL CHECK (status IN
    ('pending', 'partially_received', 'received', 'overdue', 'cancelled'))
    DEFAULT 'pending',
  notes TEXT,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.finance_receivables IS 'Finance: Accounts receivable — what clients owe us';

-- finance_payments — All money movements (both directions)
CREATE TABLE public.finance_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_code TEXT UNIQUE NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('outgoing', 'incoming')),
  invoice_id UUID REFERENCES finance_invoices(id),
  receivable_id UUID REFERENCES finance_receivables(id),
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL CHECK (currency IN ('TRY', 'USD', 'EUR')) DEFAULT 'TRY',
  payment_date DATE NOT NULL,
  payment_method TEXT CHECK (payment_method IN
    ('bank_transfer', 'cash', 'check', 'credit_card')),
  reference_number TEXT,
  notes TEXT,
  recorded_by UUID REFERENCES users(id),
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  -- Each payment links to exactly one parent: invoice OR receivable
  CONSTRAINT payment_one_parent CHECK (
    (invoice_id IS NOT NULL AND receivable_id IS NULL) OR
    (invoice_id IS NULL AND receivable_id IS NOT NULL)
  )
);

COMMENT ON TABLE public.finance_payments IS 'Finance: Payment records for both outgoing (to suppliers) and incoming (from clients)';

-- finance_recurring_templates — Auto-create invoices on schedule
CREATE TABLE public.finance_recurring_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code TEXT UNIQUE NOT NULL,
  supplier_id UUID NOT NULL REFERENCES finance_suppliers(id),
  category_id UUID REFERENCES finance_categories(id),
  description TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL CHECK (currency IN ('TRY', 'USD', 'EUR')) DEFAULT 'TRY',
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'yearly')),
  day_of_month INTEGER NOT NULL CHECK (day_of_month >= 1 AND day_of_month <= 28),
  next_due_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.finance_recurring_templates IS 'Finance: Recurring payment templates for auto-creating invoices';

-- finance_documents — Attached files (invoice PDFs, receipts)
CREATE TABLE public.finance_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES finance_invoices(id),
  receivable_id UUID REFERENCES finance_receivables(id),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  -- Each document links to exactly one parent: invoice OR receivable
  CONSTRAINT document_one_parent CHECK (
    (invoice_id IS NOT NULL AND receivable_id IS NULL) OR
    (invoice_id IS NULL AND receivable_id IS NOT NULL)
  )
);

COMMENT ON TABLE public.finance_documents IS 'Finance: Document attachments for invoices and receivables';

-- ============================================================================
-- 2. HELPER FUNCTIONS (for RLS)
-- ============================================================================

-- Check if current user has finance access (whitelist check)
CREATE OR REPLACE FUNCTION public.has_finance_access()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM finance_access
    WHERE user_id = (SELECT auth.uid())
  );
$$;

-- Check if current user can approve finance payments
CREATE OR REPLACE FUNCTION public.can_approve_finance()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM finance_access
    WHERE user_id = (SELECT auth.uid()) AND can_approve = true
  );
$$;

-- ============================================================================
-- 3. SEQUENCE METADATA + SEQUENCES
-- ============================================================================

INSERT INTO sequence_metadata (entity_type, prefix, is_year_based, padding_length) VALUES
  ('finance_supplier', 'SUP', false, 3),
  ('finance_invoice', 'INV', false, 3),
  ('finance_receivable', 'RCV', false, 3),
  ('finance_payment', 'PAY', false, 3),
  ('finance_recurring', 'REC', false, 3)
ON CONFLICT (entity_type) DO NOTHING;

CREATE SEQUENCE IF NOT EXISTS seq_finance_supplier START 1;
CREATE SEQUENCE IF NOT EXISTS seq_finance_invoice START 1;
CREATE SEQUENCE IF NOT EXISTS seq_finance_receivable START 1;
CREATE SEQUENCE IF NOT EXISTS seq_finance_payment START 1;
CREATE SEQUENCE IF NOT EXISTS seq_finance_recurring START 1;

-- ============================================================================
-- 4. AUTO-CODE TRIGGERS
-- ============================================================================

-- Suppliers
CREATE OR REPLACE FUNCTION set_finance_supplier_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NEW.supplier_code IS NULL THEN
    NEW.supplier_code := generate_entity_code('finance_supplier');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_finance_suppliers_set_code ON finance_suppliers;
CREATE TRIGGER tr_finance_suppliers_set_code
  BEFORE INSERT ON finance_suppliers FOR EACH ROW EXECUTE FUNCTION set_finance_supplier_code();

-- Invoices
CREATE OR REPLACE FUNCTION set_finance_invoice_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NEW.invoice_code IS NULL THEN
    NEW.invoice_code := generate_entity_code('finance_invoice');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_finance_invoices_set_code ON finance_invoices;
CREATE TRIGGER tr_finance_invoices_set_code
  BEFORE INSERT ON finance_invoices FOR EACH ROW EXECUTE FUNCTION set_finance_invoice_code();

-- Receivables
CREATE OR REPLACE FUNCTION set_finance_receivable_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NEW.receivable_code IS NULL THEN
    NEW.receivable_code := generate_entity_code('finance_receivable');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_finance_receivables_set_code ON finance_receivables;
CREATE TRIGGER tr_finance_receivables_set_code
  BEFORE INSERT ON finance_receivables FOR EACH ROW EXECUTE FUNCTION set_finance_receivable_code();

-- Payments
CREATE OR REPLACE FUNCTION set_finance_payment_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NEW.payment_code IS NULL THEN
    NEW.payment_code := generate_entity_code('finance_payment');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_finance_payments_set_code ON finance_payments;
CREATE TRIGGER tr_finance_payments_set_code
  BEFORE INSERT ON finance_payments FOR EACH ROW EXECUTE FUNCTION set_finance_payment_code();

-- Recurring Templates
CREATE OR REPLACE FUNCTION set_finance_recurring_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NEW.template_code IS NULL THEN
    NEW.template_code := generate_entity_code('finance_recurring');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_finance_recurring_set_code ON finance_recurring_templates;
CREATE TRIGGER tr_finance_recurring_set_code
  BEFORE INSERT ON finance_recurring_templates FOR EACH ROW EXECUTE FUNCTION set_finance_recurring_code();

-- ============================================================================
-- 5. UPDATED_AT TRIGGERS (reuse existing function)
-- ============================================================================

CREATE TRIGGER tr_finance_suppliers_updated_at BEFORE UPDATE ON finance_suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_finance_invoices_updated_at BEFORE UPDATE ON finance_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_finance_receivables_updated_at BEFORE UPDATE ON finance_receivables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_finance_recurring_updated_at BEFORE UPDATE ON finance_recurring_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. RLS POLICIES
-- ============================================================================

ALTER TABLE finance_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_recurring_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_documents ENABLE ROW LEVEL SECURITY;

-- finance_access: admins can manage, users can see their own row
CREATE POLICY "finance_access_admin_all" ON finance_access FOR ALL TO authenticated
  USING ((SELECT get_user_role()) = 'admin');

CREATE POLICY "finance_access_self_select" ON finance_access FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- finance_categories: anyone with finance access can read, only whitelisted can write
CREATE POLICY "finance_categories_select" ON finance_categories FOR SELECT TO authenticated
  USING ((SELECT has_finance_access()));

CREATE POLICY "finance_categories_insert" ON finance_categories FOR INSERT TO authenticated
  WITH CHECK ((SELECT has_finance_access()));

CREATE POLICY "finance_categories_update" ON finance_categories FOR UPDATE TO authenticated
  USING ((SELECT has_finance_access()))
  WITH CHECK ((SELECT has_finance_access()));

CREATE POLICY "finance_categories_delete" ON finance_categories FOR DELETE TO authenticated
  USING ((SELECT has_finance_access()));

-- finance_suppliers: whitelist-based access
CREATE POLICY "finance_suppliers_select" ON finance_suppliers FOR SELECT TO authenticated
  USING ((SELECT has_finance_access()));

CREATE POLICY "finance_suppliers_insert" ON finance_suppliers FOR INSERT TO authenticated
  WITH CHECK ((SELECT has_finance_access()));

CREATE POLICY "finance_suppliers_update" ON finance_suppliers FOR UPDATE TO authenticated
  USING ((SELECT has_finance_access()))
  WITH CHECK ((SELECT has_finance_access()));

CREATE POLICY "finance_suppliers_delete" ON finance_suppliers FOR DELETE TO authenticated
  USING ((SELECT has_finance_access()));

-- finance_invoices: whitelist-based access
CREATE POLICY "finance_invoices_select" ON finance_invoices FOR SELECT TO authenticated
  USING ((SELECT has_finance_access()));

CREATE POLICY "finance_invoices_insert" ON finance_invoices FOR INSERT TO authenticated
  WITH CHECK ((SELECT has_finance_access()));

CREATE POLICY "finance_invoices_update" ON finance_invoices FOR UPDATE TO authenticated
  USING ((SELECT has_finance_access()))
  WITH CHECK ((SELECT has_finance_access()));

CREATE POLICY "finance_invoices_delete" ON finance_invoices FOR DELETE TO authenticated
  USING ((SELECT has_finance_access()));

-- finance_receivables: whitelist-based access
CREATE POLICY "finance_receivables_select" ON finance_receivables FOR SELECT TO authenticated
  USING ((SELECT has_finance_access()));

CREATE POLICY "finance_receivables_insert" ON finance_receivables FOR INSERT TO authenticated
  WITH CHECK ((SELECT has_finance_access()));

CREATE POLICY "finance_receivables_update" ON finance_receivables FOR UPDATE TO authenticated
  USING ((SELECT has_finance_access()))
  WITH CHECK ((SELECT has_finance_access()));

CREATE POLICY "finance_receivables_delete" ON finance_receivables FOR DELETE TO authenticated
  USING ((SELECT has_finance_access()));

-- finance_payments: whitelist-based access
CREATE POLICY "finance_payments_select" ON finance_payments FOR SELECT TO authenticated
  USING ((SELECT has_finance_access()));

CREATE POLICY "finance_payments_insert" ON finance_payments FOR INSERT TO authenticated
  WITH CHECK ((SELECT has_finance_access()));

CREATE POLICY "finance_payments_update" ON finance_payments FOR UPDATE TO authenticated
  USING ((SELECT has_finance_access()))
  WITH CHECK ((SELECT has_finance_access()));

CREATE POLICY "finance_payments_delete" ON finance_payments FOR DELETE TO authenticated
  USING ((SELECT has_finance_access()));

-- finance_recurring_templates: whitelist-based access
CREATE POLICY "finance_recurring_select" ON finance_recurring_templates FOR SELECT TO authenticated
  USING ((SELECT has_finance_access()));

CREATE POLICY "finance_recurring_insert" ON finance_recurring_templates FOR INSERT TO authenticated
  WITH CHECK ((SELECT has_finance_access()));

CREATE POLICY "finance_recurring_update" ON finance_recurring_templates FOR UPDATE TO authenticated
  USING ((SELECT has_finance_access()))
  WITH CHECK ((SELECT has_finance_access()));

CREATE POLICY "finance_recurring_delete" ON finance_recurring_templates FOR DELETE TO authenticated
  USING ((SELECT has_finance_access()));

-- finance_documents: whitelist-based access
CREATE POLICY "finance_documents_select" ON finance_documents FOR SELECT TO authenticated
  USING ((SELECT has_finance_access()));

CREATE POLICY "finance_documents_insert" ON finance_documents FOR INSERT TO authenticated
  WITH CHECK ((SELECT has_finance_access()));

CREATE POLICY "finance_documents_delete" ON finance_documents FOR DELETE TO authenticated
  USING ((SELECT has_finance_access()));

-- ============================================================================
-- 7. INDEXES (partial, with is_deleted = false where applicable)
-- ============================================================================

-- finance_access (no is_deleted — small table)
CREATE INDEX idx_finance_access_user ON finance_access(user_id);

-- finance_categories
CREATE INDEX idx_finance_categories_type ON finance_categories(type) WHERE is_deleted = false;

-- finance_suppliers
CREATE INDEX idx_finance_suppliers_category ON finance_suppliers(category) WHERE is_deleted = false;
CREATE INDEX idx_finance_suppliers_name ON finance_suppliers(name) WHERE is_deleted = false;

-- finance_invoices
CREATE INDEX idx_finance_invoices_supplier ON finance_invoices(supplier_id) WHERE is_deleted = false;
CREATE INDEX idx_finance_invoices_category ON finance_invoices(category_id) WHERE is_deleted = false;
CREATE INDEX idx_finance_invoices_status ON finance_invoices(status) WHERE is_deleted = false;
CREATE INDEX idx_finance_invoices_due_date ON finance_invoices(due_date) WHERE is_deleted = false;
CREATE INDEX idx_finance_invoices_currency ON finance_invoices(currency) WHERE is_deleted = false;

-- finance_receivables
CREATE INDEX idx_finance_receivables_client ON finance_receivables(client_id) WHERE is_deleted = false;
CREATE INDEX idx_finance_receivables_category ON finance_receivables(category_id) WHERE is_deleted = false;
CREATE INDEX idx_finance_receivables_status ON finance_receivables(status) WHERE is_deleted = false;
CREATE INDEX idx_finance_receivables_due_date ON finance_receivables(due_date) WHERE is_deleted = false;

-- finance_payments
CREATE INDEX idx_finance_payments_invoice ON finance_payments(invoice_id) WHERE is_deleted = false;
CREATE INDEX idx_finance_payments_receivable ON finance_payments(receivable_id) WHERE is_deleted = false;
CREATE INDEX idx_finance_payments_direction ON finance_payments(direction) WHERE is_deleted = false;
CREATE INDEX idx_finance_payments_date ON finance_payments(payment_date) WHERE is_deleted = false;

-- finance_recurring_templates
CREATE INDEX idx_finance_recurring_supplier ON finance_recurring_templates(supplier_id) WHERE is_deleted = false;
CREATE INDEX idx_finance_recurring_next_due ON finance_recurring_templates(next_due_date) WHERE is_deleted = false AND is_active = true;

-- finance_documents
CREATE INDEX idx_finance_documents_invoice ON finance_documents(invoice_id);
CREATE INDEX idx_finance_documents_receivable ON finance_documents(receivable_id);

-- ============================================================================
-- 8. ADMIN VIEWS (security_invoker = true)
-- ============================================================================

-- v_finance_suppliers — supplier with invoice count and total outstanding
DROP VIEW IF EXISTS v_finance_suppliers;
CREATE VIEW v_finance_suppliers WITH (security_invoker = true) AS
SELECT
  s.id,
  s.supplier_code,
  s.name,
  s.category,
  s.contact_person,
  s.phone,
  s.email,
  s.iban,
  s.bank_name,
  s.created_at,
  COALESCE(inv.invoice_count, 0) AS invoice_count,
  COALESCE(inv.total_outstanding, 0) AS total_outstanding
FROM finance_suppliers s
LEFT JOIN LATERAL (
  SELECT
    count(*) AS invoice_count,
    COALESCE(sum(i.total_amount), 0) -
      COALESCE((SELECT sum(p.amount) FROM finance_payments p WHERE p.invoice_id IN (
        SELECT i2.id FROM finance_invoices i2
        WHERE i2.supplier_id = s.id AND i2.is_deleted = false AND i2.status NOT IN ('paid', 'cancelled')
      ) AND p.is_deleted = false), 0)
      AS total_outstanding
  FROM finance_invoices i
  WHERE i.supplier_id = s.id AND i.is_deleted = false AND i.status NOT IN ('paid', 'cancelled')
) inv ON true
WHERE s.is_deleted = false;

-- v_finance_invoices — invoice with supplier name, total paid, remaining
DROP VIEW IF EXISTS v_finance_invoices;
CREATE VIEW v_finance_invoices WITH (security_invoker = true) AS
SELECT
  i.id,
  i.invoice_code,
  i.invoice_number,
  i.invoice_date,
  i.due_date,
  i.total_amount,
  i.currency,
  i.status,
  i.requires_approval,
  i.description,
  i.created_at,
  s.name AS supplier_name,
  s.supplier_code,
  c.name AS category_name,
  COALESCE(pay.total_paid, 0) AS total_paid,
  i.total_amount - COALESCE(pay.total_paid, 0) AS remaining,
  COALESCE(pay.payment_count, 0) AS payment_count,
  CASE
    WHEN i.due_date < CURRENT_DATE AND i.status NOT IN ('paid', 'cancelled')
    THEN CURRENT_DATE - i.due_date
    ELSE 0
  END AS days_overdue
FROM finance_invoices i
LEFT JOIN finance_suppliers s ON i.supplier_id = s.id
LEFT JOIN finance_categories c ON i.category_id = c.id
LEFT JOIN LATERAL (
  SELECT
    sum(p.amount) AS total_paid,
    count(*) AS payment_count
  FROM finance_payments p
  WHERE p.invoice_id = i.id AND p.is_deleted = false
) pay ON true
WHERE i.is_deleted = false;

-- v_finance_receivables — receivable with client name, total received, remaining
DROP VIEW IF EXISTS v_finance_receivables;
CREATE VIEW v_finance_receivables WITH (security_invoker = true) AS
SELECT
  r.id,
  r.receivable_code,
  r.reference_number,
  r.issue_date,
  r.due_date,
  r.total_amount,
  r.currency,
  r.status,
  r.description,
  r.created_at,
  cl.company_name AS client_name,
  cl.client_code,
  c.name AS category_name,
  COALESCE(pay.total_received, 0) AS total_received,
  r.total_amount - COALESCE(pay.total_received, 0) AS remaining,
  COALESCE(pay.payment_count, 0) AS payment_count,
  CASE
    WHEN r.due_date < CURRENT_DATE AND r.status NOT IN ('received', 'cancelled')
    THEN CURRENT_DATE - r.due_date
    ELSE 0
  END AS days_overdue
FROM finance_receivables r
LEFT JOIN clients cl ON r.client_id = cl.id
LEFT JOIN finance_categories c ON r.category_id = c.id
LEFT JOIN LATERAL (
  SELECT
    sum(p.amount) AS total_received,
    count(*) AS payment_count
  FROM finance_payments p
  WHERE p.receivable_id = r.id AND p.is_deleted = false
) pay ON true
WHERE r.is_deleted = false;

-- v_finance_payments — payment with invoice/receivable/user details
DROP VIEW IF EXISTS v_finance_payments;
CREATE VIEW v_finance_payments WITH (security_invoker = true) AS
SELECT
  p.id,
  p.payment_code,
  p.direction,
  p.amount,
  p.currency,
  p.payment_date,
  p.payment_method,
  p.reference_number,
  p.created_at,
  i.invoice_code,
  s.name AS supplier_name,
  r.receivable_code,
  cl.company_name AS client_name,
  u.name AS recorded_by_name
FROM finance_payments p
LEFT JOIN finance_invoices i ON p.invoice_id = i.id
LEFT JOIN finance_suppliers s ON i.supplier_id = s.id
LEFT JOIN finance_receivables r ON p.receivable_id = r.id
LEFT JOIN clients cl ON r.client_id = cl.id
LEFT JOIN users u ON p.recorded_by = u.id
WHERE p.is_deleted = false;

-- ============================================================================
-- 9. SEED DATA — Default categories
-- ============================================================================

INSERT INTO finance_categories (name, type, color) VALUES
  ('Materials', 'expense', '#60a5fa'),
  ('Logistics', 'expense', '#f59e0b'),
  ('Rent', 'expense', '#a78bfa'),
  ('Subcontractor', 'expense', '#f97316'),
  ('Utilities', 'expense', '#94a3b8'),
  ('Services', 'expense', '#ec4899'),
  ('Equipment', 'expense', '#14b8a6'),
  ('Project Payment', 'income', '#22c55e'),
  ('Advance Payment', 'income', '#06b6d4'),
  ('Other Income', 'income', '#8b5cf6');

-- ============================================================================
-- 10. STORAGE BUCKET (for finance documents)
-- ============================================================================

-- Note: Create the 'finance-documents' storage bucket via Supabase Dashboard
-- or supabase CLI. Storage path: finance-documents/{invoice_id|receivable_id}/{filename}
-- This module is project-independent, so NO {project_id}/ prefix in paths.
-- Storage RLS should check has_finance_access() instead of project-based policies.

-- ============================================================================
-- 11. pg_cron JOB (Weekly Digest — requires pg_cron + pg_net extensions)
-- ============================================================================

-- Uncomment after enabling pg_cron and pg_net extensions in Supabase Dashboard,
-- and setting app.site_url and app.cron_secret in database settings.
--
-- SELECT cron.schedule(
--   'finance-weekly-digest',
--   '0 8 * * 1',  -- Every Monday at 08:00 UTC
--   $$
--   SELECT net.http_post(
--     url := current_setting('app.site_url') || '/api/cron/finance-digest',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || current_setting('app.cron_secret')
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
