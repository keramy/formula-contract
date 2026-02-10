-- ============================================================================
-- Migration 043: Set client_* views to SECURITY INVOKER
-- Purpose: Ensure client-safe views respect underlying RLS
--
-- Affected views:
-- - client_projects_view
-- - client_scope_items_view
-- - client_drawings_view
-- - client_drawing_revisions_view
-- - client_materials_view
-- - client_milestones_view
-- - client_team_view
-- ============================================================================

-- NOTE: client_reports_view already handled in migration 031

-- ============================================================================
-- client_projects_view
-- ============================================================================
DROP VIEW IF EXISTS public.client_projects_view;
CREATE VIEW public.client_projects_view
WITH (security_invoker = true)
AS
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
FROM public.projects p
LEFT JOIN public.clients c ON p.client_id = c.id
WHERE p.is_deleted = false;

COMMENT ON VIEW public.client_projects_view IS
  'Client-safe view of projects. Hides contract values and internal notes. Security invoker enabled.';
GRANT SELECT ON public.client_projects_view TO authenticated;

-- ============================================================================
-- client_scope_items_view
-- ============================================================================
DROP VIEW IF EXISTS public.client_scope_items_view;
CREATE VIEW public.client_scope_items_view
WITH (security_invoker = true)
AS
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
FROM public.scope_items si
WHERE si.is_deleted = false;

COMMENT ON VIEW public.client_scope_items_view IS
  'Client-safe view of scope items. Hides pricing and cost information. Security invoker enabled.';
GRANT SELECT ON public.client_scope_items_view TO authenticated;

-- ============================================================================
-- client_drawings_view
-- ============================================================================
DROP VIEW IF EXISTS public.client_drawings_view;
CREATE VIEW public.client_drawings_view
WITH (security_invoker = true)
AS
SELECT
  d.id,
  d.item_id,
  d.status,
  d.current_revision,
  d.sent_to_client_at,
  d.client_response_at,
  d.created_at,
  d.updated_at
FROM public.drawings d;

COMMENT ON VIEW public.client_drawings_view IS
  'Client-safe view of drawings. Hides PM override details and internal approval chain. Security invoker enabled.';
GRANT SELECT ON public.client_drawings_view TO authenticated;

-- ============================================================================
-- client_drawing_revisions_view
-- ============================================================================
DROP VIEW IF EXISTS public.client_drawing_revisions_view;
CREATE VIEW public.client_drawing_revisions_view
WITH (security_invoker = true)
AS
SELECT
  dr.id,
  dr.drawing_id,
  dr.revision,
  dr.file_url,
  dr.file_name,
  dr.created_at,
  u.name as uploader_name
FROM public.drawing_revisions dr
LEFT JOIN public.users u ON dr.uploaded_by = u.id;

COMMENT ON VIEW public.client_drawing_revisions_view IS
  'Client-safe view of drawing revisions. Hides internal notes and CAD files. Security invoker enabled.';
GRANT SELECT ON public.client_drawing_revisions_view TO authenticated;

-- ============================================================================
-- client_materials_view
-- ============================================================================
DROP VIEW IF EXISTS public.client_materials_view;
CREATE VIEW public.client_materials_view
WITH (security_invoker = true)
AS
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
FROM public.materials m
WHERE m.is_deleted = false;

COMMENT ON VIEW public.client_materials_view IS
  'Client-safe view of materials. Hides supplier information. Security invoker enabled.';
GRANT SELECT ON public.client_materials_view TO authenticated;

-- ============================================================================
-- client_milestones_view
-- ============================================================================
DROP VIEW IF EXISTS public.client_milestones_view;
CREATE VIEW public.client_milestones_view
WITH (security_invoker = true)
AS
SELECT
  m.id,
  m.project_id,
  m.name,
  m.description,
  m.due_date,
  m.is_completed,
  m.completed_at,
  m.created_at
FROM public.milestones m;

COMMENT ON VIEW public.client_milestones_view IS
  'Client-safe view of milestones. Hides internal assignment details. Security invoker enabled.';
GRANT SELECT ON public.client_milestones_view TO authenticated;

-- ============================================================================
-- client_team_view
-- ============================================================================
DROP VIEW IF EXISTS public.client_team_view;
CREATE VIEW public.client_team_view
WITH (security_invoker = true)
AS
SELECT
  pa.project_id,
  u.id as user_id,
  u.name as member_name,
  u.role as member_role
FROM public.project_assignments pa
JOIN public.users u ON pa.user_id = u.id
WHERE u.is_active = true;

COMMENT ON VIEW public.client_team_view IS
  'Client-safe view of project team. Shows only names and roles. Security invoker enabled.';
GRANT SELECT ON public.client_team_view TO authenticated;

-- ============================================================================
-- DONE
-- ============================================================================
