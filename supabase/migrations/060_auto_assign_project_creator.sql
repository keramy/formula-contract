-- ============================================
-- Auto-Assign Project Creator
-- ============================================
--
-- Problem: When a PM creates a project, they need to be assigned
-- to it. But the RLS INSERT policy on project_assignments (migration
-- 048) requires is_assigned_to_project() — which fails because
-- the PM isn't assigned yet. Chicken-and-egg.
--
-- Solution: AFTER INSERT trigger on projects that auto-inserts
-- the creator into project_assignments. The trigger function
-- runs as SECURITY DEFINER, so it bypasses RLS entirely.
-- No changes to existing RLS policies.
--
-- Requires: projects.created_by to be set on INSERT.
-- The project wizard passes auth.uid() as created_by.
--
-- Safety:
--   - SECURITY DEFINER: bypasses RLS (no recursion risk)
--   - SET search_path = public: prevents schema injection
--   - Only fires when created_by IS NOT NULL
--   - Duplicate-safe: uses ON CONFLICT DO NOTHING
-- ============================================

BEGIN;

-- Function: auto-assign creator to their new project
CREATE OR REPLACE FUNCTION public.auto_assign_project_creator()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only assign if created_by is set
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.project_assignments (project_id, user_id, assigned_by)
    VALUES (NEW.id, NEW.created_by, NEW.created_by)
    ON CONFLICT (project_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger: fires after each project insert
DROP TRIGGER IF EXISTS trigger_auto_assign_project_creator ON public.projects;
CREATE TRIGGER trigger_auto_assign_project_creator
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_project_creator();

COMMIT;

-- ============================================
-- Verification
-- ============================================
-- 1. PM creates project with created_by = their user ID
--    → project_assignments row auto-created (trigger, SECURITY DEFINER)
--    → PM can now see and manage the project
-- 2. PM creates project without created_by (legacy)
--    → No assignment created (IF NULL guard)
-- 3. Admin creates project
--    → Same behavior, admin auto-assigned
-- 4. Duplicate protection
--    → ON CONFLICT DO NOTHING prevents errors if assigned twice
-- ============================================
