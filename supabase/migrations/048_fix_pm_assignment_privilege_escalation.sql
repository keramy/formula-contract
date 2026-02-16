-- ============================================
-- Fix PM Self-Assignment Privilege Escalation
-- ============================================
--
-- Finding: Shannon AI pentest (Feb 2026) discovered that
-- any PM can assign themselves to ANY project via the
-- assignUserToProject() flow. Migration 019 only checks
-- role ('admin' or 'pm'), not project membership.
--
-- Impact: Unauthorized access to project data, financials,
-- drawings, and client communications.
--
-- Fix: Add is_assigned_to_project() check so PMs can only
-- manage assignments for projects they're already assigned to.
-- Admins retain full access. This follows the same pattern
-- used by scope_items, drawings, and materials RLS policies.
--
-- Behavioral change: PMs can no longer self-assign to new
-- projects. An admin must assign them first, then they can
-- manage that project's team members.
-- ============================================

BEGIN;

-- Fix INSERT policy: PM must already be assigned to the target project
DROP POLICY IF EXISTS "Insert assignments" ON public.project_assignments;
CREATE POLICY "Insert assignments" ON public.project_assignments
  FOR INSERT
  WITH CHECK (
    get_user_role() = 'admin'
    OR
    (get_user_role() = 'pm' AND is_assigned_to_project(project_id))
  );

-- Fix UPDATE policy for consistency
DROP POLICY IF EXISTS "Update assignments" ON public.project_assignments;
CREATE POLICY "Update assignments" ON public.project_assignments
  FOR UPDATE
  USING (
    get_user_role() = 'admin'
    OR
    (get_user_role() = 'pm' AND is_assigned_to_project(project_id))
  );

-- Fix DELETE policy for consistency
DROP POLICY IF EXISTS "Delete assignments" ON public.project_assignments;
CREATE POLICY "Delete assignments" ON public.project_assignments
  FOR DELETE
  USING (
    get_user_role() = 'admin'
    OR
    (get_user_role() = 'pm' AND is_assigned_to_project(project_id))
  );

COMMIT;

-- ============================================
-- Verification
-- ============================================
-- 1. PM assigned to Project A tries to add user to Project A → ALLOWED
-- 2. PM assigned to Project A tries to add themselves to Project B → BLOCKED
-- 3. Admin can add any user to any project → ALLOWED (unchanged)
-- ============================================
