-- Migration: Add report activity tracking
-- Purpose: Track when users view or download reports (admin-only visibility)

-- Create report_activity table
CREATE TABLE IF NOT EXISTS report_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('viewed', 'downloaded')),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_report_activity_report_id ON report_activity(report_id);
CREATE INDEX IF NOT EXISTS idx_report_activity_user_id ON report_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_report_activity_created_at ON report_activity(created_at DESC);

-- RLS Policies
ALTER TABLE report_activity ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can INSERT their own activity
CREATE POLICY "Users can log their own activity"
ON report_activity FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

-- Only admin can SELECT (view activity logs)
CREATE POLICY "Admin can view all activity"
ON report_activity FOR SELECT
TO authenticated
USING ((SELECT get_user_role()) = 'admin');

-- Comments
COMMENT ON TABLE report_activity IS 'Tracks when users view or download reports';
COMMENT ON COLUMN report_activity.action IS 'Type of activity: viewed or downloaded';
