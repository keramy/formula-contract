-- ============================================================================
-- Migration 063: Finance Documents Storage RLS Policies
-- ============================================================================
-- The finance-documents bucket existed but had no RLS policies,
-- causing all uploads to be silently blocked.
-- Uses has_finance_access() (SECURITY DEFINER) to gate access.
-- ============================================================================

-- Finance users can upload documents
CREATE POLICY "Finance users can upload finance-documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'finance-documents'
  AND has_finance_access()
);

-- Finance users can read documents
CREATE POLICY "Finance users can read finance-documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'finance-documents'
  AND has_finance_access()
);

-- Finance users can update documents
CREATE POLICY "Finance users can update finance-documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'finance-documents'
  AND has_finance_access()
);

-- Finance users can delete documents
CREATE POLICY "Finance users can delete finance-documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'finance-documents'
  AND has_finance_access()
);
