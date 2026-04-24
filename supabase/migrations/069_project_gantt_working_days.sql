-- Replace the short-lived gantt_skip_weekends boolean (migration 068, reverted)
-- with a per-day working-days bitmask. Bit index matches JavaScript
-- Date.getDay(): bit 0 = Sun, bit 1 = Mon, ..., bit 6 = Sat.
-- Default 62 (0b0111110) = Mon+Tue+Wed+Thu+Fri.
-- Example masks:
--   62  = Mon-Fri (default)
--   126 = Mon-Sat (0b1111110)
--   127 = every day (0b1111111)
--   0   = no working days (unusable, not set by UI)
ALTER TABLE public.projects DROP COLUMN IF EXISTS gantt_skip_weekends;
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS gantt_working_days SMALLINT NOT NULL DEFAULT 62;
