-- ============================================================================
-- Migration 024: Report Codes Include Project Code
--
-- Changes report_code format from RPT-YYYY-NNNN to {PROJECT_CODE}-RPT-NNN
-- This makes reports immediately identifiable by project.
--
-- Example: PRJ-001-RPT-001, PRJ-001-RPT-002, PRJ-002-RPT-001
-- ============================================================================

-- 1. Create function to generate report code with project context
CREATE OR REPLACE FUNCTION generate_report_code(p_project_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_project_code TEXT;
  v_next_num INTEGER;
  v_lock_id BIGINT;
BEGIN
  -- Get project code
  SELECT project_code INTO v_project_code
  FROM projects
  WHERE id = p_project_id;

  IF v_project_code IS NULL THEN
    -- Fallback if project not found (shouldn't happen due to FK constraint)
    RETURN 'RPT-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(nextval('seq_report_' || EXTRACT(YEAR FROM NOW())::TEXT)::TEXT, 4, '0');
  END IF;

  -- Generate a unique lock ID based on project (to prevent race conditions within same project)
  v_lock_id := hashtext('report_' || p_project_id::TEXT)::BIGINT;

  -- Acquire advisory lock for this project's reports
  PERFORM pg_advisory_xact_lock(v_lock_id);

  -- Count existing reports for this project and add 1
  SELECT COALESCE(MAX(
    CASE
      WHEN report_code ~ '-RPT-[0-9]+$' THEN
        NULLIF(SUBSTRING(report_code FROM '-RPT-([0-9]+)$'), '')::INTEGER
      ELSE 0
    END
  ), 0) + 1
  INTO v_next_num
  FROM reports
  WHERE project_id = p_project_id
    AND report_code IS NOT NULL;

  -- Format: {PROJECT_CODE}-RPT-{NNN}
  RETURN v_project_code || '-RPT-' || LPAD(v_next_num::TEXT, 3, '0');
END;
$$;

COMMENT ON FUNCTION generate_report_code IS 'Generates report code in format {PROJECT_CODE}-RPT-NNN';

-- 2. Update the trigger function to use project-based code generation
CREATE OR REPLACE FUNCTION set_report_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.report_code IS NULL AND NEW.project_id IS NOT NULL THEN
    NEW.report_code := generate_report_code(NEW.project_id);
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION set_report_code IS 'Auto-generates report_code on insert using project code prefix';

-- 3. Backfill existing reports with new format
-- Update reports that have old format (RPT-YYYY-NNNN) to new format ({PROJECT_CODE}-RPT-NNN)
DO $$
DECLARE
  v_project RECORD;
  v_report RECORD;
  v_counter INTEGER;
BEGIN
  -- Process each project
  FOR v_project IN
    SELECT DISTINCT p.id, p.project_code
    FROM projects p
    INNER JOIN reports r ON r.project_id = p.id
    WHERE p.project_code IS NOT NULL
    ORDER BY p.project_code
  LOOP
    v_counter := 0;

    -- Process each report in this project (ordered by creation date)
    FOR v_report IN
      SELECT id
      FROM reports
      WHERE project_id = v_project.id
      ORDER BY created_at, id
    LOOP
      v_counter := v_counter + 1;

      UPDATE reports
      SET report_code = v_project.project_code || '-RPT-' || LPAD(v_counter::TEXT, 3, '0')
      WHERE id = v_report.id;
    END LOOP;

    RAISE NOTICE 'Updated % reports for project %', v_counter, v_project.project_code;
  END LOOP;
END;
$$;

-- 4. Update the v_reports view to handle new format
CREATE OR REPLACE VIEW v_reports AS
SELECT
  r.id,
  COALESCE(r.report_code, 'RPT-???') AS report_code,
  r.report_type,
  p.project_code,
  p.name AS project_name,
  COALESCE(c.employee_code, '-') AS creator_code,
  c.name AS created_by_name,
  r.is_published,
  CASE WHEN r.is_published THEN 'Published' ELSE 'Draft' END AS status,
  r.share_with_client,
  r.share_internal,
  (SELECT COUNT(*) FROM report_lines WHERE report_id = r.id) AS line_count,
  r.published_at,
  r.created_at,
  r.updated_at
FROM reports r
JOIN projects p ON r.project_id = p.id
LEFT JOIN users c ON r.created_by = c.id
ORDER BY r.created_at DESC;

COMMENT ON VIEW v_reports IS 'Human-readable view of reports with project-based codes';

-- 5. Update v_report_lines view
CREATE OR REPLACE VIEW v_report_lines AS
SELECT
  rl.id,
  COALESCE(r.report_code, 'RPT-???') AS report_code,
  r.report_type,
  COALESCE(p.project_code, 'PRJ-???') AS project_code,
  p.name AS project_name,
  rl.line_order,
  rl.title,
  LEFT(rl.description, 100) AS description_preview,
  COALESCE(jsonb_array_length(rl.photos), 0) AS photo_count,
  rl.created_at
FROM report_lines rl
JOIN reports r ON rl.report_id = r.id
JOIN projects p ON r.project_id = p.id
ORDER BY rl.created_at DESC;

COMMENT ON VIEW v_report_lines IS 'Human-readable view of report lines with project-based report codes';
