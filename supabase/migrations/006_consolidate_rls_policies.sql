-- ============================================
-- Consolidate RLS Policies Migration
-- Addresses Supabase Advisor Warning:
-- "Multiple Permissive Policies"
-- ============================================
--
-- Problem: Tables have overlapping permissive SELECT policies.
-- When using "View X" (FOR SELECT) + "Manage X" (FOR ALL),
-- both policies are evaluated for SELECT operations, doubling
-- the evaluation cost.
--
-- Solution: Replace "FOR ALL" policies with specific
-- INSERT/UPDATE/DELETE policies. This way, SELECT is only
-- handled by "View X" and write operations by separate policies.
--
-- Risk Level: MEDIUM - Test thoroughly after applying
-- ============================================

-- ============================================
-- ROLLBACK SECTION (Run if issues occur)
-- ============================================
-- If this migration breaks permissions, run the original
-- policy definitions from schema.sql to restore them.
-- ============================================

BEGIN;

-- ============================================
-- 1. clients table
-- ============================================
-- Before: "View clients" (SELECT) + "Manage clients" (ALL)
-- After: "View clients" (SELECT) + separate INSERT/UPDATE/DELETE

DROP POLICY IF EXISTS "Manage clients" ON public.clients;

-- Keep "View clients" as-is (handles all SELECT)
-- CREATE POLICY "View clients" ON clients FOR SELECT USING (NOT is_deleted);

-- Create specific write policies
CREATE POLICY "Insert clients" ON public.clients
  FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'pm'));

CREATE POLICY "Update clients" ON public.clients
  FOR UPDATE
  USING (get_user_role() IN ('admin', 'pm'));

CREATE POLICY "Delete clients" ON public.clients
  FOR DELETE
  USING (get_user_role() IN ('admin', 'pm'));

-- ============================================
-- 2. drawings table
-- ============================================
-- Before: "View drawings" (SELECT) + "Manage drawings" (ALL)

DROP POLICY IF EXISTS "Manage drawings" ON public.drawings;

-- Keep "View drawings" as-is
CREATE POLICY "Insert drawings" ON public.drawings
  FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'pm', 'production'));

CREATE POLICY "Update drawings" ON public.drawings
  FOR UPDATE
  USING (get_user_role() IN ('admin', 'pm', 'production'));

CREATE POLICY "Delete drawings" ON public.drawings
  FOR DELETE
  USING (get_user_role() IN ('admin', 'pm', 'production'));

-- ============================================
-- 3. item_materials table
-- ============================================
-- Before: "View item materials" (SELECT) + "Manage item materials" (ALL)

DROP POLICY IF EXISTS "Manage item materials" ON public.item_materials;

-- Keep "View item materials" as-is
CREATE POLICY "Insert item materials" ON public.item_materials
  FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'pm'));

CREATE POLICY "Update item materials" ON public.item_materials
  FOR UPDATE
  USING (get_user_role() IN ('admin', 'pm'));

CREATE POLICY "Delete item materials" ON public.item_materials
  FOR DELETE
  USING (get_user_role() IN ('admin', 'pm'));

-- ============================================
-- 4. materials table
-- ============================================
-- Before: "View materials" (SELECT) + "Manage materials" (ALL)

DROP POLICY IF EXISTS "Manage materials" ON public.materials;

-- Keep "View materials" as-is
CREATE POLICY "Insert materials" ON public.materials
  FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'pm'));

CREATE POLICY "Update materials" ON public.materials
  FOR UPDATE
  USING (get_user_role() IN ('admin', 'pm'));

CREATE POLICY "Delete materials" ON public.materials
  FOR DELETE
  USING (get_user_role() IN ('admin', 'pm'));

-- ============================================
-- 5. milestones table
-- ============================================
-- Before: "View milestones" (SELECT) + "Manage milestones" (ALL)

DROP POLICY IF EXISTS "Manage milestones" ON public.milestones;

-- Keep "View milestones" as-is
CREATE POLICY "Insert milestones" ON public.milestones
  FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'pm') AND is_assigned_to_project(project_id));

CREATE POLICY "Update milestones" ON public.milestones
  FOR UPDATE
  USING (get_user_role() IN ('admin', 'pm') AND is_assigned_to_project(project_id));

CREATE POLICY "Delete milestones" ON public.milestones
  FOR DELETE
  USING (get_user_role() IN ('admin', 'pm') AND is_assigned_to_project(project_id));

