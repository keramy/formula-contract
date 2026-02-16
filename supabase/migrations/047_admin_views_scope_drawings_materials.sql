-- ============================================================================
-- Migration 047: Admin Views for Scope Items, Drawings, Materials, Milestones, Snagging
--
-- Problem: When browsing these tables in Supabase Studio, foreign keys show
-- as raw UUIDs. You can't tell which project a scope item belongs to without
-- clicking through to the referenced record.
--
-- Solution: Admin-friendly views that join in human-readable columns
-- (project_code, project_name, client_name, item_code) so you can
-- immediately identify records when browsing.
--
-- Follows the same pattern as migration 023 (v_reports, v_notifications, etc.)
-- Uses SECURITY INVOKER (like migration 043) to respect RLS.
--
-- Views:
-- - v_scope_items:  Scope items with project/client context
-- - v_drawings:     Drawings with project/item context + revision count
-- - v_materials:    Materials with project context + linked item count
-- - v_milestones:   Milestones with project context
-- - v_snagging:     Snagging items with project/item/user context
-- ============================================================================

-- 1. Readable scope items view
DROP VIEW IF EXISTS public.v_scope_items;
CREATE VIEW public.v_scope_items
WITH (security_invoker = true)
AS
SELECT
  si.id,
  COALESCE(p.project_code, '-') AS project_code,
  p.name AS project_name,
  COALESCE(cl.company_name, '-') AS client_name,
  si.item_code,
  si.name,
  si.item_path,
  si.status,
  si.procurement_status,
  si.production_percentage,
  si.quantity,
  si.unit,
  si.actual_unit_cost,
  si.actual_total_cost,
  si.initial_total_cost,
  si.is_shipped,
  si.is_installed,
  si.is_deleted,
  si.created_at,
  si.updated_at
FROM public.scope_items si
JOIN public.projects p ON si.project_id = p.id
LEFT JOIN public.clients cl ON p.client_id = cl.id
ORDER BY p.project_code, si.item_code;

COMMENT ON VIEW public.v_scope_items IS
  'Human-readable view of scope items with project and client context. Security invoker enabled.';

-- 2. Readable drawings view
DROP VIEW IF EXISTS public.v_drawings;
CREATE VIEW public.v_drawings
WITH (security_invoker = true)
AS
SELECT
  d.id,
  COALESCE(p.project_code, '-') AS project_code,
  p.name AS project_name,
  si.item_code,
  si.name AS item_name,
  d.status,
  d.current_revision,
  (SELECT COUNT(*) FROM public.drawing_revisions dr WHERE dr.drawing_id = d.id) AS revision_count,
  d.sent_to_client_at,
  d.client_response_at,
  LEFT(d.client_comments, 80) AS client_comments_preview,
  d.pm_override,
  d.created_at,
  d.updated_at
FROM public.drawings d
JOIN public.scope_items si ON d.item_id = si.id
JOIN public.projects p ON si.project_id = p.id
ORDER BY p.project_code, si.item_code;

COMMENT ON VIEW public.v_drawings IS
  'Human-readable view of drawings with project and item context. Security invoker enabled.';

-- 3. Readable materials view
DROP VIEW IF EXISTS public.v_materials;
CREATE VIEW public.v_materials
WITH (security_invoker = true)
AS
SELECT
  m.id,
  COALESCE(p.project_code, '-') AS project_code,
  p.name AS project_name,
  m.material_code,
  m.name,
  LEFT(m.specification, 80) AS specification_preview,
  m.supplier,
  m.status,
  (SELECT COUNT(*) FROM public.item_materials im WHERE im.material_id = m.id) AS linked_items,
  m.is_deleted,
  m.created_at,
  m.updated_at
FROM public.materials m
JOIN public.projects p ON m.project_id = p.id
ORDER BY p.project_code, m.material_code;

COMMENT ON VIEW public.v_materials IS
  'Human-readable view of materials with project context and linked item count. Security invoker enabled.';

-- 4. Readable milestones view
DROP VIEW IF EXISTS public.v_milestones;
CREATE VIEW public.v_milestones
WITH (security_invoker = true)
AS
SELECT
  ms.id,
  COALESCE(p.project_code, '-') AS project_code,
  p.name AS project_name,
  COALESCE(ms.milestone_code, 'MS-???') AS milestone_code,
  ms.name,
  ms.due_date,
  ms.is_completed,
  ms.completed_at,
  ms.alert_days_before,
  ms.created_at
FROM public.milestones ms
JOIN public.projects p ON ms.project_id = p.id
ORDER BY p.project_code, ms.due_date;

COMMENT ON VIEW public.v_milestones IS
  'Human-readable view of milestones with project context. Security invoker enabled.';

-- 5. Readable snagging view
DROP VIEW IF EXISTS public.v_snagging;
CREATE VIEW public.v_snagging
WITH (security_invoker = true)
AS
SELECT
  s.id,
  COALESCE(p.project_code, '-') AS project_code,
  p.name AS project_name,
  COALESCE(si.item_code, '-') AS item_code,
  COALESCE(si.name, '-') AS item_name,
  LEFT(s.description, 100) AS description_preview,
  s.is_resolved,
  COALESCE(creator.name, '-') AS created_by_name,
  COALESCE(resolver.name, '-') AS resolved_by_name,
  s.resolution_notes,
  s.resolved_at,
  s.created_at
FROM public.snagging s
JOIN public.projects p ON s.project_id = p.id
LEFT JOIN public.scope_items si ON s.item_id = si.id
LEFT JOIN public.users creator ON s.created_by = creator.id
LEFT JOIN public.users resolver ON s.resolved_by = resolver.id
ORDER BY p.project_code, s.created_at DESC;

COMMENT ON VIEW public.v_snagging IS
  'Human-readable view of snagging items with project, item, and user context. Security invoker enabled.';

-- Views with security_invoker respect underlying table RLS policies.
