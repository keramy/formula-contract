# Database Readability Improvement Plan (v2)

## Problem Statement
When looking at database tables in Supabase Studio, UUIDs make it impossible to understand relationships between records. You can't tell which report belongs to which project, or which user received a notification.

## Solution: Human-Readable Codes + Admin Views

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE STRUCTURE                        │
├─────────────────────────────────────────────────────────────┤
│  TABLES (with UUIDs + Human Codes)                          │
│  ├── projects      → project_code  (PRJ-2026-001) ✅ EXISTS │
│  ├── scope_items   → item_code     (ITEM-001)     ✅ EXISTS │
│  ├── reports       → report_code   (RPT-2026-001) 🆕        │
│  ├── clients       → client_code   (CLT-001)      🆕        │
│  ├── users         → employee_code (EMP-001)      🆕        │
│  └── milestones    → milestone_code(MS-001)       🆕        │
├─────────────────────────────────────────────────────────────┤
│  SEQUENCES (PostgreSQL native - thread-safe)                │
│  ├── seq_report_YYYY    → Year-specific sequences           │
│  ├── seq_client         → Global client counter             │
│  ├── seq_user           → Global user counter               │
│  └── seq_milestone      → Global milestone counter          │
├─────────────────────────────────────────────────────────────┤
│  ADMIN VIEWS (for Supabase Studio debugging)                │
│  ├── v_report_lines     → Shows report_code, project        │
│  ├── v_notifications    → Shows user name, project_code     │
│  ├── v_activity_logs    → Human-readable activity feed      │
│  ├── v_assignments      → User + Project readable           │
│  └── v_reports          → Full report context               │
└─────────────────────────────────────────────────────────────┘
```

---

## Benefits

| Benefit | Impact |
|---------|--------|
| **User-friendly** | Clients can reference "RPT-2026-042" in emails/calls |
| **Debuggable** | You can trace issues without joining 5 tables |
| **Exportable** | PDF reports, Excel exports show meaningful IDs |
| **Searchable** | Users can search by code in the app |
| **Audit-friendly** | Activity logs become readable |
| **API-stable** | Codes don't change; UUIDs stay internal |
| **Thread-safe** | No race conditions with concurrent inserts |

---

## Code Patterns Summary

| Entity | Pattern | Example | Year-Based | Notes |
|--------|---------|---------|------------|-------|
| Project | PRJ-YYYY-NNNN | PRJ-2026-0001 | Yes | ✅ Already exists |
| Report | RPT-YYYY-NNNN | RPT-2026-0042 | Yes | Resets each year |
| Client | CLT-NNNN | CLT-0015 | No | Global counter |
| User/Employee | EMP-NNNN | EMP-0008 | No | Global counter |
| Milestone | MS-NNNN | MS-0123 | No | Global counter |
| Scope Item | ITEM-NNN | ITEM-001 | No | ✅ Already exists |

---

## Implementation

### Migration 1: Infrastructure & Functions

```sql
-- ============================================================================
-- MIGRATION: Add human-readable codes infrastructure
-- ============================================================================

