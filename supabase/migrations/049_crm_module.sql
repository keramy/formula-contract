-- ============================================================================
-- Migration 049: CRM Module
--
-- Adds 6 tables for the Sales CRM:
--   crm_brands, crm_architecture_firms, crm_contacts,
--   crm_opportunities, crm_activities, crm_brand_firm_links
--
-- Includes: auto-code triggers, RLS policies, indexes, admin views
-- ============================================================================

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- crm_brands — Luxury and mid-luxury retail brands
CREATE TABLE public.crm_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  parent_group TEXT,
  tier TEXT NOT NULL CHECK (tier IN ('luxury', 'mid_luxury', 'bridge')),
  segment TEXT,
  store_count INTEGER,
  expansion_rate TEXT,
  creative_director TEXT,
  cd_changed_recently BOOLEAN DEFAULT false,
  headquarters TEXT,
  website TEXT,
  annual_revenue TEXT,
  notes TEXT,
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.crm_brands IS 'CRM: Luxury retail brands targeted for business development';

-- crm_architecture_firms — Architecture firms that specify contractors
CREATE TABLE public.crm_architecture_firms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  location TEXT,
  specialty TEXT,
  key_clients TEXT,
  vendor_list_status TEXT CHECK (vendor_list_status IN
    ('not_applied', 'applied', 'under_review', 'approved', 'rejected')) DEFAULT 'not_applied',
  vendor_application_date DATE,
  website TEXT,
  connection_strength TEXT CHECK (connection_strength IN
    ('none', 'cold', 'warm', 'hot')) DEFAULT 'none',
  connection_notes TEXT,
  notes TEXT,
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.crm_architecture_firms IS 'CRM: Architecture firms for luxury retail project specifications';

-- crm_contacts — People at brands, firms, or other organizations
CREATE TABLE public.crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_code TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  title TEXT,
  company TEXT,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  brand_id UUID REFERENCES crm_brands(id),
  architecture_firm_id UUID REFERENCES crm_architecture_firms(id),
  relationship_status TEXT CHECK (relationship_status IN
    ('identified', 'reached_out', 'connected', 'meeting_scheduled', 'active_relationship')) DEFAULT 'identified',
  source TEXT,
  last_interaction_date DATE,
  notes TEXT,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.crm_contacts IS 'CRM: Contacts at brands and architecture firms';

-- crm_opportunities — Sales opportunities with pipeline tracking
CREATE TABLE public.crm_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  brand_id UUID REFERENCES crm_brands(id),
  architecture_firm_id UUID REFERENCES crm_architecture_firms(id),
  stage TEXT NOT NULL CHECK (stage IN
    ('researched', 'contacted', 'sample_sent', 'meeting', 'proposal', 'negotiation', 'won', 'lost')) DEFAULT 'researched',
  estimated_value NUMERIC(15,2),
  currency TEXT CHECK (currency IN ('TRY', 'USD', 'EUR')) DEFAULT 'USD',
  probability INTEGER CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,
  assigned_to UUID REFERENCES users(id),
  source TEXT,
  loss_reason TEXT,
  notes TEXT,
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.crm_opportunities IS 'CRM: Sales pipeline opportunities';

-- crm_activities — Log of all sales activities
CREATE TABLE public.crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type TEXT NOT NULL CHECK (activity_type IN
    ('email', 'call', 'meeting', 'linkedin_message', 'sample_sent', 'vendor_application',
     'trade_show', 'site_visit', 'proposal_sent', 'follow_up', 'note')),
  title TEXT NOT NULL,
  description TEXT,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  brand_id UUID REFERENCES crm_brands(id),
  architecture_firm_id UUID REFERENCES crm_architecture_firms(id),
  contact_id UUID REFERENCES crm_contacts(id),
  opportunity_id UUID REFERENCES crm_opportunities(id),
  user_id UUID REFERENCES users(id),
  outcome TEXT,
  next_action TEXT,
  next_action_date DATE,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.crm_activities IS 'CRM: Sales activity log for tracking interactions';

-- crm_brand_firm_links — Many-to-many: brands <-> architecture firms
CREATE TABLE public.crm_brand_firm_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES crm_brands(id),
  architecture_firm_id UUID NOT NULL REFERENCES crm_architecture_firms(id),
  relationship_type TEXT,
  notes TEXT,
  UNIQUE(brand_id, architecture_firm_id)
);

COMMENT ON TABLE public.crm_brand_firm_links IS 'CRM: Brand-to-architecture-firm relationships';

-- ============================================================================
-- 2. SEQUENCE METADATA + SEQUENCES
-- ============================================================================

INSERT INTO sequence_metadata (entity_type, prefix, is_year_based, padding_length) VALUES
  ('crm_brand', 'BRD', false, 3),
  ('crm_firm', 'ARCH', false, 3),
  ('crm_contact', 'CON', false, 3),
  ('crm_opportunity', 'OPP', false, 3)
