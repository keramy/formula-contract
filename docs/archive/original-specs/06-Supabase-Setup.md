# Formula Contract - Supabase Setup
## Document 06: Database, Auth, Storage & RLS

**Version:** 1.0  
**Database:** PostgreSQL (via Supabase)

---

## Table of Contents

1. [Project Setup](#1-project-setup)
2. [Database Schema](#2-database-schema)
3. [Row Level Security](#3-row-level-security)
4. [Storage Buckets](#4-storage-buckets)
5. [Auth Configuration](#5-auth-configuration)
6. [Database Functions](#6-database-functions)
7. [Triggers](#7-triggers)

---

## 1. Project Setup

### Step 1.1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Choose region closest to Turkey (e.g., Frankfurt)
4. Save your project password securely

### Step 1.2: Get API Keys

From Project Settings → API:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...  # Only for server-side admin tasks
```

---

## 2. Database Schema

Run these SQL commands in Supabase SQL Editor in order:

### Step 2.1: Create Enum Types

```sql
-- User roles
CREATE TYPE user_role AS ENUM (
  'admin',
  'pm',
  'production',
  'procurement',
  'management',
  'client'
);

-- Project status
CREATE TYPE project_status AS ENUM (
  'tender',
  'active',
  'on_hold',
  'completed',
  'cancelled'
);

-- Item path (production vs procurement)
CREATE TYPE item_path AS ENUM (
  'production',
  'procurement'
);

-- Item status (for production path)
CREATE TYPE item_status AS ENUM (
  'pending',
  'in_design',
  'awaiting_approval',
  'approved',
  'in_production',
  'complete',
  'on_hold',
  'cancelled'
);

-- Procurement status
CREATE TYPE procurement_status AS ENUM (
  'pm_approval',
  'not_ordered',
  'ordered',
  'received'
);

-- Drawing status
CREATE TYPE drawing_status AS ENUM (
  'not_uploaded',
  'uploaded',
  'sent_to_client',
  'approved',
  'rejected',
  'approved_with_comments'
);

-- Material status
CREATE TYPE material_status AS ENUM (
  'pending',
  'sent_to_client',
  'approved',
  'rejected'
);

-- Currency
CREATE TYPE currency AS ENUM (
  'TRY',
  'USD',
  'EUR'
);

-- Notification types
CREATE TYPE notification_type AS ENUM (
  'drawing_uploaded',
  'drawing_sent',
  'drawing_approved',
  'drawing_rejected',
  'material_sent',
  'material_approved',
  'material_rejected',
  'milestone_approaching',
  'report_shared',
  'signoff_requested',
  'signoff_completed',
  'snag_added'
);
```

### Step 2.2: Create Tables

```sql
-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'pm',
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'tr')),
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- CLIENTS TABLE
-- ============================================
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- PROJECTS TABLE
-- ============================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code TEXT NOT NULL,
  name TEXT NOT NULL,
  client_id UUID REFERENCES clients(id),
  status project_status NOT NULL DEFAULT 'tender',
  currency currency NOT NULL DEFAULT 'TRY',
  description TEXT,
  installation_date DATE,
  
  -- Contract values
  contract_value_manual DECIMAL(15,2),
  contract_value_calculated DECIMAL(15,2) DEFAULT 0,
  
  -- Kickoff
  kickoff_summary TEXT,
  kickoff_requirements TEXT,
  
  -- Sign-off
  signoff_requested_at TIMESTAMPTZ,
  signoff_completed_at TIMESTAMPTZ,
  signoff_notes TEXT,
  
  -- Metadata
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(project_code)
);

-- ============================================
-- PROJECT ASSIGNMENTS (M:N Projects <-> Users)
-- ============================================
CREATE TABLE project_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  
  UNIQUE(project_id, user_id)
);

-- ============================================
-- MILESTONES TABLE
-- ============================================
CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  alert_days_before INTEGER DEFAULT 7,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- SCOPE ITEMS TABLE
-- ============================================
CREATE TABLE scope_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  item_code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Dimensions (in mm)
  width DECIMAL(10,2),
  depth DECIMAL(10,2),
  height DECIMAL(10,2),
  
  -- Quantity & Pricing
  unit TEXT NOT NULL DEFAULT 'pcs',
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(15,2),
  total_price DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  
  -- Path & Status
  item_path item_path NOT NULL DEFAULT 'production',
  status item_status NOT NULL DEFAULT 'pending',
  procurement_status procurement_status DEFAULT 'pm_approval',
  production_percentage INTEGER NOT NULL DEFAULT 0 CHECK (production_percentage >= 0 AND production_percentage <= 100),
  
  -- Dates
  drawing_receival_date DATE,
  planned_completion_date DATE,
  
  -- Installation
  is_installed BOOLEAN NOT NULL DEFAULT false,
  installed_at TIMESTAMPTZ,
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(project_id, item_code)
);

-- ============================================
-- ITEM STEPS TABLE (Custom production steps)
-- ============================================
CREATE TABLE item_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES scope_items(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- DRAWINGS TABLE (1:1 with scope_items)
-- ============================================
CREATE TABLE drawings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL UNIQUE REFERENCES scope_items(id) ON DELETE CASCADE,
  status drawing_status NOT NULL DEFAULT 'not_uploaded',
  current_revision TEXT,
  
  -- Approval tracking
  sent_to_client_at TIMESTAMPTZ,
  client_response_at TIMESTAMPTZ,
  client_comments TEXT,
  approved_by UUID REFERENCES users(id),
  
  -- Override
  pm_override BOOLEAN NOT NULL DEFAULT false,
  pm_override_reason TEXT,
  pm_override_at TIMESTAMPTZ,
  pm_override_by UUID REFERENCES users(id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- DRAWING REVISIONS TABLE
-- ============================================
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- MATERIALS TABLE
-- ============================================
CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  specification TEXT,
  supplier TEXT,
  images JSONB DEFAULT '[]',
  status material_status NOT NULL DEFAULT 'pending',
  
  -- Approval tracking
  sent_to_client_at TIMESTAMPTZ,
  client_response_at TIMESTAMPTZ,
  client_comments TEXT,
  approved_by UUID REFERENCES users(id),
  
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- ITEM MATERIALS (M:N scope_items <-> materials)
-- ============================================
CREATE TABLE item_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES scope_items(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(item_id, material_id)
);

-- ============================================
-- SNAGGING TABLE
-- ============================================
CREATE TABLE snagging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  item_id UUID REFERENCES scope_items(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  photos JSONB DEFAULT '[]',
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  resolution_notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- REPORTS TABLE
-- ============================================
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  share_with_client BOOLEAN NOT NULL DEFAULT false,
  share_internal BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- REPORT LINES TABLE
-- ============================================
CREATE TABLE report_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  line_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  photos JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  
  -- Related entities
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  item_id UUID REFERENCES scope_items(id) ON DELETE SET NULL,
  drawing_id UUID REFERENCES drawings(id) ON DELETE SET NULL,
  material_id UUID REFERENCES materials(id) ON DELETE SET NULL,
  report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
  
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- ACTIVITY LOG TABLE
-- ============================================
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- FILE ATTACHMENTS TABLE (General purpose)
-- ============================================
CREATE TABLE file_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Step 2.3: Create Indexes

```sql
-- Projects
CREATE INDEX idx_projects_status ON projects(status) WHERE is_deleted = false;
CREATE INDEX idx_projects_client ON projects(client_id) WHERE is_deleted = false;
CREATE INDEX idx_projects_created_by ON projects(created_by);

-- Project Assignments
CREATE INDEX idx_project_assignments_user ON project_assignments(user_id);
CREATE INDEX idx_project_assignments_project ON project_assignments(project_id);

-- Scope Items
CREATE INDEX idx_scope_items_project ON scope_items(project_id) WHERE is_deleted = false;
CREATE INDEX idx_scope_items_status ON scope_items(status) WHERE is_deleted = false;
CREATE INDEX idx_scope_items_path ON scope_items(item_path) WHERE is_deleted = false;

-- Drawings
CREATE INDEX idx_drawings_status ON drawings(status);
CREATE INDEX idx_drawings_item ON drawings(item_id);

-- Materials
CREATE INDEX idx_materials_project ON materials(project_id) WHERE is_deleted = false;
CREATE INDEX idx_materials_status ON materials(status) WHERE is_deleted = false;

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE is_read = false;

-- Activity Log
CREATE INDEX idx_activity_log_project ON activity_log(project_id);
CREATE INDEX idx_activity_log_user ON activity_log(user_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);
```

---

## 3. Row Level Security (RLS)

### Step 3.1: Enable RLS on All Tables

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE snagging ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_attachments ENABLE ROW LEVEL SECURITY;
```

### Step 3.2: Create Helper Function

```sql
-- Get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Check if user is assigned to project
CREATE OR REPLACE FUNCTION is_assigned_to_project(p_project_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_assignments 
    WHERE project_id = p_project_id 
    AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT role = 'admin' FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;
```

### Step 3.3: Create RLS Policies

```sql
-- ============================================
-- USERS POLICIES
-- ============================================
-- Anyone can read users (for assignment dropdowns)
CREATE POLICY "Users are viewable by authenticated users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

-- Only admin can insert/update users
CREATE POLICY "Only admins can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Only admins can update users"
  ON users FOR UPDATE
  TO authenticated
  USING (is_admin());

-- ============================================
-- CLIENTS POLICIES
-- ============================================
CREATE POLICY "Clients viewable by authenticated users"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and PM can insert clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'pm'));

CREATE POLICY "Admin and PM can update clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (get_user_role() IN ('admin', 'pm'));

-- ============================================
-- PROJECTS POLICIES
-- ============================================
-- Admin sees all, PM sees assigned, Client sees own
CREATE POLICY "Projects viewable based on role"
  ON projects FOR SELECT
  TO authenticated
  USING (
    is_deleted = false AND (
      is_admin() OR
      is_assigned_to_project(id) OR
      (get_user_role() = 'client' AND client_id IN (
        SELECT client_id FROM projects p
        JOIN project_assignments pa ON p.id = pa.project_id
        WHERE pa.user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Admin and PM can insert projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'pm'));

CREATE POLICY "Admin and assigned PM can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (is_admin() OR is_assigned_to_project(id));

-- ============================================
-- PROJECT ASSIGNMENTS POLICIES
-- ============================================
CREATE POLICY "Assignments viewable by authenticated users"
  ON project_assignments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admin can manage assignments"
  ON project_assignments FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- SCOPE ITEMS POLICIES
-- ============================================
CREATE POLICY "Scope items viewable if project accessible"
  ON scope_items FOR SELECT
  TO authenticated
  USING (
    is_deleted = false AND (
      is_admin() OR 
      is_assigned_to_project(project_id)
    )
  );

CREATE POLICY "Admin and assigned users can modify scope items"
  ON scope_items FOR ALL
  TO authenticated
  USING (is_admin() OR is_assigned_to_project(project_id))
  WITH CHECK (is_admin() OR is_assigned_to_project(project_id));

-- ============================================
-- NOTIFICATIONS POLICIES
-- ============================================
CREATE POLICY "Users see own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- System can insert notifications (via service role)
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

---

## 4. Storage Buckets

### Step 4.1: Create Storage Buckets

Go to Storage in Supabase Dashboard and create:

1. **drawings** - For drawing PDFs and CAD files
2. **materials** - For material images
3. **reports** - For report photos
4. **snagging** - For snagging photos
5. **attachments** - For general attachments

### Step 4.2: Storage Policies

```sql
-- Drawings bucket - Authenticated users can upload/view
CREATE POLICY "Authenticated users can view drawings"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'drawings');

CREATE POLICY "Authenticated users can upload drawings"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'drawings');

-- Materials bucket
CREATE POLICY "Authenticated users can view materials"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'materials');

CREATE POLICY "Authenticated users can upload materials"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'materials');

-- Reports bucket
CREATE POLICY "Authenticated users can view reports"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'reports');

CREATE POLICY "Authenticated users can upload to reports"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'reports');

-- Snagging bucket
CREATE POLICY "Authenticated users can view snagging"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'snagging');

CREATE POLICY "Authenticated users can upload snagging"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'snagging');
```

---

## 5. Auth Configuration

### Step 5.1: Email Templates

Go to Authentication → Email Templates and customize:

1. **Confirm signup** (if using email confirmation)
2. **Reset password**

### Step 5.2: Auth Settings

Go to Authentication → Settings:

- **Site URL:** Your production URL
- **Redirect URLs:** Add localhost for development

### Step 5.3: Create First Admin User

1. Go to Authentication → Users
2. Click "Add user"
3. Enter admin email and password
4. Run SQL to set role:

```sql
UPDATE users 
SET role = 'admin' 
WHERE email = 'admin@yourcompany.com';
```

---

## 6. Database Functions

### Step 6.1: Update Project Calculated Value

```sql
CREATE OR REPLACE FUNCTION update_project_calculated_value()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE projects
  SET contract_value_calculated = (
    SELECT COALESCE(SUM(total_price), 0)
    FROM scope_items
    WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
    AND is_deleted = false
  ),
  updated_at = NOW()
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Step 6.2: Auto-create Drawing Record

```sql
CREATE OR REPLACE FUNCTION create_drawing_for_item()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.item_path = 'production' THEN
    INSERT INTO drawings (item_id, status)
    VALUES (NEW.id, 'not_uploaded');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 7. Triggers

```sql
-- Update calculated value when scope items change
CREATE TRIGGER trigger_update_project_value
  AFTER INSERT OR UPDATE OR DELETE ON scope_items
  FOR EACH ROW
  EXECUTE FUNCTION update_project_calculated_value();

-- Auto-create drawing record for production items
CREATE TRIGGER trigger_create_drawing
  AFTER INSERT ON scope_items
  FOR EACH ROW
  EXECUTE FUNCTION create_drawing_for_item();

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_scope_items_updated_at
  BEFORE UPDATE ON scope_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_drawings_updated_at
  BEFORE UPDATE ON drawings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_materials_updated_at
  BEFORE UPDATE ON materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## Quick Reference

### Test Query: Check Setup

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check all enums exist
SELECT typname FROM pg_type 
WHERE typcategory = 'E'
ORDER BY typname;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
```

---

## Next Document

→ Continue to [07-Database-Schema.md](./07-Database-Schema.md) for detailed schema reference.
