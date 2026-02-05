# Formula Contract - Database Schema Reference
## Document 07: Complete Schema Documentation

**Version:** 1.0  
**Tables:** 17  
**Enums:** 8

---

## Entity Relationship Overview

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   USERS     │       │   CLIENTS   │       │  PROJECTS   │
│─────────────│       │─────────────│       │─────────────│
│ id (PK)     │       │ id (PK)     │◄──────│ client_id   │
│ email       │       │ company_name│       │ id (PK)     │
│ name        │       │ contact     │       │ name        │
│ role        │       │ email       │       │ status      │
└─────────────┘       └─────────────┘       └──────┬──────┘
      │                                            │
      │  ┌─────────────────────────────────────────┤
      │  │                                         │
      ▼  ▼                                         ▼
┌─────────────────┐                    ┌─────────────────┐
│ PROJECT_ASSIGN  │                    │   SCOPE_ITEMS   │
│─────────────────│                    │─────────────────│
│ project_id (FK) │                    │ id (PK)         │
│ user_id (FK)    │                    │ project_id (FK) │
└─────────────────┘                    │ item_code       │
                                       │ item_path       │
                                       └────────┬────────┘
                                                │
                    ┌───────────────────────────┼───────────────────────────┐
                    │                           │                           │
                    ▼                           ▼                           ▼
          ┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
          │    DRAWINGS     │         │  ITEM_MATERIALS │         │   ITEM_STEPS    │
          │─────────────────│         │─────────────────│         │─────────────────│
          │ item_id (FK) 1:1│         │ item_id (FK)    │         │ item_id (FK)    │
          │ status          │         │ material_id (FK)│         │ step_order      │
          └────────┬────────┘         └────────┬────────┘         └─────────────────┘
                   │                           │
                   ▼                           ▼
          ┌─────────────────┐         ┌─────────────────┐
          │DRAWING_REVISIONS│         │    MATERIALS    │
          │─────────────────│         │─────────────────│
          │ drawing_id (FK) │         │ project_id (FK) │
          │ revision        │         │ name            │
          │ file_url        │         │ status          │
          └─────────────────┘         └─────────────────┘
