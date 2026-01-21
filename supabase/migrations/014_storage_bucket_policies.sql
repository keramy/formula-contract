-- Migration: Add Storage Bucket RLS Policies
-- Purpose: Allow authenticated users to upload/download files from storage buckets
--
-- This migration:
-- 1. Creates missing scope-items bucket
-- 2. Adds RLS policies for all storage buckets (drawings, materials, reports, snagging, scope-items)

-- ============================================================================
-- STEP 1: Create missing scope-items bucket
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('scope-items', 'scope-items', false)
ON CONFLICT (id) DO NOTHING;

-- Ensure all buckets exist (in case any were deleted)
INSERT INTO storage.buckets (id, name, public) VALUES ('drawings', 'drawings', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('materials', 'materials', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'reports', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('snagging', 'snagging', false) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STEP 2: Drop existing storage policies if any (clean slate)
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
-- STEP 3: Create storage policies for DRAWINGS bucket
-- ============================================================================

CREATE POLICY "Authenticated users can upload drawings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'drawings');

CREATE POLICY "Authenticated users can read drawings"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'drawings');

CREATE POLICY "Authenticated users can update drawings"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'drawings');

CREATE POLICY "Authenticated users can delete drawings"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'drawings');

-- ============================================================================
-- STEP 4: Create storage policies for MATERIALS bucket
-- ============================================================================

CREATE POLICY "Authenticated users can upload materials"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'materials');

CREATE POLICY "Authenticated users can read materials"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'materials');

CREATE POLICY "Authenticated users can update materials"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'materials');

CREATE POLICY "Authenticated users can delete materials"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'materials');

-- ============================================================================
-- STEP 5: Create storage policies for REPORTS bucket
-- ============================================================================

CREATE POLICY "Authenticated users can upload reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'reports');

CREATE POLICY "Authenticated users can read reports"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'reports');

CREATE POLICY "Authenticated users can update reports"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'reports');

CREATE POLICY "Authenticated users can delete reports"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'reports');

-- ============================================================================
-- STEP 6: Create storage policies for SNAGGING bucket
-- ============================================================================

CREATE POLICY "Authenticated users can upload snagging"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'snagging');

CREATE POLICY "Authenticated users can read snagging"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'snagging');

CREATE POLICY "Authenticated users can update snagging"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'snagging');

CREATE POLICY "Authenticated users can delete snagging"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'snagging');

-- ============================================================================
-- STEP 7: Create storage policies for SCOPE-ITEMS bucket
-- ============================================================================

CREATE POLICY "Authenticated users can upload scope-items"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'scope-items');

CREATE POLICY "Authenticated users can read scope-items"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'scope-items');

CREATE POLICY "Authenticated users can update scope-items"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'scope-items');

CREATE POLICY "Authenticated users can delete scope-items"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'scope-items');

-- ============================================================================
-- DONE! Storage policies created for all buckets.
-- All authenticated users can now upload/download files.
-- The actual data access is still controlled by database table RLS policies.
-- ============================================================================