ON CONFLICT (entity_type) DO NOTHING;

CREATE SEQUENCE IF NOT EXISTS seq_crm_brand START 1;
CREATE SEQUENCE IF NOT EXISTS seq_crm_firm START 1;
CREATE SEQUENCE IF NOT EXISTS seq_crm_contact START 1;
CREATE SEQUENCE IF NOT EXISTS seq_crm_opportunity START 1;

-- ============================================================================
-- 3. AUTO-CODE TRIGGERS
-- ============================================================================

-- Brands
CREATE OR REPLACE FUNCTION set_crm_brand_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NEW.brand_code IS NULL THEN
    NEW.brand_code := generate_entity_code('crm_brand');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_crm_brands_set_code ON crm_brands;
CREATE TRIGGER tr_crm_brands_set_code
  BEFORE INSERT ON crm_brands FOR EACH ROW EXECUTE FUNCTION set_crm_brand_code();

-- Architecture Firms
CREATE OR REPLACE FUNCTION set_crm_firm_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NEW.firm_code IS NULL THEN
    NEW.firm_code := generate_entity_code('crm_firm');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_crm_firms_set_code ON crm_architecture_firms;
CREATE TRIGGER tr_crm_firms_set_code
  BEFORE INSERT ON crm_architecture_firms FOR EACH ROW EXECUTE FUNCTION set_crm_firm_code();

-- Contacts
CREATE OR REPLACE FUNCTION set_crm_contact_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NEW.contact_code IS NULL THEN
    NEW.contact_code := generate_entity_code('crm_contact');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_crm_contacts_set_code ON crm_contacts;
CREATE TRIGGER tr_crm_contacts_set_code
  BEFORE INSERT ON crm_contacts FOR EACH ROW EXECUTE FUNCTION set_crm_contact_code();

-- Opportunities
CREATE OR REPLACE FUNCTION set_crm_opportunity_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NEW.opportunity_code IS NULL THEN
    NEW.opportunity_code := generate_entity_code('crm_opportunity');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_crm_opportunities_set_code ON crm_opportunities;
CREATE TRIGGER tr_crm_opportunities_set_code
  BEFORE INSERT ON crm_opportunities FOR EACH ROW EXECUTE FUNCTION set_crm_opportunity_code();

-- ============================================================================
-- 4. UPDATED_AT TRIGGERS (reuse existing function)
-- ============================================================================

CREATE TRIGGER tr_crm_brands_updated_at BEFORE UPDATE ON crm_brands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_crm_firms_updated_at BEFORE UPDATE ON crm_architecture_firms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_crm_contacts_updated_at BEFORE UPDATE ON crm_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_crm_opportunities_updated_at BEFORE UPDATE ON crm_opportunities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_crm_activities_updated_at BEFORE UPDATE ON crm_activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. RLS POLICIES
-- ============================================================================

ALTER TABLE crm_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_architecture_firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_brand_firm_links ENABLE ROW LEVEL SECURITY;

-- Helper: CRM read access (admin, pm, management)
-- Helper: CRM write access (admin, pm)

-- crm_brands
CREATE POLICY "crm_brands_select" ON crm_brands FOR SELECT TO authenticated
  USING ((SELECT get_user_role()) IN ('admin', 'pm', 'management'));

CREATE POLICY "crm_brands_insert" ON crm_brands FOR INSERT TO authenticated
  WITH CHECK ((SELECT get_user_role()) IN ('admin', 'pm'));

CREATE POLICY "crm_brands_update" ON crm_brands FOR UPDATE TO authenticated
  USING ((SELECT get_user_role()) IN ('admin', 'pm'))
  WITH CHECK ((SELECT get_user_role()) IN ('admin', 'pm'));

CREATE POLICY "crm_brands_delete" ON crm_brands FOR DELETE TO authenticated
  USING ((SELECT get_user_role()) = 'admin');

-- crm_architecture_firms
CREATE POLICY "crm_firms_select" ON crm_architecture_firms FOR SELECT TO authenticated
  USING ((SELECT get_user_role()) IN ('admin', 'pm', 'management'));

CREATE POLICY "crm_firms_insert" ON crm_architecture_firms FOR INSERT TO authenticated
  WITH CHECK ((SELECT get_user_role()) IN ('admin', 'pm'));

CREATE POLICY "crm_firms_update" ON crm_architecture_firms FOR UPDATE TO authenticated
  USING ((SELECT get_user_role()) IN ('admin', 'pm'))
  WITH CHECK ((SELECT get_user_role()) IN ('admin', 'pm'));

CREATE POLICY "crm_firms_delete" ON crm_architecture_firms FOR DELETE TO authenticated
  USING ((SELECT get_user_role()) = 'admin');

