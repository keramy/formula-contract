-- Formula Contract Database Schema
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/dovxdlrltkefqhkascoa/sql)

-- ============================================
-- STEP 1: Create ENUM Types
-- ============================================

CREATE TYPE user_role AS ENUM ('admin', 'pm', 'production', 'procurement', 'management', 'client');
CREATE TYPE project_status AS ENUM ('tender', 'active', 'on_hold', 'completed', 'cancelled');
CREATE TYPE item_path AS ENUM ('production', 'procurement');
CREATE TYPE item_status AS ENUM ('pending', 'in_design', 'awaiting_approval', 'approved', 'in_production', 'complete', 'on_hold', 'cancelled');
CREATE TYPE procurement_status AS ENUM ('pm_approval', 'not_ordered', 'ordered', 'received');
CREATE TYPE drawing_status AS ENUM ('not_uploaded', 'uploaded', 'sent_to_client', 'approved', 'rejected', 'approved_with_comments');
CREATE TYPE material_status AS ENUM ('pending', 'sent_to_client', 'approved', 'rejected');
CREATE TYPE currency AS ENUM ('TRY', 'USD', 'EUR');

-- ============================================
-- STEP 2: Create Tables
-- ============================================

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'pm',
  language TEXT DEFAULT 'en',
  email_notifications BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients table
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  client_id UUID REFERENCES clients(id),
  status project_status NOT NULL DEFAULT 'tender',
  currency currency NOT NULL DEFAULT 'TRY',
  description TEXT,
  installation_date DATE,
  contract_value_manual DECIMAL(15,2),
  contract_value_calculated DECIMAL(15,2),
  kickoff_summary TEXT,
  kickoff_requirements TEXT,
  signoff_requested_at TIMESTAMPTZ,
  signoff_completed_at TIMESTAMPTZ,
  signoff_notes TEXT,
  is_deleted BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Assignments (M:M users to projects)
CREATE TABLE project_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  UNIQUE(project_id, user_id)
);

-- Milestones
CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  alert_days_before INTEGER DEFAULT 7,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scope Items (the core entity)
CREATE TABLE scope_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  item_code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  width DECIMAL(10,2),
  depth DECIMAL(10,2),
  height DECIMAL(10,2),
  unit TEXT DEFAULT 'pcs',
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(15,2),
  total_price DECIMAL(15,2),
  item_path item_path NOT NULL DEFAULT 'production',
  status item_status NOT NULL DEFAULT 'pending',
  procurement_status procurement_status,
  production_percentage INTEGER DEFAULT 0 CHECK (production_percentage >= 0 AND production_percentage <= 100),
  drawing_receival_date DATE,
  planned_completion_date DATE,
  is_installed BOOLEAN DEFAULT false,
  installed_at TIMESTAMPTZ,
  notes TEXT,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, item_code)
);

-- Drawings (one per scope_item)
CREATE TABLE drawings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID UNIQUE NOT NULL REFERENCES scope_items(id) ON DELETE CASCADE,
  status drawing_status NOT NULL DEFAULT 'not_uploaded',
  current_revision TEXT,
  sent_to_client_at TIMESTAMPTZ,
  client_response_at TIMESTAMPTZ,
  client_comments TEXT,
  approved_by UUID REFERENCES users(id),
  pm_override BOOLEAN DEFAULT false,
  pm_override_reason TEXT,
  pm_override_at TIMESTAMPTZ,
  pm_override_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drawing Revisions (history)
CREATE TABLE drawing_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drawing_id UUID NOT NULL REFERENCES drawings(id) ON DELETE CASCADE,
  revision TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  cad_file_url TEXT,
  cad_file_name TEXT,
  client_markup_url TEXT,
  notes TEXT,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(drawing_id, revision)
);

-- Materials
CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  specification TEXT,
  supplier TEXT,
  images JSONB DEFAULT '[]',
  status material_status NOT NULL DEFAULT 'pending',
  sent_to_client_at TIMESTAMPTZ,
  client_response_at TIMESTAMPTZ,
  client_comments TEXT,
  approved_by UUID REFERENCES users(id),
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Item Materials (M:M)
CREATE TABLE item_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES scope_items(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_id, material_id)
);

-- Snagging (punch list)
CREATE TABLE snagging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  item_id UUID REFERENCES scope_items(id),
  description TEXT NOT NULL,
  photos JSONB DEFAULT '[]',
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  resolution_notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reports
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL DEFAULT 'progress',
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  share_with_client BOOLEAN DEFAULT false,
  share_internal BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Report Lines
