-- ============================================
-- Fix Remaining Advisor Issues Migration
-- Follow-up to address newly discovered issues
-- ============================================
--
-- This migration fixes:
-- 1. is_admin() function - missing search_path
-- 2. report_shares policies - auth.uid() not wrapped
-- 3. users "Users can view users" policy - auth.uid() not wrapped
-- ============================================

-- ============================================
-- 1. Fix is_admin() function
-- ============================================
-- Add SET search_path = public to prevent schema injection

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

COMMENT ON FUNCTION public.is_admin() IS
  'Checks if the current user has admin role. SECURITY DEFINER for RLS usage. Search path secured.';

-- ============================================
-- 2. Fix report_shares policies
-- ============================================
-- Wrap auth.uid() in subselect for InitPlan optimization

-- Fix INSERT policy
DROP POLICY IF EXISTS "Admins and PMs can insert shares" ON public.report_shares;
CREATE POLICY "Admins and PMs can insert shares" ON public.report_shares
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role IN ('admin', 'pm')
    )
  );

-- Fix DELETE policy
DROP POLICY IF EXISTS "Admins and PMs can delete shares" ON public.report_shares;
CREATE POLICY "Admins and PMs can delete shares" ON public.report_shares
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role IN ('admin', 'pm')
    )
  );

-- Note: "Users can view report shares" uses USING (true) which is fine for SELECT

-- ============================================
-- 3. Fix users "Users can view users" policy
-- ============================================
-- Wrap auth.uid() and is_admin() in subselects

DROP POLICY IF EXISTS "Users can view users" ON public.users;
CREATE POLICY "Users can view users" ON public.users
  FOR SELECT
  USING (
    (SELECT is_admin())
    OR is_active = true
    OR id = (SELECT auth.uid())
  );

-- ============================================
-- Verification
-- ============================================
-- Run the Supabase Advisor again to confirm:
-- - is_admin should no longer show "Function Search Path Mutable"
-- - report_shares should no longer show "Auth RLS Initialization Plan"
-- - users should no longer show "Auth RLS Initialization Plan"
-- ============================================

-- ============================================
-- DONE! 3 remaining issues fixed
-- ============================================
