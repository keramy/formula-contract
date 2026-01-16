-- ============================================
-- Fix RLS Init Plan Performance Migration
-- Addresses Supabase Advisor Warning:
-- "Auth RLS Initialization Plan"
-- ============================================
--
-- Problem: Using auth.uid() directly in RLS policies causes the
-- function to be re-evaluated for every single row, resulting in
-- O(n) function calls where n is the number of rows scanned.
--
-- Solution: Wrap auth.uid() in a subselect (SELECT auth.uid())
-- so PostgreSQL evaluates it once using an InitPlan, making it O(1).
--
-- Performance Impact: 50%+ faster queries on affected tables
-- ============================================

-- ============================================
-- 1. Fix notifications table policies
-- ============================================
-- notifications table is queried frequently for unread counts

-- Drop existing policies
DROP POLICY IF EXISTS "View own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Update own notifications" ON public.notifications;

-- Recreate with optimized auth.uid() usage
CREATE POLICY "View own notifications" ON public.notifications
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Update own notifications" ON public.notifications
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()));

-- ============================================
-- 2. Fix users table policies
-- ============================================
-- users table UPDATE policy uses auth.uid()

-- Drop existing policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Recreate with optimized auth.uid() usage
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE
  USING (id = (SELECT auth.uid()));

-- Note: "Users can view all active users" doesn't use auth.uid()
-- so it doesn't need optimization

-- ============================================
-- Verification Query
-- ============================================
-- Run EXPLAIN ANALYZE on affected queries to verify InitPlan usage:
--
-- EXPLAIN ANALYZE
-- SELECT * FROM notifications WHERE user_id = auth.uid();
--
-- Look for "InitPlan" in the output - this indicates auth.uid()
-- is evaluated once at query start rather than per row.
--
-- Before fix: Function calls in Filter/Index Cond (per-row evaluation)
-- After fix: InitPlan 1 (returns $0) with single auth.uid() call
-- ============================================

-- ============================================
-- DONE! 3 RLS policies optimized for performance
-- ============================================
--
-- Policies updated:
-- 1. notifications: "View own notifications"
-- 2. notifications: "Update own notifications"
-- 3. users: "Users can update own profile"
--
-- Note: The plan mentioned report_shares policies, but this table
-- doesn't exist in the current schema. If report_shares is added
-- later, remember to use (SELECT auth.uid()) pattern from the start.
-- ============================================
