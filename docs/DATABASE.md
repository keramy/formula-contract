# Database Schema Documentation

> **Supabase Project:** `lsuiaqrpkhejeavsrsqc` (contract-eu)
> **Region:** eu-central-1
> **Last Updated:** January 20, 2026

---

## Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────────┐
│   clients   │───────│  projects   │───────│ project_assign- │
└─────────────┘  1:N  └─────────────┘  N:M  │     ments       │
                            │              └─────────────────┘
                            │ 1:N                   │
                            ▼                       │
                     ┌─────────────┐                │
                     │ scope_items │                │
                     └─────────────┘                │
                      │           │                 │
                 1:1  │           │ N:M             │
                      ▼           ▼                 ▼
               ┌──────────┐  ┌────────────┐  ┌─────────┐
               │ drawings │  │ item_mater-│  │  users  │
               └──────────┘  │    ials    │  └─────────┘
                    │        └────────────┘
               1:N  │              │
                    ▼              ▼
          ┌─────────────────┐  ┌────────────┐
          │drawing_revisions│  │ materials  │
          └─────────────────┘  └────────────┘
```

---

## Tables

### users

Internal system users (synced with Supabase Auth).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK | Matches auth.users.id |
| email | text | UNIQUE, NOT NULL | User email |
| name | text | NOT NULL | Display name |
| phone | text | - | Phone number |
| role | user_role | NOT NULL, DEFAULT 'pm' | User role |
| language | text | DEFAULT 'en' | Preferred language |
| email_notifications | boolean | DEFAULT true | Email notification preference |
| is_active | boolean | DEFAULT true | Account status |
| last_login_at | timestamptz | - | Last login timestamp |
| created_at | timestamptz | DEFAULT now() | Created timestamp |
| updated_at | timestamptz | DEFAULT now() | Updated timestamp |

**Enum `user_role`:** `admin` | `pm` | `production` | `procurement` | `management` | `client`

---

### clients

External client companies.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| company_name | text | NOT NULL | Company name |
| contact_person | text | - | Primary contact name |
| email | text | - | Contact email |
| phone | text | - | Contact phone |
| address | text | - | Address |
| notes | text | - | Internal notes |
| is_deleted | boolean | DEFAULT false | Soft delete flag |
| created_at | timestamptz | DEFAULT now() | Created timestamp |
| updated_at | timestamptz | DEFAULT now() | Updated timestamp |

---

### projects

Main project entity.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| project_code | text | UNIQUE, NOT NULL | Project identifier (e.g., "2602") |
| name | text | NOT NULL | Project name |
| client_id | uuid | FK → clients.id | Associated client |
| status | project_status | DEFAULT 'tender' | Project status |
| currency | currency | DEFAULT 'TRY' | Project currency |
| description | text | - | Project description |
| installation_date | date | - | Planned installation date |
| contract_value_manual | numeric | - | Manually entered contract value |
| contract_value_calculated | numeric | - | Auto-calculated from items |
| kickoff_summary | text | - | Kickoff meeting summary |
| kickoff_requirements | text | - | Client requirements |
| signoff_requested_at | timestamptz | - | When signoff was requested |
| signoff_completed_at | timestamptz | - | When signoff was completed |
| signoff_notes | text | - | Signoff notes |
| is_deleted | boolean | DEFAULT false | Soft delete flag |
| created_by | uuid | FK → users.id | Creator |
| created_at | timestamptz | DEFAULT now() | Created timestamp |
| updated_at | timestamptz | DEFAULT now() | Updated timestamp |

**Enum `project_status`:** `tender` | `active` | `on_hold` | `completed` | `cancelled`

**Enum `currency`:** `TRY` | `USD` | `EUR`

---

### project_assignments

Many-to-many relationship between users and projects.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| project_id | uuid | FK → projects.id, NOT NULL | Project |
| user_id | uuid | FK → users.id, NOT NULL | Assigned user |
| assigned_at | timestamptz | DEFAULT now() | Assignment date |
| assigned_by | uuid | FK → users.id | Who assigned |

---

### scope_items

Individual line items (furniture pieces) in a project.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| project_id | uuid | FK → projects.id, NOT NULL | Parent project |
| parent_id | uuid | FK → scope_items.id | Parent item (for splits) |
| item_code | text | NOT NULL | Item identifier |
| name | text | NOT NULL | Item name |
| description | text | - | Item description |
| width | numeric | - | Width dimension |
| depth | numeric | - | Depth dimension |
| height | numeric | - | Height dimension |
| unit | text | DEFAULT 'pcs' | Unit of measure |
| quantity | integer | DEFAULT 1 | Quantity |
| **unit_cost** | numeric | - | Cost per unit (what WE pay) |
| **initial_total_cost** | numeric | - | **LOCKED** snapshot at creation |
| unit_sales_price | numeric | - | Price per unit (client pays) |
| total_sales_price | numeric | - | Total price (unit_sales_price × quantity) |
| item_path | item_path | DEFAULT 'production' | Production or Procurement |
| status | item_status | DEFAULT 'pending' | Current status |
| procurement_status | procurement_status | - | For procurement items only |
| production_percentage | integer | DEFAULT 0, CHECK 0-100 | Production progress |
| drawing_receival_date | date | - | When drawing was received |
| planned_completion_date | date | - | Target completion date |
| is_installed | boolean | DEFAULT false | Installation status |
| installed_at | timestamptz | - | Installation timestamp |
| notes | text | - | Item notes |
| images | jsonb | DEFAULT '[]' | Item images array |
| is_deleted | boolean | DEFAULT false | Soft delete flag |
| created_at | timestamptz | DEFAULT now() | Created timestamp |
| updated_at | timestamptz | DEFAULT now() | Updated timestamp |

**Enum `item_path`:** `production` | `procurement`

**Enum `item_status`:** `pending` | `in_design` | `awaiting_approval` | `approved` | `in_production` | `complete` | `on_hold` | `cancelled`

**Enum `procurement_status`:** `pm_approval` | `not_ordered` | `ordered` | `received`

### Cost Fields Explanation

- **`unit_cost`**: Current cost per unit (our expense). Can be updated anytime.
- **`initial_total_cost`**: Snapshot of `unit_cost × quantity` at item creation. **NEVER UPDATED** after creation. Used for variance analysis.
- **`unit_sales_price`**: Price per unit charged to client.
- **`total_sales_price`**: `unit_sales_price × quantity`.

---

### drawings

One drawing per scope item (1:1 relationship).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| item_id | uuid | FK → scope_items.id, UNIQUE | Linked scope item |
| status | drawing_status | DEFAULT 'not_uploaded' | Approval status |
| current_revision | text | - | Current revision letter (A, B, C...) |
| sent_to_client_at | timestamptz | - | When sent for approval |
| client_response_at | timestamptz | - | When client responded |
| client_comments | text | - | Client feedback |
| approved_by | uuid | FK → users.id | Who approved |
| pm_override | boolean | DEFAULT false | PM bypassed approval |
| pm_override_reason | text | - | Reason for override |
| pm_override_at | timestamptz | - | When overridden |
| pm_override_by | uuid | FK → users.id | Who overrode |
| created_at | timestamptz | DEFAULT now() | Created timestamp |
| updated_at | timestamptz | DEFAULT now() | Updated timestamp |

**Enum `drawing_status`:** `not_uploaded` | `uploaded` | `sent_to_client` | `approved` | `rejected` | `approved_with_comments`

---

### drawing_revisions

Revision history for drawings (immutable records).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| drawing_id | uuid | FK → drawings.id, NOT NULL | Parent drawing |
| revision | text | NOT NULL | Revision letter (A, B, C...) |
| file_url | text | NOT NULL | Main drawing file URL |
| file_name | text | NOT NULL | Original filename |
| file_size | integer | - | File size in bytes |
| cad_file_url | text | - | CAD source file URL |
| cad_file_name | text | - | CAD filename |
| client_markup_url | text | - | Client markup file URL |
| notes | text | - | Revision notes |
| uploaded_by | uuid | FK → users.id | Who uploaded |
| created_at | timestamptz | DEFAULT now() | Created timestamp |

---

### materials

Material samples for client approval.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| project_id | uuid | FK → projects.id, NOT NULL | Parent project |
| material_code | text | DEFAULT '' | Material identifier |
| name | text | NOT NULL | Material name |
| specification | text | - | Technical specs |
| supplier | text | - | Supplier name |
| images | jsonb | DEFAULT '[]' | Material images |
| status | material_status | DEFAULT 'pending' | Approval status |
| sent_to_client_at | timestamptz | - | When sent for approval |
| client_response_at | timestamptz | - | When client responded |
| client_comments | text | - | Client feedback |
| approved_by | uuid | FK → users.id | Who approved |
| is_deleted | boolean | DEFAULT false | Soft delete flag |
| created_at | timestamptz | DEFAULT now() | Created timestamp |
| updated_at | timestamptz | DEFAULT now() | Updated timestamp |

**Enum `material_status`:** `pending` | `sent_to_client` | `approved` | `rejected`

---

### item_materials

Many-to-many relationship between scope items and materials.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| item_id | uuid | FK → scope_items.id, NOT NULL | Scope item |
| material_id | uuid | FK → materials.id, NOT NULL | Material |
| created_at | timestamptz | DEFAULT now() | Created timestamp |

---

### reports

Progress reports for projects.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| project_id | uuid | FK → projects.id, NOT NULL | Parent project |
| report_type | text | DEFAULT 'progress' | Report type |
| is_published | boolean | DEFAULT false | Publication status |
| published_at | timestamptz | - | Publication timestamp |
| share_with_client | boolean | DEFAULT false | Client visibility |
| share_internal | boolean | DEFAULT true | Internal visibility |
| created_by | uuid | FK → users.id | Creator |
| updated_by | uuid | FK → users.id | Last editor |
| created_at | timestamptz | DEFAULT now() | Created timestamp |
| updated_at | timestamptz | DEFAULT now() | Updated timestamp |

---

### report_lines

Content lines within reports.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| report_id | uuid | FK → reports.id, NOT NULL | Parent report |
| line_order | integer | NOT NULL | Display order |
| title | text | NOT NULL | Line title |
| description | text | - | Line description |
| photos | jsonb | DEFAULT '[]' | Line photos |
| created_at | timestamptz | DEFAULT now() | Created timestamp |
| updated_at | timestamptz | DEFAULT now() | Updated timestamp |

---

### report_shares

Junction table for report sharing permissions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| report_id | uuid | FK → reports.id, NOT NULL | Report |
| user_id | uuid | FK → users.id, NOT NULL | Shared with user |
| created_at | timestamptz | DEFAULT now() | Created timestamp |

---

### milestones

Project milestones with alert configuration.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| project_id | uuid | FK → projects.id, NOT NULL | Parent project |
| name | text | NOT NULL | Milestone name |
| description | text | - | Description |
| due_date | date | NOT NULL | Due date |
| is_completed | boolean | DEFAULT false | Completion status |
| completed_at | timestamptz | - | Completion timestamp |
| alert_days_before | integer | DEFAULT 7 | Days before to alert |
| created_at | timestamptz | DEFAULT now() | Created timestamp |
| updated_at | timestamptz | DEFAULT now() | Updated timestamp |

---

### snagging

Installation punch list items.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| project_id | uuid | FK → projects.id, NOT NULL | Parent project |
| item_id | uuid | FK → scope_items.id | Related scope item |
| description | text | NOT NULL | Snag description |
| photos | jsonb | DEFAULT '[]' | Photos |
| is_resolved | boolean | DEFAULT false | Resolution status |
| resolved_at | timestamptz | - | Resolution timestamp |
| resolved_by | uuid | FK → users.id | Who resolved |
| resolution_notes | text | - | Resolution notes |
| created_by | uuid | FK → users.id | Creator |
| created_at | timestamptz | DEFAULT now() | Created timestamp |
| updated_at | timestamptz | DEFAULT now() | Updated timestamp |

---

### notifications

In-app notifications for users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| user_id | uuid | FK → users.id, NOT NULL | Target user |
| type | text | NOT NULL | Notification type |
| title | text | NOT NULL | Notification title |
| message | text | - | Notification message |
| project_id | uuid | FK → projects.id | Related project |
| item_id | uuid | FK → scope_items.id | Related item |
| drawing_id | uuid | FK → drawings.id | Related drawing |
| material_id | uuid | FK → materials.id | Related material |
| report_id | uuid | FK → reports.id | Related report |
| is_read | boolean | DEFAULT false | Read status |
| read_at | timestamptz | - | Read timestamp |
| email_sent | boolean | DEFAULT false | Email sent flag |
| created_at | timestamptz | DEFAULT now() | Created timestamp |

---

### activity_log

Audit trail for all actions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| user_id | uuid | FK → users.id | Acting user |
| action | text | NOT NULL | Action type |
| entity_type | text | NOT NULL | Entity type (project, item, etc.) |
| entity_id | uuid | - | Entity ID |
| project_id | uuid | FK → projects.id | Related project |
| details | jsonb | - | Additional details |
| created_at | timestamptz | DEFAULT now() | Created timestamp |

---

### drafts

Autosaved form data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| user_id | uuid | FK → users.id, NOT NULL | Draft owner |
| entity_type | text | NOT NULL | Entity type being drafted |
| entity_id | uuid | - | Entity ID if editing existing |
| data | jsonb | NOT NULL | Form data JSON |
| created_at | timestamptz | DEFAULT now() | Created timestamp |
| updated_at | timestamptz | DEFAULT now() | Updated timestamp |

**Unique constraint:** `(user_id, entity_type, entity_id)`

---

## Indexes

Foreign key columns have indexes for JOIN performance:

```sql
idx_scope_items_project_id
idx_scope_items_parent_id
idx_drawings_item_id
idx_drawing_revisions_drawing_id
idx_materials_project_id
idx_item_materials_item_id
idx_item_materials_material_id
idx_reports_project_id
idx_report_lines_report_id
idx_notifications_user_id
idx_activity_log_project_id
-- ... and more
```

---

## RLS Policies

All tables have Row Level Security enabled. Key patterns:

- **Admin:** Full access to all rows
- **PM:** Access to assigned projects
- **Client:** Read-only access to their projects
- **Management:** Read-only access to all projects

Helper functions (SECURITY DEFINER):
- `get_user_role()` - Returns current user's role
- `is_assigned_to_project(uuid)` - Checks project assignment
- `is_client_for_project(uuid)` - Checks client relationship
- `is_admin()` - Checks admin role

---

## Migrations

Located in `supabase/migrations/`:

| File | Description |
|------|-------------|
| 001_performance_indexes.sql | Initial performance indexes |
| 002_client_safe_views.sql | Client-safe database views (SECURITY INVOKER, updated in 043) |
| 003_fix_function_search_paths.sql | Security fix for functions |
| 004_fix_rls_init_plan.sql | RLS performance optimization |
| 005_add_fk_indexes.sql | Foreign key indexes |
| 006_consolidate_rls_policies.sql | RLS policy cleanup |
| 007_fix_remaining_advisor_issues.sql | Advisor recommendations |
| 008_add_parent_id_to_scope_items.sql | Item splitting feature |
| 009_add_cost_tracking_fields.sql | Cost tracking columns |
| 010_fix_rls_update_with_check.sql | RLS update policies |
| 011_add_drawing_revisions_composite_index.sql | Drawing revisions index |
| 012_add_drafts_table.sql | Autosave drafts table |
| ... | (migrations 013-046 — see files in `supabase/migrations/`) |
| 047_admin_views_scope_drawings_materials.sql | Admin views: v_scope_items, v_drawings, v_materials, v_milestones, v_snagging (SECURITY INVOKER) |
