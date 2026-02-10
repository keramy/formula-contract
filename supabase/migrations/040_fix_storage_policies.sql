-- ============================================================================
-- Migration 040: Harden Storage Bucket RLS Policies
-- Purpose: Prevent cross-project access to storage objects
--
-- Security fix:
-- - Extract project_id from object name (path) and enforce project assignment
-- - Applies to drawings, materials, reports, snagging, scope-items buckets
--
-- Expected object path format:
--   drawings/{project_id}/{item_id}/...
--   materials/{project_id}/{material_id}/...
--   reports/{project_id}/{report_id}/...
--   snagging/{project_id}/{snag_id}/...
--   scope-items/{project_id}/{item_id}/...
-- ============================================================================

-- ============================================================================
-- STEP 1: Helper function to parse project_id from object name
-- ============================================================================

CREATE OR REPLACE FUNCTION public.storage_project_id(object_name text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  part text;
BEGIN
  part := split_part(object_name, '/', 1);

  -- Validate UUID format before casting to avoid runtime errors
  IF part ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN part::uuid;
  END IF;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.storage_project_id(text) IS
  'Extracts project_id (UUID) from storage object path. Returns NULL if invalid.';

-- ============================================================================
-- STEP 2: Drop existing permissive storage policies
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can upload drawings" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read drawings" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update drawings" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete drawings" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can upload materials" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read materials" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update materials" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete materials" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can upload reports" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read reports" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update reports" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete reports" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can upload snagging" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read snagging" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update snagging" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete snagging" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can upload scope-items" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read scope-items" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update scope-items" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete scope-items" ON storage.objects;

-- ============================================================================
-- STEP 3: Create scoped storage policies (project-based access)
-- ============================================================================

-- DRAWINGS bucket
CREATE POLICY "Authenticated users can upload drawings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'drawings'
  AND is_assigned_to_project(storage_project_id(name))
);

CREATE POLICY "Authenticated users can read drawings"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'drawings'
  AND is_assigned_to_project(storage_project_id(name))
);

CREATE POLICY "Authenticated users can update drawings"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'drawings'
  AND is_assigned_to_project(storage_project_id(name))
);

CREATE POLICY "Authenticated users can delete drawings"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'drawings'
  AND is_assigned_to_project(storage_project_id(name))
);

-- MATERIALS bucket
CREATE POLICY "Authenticated users can upload materials"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'materials'
  AND is_assigned_to_project(storage_project_id(name))
);

CREATE POLICY "Authenticated users can read materials"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'materials'
  AND is_assigned_to_project(storage_project_id(name))
);

CREATE POLICY "Authenticated users can update materials"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'materials'
  AND is_assigned_to_project(storage_project_id(name))
);

CREATE POLICY "Authenticated users can delete materials"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'materials'
  AND is_assigned_to_project(storage_project_id(name))
);

-- REPORTS bucket
CREATE POLICY "Authenticated users can upload reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'reports'
  AND is_assigned_to_project(storage_project_id(name))
);

CREATE POLICY "Authenticated users can read reports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'reports'
  AND is_assigned_to_project(storage_project_id(name))
);

CREATE POLICY "Authenticated users can update reports"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'reports'
  AND is_assigned_to_project(storage_project_id(name))
);

CREATE POLICY "Authenticated users can delete reports"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'reports'
  AND is_assigned_to_project(storage_project_id(name))
);

-- SNAGGING bucket
CREATE POLICY "Authenticated users can upload snagging"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'snagging'
  AND is_assigned_to_project(storage_project_id(name))
);

CREATE POLICY "Authenticated users can read snagging"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'snagging'
  AND is_assigned_to_project(storage_project_id(name))
);

CREATE POLICY "Authenticated users can update snagging"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'snagging'
  AND is_assigned_to_project(storage_project_id(name))
);

CREATE POLICY "Authenticated users can delete snagging"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'snagging'
  AND is_assigned_to_project(storage_project_id(name))
);

-- SCOPE-ITEMS bucket
CREATE POLICY "Authenticated users can upload scope-items"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'scope-items'
  AND is_assigned_to_project(storage_project_id(name))
);

CREATE POLICY "Authenticated users can read scope-items"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'scope-items'
  AND is_assigned_to_project(storage_project_id(name))
);

CREATE POLICY "Authenticated users can update scope-items"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'scope-items'
  AND is_assigned_to_project(storage_project_id(name))
);

CREATE POLICY "Authenticated users can delete scope-items"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'scope-items'
  AND is_assigned_to_project(storage_project_id(name))
);

-- ============================================================================
-- DONE
-- ============================================================================
