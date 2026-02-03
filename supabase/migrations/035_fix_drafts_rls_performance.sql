-- ============================================================================
-- Migration: Fix Drafts Table RLS Performance
-- Purpose: Wrap auth.uid() in subselect for InitPlan optimization
-- Issue: Migration 012 used bare auth.uid() which is evaluated per-row (slow)
-- Fix: Use (SELECT auth.uid()) which is evaluated once (O(1) vs O(n))
-- ============================================================================

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can manage own drafts" ON drafts;

-- Recreate with optimized auth.uid() pattern
-- The (SELECT auth.uid()) wrapper enables PostgreSQL's InitPlan optimization
CREATE POLICY "Users can manage own drafts"
  ON drafts
  FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Verify the fix by explaining a query:
-- EXPLAIN SELECT * FROM drafts WHERE user_id = (SELECT auth.uid());
-- Should show "InitPlan" indicating single evaluation of auth.uid()