```

---

## Enum Types

### user_role
```sql
CREATE TYPE user_role AS ENUM (
  'admin',        -- Full system access
  'pm',           -- Project manager
  'production',   -- Production specialist
  'procurement',  -- Procurement manager
  'management',   -- View-only management
  'client'        -- Client portal access
);
```

### project_status
```sql
CREATE TYPE project_status AS ENUM (
  'tender',       -- Initial state
  'active',       -- In progress
  'on_hold',      -- Paused
  'completed',    -- Finished
  'cancelled'     -- Cancelled
);
```

### item_path
```sql
CREATE TYPE item_path AS ENUM (
  'production',   -- Manufactured in-house
  'procurement'   -- Purchased complete
);
```

### item_status
```sql
CREATE TYPE item_status AS ENUM (
  'pending',            -- Initial
  'in_design',          -- Drawing in progress
  'awaiting_approval',  -- Sent to client
  'approved',           -- Drawing approved
  'in_production',      -- Being manufactured
  'complete',           -- Manufacturing done
  'on_hold',            -- Paused
  'cancelled'           -- Cancelled
);
```

### procurement_status
```sql
CREATE TYPE procurement_status AS ENUM (
  'pm_approval',    -- Waiting PM approval
  'not_ordered',    -- Approved, not ordered
  'ordered',        -- Order placed
  'received'        -- Item received
);
```

### drawing_status
```sql
CREATE TYPE drawing_status AS ENUM (
  'not_uploaded',           -- No drawing yet
  'uploaded',               -- Drawing uploaded
  'sent_to_client',         -- Sent for approval
  'approved',               -- Client approved
  'rejected',               -- Client rejected
  'approved_with_comments'  -- Approved with notes
);
```

### material_status
```sql
CREATE TYPE material_status AS ENUM (
  'pending',        -- Not sent to client
  'sent_to_client', -- Awaiting approval
  'approved',       -- Client approved
  'rejected'        -- Client rejected
);
```

### currency
```sql
CREATE TYPE currency AS ENUM (
  'TRY',    -- Turkish Lira
  'USD',    -- US Dollar
  'EUR'     -- Euro
);
```

---

## Tables Reference

### users

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| email | TEXT | NO | - | Unique email |
| name | TEXT | NO | - | Full name |
| phone | TEXT | YES | - | Phone number |
| role | user_role | NO | 'pm' | User role |
| language | TEXT | NO | 'en' | 'en' or 'tr' |
| email_notifications | BOOLEAN | NO | true | Receive emails |
| is_active | BOOLEAN | NO | true | Account active |
| last_login_at | TIMESTAMPTZ | YES | - | Last login |
| created_at | TIMESTAMPTZ | NO | NOW() | Created |
| updated_at | TIMESTAMPTZ | NO | NOW() | Updated |

---

### clients

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| company_name | TEXT | NO | - | Company name |
| contact_person | TEXT | YES | - | Contact name |
| email | TEXT | YES | - | Contact email |
| phone | TEXT | YES | - | Contact phone |
| address | TEXT | YES | - | Address |
| notes | TEXT | YES | - | Notes |
| is_deleted | BOOLEAN | NO | false | Soft delete |
| created_at | TIMESTAMPTZ | NO | NOW() | Created |
| updated_at | TIMESTAMPTZ | NO | NOW() | Updated |

---

### projects

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| project_code | TEXT | NO | - | Unique code (e.g., "MBH") |
| name | TEXT | NO | - | Project name |
| client_id | UUID | YES | - | FK → clients |
| status | project_status | NO | 'tender' | Current status |
| currency | currency | NO | 'TRY' | Price currency |
| description | TEXT | YES | - | Description |
| installation_date | DATE | YES | - | Target install date |
| contract_value_manual | DECIMAL(15,2) | YES | - | Manual contract value |
| contract_value_calculated | DECIMAL(15,2) | YES | 0 | Sum of items |
| kickoff_summary | TEXT | YES | - | Kickoff notes |
| kickoff_requirements | TEXT | YES | - | Requirements |
| signoff_requested_at | TIMESTAMPTZ | YES | - | Signoff request time |
| signoff_completed_at | TIMESTAMPTZ | YES | - | Signoff complete time |
| signoff_notes | TEXT | YES | - | Signoff notes |
| is_deleted | BOOLEAN | NO | false | Soft delete |
| created_by | UUID | YES | - | FK → users |
| created_at | TIMESTAMPTZ | NO | NOW() | Created |
| updated_at | TIMESTAMPTZ | NO | NOW() | Updated |

---

### project_assignments

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| project_id | UUID | NO | - | FK → projects |
| user_id | UUID | NO | - | FK → users |
| assigned_at | TIMESTAMPTZ | NO | NOW() | Assignment time |
| assigned_by | UUID | YES | - | FK → users |

**Unique Constraint:** (project_id, user_id)

---

### milestones

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| project_id | UUID | NO | - | FK → projects |
| name | TEXT | NO | - | Milestone name |
| description | TEXT | YES | - | Description |
| due_date | DATE | NO | - | Due date |
| is_completed | BOOLEAN | NO | false | Completed flag |
| completed_at | TIMESTAMPTZ | YES | - | Completion time |
| alert_days_before | INTEGER | YES | 7 | Alert timing |
| created_at | TIMESTAMPTZ | NO | NOW() | Created |
| updated_at | TIMESTAMPTZ | NO | NOW() | Updated |

---

### scope_items

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| project_id | UUID | NO | - | FK → projects |
| item_code | TEXT | NO | - | User-defined code |
| name | TEXT | NO | - | Item name |
| description | TEXT | YES | - | Description |
| width | DECIMAL(10,2) | YES | - | Width in mm |
| depth | DECIMAL(10,2) | YES | - | Depth in mm |
| height | DECIMAL(10,2) | YES | - | Height in mm |
| unit | TEXT | NO | 'pcs' | Unit of measure |
| quantity | INTEGER | NO | 1 | Quantity |
| unit_price | DECIMAL(15,2) | YES | - | Price per unit |
| total_price | DECIMAL(15,2) | - | GENERATED | quantity × unit_price |
| item_path | item_path | NO | 'production' | Production or Procurement |
| status | item_status | NO | 'pending' | Current status |
| procurement_status | procurement_status | YES | 'pm_approval' | For procurement items |
| production_percentage | INTEGER | NO | 0 | 0-100% complete |
| drawing_receival_date | DATE | YES | - | Expected drawing date |
| planned_completion_date | DATE | YES | - | Target completion |
| is_installed | BOOLEAN | NO | false | Installation flag |
| installed_at | TIMESTAMPTZ | YES | - | Installation time |
| notes | TEXT | YES | - | Notes |
| is_deleted | BOOLEAN | NO | false | Soft delete |
| created_at | TIMESTAMPTZ | NO | NOW() | Created |
| updated_at | TIMESTAMPTZ | NO | NOW() | Updated |

**Unique Constraint:** (project_id, item_code)

---

### drawings

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| item_id | UUID | NO | - | FK → scope_items (UNIQUE) |
| status | drawing_status | NO | 'not_uploaded' | Current status |
| current_revision | TEXT | YES | - | Current rev (A, B, C...) |
| sent_to_client_at | TIMESTAMPTZ | YES | - | When sent |
| client_response_at | TIMESTAMPTZ | YES | - | When responded |
| client_comments | TEXT | YES | - | Client feedback |
| approved_by | UUID | YES | - | FK → users |
| pm_override | BOOLEAN | NO | false | PM bypassed approval |
| pm_override_reason | TEXT | YES | - | Override reason |
| pm_override_at | TIMESTAMPTZ | YES | - | Override time |
| pm_override_by | UUID | YES | - | FK → users |
| created_at | TIMESTAMPTZ | NO | NOW() | Created |
| updated_at | TIMESTAMPTZ | NO | NOW() | Updated |

**Note:** 1:1 relationship with scope_items (enforced by UNIQUE on item_id)

---

### drawing_revisions

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| drawing_id | UUID | NO | - | FK → drawings |
| revision | TEXT | NO | - | Revision letter (A, B, C...) |
| file_url | TEXT | NO | - | PDF file URL |
| file_name | TEXT | NO | - | Original filename |
| file_size | INTEGER | YES | - | Size in bytes |
| cad_file_url | TEXT | YES | - | CAD file URL |
| cad_file_name | TEXT | YES | - | CAD filename |
| client_markup_url | TEXT | YES | - | Client markup PDF |
| notes | TEXT | YES | - | Revision notes |
| uploaded_by | UUID | YES | - | FK → users |
| created_at | TIMESTAMPTZ | NO | NOW() | Uploaded at |

---

### materials

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| project_id | UUID | NO | - | FK → projects |
| name | TEXT | NO | - | Material name |
| specification | TEXT | YES | - | Specifications |
| supplier | TEXT | YES | - | Supplier name |
| images | JSONB | YES | '[]' | Array of image objects |
| status | material_status | NO | 'pending' | Approval status |
| sent_to_client_at | TIMESTAMPTZ | YES | - | When sent |
| client_response_at | TIMESTAMPTZ | YES | - | When responded |
| client_comments | TEXT | YES | - | Client feedback |
| approved_by | UUID | YES | - | FK → users |
| is_deleted | BOOLEAN | NO | false | Soft delete |
| created_at | TIMESTAMPTZ | NO | NOW() | Created |
| updated_at | TIMESTAMPTZ | NO | NOW() | Updated |

**images JSONB format:**
```json
[
  {
    "url": "https://...",
    "name": "image1.jpg"
  }
]
```

---

### item_materials

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| item_id | UUID | NO | - | FK → scope_items |
| material_id | UUID | NO | - | FK → materials |
| created_at | TIMESTAMPTZ | NO | NOW() | Created |

**Unique Constraint:** (item_id, material_id)

---

### snagging

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| project_id | UUID | NO | - | FK → projects |
| item_id | UUID | YES | - | FK → scope_items |
| description | TEXT | NO | - | Issue description |
| photos | JSONB | YES | '[]' | Array of photo URLs |
| is_resolved | BOOLEAN | NO | false | Resolved flag |
| resolved_at | TIMESTAMPTZ | YES | - | Resolution time |
| resolved_by | UUID | YES | - | FK → users |
| resolution_notes | TEXT | YES | - | Resolution notes |
| created_by | UUID | YES | - | FK → users |
| created_at | TIMESTAMPTZ | NO | NOW() | Created |
| updated_at | TIMESTAMPTZ | NO | NOW() | Updated |

---

### reports

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| project_id | UUID | NO | - | FK → projects |
| report_type | TEXT | NO | - | Type (e.g., "Weekly") |
| is_published | BOOLEAN | NO | false | Published flag |
| published_at | TIMESTAMPTZ | YES | - | Publish time |
| share_with_client | BOOLEAN | NO | false | Client visible |
| share_internal | BOOLEAN | NO | false | Internal visible |
| created_by | UUID | YES | - | FK → users |
| created_at | TIMESTAMPTZ | NO | NOW() | Created |
| updated_at | TIMESTAMPTZ | NO | NOW() | Updated |

---

### report_lines

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| report_id | UUID | NO | - | FK → reports |
| line_order | INTEGER | NO | - | Display order |
| title | TEXT | NO | - | Line title |
| description | TEXT | YES | - | Content |
| photos | JSONB | YES | '[]' | Array of photo URLs (max 6) |
| created_at | TIMESTAMPTZ | NO | NOW() | Created |
| updated_at | TIMESTAMPTZ | NO | NOW() | Updated |

---

### notifications

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| user_id | UUID | NO | - | FK → users |
| type | notification_type | NO | - | Notification type |
| title | TEXT | NO | - | Title |
| message | TEXT | YES | - | Message body |
| project_id | UUID | YES | - | FK → projects |
| item_id | UUID | YES | - | FK → scope_items |
| drawing_id | UUID | YES | - | FK → drawings |
| material_id | UUID | YES | - | FK → materials |
| report_id | UUID | YES | - | FK → reports |
| is_read | BOOLEAN | NO | false | Read flag |
| read_at | TIMESTAMPTZ | YES | - | Read time |
| email_sent | BOOLEAN | NO | false | Email sent flag |
| created_at | TIMESTAMPTZ | NO | NOW() | Created |

---

### activity_log

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| user_id | UUID | YES | - | FK → users |
| action | TEXT | NO | - | Action description |
| entity_type | TEXT | NO | - | Table name |
| entity_id | UUID | YES | - | Record ID |
| project_id | UUID | YES | - | FK → projects |
| details | JSONB | YES | - | Additional data |
| created_at | TIMESTAMPTZ | NO | NOW() | When |

---

## Common Queries

### Get Project with All Relations

```sql
SELECT 
  p.*,
  c.company_name as client_name,
  c.contact_person as client_contact,
  (
    SELECT json_agg(json_build_object('user_id', u.id, 'name', u.name, 'email', u.email))
    FROM project_assignments pa
    JOIN users u ON pa.user_id = u.id
    WHERE pa.project_id = p.id
  ) as assigned_users,
  (
    SELECT COUNT(*) FROM scope_items si WHERE si.project_id = p.id AND si.is_deleted = false
  ) as total_items,
  (
    SELECT COUNT(*) FROM scope_items si WHERE si.project_id = p.id AND si.status = 'complete' AND si.is_deleted = false
  ) as complete_items
