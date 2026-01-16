-- ============================================
-- Fix Function Search Paths Migration
-- Addresses Supabase Advisor Security Warning:
-- "Function Search Path Mutable"
-- ============================================
--
-- Problem: Functions without a fixed search_path can be vulnerable to
-- schema injection attacks where an attacker creates objects in a
-- different schema that gets resolved before the intended objects.
--
-- Solution: Add SET search_path = public to all functions.
-- This ensures predictable behavior regardless of caller's search_path.
-- ============================================

-- ============================================
-- 1. Fix update_updated_at() function
-- ============================================
-- Trigger function for auto-updating updated_at timestamp

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_updated_at() IS
  'Trigger function to auto-update updated_at timestamp. Search path secured.';

-- ============================================
-- 2. Fix calculate_item_total() function
-- ============================================
-- Trigger function for calculating scope_item total_price

CREATE OR REPLACE FUNCTION public.calculate_item_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.total_price = COALESCE(NEW.unit_price, 0) * COALESCE(NEW.quantity, 1);
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.calculate_item_total() IS
  'Trigger function to calculate total_price from unit_price * quantity. Search path secured.';

-- ============================================
-- 3. Fix get_user_role() function
-- ============================================
-- SECURITY DEFINER helper for RLS policies
-- Must use SECURITY DEFINER to allow RLS policies to check user roles

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$;

COMMENT ON FUNCTION public.get_user_role() IS
  'Returns the role of the current authenticated user. SECURITY DEFINER allows RLS policies to check roles. Search path secured.';

-- ============================================
-- 4. Fix is_assigned_to_project() function
-- ============================================
-- SECURITY DEFINER helper for RLS policies
-- Checks if current user is assigned to a specific project

CREATE OR REPLACE FUNCTION public.is_assigned_to_project(project_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_assignments
    WHERE project_id = project_uuid AND user_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION public.is_assigned_to_project(UUID) IS
  'Checks if the current user is assigned to the given project. SECURITY DEFINER allows RLS policies to verify assignments. Search path secured.';

-- ============================================
-- 5. Fix is_client_for_project() function
-- ============================================
-- SECURITY DEFINER helper for client-specific checks

CREATE OR REPLACE FUNCTION public.is_client_for_project(project_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM users u
    JOIN project_assignments pa ON pa.user_id = u.id
    WHERE u.id = auth.uid()
    AND u.role = 'client'
    AND pa.project_id = project_uuid
  );
END;
$$;

COMMENT ON FUNCTION public.is_client_for_project(UUID) IS
  'Checks if the current user is assigned as a client to the given project. SECURITY DEFINER allows secure role verification. Search path secured.';

-- ============================================
-- Verification Query
-- ============================================
-- Run this after migration to verify search_path is set:
--
-- SELECT
--   proname AS function_name,
--   proconfig AS config_settings
-- FROM pg_proc
-- WHERE proname IN (
--   'update_updated_at',
--   'calculate_item_total',
--   'get_user_role',
--   'is_assigned_to_project',
--   'is_client_for_project'
-- )
-- AND pronamespace = 'public'::regnamespace;
--
-- Expected: All functions should show search_path=public in config_settings
-- ============================================

-- ============================================
-- DONE! 5 functions updated with fixed search_path
-- ============================================
