-- ============================================================================
-- Migration 059: Fix recursive RLS — SECURITY DEFINER on helper functions
-- Applied live: Apr 3, 2026
--
-- ROOT CAUSE: get_user_role() and is_assigned_to_project() were NOT
-- SECURITY DEFINER. When called from RLS policies, they executed as the
-- authenticated role, which triggered RLS on the tables they queried,
-- creating infinite recursion → "stack depth limit exceeded" errors.
--
-- This caused ALL authenticated app queries to fail while direct SQL
-- and service_role queries worked fine. The app appeared broken (empty
-- dashboard, timeouts, IO budget depletion from retried failing queries).
--
-- Fix: ALTER FUNCTION to SECURITY DEFINER so these helpers bypass RLS
-- when called from within RLS policies, breaking the recursion cycle.
-- ============================================================================

-- get_user_role() queries public.users which has RLS using get_user_role() → recursion
ALTER FUNCTION public.get_user_role() SECURITY DEFINER;

-- is_assigned_to_project() queries public.project_assignments which has RLS
-- using is_assigned_to_project() → recursion
-- Also queries public.users internally (for admin/management check) → double recursion
ALTER FUNCTION public.is_assigned_to_project(uuid) SECURITY DEFINER;

-- Also changed statement timeouts (separate from recursion fix):
-- ALTER ROLE authenticated SET statement_timeout = '30s';  -- was 8s
-- ALTER ROLE authenticator SET statement_timeout = '30s';  -- was 8s
-- ALTER ROLE authenticator SET lock_timeout = '30s';       -- was 8s

-- Synced user names to JWT metadata for layout display:
-- UPDATE auth.users au
-- SET raw_user_meta_data = COALESCE(au.raw_user_meta_data, '{}'::jsonb)
--   || jsonb_build_object('name', pu.name)
-- FROM public.users pu
-- WHERE pu.id = au.id AND pu.name IS NOT NULL
-- AND (au.raw_user_meta_data->>'name' IS NULL);
