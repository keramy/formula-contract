-- Migration: Add project timelines for Gantt chart
-- Allows PMs to create custom timeline items (phases and tasks) that can link to scope items and milestones

-- ============================================================================
-- ENUM TYPE
-- ============================================================================

CREATE TYPE timeline_item_type AS ENUM ('phase', 'task');

-- ============================================================================
-- MAIN TABLE: project_timelines
-- ============================================================================

CREATE TABLE project_timelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  item_type timeline_item_type NOT NULL DEFAULT 'task',
  start_date date NOT NULL,
  end_date date NOT NULL,
  color text, -- Optional color override (hex)
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Ensure end_date >= start_date
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- ============================================================================
-- JUNCTION TABLE: timeline_scope_items (many-to-many)
-- ============================================================================

CREATE TABLE timeline_scope_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id uuid NOT NULL REFERENCES project_timelines(id) ON DELETE CASCADE,
  scope_item_id uuid NOT NULL REFERENCES scope_items(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Prevent duplicate links
  CONSTRAINT unique_timeline_scope_item UNIQUE (timeline_id, scope_item_id)
);

-- ============================================================================
-- JUNCTION TABLE: timeline_milestones (many-to-many)
-- ============================================================================

CREATE TABLE timeline_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id uuid NOT NULL REFERENCES project_timelines(id) ON DELETE CASCADE,
  milestone_id uuid NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Prevent duplicate links
  CONSTRAINT unique_timeline_milestone UNIQUE (timeline_id, milestone_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Primary lookup: timelines by project
CREATE INDEX idx_project_timelines_project_id ON project_timelines(project_id);

-- Sorting within project
CREATE INDEX idx_project_timelines_sort_order ON project_timelines(project_id, sort_order);

-- Date range queries
CREATE INDEX idx_project_timelines_dates ON project_timelines(project_id, start_date, end_date);

-- Junction table indexes
CREATE INDEX idx_timeline_scope_items_timeline_id ON timeline_scope_items(timeline_id);
CREATE INDEX idx_timeline_scope_items_scope_item_id ON timeline_scope_items(scope_item_id);
CREATE INDEX idx_timeline_milestones_timeline_id ON timeline_milestones(timeline_id);
CREATE INDEX idx_timeline_milestones_milestone_id ON timeline_milestones(milestone_id);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE TRIGGER update_project_timelines_updated_at
  BEFORE UPDATE ON project_timelines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE project_timelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_scope_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_milestones ENABLE ROW LEVEL SECURITY;

-- project_timelines: SELECT - assigned users, admins, management can view
CREATE POLICY "project_timelines_select" ON project_timelines
  FOR SELECT USING (
    (SELECT get_user_role()) IN ('admin', 'management')
    OR is_assigned_to_project(project_id)
    OR is_client_for_project(project_id)
  );

-- project_timelines: INSERT - PM and admin only
CREATE POLICY "project_timelines_insert" ON project_timelines
  FOR INSERT WITH CHECK (
    (SELECT get_user_role()) IN ('admin', 'pm')
    AND (
      (SELECT get_user_role()) = 'admin'
      OR is_assigned_to_project(project_id)
    )
  );

-- project_timelines: UPDATE - PM and admin only
CREATE POLICY "project_timelines_update" ON project_timelines
  FOR UPDATE USING (
    (SELECT get_user_role()) IN ('admin', 'pm')
    AND (
      (SELECT get_user_role()) = 'admin'
      OR is_assigned_to_project(project_id)
    )
  );

-- project_timelines: DELETE - PM and admin only
CREATE POLICY "project_timelines_delete" ON project_timelines
  FOR DELETE USING (
    (SELECT get_user_role()) IN ('admin', 'pm')
    AND (
      (SELECT get_user_role()) = 'admin'
      OR is_assigned_to_project(project_id)
    )
  );

-- timeline_scope_items: SELECT - same as project_timelines
CREATE POLICY "timeline_scope_items_select" ON timeline_scope_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_timelines pt
      WHERE pt.id = timeline_id
      AND (
        (SELECT get_user_role()) IN ('admin', 'management')
        OR is_assigned_to_project(pt.project_id)
        OR is_client_for_project(pt.project_id)
      )
    )
  );

-- timeline_scope_items: INSERT/UPDATE/DELETE - PM and admin only
CREATE POLICY "timeline_scope_items_insert" ON timeline_scope_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_timelines pt
      WHERE pt.id = timeline_id
      AND (SELECT get_user_role()) IN ('admin', 'pm')
      AND (
        (SELECT get_user_role()) = 'admin'
        OR is_assigned_to_project(pt.project_id)
      )
    )
  );

CREATE POLICY "timeline_scope_items_delete" ON timeline_scope_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM project_timelines pt
      WHERE pt.id = timeline_id
      AND (SELECT get_user_role()) IN ('admin', 'pm')
      AND (
        (SELECT get_user_role()) = 'admin'
        OR is_assigned_to_project(pt.project_id)
      )
    )
  );

-- timeline_milestones: SELECT - same as project_timelines
CREATE POLICY "timeline_milestones_select" ON timeline_milestones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_timelines pt
      WHERE pt.id = timeline_id
      AND (
        (SELECT get_user_role()) IN ('admin', 'management')
        OR is_assigned_to_project(pt.project_id)
        OR is_client_for_project(pt.project_id)
      )
    )
  );

-- timeline_milestones: INSERT/UPDATE/DELETE - PM and admin only
CREATE POLICY "timeline_milestones_insert" ON timeline_milestones
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_timelines pt
      WHERE pt.id = timeline_id
      AND (SELECT get_user_role()) IN ('admin', 'pm')
      AND (
        (SELECT get_user_role()) = 'admin'
        OR is_assigned_to_project(pt.project_id)
      )
    )
  );

CREATE POLICY "timeline_milestones_delete" ON timeline_milestones
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM project_timelines pt
      WHERE pt.id = timeline_id
      AND (SELECT get_user_role()) IN ('admin', 'pm')
      AND (
        (SELECT get_user_role()) = 'admin'
        OR is_assigned_to_project(pt.project_id)
      )
    )
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE project_timelines IS 'Custom timeline items (phases/tasks) for Gantt chart visualization';
COMMENT ON TABLE timeline_scope_items IS 'Many-to-many link between timeline items and scope items for progress tracking';
COMMENT ON TABLE timeline_milestones IS 'Many-to-many link between timeline items and milestones';
COMMENT ON COLUMN project_timelines.item_type IS 'phase = date range container, task = specific activity';
COMMENT ON COLUMN project_timelines.color IS 'Optional hex color override, otherwise uses preset by type';
