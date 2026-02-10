-- ============================================================================
-- Migration 042: Restrict Client Access to Users and Clients (PII)
-- Purpose: Prevent client users from seeing all internal users/clients
--
-- Affected tables:
-- - users
-- - clients
-- ============================================================================

BEGIN;

-- ============================================================================
-- USERS: Restrict client visibility to project team only
-- ============================================================================

-- Drop any prior user view policies (names vary across migrations)
DROP POLICY IF EXISTS "Users can view users" ON public.users;
DROP POLICY IF EXISTS "Users can view all active users" ON public.users;

CREATE POLICY "Users can view users" ON public.users
FOR SELECT
USING (
  -- Internal roles can view all active users
  (
    (SELECT get_user_role()) IN ('admin', 'pm', 'production', 'procurement', 'management')
    AND is_active = true
  )
  -- Any user can see their own record
  OR id = (SELECT auth.uid())
  -- Clients can only see users assigned to their projects
  OR (
    (SELECT get_user_role()) = 'client'
    AND EXISTS (
      SELECT 1
      FROM public.project_assignments pa_client
      JOIN public.project_assignments pa_team
        ON pa_team.project_id = pa_client.project_id
      WHERE pa_client.user_id = (SELECT auth.uid())
        AND pa_team.user_id = users.id
    )
  )
);

COMMENT ON POLICY "Users can view users" ON public.users IS
  'Internal roles can view all active users; clients can only view their project team; users can view their own record.';

-- ============================================================================
-- CLIENTS: Restrict clients to their own company
-- ============================================================================

DROP POLICY IF EXISTS "View clients" ON public.clients;

CREATE POLICY "View clients" ON public.clients
FOR SELECT
USING (
  NOT is_deleted AND (
    -- Internal roles can view all clients
    (SELECT get_user_role()) IN ('admin', 'pm', 'production', 'procurement', 'management')
    -- Clients can only see client companies for their assigned projects
    OR id IN (
      SELECT p.client_id
      FROM public.project_assignments pa
      JOIN public.projects p ON p.id = pa.project_id
      WHERE pa.user_id = (SELECT auth.uid())
        AND p.client_id IS NOT NULL
    )
  )
);

COMMENT ON POLICY "View clients" ON public.clients IS
  'Internal roles can view all clients; client users can only view their own company.';

COMMIT;

-- ============================================================================
-- DONE
-- ============================================================================
