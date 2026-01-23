-- ============================================
-- Allow PM Role to Manage Project Assignments
-- ============================================
--
-- Problem: Only admin can assign users to projects.
-- PMs get RLS violation when trying to assign team members.
--
-- Solution: Update project_assignments policies to allow
-- both admin AND pm roles to INSERT, UPDATE, DELETE.
-- ============================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Insert assignments" ON public.project_assignments;
DROP POLICY IF EXISTS "Update assignments" ON public.project_assignments;
DROP POLICY IF EXISTS "Delete assignments" ON public.project_assignments;

-- Recreate with admin OR pm access
CREATE POLICY "Insert assignments" ON public.project_assignments
  FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'pm'));

CREATE POLICY "Update assignments" ON public.project_assignments
  FOR UPDATE
  USING (get_user_role() IN ('admin', 'pm'));

CREATE POLICY "Delete assignments" ON public.project_assignments
  FOR DELETE
  USING (get_user_role() IN ('admin', 'pm'));

-- ============================================
-- Verification
-- ============================================
-- As PM user, try:
-- INSERT INTO project_assignments (project_id, user_id, assigned_by)
-- VALUES ('project-uuid', 'user-uuid', auth.uid());
-- Should succeed now.
-- ============================================