-- crm_contacts
CREATE POLICY "crm_contacts_select" ON crm_contacts FOR SELECT TO authenticated
  USING ((SELECT get_user_role()) IN ('admin', 'pm', 'management'));

CREATE POLICY "crm_contacts_insert" ON crm_contacts FOR INSERT TO authenticated
  WITH CHECK ((SELECT get_user_role()) IN ('admin', 'pm'));

CREATE POLICY "crm_contacts_update" ON crm_contacts FOR UPDATE TO authenticated
  USING ((SELECT get_user_role()) IN ('admin', 'pm'))
  WITH CHECK ((SELECT get_user_role()) IN ('admin', 'pm'));

CREATE POLICY "crm_contacts_delete" ON crm_contacts FOR DELETE TO authenticated
  USING ((SELECT get_user_role()) = 'admin');

-- crm_opportunities
CREATE POLICY "crm_opportunities_select" ON crm_opportunities FOR SELECT TO authenticated
  USING ((SELECT get_user_role()) IN ('admin', 'pm', 'management'));

CREATE POLICY "crm_opportunities_insert" ON crm_opportunities FOR INSERT TO authenticated
  WITH CHECK ((SELECT get_user_role()) IN ('admin', 'pm'));

CREATE POLICY "crm_opportunities_update" ON crm_opportunities FOR UPDATE TO authenticated
  USING ((SELECT get_user_role()) IN ('admin', 'pm'))
  WITH CHECK ((SELECT get_user_role()) IN ('admin', 'pm'));

CREATE POLICY "crm_opportunities_delete" ON crm_opportunities FOR DELETE TO authenticated
  USING ((SELECT get_user_role()) = 'admin');

-- crm_activities
CREATE POLICY "crm_activities_select" ON crm_activities FOR SELECT TO authenticated
  USING ((SELECT get_user_role()) IN ('admin', 'pm', 'management'));

CREATE POLICY "crm_activities_insert" ON crm_activities FOR INSERT TO authenticated
  WITH CHECK ((SELECT get_user_role()) IN ('admin', 'pm'));

CREATE POLICY "crm_activities_update" ON crm_activities FOR UPDATE TO authenticated
  USING ((SELECT get_user_role()) IN ('admin', 'pm'))
  WITH CHECK ((SELECT get_user_role()) IN ('admin', 'pm'));

CREATE POLICY "crm_activities_delete" ON crm_activities FOR DELETE TO authenticated
  USING ((SELECT get_user_role()) = 'admin');

-- crm_brand_firm_links
CREATE POLICY "crm_links_select" ON crm_brand_firm_links FOR SELECT TO authenticated
  USING ((SELECT get_user_role()) IN ('admin', 'pm', 'management'));

CREATE POLICY "crm_links_insert" ON crm_brand_firm_links FOR INSERT TO authenticated
  WITH CHECK ((SELECT get_user_role()) IN ('admin', 'pm'));

CREATE POLICY "crm_links_update" ON crm_brand_firm_links FOR UPDATE TO authenticated
  USING ((SELECT get_user_role()) IN ('admin', 'pm'))
  WITH CHECK ((SELECT get_user_role()) IN ('admin', 'pm'));

CREATE POLICY "crm_links_delete" ON crm_brand_firm_links FOR DELETE TO authenticated
  USING ((SELECT get_user_role()) = 'admin');

-- ============================================================================
-- 6. INDEXES
-- ============================================================================

-- crm_brands
CREATE INDEX idx_crm_brands_tier ON crm_brands(tier) WHERE is_deleted = false;
CREATE INDEX idx_crm_brands_priority ON crm_brands(priority) WHERE is_deleted = false;
CREATE INDEX idx_crm_brands_parent_group ON crm_brands(parent_group) WHERE is_deleted = false;

-- crm_architecture_firms
CREATE INDEX idx_crm_firms_vendor_status ON crm_architecture_firms(vendor_list_status) WHERE is_deleted = false;
CREATE INDEX idx_crm_firms_connection ON crm_architecture_firms(connection_strength) WHERE is_deleted = false;
CREATE INDEX idx_crm_firms_priority ON crm_architecture_firms(priority) WHERE is_deleted = false;

-- crm_contacts
CREATE INDEX idx_crm_contacts_brand ON crm_contacts(brand_id) WHERE is_deleted = false;
CREATE INDEX idx_crm_contacts_firm ON crm_contacts(architecture_firm_id) WHERE is_deleted = false;
CREATE INDEX idx_crm_contacts_relationship ON crm_contacts(relationship_status) WHERE is_deleted = false;

