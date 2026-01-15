-- ============================================
-- Performance Indexes Migration
-- Run this in Supabase SQL Editor to add missing indexes
-- ============================================

-- ============================================
-- COMPOSITE INDEXES (Most Important)
-- ============================================

-- Scope items: Frequently queried with project + status filter
CREATE INDEX IF NOT EXISTS idx_scope_items_project_status_path
  ON scope_items(project_id, status, item_path)
  WHERE is_deleted = false;

-- Scope items: For progress calculations
CREATE INDEX IF NOT EXISTS idx_scope_items_project_progress
  ON scope_items(project_id, production_percentage)
  WHERE is_deleted = false;

-- Projects: For sorting by recent activity
CREATE INDEX IF NOT EXISTS idx_projects_updated_at
  ON projects(updated_at DESC)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_projects_created_at
  ON projects(created_at DESC)
  WHERE is_deleted = false;

-- ============================================
-- JOIN OPTIMIZATION INDEXES
-- ============================================

-- Drawings: Join with scope_items
CREATE INDEX IF NOT EXISTS idx_drawings_item_id
  ON drawings(item_id);

-- Drawing revisions: Join with drawings
CREATE INDEX IF NOT EXISTS idx_drawing_revisions_drawing_id
  ON drawing_revisions(drawing_id);

-- Item materials: Both foreign keys
CREATE INDEX IF NOT EXISTS idx_item_materials_item_id
  ON item_materials(item_id);

CREATE INDEX IF NOT EXISTS idx_item_materials_material_id
  ON item_materials(material_id);

-- ============================================
-- PROJECT ASSIGNMENTS (Critical for RLS)
-- ============================================

-- User's assigned projects (very frequent query)
CREATE INDEX IF NOT EXISTS idx_project_assignments_user_id
  ON project_assignments(user_id);

-- Project's assigned users
CREATE INDEX IF NOT EXISTS idx_project_assignments_project_id
  ON project_assignments(project_id);

-- ============================================
-- MILESTONES & TIMELINE
-- ============================================

-- Milestones by project and due date
CREATE INDEX IF NOT EXISTS idx_milestones_project_due
  ON milestones(project_id, due_date);

-- Overdue milestones query
CREATE INDEX IF NOT EXISTS idx_milestones_due_date
  ON milestones(due_date)
  WHERE is_completed = false;

-- ============================================
-- NOTIFICATIONS (User-specific queries)
-- ============================================

-- Unread notifications (most common query)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, created_at DESC)
  WHERE is_read = false;

-- All notifications for user (sorted)
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);

-- ============================================
-- ACTIVITY LOG
-- ============================================

-- Recent activity by project
CREATE INDEX IF NOT EXISTS idx_activity_log_project_created
  ON activity_log(project_id, created_at DESC);

-- Recent activity by entity
CREATE INDEX IF NOT EXISTS idx_activity_log_entity
  ON activity_log(entity_type, entity_id);

-- ============================================
-- REPORTS
-- ============================================

-- Published reports for project
CREATE INDEX IF NOT EXISTS idx_reports_project_published
  ON reports(project_id, is_published);

-- Report lines order
CREATE INDEX IF NOT EXISTS idx_report_lines_report_order
  ON report_lines(report_id, line_order);

-- ============================================
-- SNAGGING / DEFECTS
-- ============================================

-- Snagging by project and status
CREATE INDEX IF NOT EXISTS idx_snagging_project_resolved
  ON snagging(project_id, is_resolved);

-- ============================================
-- MATERIALS
-- ============================================

-- Materials by status (for approval workflows)
CREATE INDEX IF NOT EXISTS idx_materials_project_status
  ON materials(project_id, status)
  WHERE is_deleted = false;

-- ============================================
-- FULL-TEXT SEARCH INDEXES
-- ============================================

-- Projects search (name and code)
CREATE INDEX IF NOT EXISTS idx_projects_search
  ON projects USING gin(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(project_code, '')));

-- Scope items search (name and code)
CREATE INDEX IF NOT EXISTS idx_scope_items_search
  ON scope_items USING gin(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(item_code, '')));

-- Clients search
CREATE INDEX IF NOT EXISTS idx_clients_search
  ON clients USING gin(to_tsvector('english', coalesce(company_name, '') || ' ' || coalesce(contact_person, '')));

-- ============================================
-- DONE!
-- Total: 24 new indexes for common query patterns
-- ============================================
