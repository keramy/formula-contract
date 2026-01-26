-- ============================================================================
-- Migration 020: Human-Readable Codes Infrastructure
--
-- Creates the foundation for human-readable entity codes:
-- - Sequence metadata table for configuration
-- - Native PostgreSQL sequences for thread-safe counters
-- - Code generation function with advisory locks
-- ============================================================================

-- 1. Create sequence metadata table (tracks code configuration per entity)
CREATE TABLE IF NOT EXISTS public.sequence_metadata (
  entity_type TEXT PRIMARY KEY,
  prefix TEXT NOT NULL,
  is_year_based BOOLEAN DEFAULT false,
  padding_length INTEGER DEFAULT 4,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comment for documentation
COMMENT ON TABLE public.sequence_metadata IS 'Configuration for human-readable code generation per entity type';

-- 2. Seed metadata for each entity type
INSERT INTO sequence_metadata (entity_type, prefix, is_year_based, padding_length) VALUES
  ('report', 'RPT', true, 4),
  ('client', 'CLT', false, 4),
  ('user', 'EMP', false, 4),
  ('milestone', 'MS', false, 4)
ON CONFLICT (entity_type) DO NOTHING;

-- 3. Create non-year-based sequences (global counters)
CREATE SEQUENCE IF NOT EXISTS seq_client START 1;
CREATE SEQUENCE IF NOT EXISTS seq_user START 1;
CREATE SEQUENCE IF NOT EXISTS seq_milestone START 1;

-- 4. Function to get or create year-based sequence
-- This auto-creates a new sequence for each year (e.g., seq_report_2026)
CREATE OR REPLACE FUNCTION get_year_sequence(p_entity_type TEXT, p_year INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_seq_name TEXT;
BEGIN
  v_seq_name := 'seq_' || p_entity_type || '_' || p_year::TEXT;

  -- Create sequence if it doesn't exist (handles new year transitions)
  IF NOT EXISTS (
    SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = v_seq_name
  ) THEN
    EXECUTE format('CREATE SEQUENCE IF NOT EXISTS %I START 1', v_seq_name);
  END IF;

  RETURN v_seq_name;
END;
$$;

COMMENT ON FUNCTION get_year_sequence IS 'Gets or creates a year-specific sequence for entity types with yearly numbering';

-- 5. Main code generation function (thread-safe with advisory lock)
CREATE OR REPLACE FUNCTION generate_entity_code(p_entity_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_meta sequence_metadata%ROWTYPE;
  v_next_val BIGINT;
  v_year INTEGER;
  v_seq_name TEXT;
  v_code TEXT;
  v_lock_id BIGINT;
BEGIN
  -- Get metadata for this entity type
  SELECT * INTO v_meta FROM sequence_metadata WHERE entity_type = p_entity_type;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown entity type: %', p_entity_type;
  END IF;

  -- Generate a unique lock ID based on entity type (hash to bigint)
  -- This ensures only one transaction generates a code for this entity type at a time
  v_lock_id := hashtext(p_entity_type)::BIGINT;

  -- Acquire advisory lock to prevent race conditions
  -- Lock is automatically released at end of transaction
  PERFORM pg_advisory_xact_lock(v_lock_id);

  IF v_meta.is_year_based THEN
    -- Year-based sequence (e.g., RPT-2026-0001)
    v_year := EXTRACT(YEAR FROM NOW())::INTEGER;
    v_seq_name := get_year_sequence(p_entity_type, v_year);
    EXECUTE format('SELECT nextval(%L)', v_seq_name) INTO v_next_val;
    v_code := v_meta.prefix || '-' || v_year::TEXT || '-' || LPAD(v_next_val::TEXT, v_meta.padding_length, '0');
  ELSE
    -- Global sequence (e.g., CLT-0001)
    v_seq_name := 'seq_' || p_entity_type;
    EXECUTE format('SELECT nextval(%L)', v_seq_name) INTO v_next_val;
    v_code := v_meta.prefix || '-' || LPAD(v_next_val::TEXT, v_meta.padding_length, '0');
  END IF;

  RETURN v_code;
END;
$$;

COMMENT ON FUNCTION generate_entity_code IS 'Generates a unique human-readable code for an entity type. Thread-safe via advisory locks.';

-- 6. RLS policy for sequence_metadata (admin read-only for now)
ALTER TABLE sequence_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read sequence metadata"
  ON sequence_metadata
  FOR SELECT
  TO authenticated
  USING (true);

-- Only allow system/migrations to modify
CREATE POLICY "Deny modifications to sequence metadata"
  ON sequence_metadata
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);
