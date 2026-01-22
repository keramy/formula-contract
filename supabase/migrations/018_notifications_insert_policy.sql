-- Migration: Add INSERT policy for notifications table
-- Problem: Server actions can't create notifications for other users due to missing INSERT policy
-- Solution: Allow authenticated users to insert notifications

-- Drop existing policy if any (just in case)
DROP POLICY IF EXISTS "Insert notifications" ON notifications;

-- Allow any authenticated user to create notifications
-- This is needed because:
-- 1. User A creates a milestone → needs to notify User B
-- 2. User A assigns User B to project → needs to notify User B
-- 3. User A publishes a report → needs to notify all team members
CREATE POLICY "Insert notifications"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add a comment explaining the policy
COMMENT ON POLICY "Insert notifications" ON notifications IS
  'Allows authenticated users to create notifications for any user (needed for cross-user notifications)';
