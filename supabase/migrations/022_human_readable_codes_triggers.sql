-- ============================================================================
-- Migration 022: Auto-Generation Triggers for Human-Readable Codes
--
-- Creates BEFORE INSERT triggers that automatically generate codes
-- for new records when the code column is NULL.
-- ============================================================================

-- 1. Reports trigger function
CREATE OR REPLACE FUNCTION set_report_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.report_code IS NULL THEN
    NEW.report_code := generate_entity_code('report');
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION set_report_code IS 'Auto-generates report_code on insert if not provided';

DROP TRIGGER IF EXISTS tr_reports_set_code ON reports;
CREATE TRIGGER tr_reports_set_code
  BEFORE INSERT ON reports
  FOR EACH ROW
  EXECUTE FUNCTION set_report_code();

-- 2. Clients trigger function
CREATE OR REPLACE FUNCTION set_client_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.client_code IS NULL THEN
    NEW.client_code := generate_entity_code('client');
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION set_client_code IS 'Auto-generates client_code on insert if not provided';

DROP TRIGGER IF EXISTS tr_clients_set_code ON clients;
CREATE TRIGGER tr_clients_set_code
  BEFORE INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION set_client_code();

-- 3. Users trigger function
CREATE OR REPLACE FUNCTION set_employee_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.employee_code IS NULL THEN
    NEW.employee_code := generate_entity_code('user');
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION set_employee_code IS 'Auto-generates employee_code on insert if not provided';

DROP TRIGGER IF EXISTS tr_users_set_code ON users;
CREATE TRIGGER tr_users_set_code
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_employee_code();

-- 4. Milestones trigger function
CREATE OR REPLACE FUNCTION set_milestone_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.milestone_code IS NULL THEN
    NEW.milestone_code := generate_entity_code('milestone');
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION set_milestone_code IS 'Auto-generates milestone_code on insert if not provided';

DROP TRIGGER IF EXISTS tr_milestones_set_code ON milestones;
CREATE TRIGGER tr_milestones_set_code
  BEFORE INSERT ON milestones
  FOR EACH ROW
  EXECUTE FUNCTION set_milestone_code();
