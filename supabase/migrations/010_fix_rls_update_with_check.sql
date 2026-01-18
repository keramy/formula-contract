-- Migration: Fix RLS UPDATE policies with explicit WITH CHECK
--
-- Problem: UPDATE policies use USING clause as implicit WITH CHECK.
-- This causes "new row violates row-level security policy" errors
-- during soft deletes because the updated row must still satisfy
-- the USING condition.
--
-- Solution: Add explicit WITH CHECK (true) to allow any values
-- after update, while still controlling WHO can update via USING.

-- Fix scope_items UPDATE policy
DROP POLICY IF EXISTS "Update scope items" ON public.scope_items;

CREATE POLICY "Update scope items" ON public.scope_items
  FOR UPDATE
  USING (get_user_role() IN ('admin', 'pm') AND is_assigned_to_project(project_id))
  WITH CHECK (true);

-- Also fix other tables that might have similar issues with soft delete

-- clients
DROP POLICY IF EXISTS "Update clients" ON public.clients;
CREATE POLICY "Update clients" ON public.clients
  FOR UPDATE
  USING (get_user_role() IN ('admin', 'pm'))
  WITH CHECK (true);

-- materials
DROP POLICY IF EXISTS "Update materials" ON public.materials;
CREATE POLICY "Update materials" ON public.materials
  FOR UPDATE
  USING (get_user_role() IN ('admin', 'pm'))
  WITH CHECK (true);

-- snagging
DROP POLICY IF EXISTS "Update snagging" ON public.snagging;
CREATE POLICY "Update snagging" ON public.snagging
  FOR UPDATE
  USING (get_user_role() IN ('admin', 'pm', 'production'))
  WITH CHECK (true);
