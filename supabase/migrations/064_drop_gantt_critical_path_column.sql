-- Drop is_on_critical_path column from gantt_items.
-- The critical-path toggle UI was removed; priority field (value 4 = Critical)
-- already covers "this task is important" semantics.
ALTER TABLE public.gantt_items DROP COLUMN IF EXISTS is_on_critical_path;
