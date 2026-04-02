-- ============================================================================
-- Migration 058: Fix RLS InitPlan for notifications + users
-- Applied live: Apr 2, 2026
-- Issue: Supabase Performance Advisor flagged 3 policies using bare auth.uid()
--        which re-evaluates per-row (O(n)) instead of once (O(1))
-- ============================================================================

-- Fix notifications: queried on every page load, was O(n) per-row
DROP POLICY IF EXISTS "View own notifications" ON notifications;
CREATE POLICY "View own notifications" ON notifications
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Update own notifications" ON notifications;
CREATE POLICY "Update own notifications" ON notifications
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

-- Fix users: profile update policy
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (id = (SELECT auth.uid()));
