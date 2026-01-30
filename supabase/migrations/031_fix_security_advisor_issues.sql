-- ============================================================================
-- Migration 031: Fix Security Advisor Issues
--
-- Addresses 8 ERRORS and several WARNINGS from Supabase Security Advisor:
-- 1. SECURITY DEFINER Views → Convert to SECURITY INVOKER
-- 2. Function Search Path → Add SET search_path = public
--
-- Note: WITH CHECK (true) warnings are intentional - they allow authorized
-- users to update any column values after the USING check passes.
-- ============================================================================

-- ============================================================================
-- PART 1: Fix Function Search Paths
-- ============================================================================
-- Fix generate_slug and set_project_slug from migration 015

-- 1. Fix generate_slug function
CREATE OR REPLACE FUNCTION public.generate_slug(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        TRIM(input_text),
        '[^a-zA-Z0-9\s-]', '', 'g'  -- Remove special characters
      ),
      '\s+', '-', 'g'  -- Replace spaces with hyphens
    )
  );
END;
$$;

COMMENT ON FUNCTION public.generate_slug(TEXT) IS
  'Generates URL-friendly slugs from text. Search path secured.';

-- 2. Fix set_project_slug function
CREATE OR REPLACE FUNCTION public.set_project_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Generate base slug from name
  base_slug := public.generate_slug(NEW.name);
  final_slug := base_slug;

  -- Check for duplicates and append number if needed
  WHILE EXISTS (SELECT 1 FROM public.projects WHERE slug = final_slug AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  NEW.slug := final_slug;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_project_slug() IS
  'Trigger function to auto-generate project slugs. Search path secured.';

-- ============================================================================
-- PART 2: Fix SECURITY DEFINER Views
-- ============================================================================
-- Recreate all admin views with security_invoker = true
-- This ensures views respect RLS policies of the underlying tables

-- 2.1 Fix v_report_lines
DROP VIEW IF EXISTS public.v_report_lines;
CREATE VIEW public.v_report_lines
WITH (security_invoker = true)
AS
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
FROM public.report_lines rl
JOIN public.reports r ON rl.report_id = r.id
JOIN public.projects p ON r.project_id = p.id
ORDER BY rl.created_at DESC;

COMMENT ON VIEW public.v_report_lines IS 'Human-readable view of report lines with project/report context. Security invoker enabled.';
GRANT SELECT ON public.v_report_lines TO authenticated;

-- 2.2 Fix v_notifications
DROP VIEW IF EXISTS public.v_notifications;
CREATE VIEW public.v_notifications
WITH (security_invoker = true)
AS
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
FROM public.notifications n
LEFT JOIN public.users u ON n.user_id = u.id
LEFT JOIN public.projects p ON n.project_id = p.id
LEFT JOIN public.reports r ON n.report_id = r.id
ORDER BY n.created_at DESC;

COMMENT ON VIEW public.v_notifications IS 'Human-readable view of notifications with user and project context. Security invoker enabled.';
GRANT SELECT ON public.v_notifications TO authenticated;

-- 2.3 Fix v_activity_logs
DROP VIEW IF EXISTS public.v_activity_logs;
CREATE VIEW public.v_activity_logs
WITH (security_invoker = true)
AS
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
FROM public.activity_log al
LEFT JOIN public.users u ON al.user_id = u.id
LEFT JOIN public.projects p ON al.project_id = p.id
ORDER BY al.created_at DESC;

COMMENT ON VIEW public.v_activity_logs IS 'Human-readable view of activity logs with user and project context. Security invoker enabled.';
GRANT SELECT ON public.v_activity_logs TO authenticated;

-- 2.4 Fix v_project_assignments
DROP VIEW IF EXISTS public.v_project_assignments;
CREATE VIEW public.v_project_assignments
WITH (security_invoker = true)
AS
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
FROM public.project_assignments pa
JOIN public.projects p ON pa.project_id = p.id
JOIN public.users u ON pa.user_id = u.id
LEFT JOIN public.users assigner ON pa.assigned_by = assigner.id
ORDER BY p.project_code, u.name;

COMMENT ON VIEW public.v_project_assignments IS 'Human-readable view of project team assignments. Security invoker enabled.';
GRANT SELECT ON public.v_project_assignments TO authenticated;

-- 2.5 Fix v_reports
DROP VIEW IF EXISTS public.v_reports;
CREATE VIEW public.v_reports
WITH (security_invoker = true)
AS
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
  (SELECT COUNT(*) FROM public.report_lines WHERE report_id = r.id) AS line_count,
  r.published_at,
  r.created_at,
  r.updated_at
FROM public.reports r
JOIN public.projects p ON r.project_id = p.id
LEFT JOIN public.users c ON r.created_by = c.id
ORDER BY r.created_at DESC;

COMMENT ON VIEW public.v_reports IS 'Human-readable view of reports with project and creator context. Security invoker enabled.';
GRANT SELECT ON public.v_reports TO authenticated;

-- 2.6 Fix v_clients
DROP VIEW IF EXISTS public.v_clients;
CREATE VIEW public.v_clients
WITH (security_invoker = true)
AS
SELECT
  c.id,
  COALESCE(c.client_code, 'CLT-???') AS client_code,
  c.company_name,
  c.contact_person,
  c.email,
  c.phone,
  (SELECT COUNT(*) FROM public.projects WHERE client_id = c.id AND is_deleted = false) AS project_count,
  c.created_at
FROM public.clients c
WHERE c.is_deleted = false
ORDER BY c.company_name;

COMMENT ON VIEW public.v_clients IS 'Human-readable view of clients with project counts. Security invoker enabled.';
GRANT SELECT ON public.v_clients TO authenticated;

-- 2.7 Fix v_users
DROP VIEW IF EXISTS public.v_users;
CREATE VIEW public.v_users
WITH (security_invoker = true)
AS
SELECT
  u.id,
  COALESCE(u.employee_code, 'EMP-???') AS employee_code,
  u.name,
  u.email,
  u.role,
  u.is_active,
  (SELECT COUNT(*) FROM public.project_assignments WHERE user_id = u.id) AS assigned_projects,
  u.last_login_at,
  u.last_active_at,
  u.created_at
FROM public.users u
ORDER BY u.name;

COMMENT ON VIEW public.v_users IS 'Human-readable view of users with assignment counts. Security invoker enabled.';
GRANT SELECT ON public.v_users TO authenticated;

-- 2.8 Fix client_reports_view
DROP VIEW IF EXISTS public.client_reports_view;
CREATE VIEW public.client_reports_view
WITH (security_invoker = true)
AS
SELECT
  r.id,
  r.project_id,
  r.report_type,
  r.report_code,
  r.published_at,
  r.created_at,
  u.name AS creator_name
FROM public.reports r
LEFT JOIN public.users u ON r.created_by = u.id
WHERE r.is_published = true
  AND r.share_with_client = true;

COMMENT ON VIEW public.client_reports_view IS 'Client-safe view of reports. Only shows published reports with share_with_client=true. Security invoker enabled.';
GRANT SELECT ON public.client_reports_view TO authenticated;

-- ============================================================================
-- PART 3: Notes on Intentional Warnings
-- ============================================================================
-- The following WITH CHECK (true) policies are INTENTIONAL:
--
-- 1. activity_log INSERT: Logging should be unrestricted for system operation
-- 2. clients UPDATE: Admin/PM who pass USING check can update any fields
-- 3. materials UPDATE: Admin/PM who pass USING check can update any fields
-- 4. notifications INSERT: Authenticated users need to create notifications
-- 5. scope_items UPDATE: Admin/PM who pass USING check can update any fields
-- 6. snagging UPDATE: Authorized users who pass USING check can update any fields
--
-- The USING clause controls WHO can perform the operation.
-- WITH CHECK (true) allows them to set ANY values once authorized.
-- This is the correct pattern for our application.
-- ============================================================================

-- ============================================================================
-- PART 4: Additional Security Recommendation
-- ============================================================================
-- Enable "Leaked Password Protection" in Supabase Dashboard:
-- Project Settings → Auth → Password Settings → Enable "Protect against leaked passwords"
-- This checks passwords against HaveIBeenPwned.org database.
-- ============================================================================

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this to verify security_invoker is set on views:
--
-- SELECT
--   c.relname as view_name,
--   CASE WHEN c.reloptions @> ARRAY['security_invoker=true']
--        THEN 'SECURITY INVOKER'
--        ELSE 'SECURITY DEFINER'
--   END as security_mode
-- FROM pg_class c
-- JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'public'
-- AND c.relkind = 'v'
-- AND c.relname LIKE 'v_%' OR c.relname = 'client_reports_view';
-- ============================================================================
