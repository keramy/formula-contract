-- Migration 056: Add description and critical path flag to gantt_items
-- Required for Gantt chart rewrite — table view needs description,
-- critical path is manually flagged per task.

ALTER TABLE public.gantt_items
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS is_on_critical_path boolean NOT NULL DEFAULT false;

-- Index for filtering critical path items
CREATE INDEX IF NOT EXISTS idx_gantt_items_critical_path
  ON public.gantt_items (project_id)
  WHERE is_on_critical_path = true;