CREATE TABLE report_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  line_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  photos JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  project_id UUID REFERENCES projects(id),
  item_id UUID REFERENCES scope_items(id),
  drawing_id UUID REFERENCES drawings(id),
  material_id UUID REFERENCES materials(id),
  report_id UUID REFERENCES reports(id),
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  email_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Log (audit trail)
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  project_id UUID REFERENCES projects(id),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STEP 3: Create Indexes for Performance
-- ============================================

-- Basic indexes
CREATE INDEX idx_projects_status ON projects(status) WHERE NOT is_deleted;
CREATE INDEX idx_projects_client ON projects(client_id) WHERE NOT is_deleted;
CREATE INDEX idx_scope_items_project ON scope_items(project_id) WHERE NOT is_deleted;
CREATE INDEX idx_scope_items_status ON scope_items(status) WHERE NOT is_deleted;
CREATE INDEX idx_drawings_status ON drawings(status);
CREATE INDEX idx_materials_project ON materials(project_id) WHERE NOT is_deleted;
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_activity_log_project ON activity_log(project_id);
CREATE INDEX idx_activity_log_user ON activity_log(user_id);

-- Composite indexes for common query patterns
CREATE INDEX idx_scope_items_project_status_path ON scope_items(project_id, status, item_path) WHERE NOT is_deleted;
CREATE INDEX idx_scope_items_project_progress ON scope_items(project_id, production_percentage) WHERE NOT is_deleted;
CREATE INDEX idx_projects_updated_at ON projects(updated_at DESC) WHERE NOT is_deleted;
CREATE INDEX idx_projects_created_at ON projects(created_at DESC) WHERE NOT is_deleted;

-- Join optimization indexes
CREATE INDEX idx_drawings_item_id ON drawings(item_id);
CREATE INDEX idx_drawing_revisions_drawing_id ON drawing_revisions(drawing_id);
CREATE INDEX idx_item_materials_item_id ON item_materials(item_id);
CREATE INDEX idx_item_materials_material_id ON item_materials(material_id);

-- Project assignments (critical for RLS performance)
CREATE INDEX idx_project_assignments_user_id ON project_assignments(user_id);
CREATE INDEX idx_project_assignments_project_id ON project_assignments(project_id);

-- Milestones & timeline
CREATE INDEX idx_milestones_project_due ON milestones(project_id, due_date);
CREATE INDEX idx_milestones_due_date ON milestones(due_date) WHERE NOT is_completed;

-- Notifications (user-specific queries)
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE NOT is_read;
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);

-- Activity log (recent activity queries)
CREATE INDEX idx_activity_log_project_created ON activity_log(project_id, created_at DESC);
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);

-- Reports
CREATE INDEX idx_reports_project_published ON reports(project_id, is_published);
CREATE INDEX idx_report_lines_report_order ON report_lines(report_id, line_order);

-- Snagging
CREATE INDEX idx_snagging_project_resolved ON snagging(project_id, is_resolved);

-- Materials by status
CREATE INDEX idx_materials_project_status ON materials(project_id, status) WHERE NOT is_deleted;

-- Full-text search indexes
CREATE INDEX idx_projects_search ON projects USING gin(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(project_code, '')));
CREATE INDEX idx_scope_items_search ON scope_items USING gin(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(item_code, '')));
CREATE INDEX idx_clients_search ON clients USING gin(to_tsvector('english', coalesce(company_name, '') || ' ' || coalesce(contact_person, '')));

-- ============================================
-- STEP 4: Create Updated_at Trigger
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_scope_items_updated_at BEFORE UPDATE ON scope_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_drawings_updated_at BEFORE UPDATE ON drawings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON materials FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_snagging_updated_at BEFORE UPDATE ON snagging FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_report_lines_updated_at BEFORE UPDATE ON report_lines FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- STEP 5: Calculate total_price Trigger
-- ============================================

