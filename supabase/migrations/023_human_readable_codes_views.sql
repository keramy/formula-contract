-- ============================================================================
-- Migration 023: Admin Views for Human-Readable Data
--
-- Creates views that join tables and display human-readable codes,
-- making it easy to debug and understand data in Supabase Studio.
--
-- Views:
-- - v_report_lines: Report lines with context
-- - v_notifications: Notifications with user/project info
-- - v_activity_logs: Activity logs with readable context
-- - v_project_assignments: Team assignments with names
-- - v_reports: Reports with full context
-- - v_clients: Clients with project counts
-- - v_users: Users with assignment counts
-- ============================================================================

-- 1. Readable report lines view
CREATE OR REPLACE VIEW v_report_lines AS
SELECT
  rl.id,
  COALESCE(r.report_code, 'RPT-???') AS report_code,
  r.report_type,
  COALESCE(p.project_code, 'PRJ-???') AS project_code,
  p.name AS project_name,
  rl.line_order,
  rl.title,
  LEFT(rl.description, 100) AS description_preview,
  COALESCE(jsonb_array_length(rl.photos), 0) AS photo_count,
  rl.created_at
FROM report_lines rl
JOIN reports r ON rl.report_id = r.id
JOIN projects p ON r.project_id = p.id
ORDER BY rl.created_at DESC;

COMMENT ON VIEW v_report_lines IS 'Human-readable view of report lines with project/report context';

-- 2. Readable notifications view
CREATE OR REPLACE VIEW v_notifications AS
SELECT
  n.id,
  COALESCE(u.employee_code, 'EMP-???') AS employee_code,
  u.name AS user_name,
  u.email,
  n.type,
  n.title,
  LEFT(n.message, 80) AS message_preview,
  COALESCE(p.project_code, '-') AS project_code,
  p.name AS project_name,
  COALESCE(r.report_code, '-') AS report_code,
  n.is_read,
  n.created_at
FROM notifications n
LEFT JOIN users u ON n.user_id = u.id
LEFT JOIN projects p ON n.project_id = p.id
LEFT JOIN reports r ON n.report_id = r.id
ORDER BY n.created_at DESC;

COMMENT ON VIEW v_notifications IS 'Human-readable view of notifications with user and project context';

-- 3. Readable activity logs view
CREATE OR REPLACE VIEW v_activity_logs AS
SELECT
  al.id,
  COALESCE(u.employee_code, 'SYSTEM') AS employee_code,
  COALESCE(u.name, 'System') AS user_name,
  al.action,
  al.entity_type,
  COALESCE(p.project_code, '-') AS project_code,
  p.name AS project_name,
  al.details::TEXT AS details,
  al.created_at
FROM activity_log al
LEFT JOIN users u ON al.user_id = u.id
LEFT JOIN projects p ON al.project_id = p.id
ORDER BY al.created_at DESC;

COMMENT ON VIEW v_activity_logs IS 'Human-readable view of activity logs with user and project context';

-- 4. Readable project assignments view
CREATE OR REPLACE VIEW v_project_assignments AS
SELECT
  pa.id,
  p.project_code,
  p.name AS project_name,
  p.status AS project_status,
  COALESCE(u.employee_code, 'EMP-???') AS employee_code,
  u.name AS user_name,
  u.email,
  u.role AS user_role,
  assigner.name AS assigned_by,
  pa.assigned_at
FROM project_assignments pa
JOIN projects p ON pa.project_id = p.id
JOIN users u ON pa.user_id = u.id
LEFT JOIN users assigner ON pa.assigned_by = assigner.id
ORDER BY p.project_code, u.name;

COMMENT ON VIEW v_project_assignments IS 'Human-readable view of project team assignments';

-- 5. Readable reports view
CREATE OR REPLACE VIEW v_reports AS
SELECT
  r.id,
  COALESCE(r.report_code, 'RPT-???') AS report_code,
  r.report_type,
  p.project_code,
  p.name AS project_name,
  COALESCE(c.employee_code, '-') AS creator_code,
  c.name AS created_by_name,
  r.is_published,
  CASE WHEN r.is_published THEN 'Published' ELSE 'Draft' END AS status,
  r.share_with_client,
  r.share_internal,
  (SELECT COUNT(*) FROM report_lines WHERE report_id = r.id) AS line_count,
  r.published_at,
  r.created_at,
  r.updated_at
FROM reports r
JOIN projects p ON r.project_id = p.id
LEFT JOIN users c ON r.created_by = c.id
ORDER BY r.created_at DESC;

COMMENT ON VIEW v_reports IS 'Human-readable view of reports with project and creator context';

-- 6. Readable clients view
CREATE OR REPLACE VIEW v_clients AS
SELECT
  c.id,
  COALESCE(c.client_code, 'CLT-???') AS client_code,
  c.company_name,
  c.contact_person,
  c.email,
  c.phone,
  (SELECT COUNT(*) FROM projects WHERE client_id = c.id AND is_deleted = false) AS project_count,
  c.created_at
FROM clients c
WHERE c.is_deleted = false
ORDER BY c.company_name;

COMMENT ON VIEW v_clients IS 'Human-readable view of clients with project counts';

-- 7. Readable users view
CREATE OR REPLACE VIEW v_users AS
SELECT
  u.id,
  COALESCE(u.employee_code, 'EMP-???') AS employee_code,
  u.name,
  u.email,
  u.role,
  u.is_active,
  (SELECT COUNT(*) FROM project_assignments WHERE user_id = u.id) AS assigned_projects,
  u.last_login_at,
  u.last_active_at,
  u.created_at
FROM users u
ORDER BY u.name;

COMMENT ON VIEW v_users IS 'Human-readable view of users with assignment counts';

-- 8. Grant access to views (views inherit RLS from base tables)
-- No additional RLS needed as views will respect underlying table policies
