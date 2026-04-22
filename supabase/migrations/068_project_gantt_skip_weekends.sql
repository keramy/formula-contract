-- Add a per-project flag to treat weekends (Sat + Sun) as non-working days
-- for timeline duration display and dependency date arithmetic.
-- Default false: existing projects keep current calendar-day behavior until
-- a PM explicitly enables the toggle in the Gantt toolbar.
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS gantt_skip_weekends BOOLEAN NOT NULL DEFAULT false;
