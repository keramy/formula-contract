-- ============================================================================
-- Migration 045: Gantt Rewrite (New Schema)
-- Purpose: Replace legacy timeline tables with new Gantt model
-- NOTE: Data reset is acceptable (test data only)
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Drop legacy timeline tables
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS public.timeline_milestones CASCADE;
DROP TABLE IF EXISTS public.timeline_scope_items CASCADE;
DROP TABLE IF EXISTS public.timeline_dependencies CASCADE;
DROP TABLE IF EXISTS public.project_timelines CASCADE;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gantt_item_type') THEN
    CREATE TYPE public.gantt_item_type AS ENUM ('phase', 'task', 'milestone');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gantt_phase_key') THEN
    CREATE TYPE public.gantt_phase_key AS ENUM ('design', 'production', 'shipping', 'installation');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Gantt Items
-- ---------------------------------------------------------------------------
CREATE TABLE public.gantt_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  item_type public.gantt_item_type NOT NULL,
  phase_key public.gantt_phase_key, -- only for item_type = 'phase'
  parent_id uuid REFERENCES public.gantt_items(id) ON DELETE SET NULL,
  sort_order int NOT NULL DEFAULT 0,
  start_date date NOT NULL,
  end_date date NOT NULL,
  priority int NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 4),
  progress_override int CHECK (progress_override BETWEEN 0 AND 100),
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  color text,
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_gantt_items_project_order ON public.gantt_items(project_id, sort_order);
CREATE INDEX idx_gantt_items_project_parent ON public.gantt_items(project_id, parent_id);

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_gantt_items_updated_at ON public.gantt_items;
CREATE TRIGGER update_gantt_items_updated_at
  BEFORE UPDATE ON public.gantt_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create fixed phases for each project
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_default_gantt_phases()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.gantt_items (project_id, name, item_type, phase_key, parent_id, sort_order, start_date, end_date, color)
  VALUES
    (NEW.id, 'Design', 'phase', 'design', NULL, 1, CURRENT_DATE, CURRENT_DATE, '#64748b'),
    (NEW.id, 'Production', 'phase', 'production', NULL, 2, CURRENT_DATE, CURRENT_DATE, '#3b82f6'),
    (NEW.id, 'Shipping', 'phase', 'shipping', NULL, 3, CURRENT_DATE, CURRENT_DATE, '#f59e0b'),
    (NEW.id, 'Installation', 'phase', 'installation', NULL, 4, CURRENT_DATE, CURRENT_DATE, '#8b5cf6');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_default_gantt_phases ON public.projects;
CREATE TRIGGER create_default_gantt_phases
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.create_default_gantt_phases();

-- Seed phases for existing projects (if any)
INSERT INTO public.gantt_items (project_id, name, item_type, phase_key, parent_id, sort_order, start_date, end_date, color)
SELECT p.id, v.name, 'phase', v.phase_key, NULL, v.sort_order, CURRENT_DATE, CURRENT_DATE, v.color
FROM public.projects p
CROSS JOIN (
  VALUES
    ('Design', 'design'::public.gantt_phase_key, 1, '#64748b'),
    ('Production', 'production'::public.gantt_phase_key, 2, '#3b82f6'),
    ('Shipping', 'shipping'::public.gantt_phase_key, 3, '#f59e0b'),
    ('Installation', 'installation'::public.gantt_phase_key, 4, '#8b5cf6')
) AS v(name, phase_key, sort_order, color)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.gantt_items gi
  WHERE gi.project_id = p.id AND gi.item_type = 'phase' AND gi.phase_key = v.phase_key
);

-- ---------------------------------------------------------------------------
-- Gantt Dependencies
-- ---------------------------------------------------------------------------
CREATE TABLE public.gantt_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.gantt_items(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES public.gantt_items(id) ON DELETE CASCADE,
  dependency_type smallint NOT NULL DEFAULT 0,
  lag_days int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT gantt_dependency_unique UNIQUE (source_id, target_id),
  CONSTRAINT gantt_dependency_type_check CHECK (dependency_type BETWEEN 0 AND 3),
  CONSTRAINT gantt_dependency_no_self CHECK (source_id <> target_id)
);

CREATE INDEX idx_gantt_deps_project ON public.gantt_dependencies(project_id);
CREATE INDEX idx_gantt_deps_source ON public.gantt_dependencies(source_id);
CREATE INDEX idx_gantt_deps_target ON public.gantt_dependencies(target_id);

