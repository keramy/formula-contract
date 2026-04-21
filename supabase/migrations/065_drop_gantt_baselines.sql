-- Drop gantt baseline tables. Feature was built but never adopted by PMs;
-- the ON DELETE CASCADE on gantt_baseline_items.gantt_item_id also made
-- baselines unreliable as permanent records.
DROP TABLE IF EXISTS public.gantt_baseline_items CASCADE;
DROP TABLE IF EXISTS public.gantt_baselines CASCADE;
