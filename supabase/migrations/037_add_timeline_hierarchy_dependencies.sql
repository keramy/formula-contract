-- Migration: Add hierarchy and dependencies to project timelines for advanced Gantt features
-- Enables parent-child relationships (indent/outdent) and dependency links between items

-- ============================================================================
-- ADD HIERARCHY COLUMNS TO project_timelines
-- ============================================================================

-- Parent reference for hierarchy (null = top-level item)
ALTER TABLE project_timelines
  ADD COLUMN parent_id uuid REFERENCES project_timelines(id) ON DELETE SET NULL;

-- Hierarchy level for quick indentation rendering (0 = top-level)
ALTER TABLE project_timelines
  ADD COLUMN hierarchy_level integer NOT NULL DEFAULT 0;

-- Composite index for efficient hierarchy queries
CREATE INDEX idx_timelines_hierarchy ON project_timelines(project_id, parent_id, sort_order);

-- Index for parent lookups
CREATE INDEX idx_timelines_parent_id ON project_timelines(parent_id);

-- ============================================================================
-- CREATE timeline_dependencies TABLE
-- ============================================================================

CREATE TABLE timeline_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES project_timelines(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES project_timelines(id) ON DELETE CASCADE,

  -- Dependency type:
  -- 0 = Finish-to-Start (FS) - most common: target starts after source ends
  -- 1 = Start-to-Start (SS) - target starts when source starts
  -- 2 = Finish-to-Finish (FF) - target ends when source ends
  -- 3 = Start-to-Finish (SF) - target ends when source starts (rare)
  dependency_type smallint NOT NULL DEFAULT 0,

  -- Lag days: positive = delay, negative = lead time
  lag_days integer NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,

  -- Prevent duplicate links between same source and target
  CONSTRAINT unique_dependency UNIQUE (source_id, target_id),

  -- Prevent self-referencing links
  CONSTRAINT no_self_link CHECK (source_id != target_id),

  -- Validate dependency type range
  CONSTRAINT valid_dependency_type CHECK (dependency_type >= 0 AND dependency_type <= 3)
);

-- ============================================================================
-- INDEXES FOR timeline_dependencies
-- ============================================================================

-- Query dependencies by project
CREATE INDEX idx_dependencies_project ON timeline_dependencies(project_id);

-- Query dependencies by source (what does this item block?)
CREATE INDEX idx_dependencies_source ON timeline_dependencies(source_id);

-- Query dependencies by target (what blocks this item?)
CREATE INDEX idx_dependencies_target ON timeline_dependencies(target_id);

-- ============================================================================
-- RLS POLICIES FOR timeline_dependencies
-- ============================================================================

ALTER TABLE timeline_dependencies ENABLE ROW LEVEL SECURITY;

-- SELECT: Same access as project_timelines (assigned users, admins, management, clients)
CREATE POLICY "timeline_dependencies_select" ON timeline_dependencies
  FOR SELECT USING (
    (SELECT get_user_role()) IN ('admin', 'management')
    OR is_assigned_to_project(project_id)
    OR is_client_for_project(project_id)
  );

-- INSERT: PM and admin only, must be assigned to project (except admin)
CREATE POLICY "timeline_dependencies_insert" ON timeline_dependencies
  FOR INSERT WITH CHECK (
    (SELECT get_user_role()) IN ('admin', 'pm')
    AND (
      (SELECT get_user_role()) = 'admin'
      OR is_assigned_to_project(project_id)
    )
  );

-- UPDATE: PM and admin only, must be assigned to project (except admin)
CREATE POLICY "timeline_dependencies_update" ON timeline_dependencies
  FOR UPDATE USING (
    (SELECT get_user_role()) IN ('admin', 'pm')
    AND (
      (SELECT get_user_role()) = 'admin'
      OR is_assigned_to_project(project_id)
    )
  );

-- DELETE: PM and admin only, must be assigned to project (except admin)
CREATE POLICY "timeline_dependencies_delete" ON timeline_dependencies
  FOR DELETE USING (
    (SELECT get_user_role()) IN ('admin', 'pm')
    AND (
      (SELECT get_user_role()) = 'admin'
      OR is_assigned_to_project(project_id)
    )
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN project_timelines.parent_id IS 'Parent timeline item ID for hierarchy (null = top-level)';
COMMENT ON COLUMN project_timelines.hierarchy_level IS 'Indentation level (0 = top-level, 1 = one level deep, etc.)';

COMMENT ON TABLE timeline_dependencies IS 'Dependency links between timeline items for Gantt chart visualization';
COMMENT ON COLUMN timeline_dependencies.dependency_type IS '0=FS (Finish-to-Start), 1=SS (Start-to-Start), 2=FF (Finish-to-Finish), 3=SF (Start-to-Finish)';
COMMENT ON COLUMN timeline_dependencies.lag_days IS 'Delay in days (positive) or lead time (negative) between linked items';
