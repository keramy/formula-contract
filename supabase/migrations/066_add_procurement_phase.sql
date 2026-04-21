-- Add 'procurement' value to gantt_phase_key enum, positioned between
-- 'production' and 'shipping' to match the natural project flow.
-- Note: ALTER TYPE ADD VALUE must run outside a transaction, so this is
-- a standalone migration. The trigger update + backfill comes next (067).
ALTER TYPE gantt_phase_key ADD VALUE IF NOT EXISTS 'procurement' AFTER 'production';
