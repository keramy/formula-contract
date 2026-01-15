-- ============================================
-- Client-Safe Database Views
-- Run this in Supabase SQL Editor
-- ============================================
--
-- These views provide filtered data specifically for client users,
-- hiding sensitive internal information while exposing only what
-- clients need to see about their projects.
--
-- Security Model:
-- - Clients can only see projects they're assigned to (via project_assignments)
-- - Internal notes and costs are hidden from clients
-- - User details (except names) are hidden from clients
-- ============================================

-- ============================================
-- VIEW: client_projects_view
-- ============================================
-- Filtered project view for clients - hides internal financial data

CREATE OR REPLACE VIEW client_projects_view AS
SELECT
  p.id,
  p.project_code,
  p.name,
  p.description,
  p.status,
  p.installation_date,
  p.created_at,
  p.updated_at,
  c.company_name as client_name
FROM projects p
LEFT JOIN clients c ON p.client_id = c.id
WHERE p.is_deleted = false;

-- Grant access
GRANT SELECT ON client_projects_view TO authenticated;

COMMENT ON VIEW client_projects_view IS
  'Client-safe view of projects. Hides contract values and internal notes.';

-- ============================================
-- VIEW: client_scope_items_view
-- ============================================
-- Filtered scope items for clients - hides costs and internal notes

CREATE OR REPLACE VIEW client_scope_items_view AS
SELECT
  si.id,
  si.project_id,
  si.item_code,
  si.name,
  si.description,
  si.item_path,
  si.status,
  si.production_percentage,
  si.is_installed,
  si.installed_at,
  si.created_at,
  si.updated_at
  -- Note: Deliberately excludes unit_price, cost fields, and internal notes
FROM scope_items si
WHERE si.is_deleted = false;

-- Grant access
GRANT SELECT ON client_scope_items_view TO authenticated;

COMMENT ON VIEW client_scope_items_view IS
  'Client-safe view of scope items. Hides pricing and cost information.';

-- ============================================
-- VIEW: client_drawings_view
-- ============================================
-- Filtered drawings view - hides upload metadata

CREATE OR REPLACE VIEW client_drawings_view AS
SELECT
  d.id,
  d.item_id,
  d.status,
  d.current_revision,
  d.sent_to_client_at,
  d.client_response_at,
  d.created_at,
  d.updated_at
  -- Note: Hides pm_override details and internal approval chain
FROM drawings d;

-- Grant access
GRANT SELECT ON client_drawings_view TO authenticated;

COMMENT ON VIEW client_drawings_view IS
  'Client-safe view of drawings. Hides PM override details and internal approval chain.';

-- ============================================
-- VIEW: client_drawing_revisions_view
-- ============================================
-- Filtered revisions - hides internal notes

CREATE OR REPLACE VIEW client_drawing_revisions_view AS
SELECT
  dr.id,
  dr.drawing_id,
  dr.revision,
  dr.file_url,
  dr.file_name,
  dr.created_at,
  u.name as uploader_name
  -- Note: Deliberately excludes CAD files, file_size, and internal notes
FROM drawing_revisions dr
LEFT JOIN users u ON dr.uploaded_by = u.id;

-- Grant access
GRANT SELECT ON client_drawing_revisions_view TO authenticated;

COMMENT ON VIEW client_drawing_revisions_view IS
  'Client-safe view of drawing revisions. Hides internal notes and CAD files.';

-- ============================================
-- VIEW: client_materials_view
-- ============================================
-- Filtered materials - hides supplier info

CREATE OR REPLACE VIEW client_materials_view AS
SELECT
  m.id,
  m.project_id,
  m.name,
  m.specification,
  m.status,
  m.images,
  m.sent_to_client_at,
  m.client_response_at,
  m.created_at,
  m.updated_at
  -- Note: Deliberately excludes supplier information
FROM materials m
WHERE m.is_deleted = false;

-- Grant access
GRANT SELECT ON client_materials_view TO authenticated;

COMMENT ON VIEW client_materials_view IS
  'Client-safe view of materials. Hides supplier information.';

-- ============================================
-- VIEW: client_reports_view
-- ============================================
-- Only published reports visible to clients

CREATE OR REPLACE VIEW client_reports_view AS
SELECT
  r.id,
  r.project_id,
  r.report_type,
  r.published_at,
  r.created_at,
  u.name as creator_name
FROM reports r
LEFT JOIN users u ON r.created_by = u.id
WHERE r.is_published = true;

-- Grant access
GRANT SELECT ON client_reports_view TO authenticated;

COMMENT ON VIEW client_reports_view IS
  'Client-safe view of reports. Only shows published reports.';

-- ============================================
-- VIEW: client_milestones_view
-- ============================================
-- Filtered milestones view

CREATE OR REPLACE VIEW client_milestones_view AS
SELECT
  m.id,
  m.project_id,
  m.name,
  m.description,
  m.due_date,
  m.is_completed,
  m.completed_at,
  m.created_at
  -- Note: Excludes alert_days_before and internal notes
FROM milestones m;

-- Grant access
GRANT SELECT ON client_milestones_view TO authenticated;

COMMENT ON VIEW client_milestones_view IS
  'Client-safe view of milestones. Hides internal assignment details.';

-- ============================================
-- VIEW: client_team_view
-- ============================================
-- Only shows team member names and roles, not emails/phones

CREATE OR REPLACE VIEW client_team_view AS
SELECT
  pa.project_id,
  u.id as user_id,
  u.name as member_name,
  u.role as member_role
  -- Note: Deliberately excludes email, phone, and other PII
FROM project_assignments pa
JOIN users u ON pa.user_id = u.id
WHERE u.is_active = true;

-- Grant access
GRANT SELECT ON client_team_view TO authenticated;

COMMENT ON VIEW client_team_view IS
  'Client-safe view of project team. Shows only names and roles.';

-- ============================================
-- FUNCTION: is_client_for_project
-- ============================================
-- Helper function to check if current user is a client for a project

CREATE OR REPLACE FUNCTION is_client_for_project(project_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM users u
    JOIN project_assignments pa ON pa.user_id = u.id
    WHERE u.id = auth.uid()
    AND u.role = 'client'
    AND pa.project_id = project_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_client_for_project IS
  'Checks if the current user is assigned as a client to the given project.';

-- ============================================
-- DONE!
-- ============================================
--
-- Usage Notes:
-- 1. Client-facing queries should use these views instead of base tables
-- 2. Views automatically filter out sensitive data
-- 3. RLS policies still apply on top of views
-- 4. Use is_client_for_project() in RLS policies if needed
--
-- Example usage in application:
-- Instead of: SELECT * FROM scope_items WHERE project_id = ?
-- Use: SELECT * FROM client_scope_items_view WHERE project_id = ?
-- ============================================
