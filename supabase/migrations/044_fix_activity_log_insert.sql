-- ============================================================================
-- Migration 044: Enforce Activity Log Insert Integrity
-- Purpose: Prevent spoofed activity logs by requiring user_id match auth.uid()
-- ============================================================================

BEGIN;

-- Drop existing permissive insert policy
DROP POLICY IF EXISTS "Create activity log" ON public.activity_log;

-- Recreate with integrity check
CREATE POLICY "Create activity log" ON public.activity_log
FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

COMMENT ON POLICY "Create activity log" ON public.activity_log IS
  'Only allow inserts where user_id matches auth.uid(). Prevents spoofed logs.';

COMMIT;

-- ============================================================================
-- DONE
-- ============================================================================