-- 1. Create sequence metadata table (tracks year-based sequences)
CREATE TABLE IF NOT EXISTS public.sequence_metadata (
  entity_type TEXT PRIMARY KEY,
  prefix TEXT NOT NULL,
  is_year_based BOOLEAN DEFAULT false,
  padding_length INTEGER DEFAULT 4,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed metadata
INSERT INTO sequence_metadata (entity_type, prefix, is_year_based, padding_length) VALUES
  ('report', 'RPT', true, 4),
  ('client', 'CLT', false, 4),
  ('user', 'EMP', false, 4),
  ('milestone', 'MS', false, 4)
ON CONFLICT (entity_type) DO NOTHING;

-- 2. Create non-year-based sequences (global counters)
CREATE SEQUENCE IF NOT EXISTS seq_client START 1;
CREATE SEQUENCE IF NOT EXISTS seq_user START 1;
CREATE SEQUENCE IF NOT EXISTS seq_milestone START 1;

-- 3. Function to get or create year-based sequence
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

  -- Create sequence if it doesn't exist (for new year)
  IF NOT EXISTS (
    SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = v_seq_name
  ) THEN
    EXECUTE format('CREATE SEQUENCE IF NOT EXISTS %I START 1', v_seq_name);
  END IF;

  RETURN v_seq_name;
END;
$$;

-- 4. Main code generation function (thread-safe with advisory lock)
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
  v_lock_id := hashtext(p_entity_type)::BIGINT;

  -- Acquire advisory lock to prevent race conditions
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

-- 5. Generic trigger function for auto-generating codes
CREATE OR REPLACE FUNCTION trigger_set_entity_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_entity_type TEXT;
  v_code_column TEXT;
BEGIN
  -- Get entity type and code column from trigger arguments
  v_entity_type := TG_ARGV[0];
  v_code_column := TG_ARGV[1];

  -- Only generate if code is NULL
  EXECUTE format('SELECT ($1).%I IS NULL', v_code_column) INTO STRICT v_code_column USING NEW;

  IF v_code_column IS NULL OR v_code_column = '' THEN
    EXECUTE format('SELECT generate_entity_code(%L)', v_entity_type) INTO v_code_column;
    NEW := NEW #= hstore(TG_ARGV[1], v_code_column);
  END IF;

  RETURN NEW;
END;
$$;

-- Note: hstore extension needed for generic trigger
CREATE EXTENSION IF NOT EXISTS hstore;
```

### Migration 2: Add Code Columns to Tables

```sql
-- ============================================================================
-- MIGRATION: Add code columns to existing tables
-- ============================================================================

-- 1. Add columns (nullable first for backfill)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS report_code TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_code TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_code TEXT;
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS milestone_code TEXT;

-- 2. Create unique indexes (allows NULLs during backfill)
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_report_code ON reports(report_code) WHERE report_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_client_code ON clients(client_code) WHERE client_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_employee_code ON users(employee_code) WHERE employee_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_milestones_milestone_code ON milestones(milestone_code) WHERE milestone_code IS NOT NULL;

-- 3. Backfill existing reports (year-based)
WITH numbered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY EXTRACT(YEAR FROM created_at)
      ORDER BY created_at
    ) as rn,
    EXTRACT(YEAR FROM created_at)::INTEGER as yr
  FROM reports
  WHERE report_code IS NULL
)
UPDATE reports r
SET report_code = 'RPT-' || n.yr::TEXT || '-' || LPAD(n.rn::TEXT, 4, '0')
FROM numbered n
WHERE r.id = n.id;

-- 4. Backfill existing clients
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM clients
  WHERE client_code IS NULL
)
UPDATE clients c
SET client_code = 'CLT-' || LPAD(n.rn::TEXT, 4, '0')
FROM numbered n
WHERE c.id = n.id;

-- 5. Backfill existing users
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM users
  WHERE employee_code IS NULL
)
UPDATE users u
SET employee_code = 'EMP-' || LPAD(n.rn::TEXT, 4, '0')
FROM numbered n
WHERE u.id = n.id;

-- 6. Backfill existing milestones (if any)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM milestones
  WHERE milestone_code IS NULL
)
UPDATE milestones m
SET milestone_code = 'MS-' || LPAD(n.rn::TEXT, 4, '0')
FROM numbered n
WHERE m.id = n.id;

-- 7. Update sequences to current max values
DO $$
DECLARE
  v_max_client BIGINT;
  v_max_user BIGINT;
  v_max_milestone BIGINT;
  v_year INTEGER;
  v_max_report BIGINT;
BEGIN
  -- Clients
  SELECT COALESCE(MAX(NULLIF(regexp_replace(client_code, '[^0-9]', '', 'g'), '')::BIGINT), 0)
  INTO v_max_client FROM clients;
  IF v_max_client > 0 THEN
    PERFORM setval('seq_client', v_max_client);
  END IF;

  -- Users
  SELECT COALESCE(MAX(NULLIF(regexp_replace(employee_code, '[^0-9]', '', 'g'), '')::BIGINT), 0)
  INTO v_max_user FROM users;
  IF v_max_user > 0 THEN
    PERFORM setval('seq_user', v_max_user);
  END IF;

  -- Milestones
  SELECT COALESCE(MAX(NULLIF(regexp_replace(milestone_code, '[^0-9]', '', 'g'), '')::BIGINT), 0)
  INTO v_max_milestone FROM milestones;
  IF v_max_milestone > 0 THEN
    PERFORM setval('seq_milestone', v_max_milestone);
  END IF;

  -- Reports (current year only)
  v_year := EXTRACT(YEAR FROM NOW())::INTEGER;
  SELECT COALESCE(MAX(
    NULLIF(
      SUBSTRING(report_code FROM '[0-9]+$'),
      ''
    )::BIGINT
  ), 0)
  INTO v_max_report
  FROM reports
  WHERE report_code LIKE 'RPT-' || v_year || '-%';

  IF v_max_report > 0 THEN
    -- Create this year's sequence if needed and set value
    PERFORM get_year_sequence('report', v_year);
    EXECUTE format('SELECT setval(%L, %s)', 'seq_report_' || v_year, v_max_report);
  END IF;
END;
$$;
```

### Migration 3: Create Triggers (Simpler Approach)

```sql
-- ============================================================================
-- MIGRATION: Create auto-generation triggers (simple approach)
-- ============================================================================

-- Reports trigger
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

