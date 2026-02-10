-- ============================================================================
-- Migration 046: Allow clients to approve/reject drawings
-- ============================================================================
--
-- Problem: The "Update drawings" and "Update scope items" RLS policies
-- (from migration 006) only allow admin/pm/production roles. Clients
-- assigned to a project cannot update drawing status during the approval
-- flow, causing silent failures (0 rows affected, no error).
--
-- Fix: Add client-specific UPDATE policies restricted to their projects.
-- Uses a SECURITY DEFINER helper to look up the project_id from scope_items
-- to avoid RLS evaluation issues in the policy subquery.
-- ============================================================================

-- Helper function: get project_id from a scope item (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.get_item_project_id(scope_item_uuid uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT project_id FROM public.scope_items WHERE id = scope_item_uuid;
$$;

-- 1. Allow clients to UPDATE drawings for projects they are assigned to.
CREATE POLICY "Client update drawings for approval" ON public.drawings
  FOR UPDATE
  USING (
    (SELECT get_user_role()) = 'client'
    AND is_assigned_to_project(get_item_project_id(item_id))
  );

-- 2. Allow clients to UPDATE scope_items for projects they are assigned to.
CREATE POLICY "Client update scope items for approval" ON public.scope_items
  FOR UPDATE
  USING (
    (SELECT get_user_role()) = 'client'
    AND is_assigned_to_project(project_id)
  );
