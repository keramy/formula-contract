-- ============================================================================
-- Migration 021: Add Human-Readable Code Columns
--
-- Adds code columns to tables and backfills existing data:
-- - reports.report_code (RPT-YYYY-NNNN)
-- - clients.client_code (CLT-NNNN)
-- - users.employee_code (EMP-NNNN)
-- - milestones.milestone_code (MS-NNNN)
-- ============================================================================

-- 1. Add columns (nullable first for safe backfill)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS report_code TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_code TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_code TEXT;
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS milestone_code TEXT;

-- 2. Create partial unique indexes (allows NULLs during migration)
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_report_code
  ON reports(report_code) WHERE report_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_client_code
  ON clients(client_code) WHERE client_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_employee_code
  ON users(employee_code) WHERE employee_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_milestones_milestone_code
  ON milestones(milestone_code) WHERE milestone_code IS NOT NULL;

-- 3. Backfill existing reports (year-based numbering)
WITH numbered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY EXTRACT(YEAR FROM created_at)
      ORDER BY created_at, id
    ) as rn,
    EXTRACT(YEAR FROM created_at)::INTEGER as yr
  FROM reports
  WHERE report_code IS NULL
)
UPDATE reports r
SET report_code = 'RPT-' || n.yr::TEXT || '-' || LPAD(n.rn::TEXT, 4, '0')
FROM numbered n
WHERE r.id = n.id;

-- 4. Backfill existing clients (global numbering)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) as rn
  FROM clients
  WHERE client_code IS NULL
)
UPDATE clients c
SET client_code = 'CLT-' || LPAD(n.rn::TEXT, 4, '0')
FROM numbered n
WHERE c.id = n.id;

-- 5. Backfill existing users (global numbering)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) as rn
  FROM users
  WHERE employee_code IS NULL
)
UPDATE users u
SET employee_code = 'EMP-' || LPAD(n.rn::TEXT, 4, '0')
FROM numbered n
WHERE u.id = n.id;

-- 6. Backfill existing milestones (global numbering)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) as rn
  FROM milestones
  WHERE milestone_code IS NULL
)
UPDATE milestones m
SET milestone_code = 'MS-' || LPAD(n.rn::TEXT, 4, '0')
FROM numbered n
WHERE m.id = n.id;

-- 7. Sync sequences to current max values
DO $$
DECLARE
  v_max_client BIGINT;
  v_max_user BIGINT;
  v_max_milestone BIGINT;
  v_year INTEGER;
  v_max_report BIGINT;
  v_seq_name TEXT;
BEGIN
  -- Sync client sequence
  SELECT COALESCE(MAX(
    NULLIF(regexp_replace(client_code, '[^0-9]', '', 'g'), '')::BIGINT
  ), 0) INTO v_max_client FROM clients WHERE client_code IS NOT NULL;

  IF v_max_client > 0 THEN
    PERFORM setval('seq_client', v_max_client);
    RAISE NOTICE 'Set seq_client to %', v_max_client;
  END IF;

  -- Sync user sequence
  SELECT COALESCE(MAX(
    NULLIF(regexp_replace(employee_code, '[^0-9]', '', 'g'), '')::BIGINT
  ), 0) INTO v_max_user FROM users WHERE employee_code IS NOT NULL;

  IF v_max_user > 0 THEN
    PERFORM setval('seq_user', v_max_user);
    RAISE NOTICE 'Set seq_user to %', v_max_user;
  END IF;

  -- Sync milestone sequence
  SELECT COALESCE(MAX(
    NULLIF(regexp_replace(milestone_code, '[^0-9]', '', 'g'), '')::BIGINT
  ), 0) INTO v_max_milestone FROM milestones WHERE milestone_code IS NOT NULL;

  IF v_max_milestone > 0 THEN
    PERFORM setval('seq_milestone', v_max_milestone);
    RAISE NOTICE 'Set seq_milestone to %', v_max_milestone;
  END IF;

  -- Sync report sequences (per year)
  v_year := EXTRACT(YEAR FROM NOW())::INTEGER;

  SELECT COALESCE(MAX(
    NULLIF(SUBSTRING(report_code FROM '[0-9]+$'), '')::BIGINT
  ), 0) INTO v_max_report
  FROM reports
  WHERE report_code LIKE 'RPT-' || v_year || '-%';

  IF v_max_report > 0 THEN
    -- Create this year's sequence if needed
    v_seq_name := get_year_sequence('report', v_year);
    EXECUTE format('SELECT setval(%L, %s)', v_seq_name, v_max_report);
    RAISE NOTICE 'Set % to %', v_seq_name, v_max_report;
  END IF;

  -- Also sync any previous years that have reports
  FOR v_year IN (
    SELECT DISTINCT EXTRACT(YEAR FROM created_at)::INTEGER as yr
    FROM reports
    WHERE report_code IS NOT NULL
      AND EXTRACT(YEAR FROM created_at) < EXTRACT(YEAR FROM NOW())
    ORDER BY yr
  ) LOOP
    SELECT COALESCE(MAX(
      NULLIF(SUBSTRING(report_code FROM '[0-9]+$'), '')::BIGINT
    ), 0) INTO v_max_report
    FROM reports
    WHERE report_code LIKE 'RPT-' || v_year || '-%';

    IF v_max_report > 0 THEN
      v_seq_name := get_year_sequence('report', v_year);
      EXECUTE format('SELECT setval(%L, %s)', v_seq_name, v_max_report);
      RAISE NOTICE 'Set % to %', v_seq_name, v_max_report;
    END IF;
  END LOOP;
END;
$$;

-- 8. Add comments for documentation
COMMENT ON COLUMN reports.report_code IS 'Human-readable report code (RPT-YYYY-NNNN)';
COMMENT ON COLUMN clients.client_code IS 'Human-readable client code (CLT-NNNN)';
COMMENT ON COLUMN users.employee_code IS 'Human-readable employee code (EMP-NNNN)';
COMMENT ON COLUMN milestones.milestone_code IS 'Human-readable milestone code (MS-NNNN)';