FROM projects p
LEFT JOIN clients c ON p.client_id = c.id
WHERE p.id = $1 AND p.is_deleted = false;
```

### Get Scope Items with Drawing Status

```sql
SELECT 
  si.*,
  d.status as drawing_status,
  d.current_revision
FROM scope_items si
LEFT JOIN drawings d ON si.id = d.item_id
WHERE si.project_id = $1 
  AND si.is_deleted = false
ORDER BY si.item_code;
```

### Get Pending Approvals for Client

```sql
-- Pending drawings
SELECT 
  si.item_code,
  si.name as item_name,
  d.id as drawing_id,
  d.current_revision,
  d.sent_to_client_at
FROM scope_items si
JOIN drawings d ON si.id = d.item_id
JOIN projects p ON si.project_id = p.id
WHERE p.client_id = $1
  AND d.status = 'sent_to_client'
  AND si.is_deleted = false

UNION ALL

-- Pending materials
SELECT 
  m.name as item_code,
  m.name as item_name,
  m.id as material_id,
  NULL as current_revision,
  m.sent_to_client_at
FROM materials m
JOIN projects p ON m.project_id = p.id
WHERE p.client_id = $1
  AND m.status = 'sent_to_client'
  AND m.is_deleted = false;
```

---

## Next Document

→ See [10-MVP-Scope.md](./10-MVP-Scope.md) for MVP feature details.
