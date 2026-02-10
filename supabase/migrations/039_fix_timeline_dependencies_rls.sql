-- Migration: Fix timeline_dependencies RLS policies
-- Run this after migration 037 fails due to missing is_client_for_project function
-- This script is idempotent - safe to run multiple times

-- ============================================================================
-- STEP 1: Ensure is_client_for_project function exists
-- (Copy from migration 002_client_safe_views.sql if it doesn't exist)
-- ============================================================================

-- Check if function exists and create if not
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'is_client_for_project'
  ) THEN
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION public.is_client_for_project(project_uuid UUID)
      RETURNS BOOLEAN
      LANGUAGE plpgsql
      STABLE
      SECURITY DEFINER
      SET search_path = public
      AS $body$
      DECLARE
        user_client_id UUID;
        project_client_id UUID;
      BEGIN
        -- Get the client_id associated with the current user
        SELECT client_id INTO user_client_id
        FROM public.users
        WHERE id = (SELECT auth.uid());

        -- If user has no client_id, they're not a client user
        IF user_client_id IS NULL THEN
          RETURN FALSE;
        END IF;

        -- Get the client_id of the project
        SELECT client_id INTO project_client_id
        FROM public.projects
        WHERE id = project_uuid;

        -- Return true if they match
        RETURN user_client_id = project_client_id;
      END;
      $body$
    $func$;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Ensure hierarchy columns exist on project_timelines
-- ============================================================================

DO $$
BEGIN
  -- Add parent_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timelines' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE project_timelines
      ADD COLUMN parent_id uuid REFERENCES project_timelines(id) ON DELETE SET NULL;
  END IF;

  -- Add hierarchy_level if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_timelines' AND column_name = 'hierarchy_level'
  ) THEN
    ALTER TABLE project_timelines
      ADD COLUMN hierarchy_level integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_timelines_hierarchy ON project_timelines(project_id, parent_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_timelines_parent_id ON project_timelines(parent_id);

-- ============================================================================
-- STEP 3: Create timeline_dependencies table if it doesn't exist
-- ============================================================================

CREATE TABLE IF NOT EXISTS timeline_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES project_timelines(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES project_timelines(id) ON DELETE CASCADE,
  dependency_type smallint NOT NULL DEFAULT 0,
  lag_days integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT unique_dependency UNIQUE (source_id, target_id),
  CONSTRAINT no_self_link CHECK (source_id != target_id),
  CONSTRAINT valid_dependency_type CHECK (dependency_type >= 0 AND dependency_type <= 3)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_dependencies_project ON timeline_dependencies(project_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_source ON timeline_dependencies(source_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_target ON timeline_dependencies(target_id);

-- ============================================================================
-- STEP 4: Enable RLS and create policies (drop if exist first)
-- ============================================================================

ALTER TABLE timeline_dependencies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "timeline_dependencies_select" ON timeline_dependencies;
DROP POLICY IF EXISTS "timeline_dependencies_insert" ON timeline_dependencies;
DROP POLICY IF EXISTS "timeline_dependencies_update" ON timeline_dependencies;
DROP POLICY IF EXISTS "timeline_dependencies_delete" ON timeline_dependencies;

-- SELECT policy
CREATE POLICY "timeline_dependencies_select" ON timeline_dependencies
  FOR SELECT USING (
    (SELECT get_user_role()) IN ('admin', 'management')
    OR is_assigned_to_project(project_id)
    OR is_client_for_project(project_id)
  );

-- INSERT policy
CREATE POLICY "timeline_dependencies_insert" ON timeline_dependencies
  FOR INSERT WITH CHECK (
    (SELECT get_user_role()) IN ('admin', 'pm')
    AND (
      (SELECT get_user_role()) = 'admin'
      OR is_assigned_to_project(project_id)
    )
  );

-- UPDATE policy
CREATE POLICY "timeline_dependencies_update" ON timeline_dependencies
  FOR UPDATE USING (
    (SELECT get_user_role()) IN ('admin', 'pm')
    AND (
      (SELECT get_user_role()) = 'admin'
      OR is_assigned_to_project(project_id)
    )
  );

-- DELETE policy
CREATE POLICY "timeline_dependencies_delete" ON timeline_dependencies
  FOR DELETE USING (
    (SELECT get_user_role()) IN ('admin', 'pm')
    AND (
      (SELECT get_user_role()) = 'admin'
      OR is_assigned_to_project(project_id)
    )
  );

-- ============================================================================
-- STEP 5: Add comments
-- ============================================================================

COMMENT ON COLUMN project_timelines.parent_id IS 'Parent timeline item ID for hierarchy (null = top-level)';
COMMENT ON COLUMN project_timelines.hierarchy_level IS 'Indentation level (0 = top-level, 1 = one level deep, etc.)';
COMMENT ON TABLE timeline_dependencies IS 'Dependency links between timeline items for Gantt chart visualization';
COMMENT ON COLUMN timeline_dependencies.dependency_type IS '0=FS (Finish-to-Start), 1=SS (Start-to-Start), 2=FF (Finish-to-Finish), 3=SF (Start-to-Finish)';
COMMENT ON COLUMN timeline_dependencies.lag_days IS 'Delay in days (positive) or lead time (negative) between linked items';