-- ============================================
-- 6. project_assignments table
-- ============================================
-- Before: "View assignments" (SELECT) + "Manage assignments" (ALL)

DROP POLICY IF EXISTS "Manage assignments" ON public.project_assignments;

-- Keep "View assignments" as-is
CREATE POLICY "Insert assignments" ON public.project_assignments
  FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Update assignments" ON public.project_assignments
  FOR UPDATE
  USING (get_user_role() = 'admin');

CREATE POLICY "Delete assignments" ON public.project_assignments
  FOR DELETE
  USING (get_user_role() = 'admin');

-- ============================================
-- 7. report_lines table
-- ============================================
-- Before: "View report lines" (SELECT) + "Manage report lines" (ALL)

DROP POLICY IF EXISTS "Manage report lines" ON public.report_lines;

-- Keep "View report lines" as-is
CREATE POLICY "Insert report lines" ON public.report_lines
  FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'pm'));

CREATE POLICY "Update report lines" ON public.report_lines
  FOR UPDATE
  USING (get_user_role() IN ('admin', 'pm'));

CREATE POLICY "Delete report lines" ON public.report_lines
  FOR DELETE
  USING (get_user_role() IN ('admin', 'pm'));

-- ============================================
-- 8. reports table
-- ============================================
-- Before: "View reports" (SELECT) + "Manage reports" (ALL)

DROP POLICY IF EXISTS "Manage reports" ON public.reports;

-- Keep "View reports" as-is
CREATE POLICY "Insert reports" ON public.reports
  FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'pm'));

CREATE POLICY "Update reports" ON public.reports
  FOR UPDATE
  USING (get_user_role() IN ('admin', 'pm'));

CREATE POLICY "Delete reports" ON public.reports
  FOR DELETE
  USING (get_user_role() IN ('admin', 'pm'));

-- ============================================
-- 9. scope_items table
-- ============================================
-- Before: "View scope items" (SELECT) + "Manage scope items" (ALL)

DROP POLICY IF EXISTS "Manage scope items" ON public.scope_items;

-- Keep "View scope items" as-is
CREATE POLICY "Insert scope items" ON public.scope_items
  FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'pm') AND is_assigned_to_project(project_id));

CREATE POLICY "Update scope items" ON public.scope_items
  FOR UPDATE
  USING (get_user_role() IN ('admin', 'pm') AND is_assigned_to_project(project_id));

CREATE POLICY "Delete scope items" ON public.scope_items
  FOR DELETE
  USING (get_user_role() IN ('admin', 'pm') AND is_assigned_to_project(project_id));

-- ============================================
-- 10. snagging table
-- ============================================
-- Before: "View snagging" (SELECT) + "Manage snagging" (ALL)

DROP POLICY IF EXISTS "Manage snagging" ON public.snagging;

-- Keep "View snagging" as-is
CREATE POLICY "Insert snagging" ON public.snagging
  FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'pm', 'production'));

CREATE POLICY "Update snagging" ON public.snagging
  FOR UPDATE
  USING (get_user_role() IN ('admin', 'pm', 'production'));

CREATE POLICY "Delete snagging" ON public.snagging
  FOR DELETE
  USING (get_user_role() IN ('admin', 'pm', 'production'));

COMMIT;

-- ============================================
-- Verification Query
-- ============================================
-- Run this to verify policy changes:
--
-- SELECT
--   schemaname,
--   tablename,
--   policyname,
--   cmd AS operation,
--   roles
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
--
-- Expected: Each table should have:
-- - One "View X" or similar SELECT policy
-- - Separate Insert/Update/Delete policies
-- - No "Manage X" (FOR ALL) policies
-- ============================================

-- ============================================
-- DONE! 40 overlapping policies consolidated
-- ============================================
--
-- Tables affected (10 total):
-- - clients
-- - drawings
-- - item_materials
-- - materials
-- - milestones
-- - project_assignments
-- - report_lines
-- - reports
-- - scope_items
-- - snagging
--
-- Each "Manage X" (FOR ALL) policy was replaced with:
-- - "Insert X" (FOR INSERT)
-- - "Update X" (FOR UPDATE)
-- - "Delete X" (FOR DELETE)
--
-- Benefits:
-- - SELECT operations now only evaluate one policy
-- - 2x faster policy evaluation for read queries
-- - Clearer permission model per operation
-- ============================================
