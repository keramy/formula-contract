-- Migration: Add 'not_required' status to drawing_status enum
-- Description: Allows PM to mark drawings as "Not Required" when proceeding to production without a drawing

-- Step 1: Add the new enum value
ALTER TYPE drawing_status ADD VALUE IF NOT EXISTS 'not_required';

-- Step 2: Add a column to track why drawing was marked as not required
ALTER TABLE drawings ADD COLUMN IF NOT EXISTS not_required_reason TEXT;
ALTER TABLE drawings ADD COLUMN IF NOT EXISTS not_required_at TIMESTAMPTZ;
ALTER TABLE drawings ADD COLUMN IF NOT EXISTS not_required_by UUID REFERENCES users(id);

-- Add comments for documentation
COMMENT ON COLUMN drawings.not_required_reason IS 'Reason provided when PM marks drawing as not required';
COMMENT ON COLUMN drawings.not_required_at IS 'Timestamp when drawing was marked as not required';
COMMENT ON COLUMN drawings.not_required_by IS 'User who marked the drawing as not required';
