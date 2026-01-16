-- ============================================
-- Add Missing Foreign Key Indexes Migration
-- Addresses Supabase Advisor Info:
-- "Unindexed Foreign Keys"
-- ============================================
--
-- Problem: Foreign key columns without indexes cause slow JOINs
-- and CASCADE operations. PostgreSQL doesn't auto-create indexes
-- on FK columns (only on referenced columns).
--
-- Solution: Add indexes on all FK columns that are frequently
-- used in JOINs or have CASCADE behavior.
--
-- Performance Impact: Faster JOINs, faster CASCADE deletes/updates
-- ============================================

-- ============================================
-- 1. drawing_revisions table
-- ============================================
-- uploaded_by references users(id)
CREATE INDEX IF NOT EXISTS idx_drawing_revisions_uploaded_by
  ON public.drawing_revisions(uploaded_by);

-- ============================================
-- 2. drawings table
-- ============================================
-- approved_by references users(id)
CREATE INDEX IF NOT EXISTS idx_drawings_approved_by
  ON public.drawings(approved_by);

-- pm_override_by references users(id)
CREATE INDEX IF NOT EXISTS idx_drawings_pm_override_by
  ON public.drawings(pm_override_by);

-- ============================================
-- 3. materials table
-- ============================================
-- approved_by references users(id)
CREATE INDEX IF NOT EXISTS idx_materials_approved_by
  ON public.materials(approved_by);

-- ============================================
-- 4. notifications table
-- ============================================
-- Multiple optional FK columns for linking to related entities
-- These are nullable but still benefit from indexing for JOIN queries

-- drawing_id references drawings(id)
CREATE INDEX IF NOT EXISTS idx_notifications_drawing_id
  ON public.notifications(drawing_id)
  WHERE drawing_id IS NOT NULL;

-- item_id references scope_items(id)
CREATE INDEX IF NOT EXISTS idx_notifications_item_id
  ON public.notifications(item_id)
  WHERE item_id IS NOT NULL;

-- material_id references materials(id)
CREATE INDEX IF NOT EXISTS idx_notifications_material_id
  ON public.notifications(material_id)
  WHERE material_id IS NOT NULL;

-- project_id references projects(id)
CREATE INDEX IF NOT EXISTS idx_notifications_project_id
  ON public.notifications(project_id)
  WHERE project_id IS NOT NULL;

-- report_id references reports(id)
CREATE INDEX IF NOT EXISTS idx_notifications_report_id
  ON public.notifications(report_id)
  WHERE report_id IS NOT NULL;

-- ============================================
-- 5. project_assignments table
-- ============================================
-- assigned_by references users(id)
CREATE INDEX IF NOT EXISTS idx_project_assignments_assigned_by
  ON public.project_assignments(assigned_by);

-- ============================================
-- 6. projects table
-- ============================================
-- created_by references users(id)
CREATE INDEX IF NOT EXISTS idx_projects_created_by
  ON public.projects(created_by);

-- ============================================
-- 7. reports table
-- ============================================
-- created_by references users(id)
CREATE INDEX IF NOT EXISTS idx_reports_created_by
  ON public.reports(created_by);

-- ============================================
-- 8. snagging table
-- ============================================
-- created_by references users(id)
CREATE INDEX IF NOT EXISTS idx_snagging_created_by
  ON public.snagging(created_by);

-- item_id references scope_items(id) - nullable
CREATE INDEX IF NOT EXISTS idx_snagging_item_id
  ON public.snagging(item_id)
  WHERE item_id IS NOT NULL;

-- resolved_by references users(id) - nullable
CREATE INDEX IF NOT EXISTS idx_snagging_resolved_by
  ON public.snagging(resolved_by)
  WHERE resolved_by IS NOT NULL;

-- ============================================
-- Verification Query
-- ============================================
-- Run this to verify indexes were created:
--
-- SELECT
--   schemaname,
--   tablename,
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND indexname LIKE 'idx_%'
-- ORDER BY tablename, indexname;
--
-- ============================================

-- ============================================
-- DONE! 15 foreign key indexes added
-- ============================================
--
-- Indexes created:
-- 1.  idx_drawing_revisions_uploaded_by
-- 2.  idx_drawings_approved_by
-- 3.  idx_drawings_pm_override_by
-- 4.  idx_materials_approved_by
-- 5.  idx_notifications_drawing_id
-- 6.  idx_notifications_item_id
-- 7.  idx_notifications_material_id
-- 8.  idx_notifications_project_id
-- 9.  idx_notifications_report_id
-- 10. idx_project_assignments_assigned_by
-- 11. idx_projects_created_by
-- 12. idx_reports_created_by
-- 13. idx_snagging_created_by
-- 14. idx_snagging_item_id
-- 15. idx_snagging_resolved_by
--
-- Note: Partial indexes (WHERE ... IS NOT NULL) are used for
-- nullable FK columns to save space and improve performance.
-- ============================================
