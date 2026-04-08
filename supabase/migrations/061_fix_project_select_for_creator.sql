-- ============================================
-- Fix Project SELECT Policy for Creator
-- ============================================
--
-- Problem: PM creates a project via .insert().select("id").
-- INSERT policy allows PM. But the RETURNING clause evaluates
-- against the SELECT policy, which requires admin/management
-- OR is_assigned_to_project(). The AFTER INSERT trigger
-- (migration 060) auto-assigns the creator, but the assignment
-- isn't visible within the same transaction for the RETURNING.
--
-- Fix: Add `created_by = auth.uid()` to the SELECT policy so
-- the creator can always see their own project immediately.
-- ============================================

DROP POLICY IF EXISTS "View assigned projects" ON public.projects;
CREATE POLICY "View assigned projects" ON public.projects
  FOR SELECT
  USING (
    (NOT is_deleted) AND (
      (SELECT get_user_role()) = ANY (ARRAY['admin'::user_role, 'management'::user_role])
      OR is_assigned_to_project(id)
      OR created_by = (SELECT auth.uid())
    )
  );
