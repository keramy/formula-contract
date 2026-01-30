-- Migration 030: Fix materials UPDATE policy for soft delete
--
-- Problem: "new row violates row-level security policy for table materials"
-- when trying to soft delete (UPDATE ... SET is_deleted = true)
--
-- The "Manage materials" FOR ALL policy doesn't have WITH CHECK (true),
-- causing the updated row to fail validation.
--
-- Solution: Drop the FOR ALL policy and create separate policies with
-- explicit WITH CHECK (true) for INSERT and UPDATE operations.

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Manage materials" ON public.materials;
DROP POLICY IF EXISTS "Update materials" ON public.materials;
DROP POLICY IF EXISTS "Insert materials" ON public.materials;
DROP POLICY IF EXISTS "Delete materials" ON public.materials;

-- Recreate with explicit WITH CHECK for write operations
CREATE POLICY "Insert materials" ON public.materials
  FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'pm'));

CREATE POLICY "Update materials" ON public.materials
  FOR UPDATE
  USING (get_user_role() IN ('admin', 'pm'))
  WITH CHECK (true);  -- Allow any values after update (including is_deleted = true)

CREATE POLICY "Delete materials" ON public.materials
  FOR DELETE
  USING (get_user_role() IN ('admin', 'pm'));

-- View policy should already exist, but ensure it's correct
DROP POLICY IF EXISTS "View materials" ON public.materials;
CREATE POLICY "View materials" ON public.materials
  FOR SELECT
  USING (NOT is_deleted AND is_assigned_to_project(project_id));
