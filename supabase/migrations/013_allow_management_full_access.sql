-- ============================================
-- Allow Management Role Full Project Access
-- ============================================
--
-- Problem: Management users can see project list but not scope items,
-- materials, etc. because they aren't explicitly assigned to projects.
--
-- Solution: Update is_assigned_to_project() to return TRUE for
-- admin and management roles (they should see everything).
--
-- Roles with full access (no assignment needed):
-- - admin: System administrator
-- - management: Company management/executives
--
-- Roles that need project assignment:
-- - pm: Only sees assigned projects
-- - production: Only sees assigned projects
-- - procurement: Only sees assigned projects
-- - client: Only sees assigned projects
-- ============================================

-- ============================================
-- Update is_assigned_to_project() function
-- ============================================
CREATE OR REPLACE FUNCTION public.is_assigned_to_project(project_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get user role from users table
  SELECT role INTO user_role
  FROM users
  WHERE id = auth.uid();

  -- Admin and management can see ALL projects without assignment
  IF user_role IN ('admin', 'management') THEN
    RETURN TRUE;
  END IF;

  -- Other roles need explicit project assignment
  RETURN EXISTS (
    SELECT 1 FROM project_assignments
    WHERE project_id = project_uuid AND user_id = auth.uid()
  );
END;
$$;

COMMENT ON FUNCTION public.is_assigned_to_project(UUID) IS
  'Checks if the current user can access the given project. Admin and management roles have full access. Other roles require explicit assignment.';

-- ============================================
-- Verification
-- ============================================
-- Test as management user:
-- SELECT is_assigned_to_project('some-project-uuid');
-- Should return TRUE even without assignment
-- ============================================