CREATE OR REPLACE FUNCTION calculate_item_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_price = COALESCE(NEW.unit_price, 0) * COALESCE(NEW.quantity, 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_scope_item_total
BEFORE INSERT OR UPDATE OF unit_price, quantity ON scope_items
FOR EACH ROW EXECUTE FUNCTION calculate_item_total();

-- ============================================
-- STEP 6: Row Level Security (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE snagging ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function to check if user is assigned to project
CREATE OR REPLACE FUNCTION is_assigned_to_project(project_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_assignments
    WHERE project_id = project_uuid AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Users: Users can read all active users, update own profile
CREATE POLICY "Users can view all active users" ON users FOR SELECT USING (is_active = true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (id = auth.uid());

-- Clients: Admins and PMs can manage, others can view
CREATE POLICY "View clients" ON clients FOR SELECT USING (NOT is_deleted);
CREATE POLICY "Manage clients" ON clients FOR ALL USING (get_user_role() IN ('admin', 'pm'));

-- Projects: Based on role and assignment
CREATE POLICY "View assigned projects" ON projects FOR SELECT
USING (
  NOT is_deleted AND (
    get_user_role() IN ('admin', 'management') OR
    is_assigned_to_project(id)
  )
);
CREATE POLICY "Create projects" ON projects FOR INSERT
WITH CHECK (get_user_role() IN ('admin', 'pm'));
CREATE POLICY "Update projects" ON projects FOR UPDATE
USING (get_user_role() IN ('admin', 'pm') AND (get_user_role() = 'admin' OR is_assigned_to_project(id)));

-- Project Assignments: Admins can manage all, PMs can view
CREATE POLICY "View assignments" ON project_assignments FOR SELECT USING (true);
CREATE POLICY "Manage assignments" ON project_assignments FOR ALL USING (get_user_role() = 'admin');

-- Scope Items: Based on project access
CREATE POLICY "View scope items" ON scope_items FOR SELECT
USING (NOT is_deleted AND is_assigned_to_project(project_id));
CREATE POLICY "Manage scope items" ON scope_items FOR ALL
USING (get_user_role() IN ('admin', 'pm') AND is_assigned_to_project(project_id));

-- Drawings: Based on project access
CREATE POLICY "View drawings" ON drawings FOR SELECT
USING (EXISTS (SELECT 1 FROM scope_items WHERE scope_items.id = drawings.item_id AND is_assigned_to_project(scope_items.project_id)));
CREATE POLICY "Manage drawings" ON drawings FOR ALL
USING (get_user_role() IN ('admin', 'pm', 'production'));

-- Drawing Revisions: Based on drawing access
CREATE POLICY "View revisions" ON drawing_revisions FOR SELECT USING (true);
CREATE POLICY "Create revisions" ON drawing_revisions FOR INSERT
WITH CHECK (get_user_role() IN ('admin', 'pm', 'production'));

-- Materials: Based on project access
CREATE POLICY "View materials" ON materials FOR SELECT
USING (NOT is_deleted AND is_assigned_to_project(project_id));
CREATE POLICY "Manage materials" ON materials FOR ALL
USING (get_user_role() IN ('admin', 'pm'));

-- Item Materials: Based on project access
CREATE POLICY "View item materials" ON item_materials FOR SELECT USING (true);
CREATE POLICY "Manage item materials" ON item_materials FOR ALL
USING (get_user_role() IN ('admin', 'pm'));

-- Snagging: Based on project access
CREATE POLICY "View snagging" ON snagging FOR SELECT
USING (is_assigned_to_project(project_id));
CREATE POLICY "Manage snagging" ON snagging FOR ALL
USING (get_user_role() IN ('admin', 'pm', 'production'));

-- Reports: Based on project access
CREATE POLICY "View reports" ON reports FOR SELECT
USING (is_assigned_to_project(project_id));
CREATE POLICY "Manage reports" ON reports FOR ALL
USING (get_user_role() IN ('admin', 'pm'));

-- Report Lines: Based on report access
CREATE POLICY "View report lines" ON report_lines FOR SELECT USING (true);
CREATE POLICY "Manage report lines" ON report_lines FOR ALL
USING (get_user_role() IN ('admin', 'pm'));

-- Notifications: Users can only see their own
CREATE POLICY "View own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- Activity Log: Based on project access or admin
CREATE POLICY "View activity log" ON activity_log FOR SELECT
USING (get_user_role() = 'admin' OR (project_id IS NOT NULL AND is_assigned_to_project(project_id)));
CREATE POLICY "Create activity log" ON activity_log FOR INSERT WITH CHECK (true);

-- Milestones: Based on project access
CREATE POLICY "View milestones" ON milestones FOR SELECT
USING (is_assigned_to_project(project_id));
CREATE POLICY "Manage milestones" ON milestones FOR ALL
USING (get_user_role() IN ('admin', 'pm') AND is_assigned_to_project(project_id));

-- ============================================
-- STEP 7: Storage Buckets
-- ============================================

-- Create storage buckets (run these separately if needed)
INSERT INTO storage.buckets (id, name, public) VALUES ('drawings', 'drawings', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('materials', 'materials', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'reports', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('snagging', 'snagging', false);

-- ============================================
-- DONE! Schema created successfully.
-- ============================================
