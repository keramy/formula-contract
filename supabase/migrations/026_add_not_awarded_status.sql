-- Migration: Add 'not_awarded' status to project_status enum
-- Description: When a tender is lost to another supplier, the project can be marked as "not_awarded"

-- Add new value to the project_status enum
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'not_awarded';

-- Add comment for documentation
COMMENT ON TYPE project_status IS 'Project lifecycle status: tender (bidding), active (won & in progress), on_hold (paused), completed (finished), cancelled (stopped), not_awarded (tender lost to competitor)';