DROP TRIGGER IF EXISTS tr_reports_set_code ON reports;
CREATE TRIGGER tr_reports_set_code
  BEFORE INSERT ON reports
  FOR EACH ROW
  EXECUTE FUNCTION set_report_code();

-- Clients trigger
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

DROP TRIGGER IF EXISTS tr_clients_set_code ON clients;
CREATE TRIGGER tr_clients_set_code
  BEFORE INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION set_client_code();

-- Users trigger
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

DROP TRIGGER IF EXISTS tr_users_set_code ON users;
CREATE TRIGGER tr_users_set_code
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_employee_code();

-- Milestones trigger
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

DROP TRIGGER IF EXISTS tr_milestones_set_code ON milestones;
CREATE TRIGGER tr_milestones_set_code
  BEFORE INSERT ON milestones
  FOR EACH ROW
  EXECUTE FUNCTION set_milestone_code();
```

### Migration 4: Admin Views

```sql
-- ============================================================================
-- MIGRATION: Create admin views for debugging
-- ============================================================================

-- Readable report lines view
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
  CARDINALITY(rl.photos) AS photo_count,
  rl.created_at
FROM report_lines rl
JOIN reports r ON rl.report_id = r.id
JOIN projects p ON r.project_id = p.id
ORDER BY rl.created_at DESC;

-- Readable notifications view
CREATE OR REPLACE VIEW v_notifications AS
SELECT
  n.id,
  COALESCE(u.employee_code, 'EMP-???') AS employee_code,
  u.name AS user_name,
  u.email,
  n.type,
  n.title,
  LEFT(n.message, 80) AS message_preview,
  COALESCE(p.project_code, '-') AS project_code,
  p.name AS project_name,
  COALESCE(r.report_code, '-') AS report_code,
  n.is_read,
  n.created_at
FROM notifications n
LEFT JOIN users u ON n.user_id = u.id
LEFT JOIN projects p ON n.project_id = p.id
LEFT JOIN reports r ON n.report_id = r.id
ORDER BY n.created_at DESC;

-- Readable activity logs view
CREATE OR REPLACE VIEW v_activity_logs AS
SELECT
  al.id,
  COALESCE(u.employee_code, 'SYSTEM') AS employee_code,
  COALESCE(u.name, 'System') AS user_name,
  al.action,
  al.entity_type,
  COALESCE(p.project_code, '-') AS project_code,
  p.name AS project_name,
  al.details::TEXT AS details,
  al.created_at
FROM activity_logs al
LEFT JOIN users u ON al.user_id = u.id
LEFT JOIN projects p ON al.project_id = p.id
ORDER BY al.created_at DESC;

-- Readable project assignments view
CREATE OR REPLACE VIEW v_project_assignments AS
SELECT
  pa.id,
  p.project_code,
  p.name AS project_name,
  p.status AS project_status,
  COALESCE(u.employee_code, 'EMP-???') AS employee_code,
  u.name AS user_name,
  u.email,
  u.role AS user_role,
  assigner.name AS assigned_by,
  pa.assigned_at
FROM project_assignments pa
JOIN projects p ON pa.project_id = p.id
JOIN users u ON pa.user_id = u.id
LEFT JOIN users assigner ON pa.assigned_by = assigner.id
ORDER BY p.project_code, u.name;

-- Readable reports view
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

-- Readable clients view
CREATE OR REPLACE VIEW v_clients AS
SELECT
  c.id,
  COALESCE(c.client_code, 'CLT-???') AS client_code,
  c.name,
  c.email,
  c.phone,
  c.company,
  (SELECT COUNT(*) FROM projects WHERE client_id = c.id) AS project_count,
  c.created_at
FROM clients c
ORDER BY c.name;

-- Readable users view
CREATE OR REPLACE VIEW v_users AS
SELECT
  u.id,
  COALESCE(u.employee_code, 'EMP-???') AS employee_code,
  u.name,
  u.email,
  u.role,
  u.is_active,
  (SELECT COUNT(*) FROM project_assignments WHERE user_id = u.id) AS assigned_projects,
  u.last_login_at,
  u.last_active_at,
  u.created_at
FROM users u
ORDER BY u.name;
```

### Migration 5: Make Columns NOT NULL (After Verification)

```sql
-- ============================================================================
-- MIGRATION: Add NOT NULL constraints (run after verifying backfill)
-- ============================================================================

-- Only run this after confirming all existing records have codes!

-- Check for any NULL codes first:
-- SELECT 'reports' as tbl, COUNT(*) FROM reports WHERE report_code IS NULL
-- UNION ALL SELECT 'clients', COUNT(*) FROM clients WHERE client_code IS NULL
-- UNION ALL SELECT 'users', COUNT(*) FROM users WHERE employee_code IS NULL
-- UNION ALL SELECT 'milestones', COUNT(*) FROM milestones WHERE milestone_code IS NULL;

