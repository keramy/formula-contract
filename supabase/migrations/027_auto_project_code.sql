-- Migration: Auto-generate sequential project codes
-- Description: Creates a sequence and function to automatically generate project codes (2601, 2602, etc.)

-- Step 1: Find the current maximum project code to set the sequence start
-- We'll use a DO block to dynamically set the start value
DO $$
DECLARE
  max_code INTEGER;
  next_val INTEGER;
BEGIN
  -- Get the maximum numeric project code
  SELECT COALESCE(MAX(NULLIF(regexp_replace(project_code, '[^0-9]', '', 'g'), '')::INTEGER), 2600)
  INTO max_code
  FROM projects
  WHERE project_code ~ '^[0-9]+$'; -- Only consider purely numeric codes

  next_val := max_code + 1;

  -- Create or reset the sequence
  IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'project_code_seq') THEN
    EXECUTE format('ALTER SEQUENCE project_code_seq RESTART WITH %s', next_val);
  ELSE
    EXECUTE format('CREATE SEQUENCE project_code_seq START WITH %s INCREMENT BY 1', next_val);
  END IF;
END $$;

-- Step 2: Create function to get next project code
CREATE OR REPLACE FUNCTION get_next_project_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN nextval('project_code_seq')::TEXT;
END $$;

-- Step 3: Create function to preview next project code (without consuming it)
CREATE OR REPLACE FUNCTION preview_next_project_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  next_code INTEGER;
BEGIN
  -- Get current value + 1 without consuming the sequence
  SELECT last_value + 1 INTO next_code FROM project_code_seq;
  RETURN next_code::TEXT;
END $$;

-- Step 4: Create trigger to auto-fill project_code if empty
CREATE OR REPLACE FUNCTION auto_fill_project_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only auto-generate if project_code is NULL or empty
  IF NEW.project_code IS NULL OR TRIM(NEW.project_code) = '' THEN
    NEW.project_code := get_next_project_code();
  END IF;
  RETURN NEW;
END $$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_auto_project_code ON projects;

-- Create the trigger (BEFORE INSERT)
CREATE TRIGGER trigger_auto_project_code
  BEFORE INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_project_code();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_next_project_code() TO authenticated;
GRANT EXECUTE ON FUNCTION preview_next_project_code() TO authenticated;
GRANT USAGE ON SEQUENCE project_code_seq TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_next_project_code() IS 'Returns the next sequential project code and increments the sequence';
COMMENT ON FUNCTION preview_next_project_code() IS 'Returns what the next project code will be without consuming it';
COMMENT ON FUNCTION auto_fill_project_code() IS 'Trigger function to auto-generate project code if not provided';
