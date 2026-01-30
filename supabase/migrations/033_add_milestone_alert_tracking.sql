-- Migration: Add milestone alert tracking
-- Purpose: Track when milestone alerts are sent to avoid duplicate notifications

-- Add alert_sent_at column to track when alert was last sent
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS alert_sent_at TIMESTAMPTZ;

-- Add index for efficient querying of milestones needing alerts
CREATE INDEX IF NOT EXISTS idx_milestones_alert_due
ON milestones (due_date, is_completed, alert_sent_at)
WHERE is_completed = false;

-- Comment for documentation
COMMENT ON COLUMN milestones.alert_sent_at IS 'Timestamp when the last alert email/notification was sent for this milestone';