-- crm_opportunities
CREATE INDEX idx_crm_opps_brand ON crm_opportunities(brand_id) WHERE is_deleted = false;
CREATE INDEX idx_crm_opps_firm ON crm_opportunities(architecture_firm_id) WHERE is_deleted = false;
CREATE INDEX idx_crm_opps_stage ON crm_opportunities(stage) WHERE is_deleted = false;
CREATE INDEX idx_crm_opps_priority ON crm_opportunities(priority) WHERE is_deleted = false;
CREATE INDEX idx_crm_opps_assigned ON crm_opportunities(assigned_to) WHERE is_deleted = false;
CREATE INDEX idx_crm_opps_close_date ON crm_opportunities(expected_close_date) WHERE is_deleted = false;

-- crm_activities
CREATE INDEX idx_crm_activities_brand ON crm_activities(brand_id) WHERE is_deleted = false;
CREATE INDEX idx_crm_activities_firm ON crm_activities(architecture_firm_id) WHERE is_deleted = false;
CREATE INDEX idx_crm_activities_contact ON crm_activities(contact_id) WHERE is_deleted = false;
CREATE INDEX idx_crm_activities_opp ON crm_activities(opportunity_id) WHERE is_deleted = false;
CREATE INDEX idx_crm_activities_user ON crm_activities(user_id) WHERE is_deleted = false;
CREATE INDEX idx_crm_activities_date ON crm_activities(activity_date) WHERE is_deleted = false;
CREATE INDEX idx_crm_activities_next_action ON crm_activities(next_action_date) WHERE is_deleted = false AND next_action_date IS NOT NULL;

-- crm_brand_firm_links
CREATE INDEX idx_crm_links_brand ON crm_brand_firm_links(brand_id);
CREATE INDEX idx_crm_links_firm ON crm_brand_firm_links(architecture_firm_id);

-- ============================================================================
-- 7. ADMIN VIEWS (security_invoker = true)
-- ============================================================================

-- v_crm_brands — brand + opportunity count + latest activity date
DROP VIEW IF EXISTS v_crm_brands;
CREATE VIEW v_crm_brands WITH (security_invoker = true) AS
SELECT
  b.id,
  b.brand_code,
  b.name,
  b.parent_group,
  b.tier,
  b.segment,
  b.store_count,
  b.expansion_rate,
  b.priority,
  b.cd_changed_recently,
  b.headquarters,
  b.created_at,
  COALESCE(opp.opportunity_count, 0) AS opportunity_count,
  act.latest_activity_date
FROM crm_brands b
LEFT JOIN LATERAL (
  SELECT count(*) AS opportunity_count
  FROM crm_opportunities o
  WHERE o.brand_id = b.id AND o.is_deleted = false
) opp ON true
LEFT JOIN LATERAL (
  SELECT max(a.activity_date) AS latest_activity_date
  FROM crm_activities a
  WHERE a.brand_id = b.id AND a.is_deleted = false
) act ON true
WHERE b.is_deleted = false;

-- v_crm_opportunities — opportunity + brand name + firm name + assigned user
DROP VIEW IF EXISTS v_crm_opportunities;
CREATE VIEW v_crm_opportunities WITH (security_invoker = true) AS
SELECT
  o.id,
  o.opportunity_code,
  o.title,
  o.stage,
  o.estimated_value,
  o.currency,
  o.probability,
  o.expected_close_date,
  o.priority,
  o.source,
  o.loss_reason,
  o.assigned_to,
  o.created_at,
  b.name AS brand_name,
  b.brand_code,
  f.name AS firm_name,
  f.firm_code,
  u.name AS assigned_to_name
FROM crm_opportunities o
LEFT JOIN crm_brands b ON o.brand_id = b.id
LEFT JOIN crm_architecture_firms f ON o.architecture_firm_id = f.id
LEFT JOIN users u ON o.assigned_to = u.id
WHERE o.is_deleted = false;

-- v_crm_activities — activity + brand/firm/contact/user names
DROP VIEW IF EXISTS v_crm_activities;
CREATE VIEW v_crm_activities WITH (security_invoker = true) AS
SELECT
  a.id,
  a.activity_type,
  a.title,
  a.activity_date,
  a.outcome,
  a.next_action,
  a.next_action_date,
  a.created_at,
  b.name AS brand_name,
  f.name AS firm_name,
  CASE WHEN c.id IS NOT NULL THEN c.first_name || ' ' || c.last_name END AS contact_name,
  o.title AS opportunity_title,
  u.name AS user_name
FROM crm_activities a
LEFT JOIN crm_brands b ON a.brand_id = b.id
LEFT JOIN crm_architecture_firms f ON a.architecture_firm_id = f.id
LEFT JOIN crm_contacts c ON a.contact_id = c.id
LEFT JOIN crm_opportunities o ON a.opportunity_id = o.id
LEFT JOIN users u ON a.user_id = u.id
WHERE a.is_deleted = false;
