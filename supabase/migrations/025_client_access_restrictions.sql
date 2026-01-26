-- ============================================================================
-- Migration 025: Client Access Restrictions
--
-- Enforces client-specific access rules at the database level:
-- 1. Reports: Clients can only see published reports shared with them
-- 2. Milestones: Clients cannot see milestones (internal timeline)
-- 3. Scope Items: Client view already excludes costs (002_client_safe_views.sql)
--
-- This provides defense-in-depth alongside application-level checks.
-- ============================================================================

-- ============================================================================
-- 1. UPDATE REPORTS RLS POLICY
-- ============================================================================
-- Drop the existing "View reports" policy and create a client-aware one

DROP POLICY IF EXISTS "View reports" ON public.reports;

CREATE POLICY "View reports" ON public.reports
FOR SELECT
USING (
  is_assigned_to_project(project_id) AND (
    -- Non-clients can see all reports for assigned projects
    get_user_role() != 'client'
    OR
    -- Clients can only see published reports that are shared with them
    (is_published = true AND share_with_client = true)
  )
);

COMMENT ON POLICY "View reports" ON public.reports IS
  'Clients can only see published reports with share_with_client=true. Internal users see all reports for assigned projects.';

-- ============================================================================
-- 2. UPDATE MILESTONES RLS POLICY
-- ============================================================================
-- Drop the existing "View milestones" policy and create a client-restricted one

DROP POLICY IF EXISTS "View milestones" ON public.milestones;

CREATE POLICY "View milestones" ON public.milestones
FOR SELECT
USING (
  is_assigned_to_project(project_id) AND
  -- Clients cannot see milestones at all
  get_user_role() != 'client'
);

COMMENT ON POLICY "View milestones" ON public.milestones IS
  'Milestones are internal only - clients cannot see them.';

-- ============================================================================
-- 3. UPDATE CLIENT REPORTS VIEW
-- ============================================================================
-- Fix the client_reports_view to also check share_with_client

CREATE OR REPLACE VIEW client_reports_view AS
SELECT
  r.id,
  r.project_id,
  r.report_type,
  r.report_code,
  r.published_at,
  r.created_at,
  u.name as creator_name
FROM reports r
LEFT JOIN users u ON r.created_by = u.id
WHERE r.is_published = true
  AND r.share_with_client = true;  -- Added this condition

COMMENT ON VIEW client_reports_view IS
  'Client-safe view of reports. Only shows published reports with share_with_client=true.';

-- ============================================================================
-- 4. VERIFICATION QUERIES (Run these to verify)
-- ============================================================================
--
-- Test as a client user:
-- SELECT * FROM reports WHERE project_id = 'your-project-id';
-- Should only return published reports with share_with_client=true
--
-- SELECT * FROM milestones WHERE project_id = 'your-project-id';
-- Should return empty for client users
--
-- Check policies:
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'reports';
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'milestones';
-- ============================================================================
