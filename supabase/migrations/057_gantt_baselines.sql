-- Migration 057: Gantt baseline comparison tables
-- Save schedule snapshots for plan vs actual comparison.

-- Baseline header (one per snapshot)
CREATE TABLE public.gantt_baselines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Baseline item data (copy of gantt_items dates at snapshot time)
CREATE TABLE public.gantt_baseline_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  baseline_id uuid NOT NULL REFERENCES gantt_baselines(id) ON DELETE CASCADE,
  gantt_item_id uuid NOT NULL REFERENCES gantt_items(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  progress int DEFAULT 0,
  UNIQUE (baseline_id, gantt_item_id)
);

-- Indexes
CREATE INDEX idx_gantt_baselines_project ON gantt_baselines(project_id);
CREATE INDEX idx_gantt_baseline_items_baseline ON gantt_baseline_items(baseline_id);
CREATE INDEX idx_gantt_baseline_items_item ON gantt_baseline_items(gantt_item_id);

-- RLS
ALTER TABLE gantt_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE gantt_baseline_items ENABLE ROW LEVEL SECURITY;

-- Baselines: read by assigned users, write by PM/Admin
CREATE POLICY "baselines_select" ON gantt_baselines FOR SELECT
  USING (is_assigned_to_project((SELECT project_id)));

CREATE POLICY "baselines_insert" ON gantt_baselines FOR INSERT
  WITH CHECK (
    (SELECT get_user_role()) IN ('admin', 'pm')
    AND is_assigned_to_project(project_id)
  );

CREATE POLICY "baselines_delete" ON gantt_baselines FOR DELETE
  USING (
    (SELECT get_user_role()) IN ('admin', 'pm')
    AND is_assigned_to_project(project_id)
  );

-- Baseline items: read via baseline's project, write via baseline's project
CREATE POLICY "baseline_items_select" ON gantt_baseline_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gantt_baselines b
      WHERE b.id = baseline_id
      AND is_assigned_to_project(b.project_id)
    )
  );

CREATE POLICY "baseline_items_insert" ON gantt_baseline_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM gantt_baselines b
      WHERE b.id = baseline_id
      AND (SELECT get_user_role()) IN ('admin', 'pm')
      AND is_assigned_to_project(b.project_id)
    )
  );