-- If all counts are 0, proceed:
ALTER TABLE reports ALTER COLUMN report_code SET NOT NULL;
ALTER TABLE clients ALTER COLUMN client_code SET NOT NULL;
ALTER TABLE users ALTER COLUMN employee_code SET NOT NULL;
-- ALTER TABLE milestones ALTER COLUMN milestone_code SET NOT NULL; -- Only if milestones exist

-- Update unique constraints (remove WHERE clause now that NOT NULL)
DROP INDEX IF EXISTS idx_reports_report_code;
DROP INDEX IF EXISTS idx_clients_client_code;
DROP INDEX IF EXISTS idx_users_employee_code;
DROP INDEX IF EXISTS idx_milestones_milestone_code;

ALTER TABLE reports ADD CONSTRAINT uq_reports_report_code UNIQUE (report_code);
ALTER TABLE clients ADD CONSTRAINT uq_clients_client_code UNIQUE (client_code);
ALTER TABLE users ADD CONSTRAINT uq_users_employee_code UNIQUE (employee_code);
-- ALTER TABLE milestones ADD CONSTRAINT uq_milestones_milestone_code UNIQUE (milestone_code);
```

---

## Result: What You'll See

### Before (raw UUIDs):
| id | report_id | line_order | title |
|----|-----------|------------|-------|
| 556dd31a-e7f1... | 28df752b-e40d... | 1 | Deneme 1 |

### After (using v_report_lines):
| report_code | project_code | project_name | line_order | title | photo_count |
|-------------|--------------|--------------|------------|-------|-------------|
| RPT-2026-0042 | MOODUP | Moodup Istanbul | 1 | Deneme 1 | 3 |

---

## TypeScript Type Updates

Add to `src/types/database.ts`:

```typescript
// Add to existing table types
export interface Report {
  // ... existing fields
  report_code: string;
}

export interface Client {
  // ... existing fields
  client_code: string;
}

export interface User {
  // ... existing fields
  employee_code: string;
}

export interface Milestone {
  // ... existing fields
  milestone_code: string;
}
```

---

## Application Code Updates

### Display codes in UI where appropriate:

```typescript
// In reports table/list
<span className="font-mono text-xs">{report.report_code}</span>

// In user avatars/badges
<Tooltip content={user.employee_code}>
  <Avatar>{user.name}</Avatar>
</Tooltip>

// In client selectors
<SelectItem value={client.id}>
  {client.name} ({client.client_code})
</SelectItem>
```

### Search by code:

```typescript
// Allow searching by human-readable code
const { data } = await supabase
  .from('reports')
  .select('*')
  .or(`report_code.ilike.%${search}%,id.eq.${search}`)
```

---

## Implementation Checklist

- [ ] **Phase 1**: Run Migration 1 (infrastructure)
- [ ] **Phase 2**: Run Migration 2 (add columns + backfill)
- [ ] **Phase 3**: Run Migration 3 (triggers)
- [ ] **Phase 4**: Run Migration 4 (admin views)
- [ ] **Phase 5**: Verify all codes populated
- [ ] **Phase 6**: Run Migration 5 (NOT NULL constraints)
- [ ] **Phase 7**: Update TypeScript types
- [ ] **Phase 8**: Update UI to display codes
- [ ] **Phase 9**: Add search by code functionality

---

## Key Improvements from v1

| Aspect | v1 (Original) | v2 (Improved) |
|--------|---------------|---------------|
| **Concurrency** | Custom table with FOR UPDATE | Advisory locks + native sequences |
| **Year Reset** | Manual handling | Auto-creates year sequences |
| **Performance** | Table lookups | Native PostgreSQL sequences |
| **Indexes** | Not specified | Partial unique indexes |
| **Security** | Not specified | SECURITY INVOKER + search_path |
| **NULL handling** | Immediate NOT NULL | Phased: nullable → backfill → NOT NULL |
| **Views** | Basic | Enhanced with preview columns, counts |

---

## Future Enhancements

1. **QR Codes** - Generate QR codes for physical items linking to item_code
2. **Voice Search** - "Show me report RPT-2026-042"
3. **External Integration** - Stable codes for API consumers
4. **Audit Compliance** - Traceable identifiers for legal/compliance
5. **URL Slugs** - Use codes in URLs: `/reports/RPT-2026-042`
6. **Materialized Views** - If v_* views become slow, convert to materialized

---

## Notes

- UUIDs remain as primary keys (security, distributed systems)
- Codes are additive, not replacements
- Triggers ensure automatic code generation
- Views are read-only and don't affect write performance
- Advisory locks prevent race conditions under concurrent load
- Year-based sequences auto-create on first use each year

---

*Plan created: January 2026*
*Version: 2.0 (Improved with Context7 best practices)*
*Status: Pending Implementation*
