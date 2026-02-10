-- ============================================================================
-- Migration 041: Tighten SELECT Policies on Sensitive Tables
-- Purpose: Prevent cross-project data exfiltration
--
-- Affected tables:
-- - report_lines
-- - drawing_revisions
-- - item_materials
-- - project_assignments
-- ============================================================================

BEGIN;

-- ============================================================================
-- report_lines: scope to reports.project_id and client visibility rules
-- ============================================================================

DROP POLICY IF EXISTS "View report lines" ON public.report_lines;

CREATE POLICY "View report lines" ON public.report_lines
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.reports r
    WHERE r.id = report_lines.report_id
      AND is_assigned_to_project(r.project_id)
      AND (
        (SELECT get_user_role()) != 'client'
        OR (r.is_published = true AND r.share_with_client = true)
      )
  )
);

COMMENT ON POLICY "View report lines" ON public.report_lines IS
  'Limits report lines to assigned projects; clients only see published shared reports.';

-- ============================================================================
-- drawing_revisions: scope to scope_items.project_id via drawings
-- ============================================================================

DROP POLICY IF EXISTS "View revisions" ON public.drawing_revisions;

CREATE POLICY "View revisions" ON public.drawing_revisions
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.drawings d
    JOIN public.scope_items si ON si.id = d.item_id
    WHERE d.id = drawing_revisions.drawing_id
      AND si.is_deleted = false
      AND is_assigned_to_project(si.project_id)
  )
);

COMMENT ON POLICY "View revisions" ON public.drawing_revisions IS
  'Limits drawing revisions to assigned projects.';

-- ============================================================================
-- item_materials: scope to scope_items.project_id
-- ============================================================================

DROP POLICY IF EXISTS "View item materials" ON public.item_materials;

CREATE POLICY "View item materials" ON public.item_materials
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.scope_items si
    WHERE si.id = item_materials.item_id
      AND si.is_deleted = false
      AND is_assigned_to_project(si.project_id)
  )
);

COMMENT ON POLICY "View item materials" ON public.item_materials IS
  'Limits item-material links to assigned projects.';

-- ============================================================================
-- project_assignments: restrict clients and scope non-admin roles
-- ============================================================================

DROP POLICY IF EXISTS "View assignments" ON public.project_assignments;

CREATE POLICY "View assignments" ON public.project_assignments
FOR SELECT
USING (
  (SELECT get_user_role()) IN ('admin', 'management')
  OR (
    (SELECT get_user_role()) != 'client'
    AND is_assigned_to_project(project_id)
  )
  OR (
    (SELECT get_user_role()) = 'client'
    AND is_assigned_to_project(project_id)
  )
);

COMMENT ON POLICY "View assignments" ON public.project_assignments IS
  'Admins/management see all; others (including clients) only see assigned projects.';

COMMIT;

-- ============================================================================
-- DONE
-- ============================================================================
