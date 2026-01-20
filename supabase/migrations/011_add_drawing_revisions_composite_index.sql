-- Migration: Add composite index for drawing_revisions ORDER BY optimization
-- Purpose: Speed up queries that fetch revisions by drawing_id ordered by created_at
--
-- Problem: The query `SELECT ... FROM drawing_revisions WHERE drawing_id = ? ORDER BY created_at DESC`
-- has an index on drawing_id but no covering index for the ORDER BY clause.
-- This causes PostgreSQL to find rows by drawing_id (fast) then sort them (slow).
--
-- Solution: Create a composite index on (drawing_id, created_at DESC) so PostgreSQL
-- can satisfy both the WHERE and ORDER BY from the index without sorting.

-- Create composite index for efficient revision lookups with ordering
CREATE INDEX IF NOT EXISTS idx_drawing_revisions_drawing_created
ON drawing_revisions(drawing_id, created_at DESC);

-- Comment for documentation
COMMENT ON INDEX idx_drawing_revisions_drawing_created IS
  'Composite index for efficient revision lookups ordered by creation date (newest first)';