-- ---------------------------------------------------------------------------
-- Gantt Item ↔ Scope Items (for progress calc)
-- ---------------------------------------------------------------------------
CREATE TABLE public.gantt_item_scope_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gantt_item_id uuid NOT NULL REFERENCES public.gantt_items(id) ON DELETE CASCADE,
  scope_item_id uuid NOT NULL REFERENCES public.scope_items(id) ON DELETE CASCADE,
  UNIQUE (gantt_item_id, scope_item_id)
);

CREATE INDEX idx_gantt_item_scope_items_item ON public.gantt_item_scope_items(gantt_item_id);
CREATE INDEX idx_gantt_item_scope_items_scope ON public.gantt_item_scope_items(scope_item_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.gantt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gantt_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gantt_item_scope_items ENABLE ROW LEVEL SECURITY;

-- Gantt items: everyone assigned can view; PM/Admin can write
DROP POLICY IF EXISTS "Gantt items select" ON public.gantt_items;
DROP POLICY IF EXISTS "Gantt items insert" ON public.gantt_items;
DROP POLICY IF EXISTS "Gantt items update" ON public.gantt_items;
DROP POLICY IF EXISTS "Gantt items delete" ON public.gantt_items;

CREATE POLICY "Gantt items select" ON public.gantt_items
  FOR SELECT USING (is_assigned_to_project(project_id));

CREATE POLICY "Gantt items insert" ON public.gantt_items
  FOR INSERT WITH CHECK ((SELECT get_user_role()) IN ('admin','pm') AND is_assigned_to_project(project_id));

CREATE POLICY "Gantt items update" ON public.gantt_items
  FOR UPDATE USING ((SELECT get_user_role()) IN ('admin','pm') AND is_assigned_to_project(project_id));

CREATE POLICY "Gantt items delete" ON public.gantt_items
  FOR DELETE USING ((SELECT get_user_role()) IN ('admin','pm') AND is_assigned_to_project(project_id));

-- Dependencies: same rules
DROP POLICY IF EXISTS "Gantt deps select" ON public.gantt_dependencies;
DROP POLICY IF EXISTS "Gantt deps insert" ON public.gantt_dependencies;
DROP POLICY IF EXISTS "Gantt deps update" ON public.gantt_dependencies;
DROP POLICY IF EXISTS "Gantt deps delete" ON public.gantt_dependencies;

CREATE POLICY "Gantt deps select" ON public.gantt_dependencies
  FOR SELECT USING (is_assigned_to_project(project_id));

CREATE POLICY "Gantt deps insert" ON public.gantt_dependencies
  FOR INSERT WITH CHECK ((SELECT get_user_role()) IN ('admin','pm') AND is_assigned_to_project(project_id));

CREATE POLICY "Gantt deps update" ON public.gantt_dependencies
  FOR UPDATE USING ((SELECT get_user_role()) IN ('admin','pm') AND is_assigned_to_project(project_id));

CREATE POLICY "Gantt deps delete" ON public.gantt_dependencies
  FOR DELETE USING ((SELECT get_user_role()) IN ('admin','pm') AND is_assigned_to_project(project_id));

-- Scope links: viewable by assigned; PM/Admin can write
DROP POLICY IF EXISTS "Gantt scope links select" ON public.gantt_item_scope_items;
DROP POLICY IF EXISTS "Gantt scope links insert" ON public.gantt_item_scope_items;
DROP POLICY IF EXISTS "Gantt scope links delete" ON public.gantt_item_scope_items;

CREATE POLICY "Gantt scope links select" ON public.gantt_item_scope_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.gantt_items gi
      WHERE gi.id = gantt_item_scope_items.gantt_item_id
        AND is_assigned_to_project(gi.project_id)
    )
  );

CREATE POLICY "Gantt scope links insert" ON public.gantt_item_scope_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.gantt_items gi
      WHERE gi.id = gantt_item_scope_items.gantt_item_id
        AND (SELECT get_user_role()) IN ('admin','pm')
        AND is_assigned_to_project(gi.project_id)
    )
  );

CREATE POLICY "Gantt scope links delete" ON public.gantt_item_scope_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM public.gantt_items gi
      WHERE gi.id = gantt_item_scope_items.gantt_item_id
        AND (SELECT get_user_role()) IN ('admin','pm')
        AND is_assigned_to_project(gi.project_id)
    )
  );

COMMIT;

-- ============================================================================
-- DONE
-- ============================================================================
