-- Migration: Add priority field to project_timelines
-- Enables priority-based sorting and visual indicators in Gantt chart

-- ============================================================================
-- ADD PRIORITY COLUMN
-- ============================================================================

-- Priority levels: 1=Low, 2=Normal, 3=High, 4=Critical
-- Default is 2 (Normal) to not disrupt existing items
ALTER TABLE project_timelines
  ADD COLUMN priority smallint NOT NULL DEFAULT 2;

-- Constraint to ensure valid priority range
ALTER TABLE project_timelines
  ADD CONSTRAINT valid_priority CHECK (priority >= 1 AND priority <= 4);

-- Comment for documentation
COMMENT ON COLUMN project_timelines.priority IS '1=Low, 2=Normal, 3=High, 4=Critical';

-- ============================================================================
-- INDEX FOR PRIORITY SORTING
-- ============================================================================

-- Composite index for sorting by priority within a project
CREATE INDEX idx_timelines_priority ON project_timelines(project_id, priority, sort_order);
