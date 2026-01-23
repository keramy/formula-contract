# Formula Contract - Codebase Documentation

> **Last Updated:** January 23, 2026
> **Tech Stack:** Next.js 16 + React 19 + Supabase + TypeScript + TailwindCSS 4

---

## Overview

Formula Contract is a **project management system for furniture manufacturing contracts**. It handles the complete lifecycle from tender to installation, including:

- Project & scope item management
- Drawing approval workflows
- Material specification & approval
- Production tracking
- Quality control (snagging)
- Report generation & publishing
- Multi-role access control

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Login, password reset, setup
│   └── (dashboard)/       # Main application pages
├── components/            # React components (60+ business, 64 UI)
│   ├── dashboard/         # Dashboard widgets
│   ├── drawings/          # Drawing management
│   ├── layout/            # App shell (sidebar, header)
│   ├── materials/         # Material management
│   ├── notifications/     # Notification center
│   ├── projects/          # Project components
│   ├── reports/           # Report builder
│   ├── scope-items/       # Scope item management
│   └── ui/                # shadcn/ui components
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities & server actions
│   ├── actions/           # Server actions (all DB operations)
│   ├── activity-log/      # Audit trail
│   ├── notifications/     # Email & in-app notifications
│   └── supabase/          # Supabase client helpers
├── types/                 # TypeScript types
└── test/                  # Test setup
```

---

## Database Schema

### Core Entities

| Table | Purpose |
|-------|---------|
| `users` | Team members (admin, pm, production, procurement, management, client) |
| `clients` | Client companies |
| `projects` | Manufacturing projects with status, currency, contract value |
| `scope_items` | Items to produce/procure with costs and progress |
| `drawings` | Technical drawings with revision tracking |
| `drawing_revisions` | Drawing version history with files |
| `materials` | Material specifications with approval status |
| `item_materials` | Links scope items to materials |
| `snagging` | Quality issues/defects |
| `milestones` | Project milestones with due dates |
| `project_assignments` | Team member assignments |
| `reports` | Project reports |
| `report_lines` | Report sections with photos |
| `notifications` | In-app notifications |
| `activity_log` | Audit trail |
| `drafts` | Unsaved work preservation |

### Key Enums

```typescript
UserRole: admin | pm | production | procurement | management | client
ProjectStatus: tender | active | on_hold | completed | cancelled
ItemPath: production | procurement
ItemStatus: pending | in_design | awaiting_approval | approved | in_production | complete | on_hold | cancelled
DrawingStatus: not_uploaded | uploaded | sent_to_client | approved | rejected | approved_with_comments
MaterialStatus: pending | sent_to_client | approved | rejected
Currency: TRY | USD | EUR
```

---

## Role-Based Access

| Role | Projects | Clients | Users | Reports | Settings |
|------|----------|---------|-------|---------|----------|
| **admin** | All | Full | Full | All | Full |
| **pm** | Assigned | View/Create | - | Assigned | - |
| **production** | Assigned | - | - | - | - |
| **procurement** | Assigned | - | - | - | - |
| **management** | All (view) | - | - | All | - |
| **client** | Own only | - | - | Own | - |

---

## Key Workflows

### Drawing Approval Flow
```
Upload → Send to Client → Client Reviews → Approve/Reject
                                              ↓
                                     (If rejected)
                                     Upload new revision
                                              ↓
                                     PM can override approval
```

### Material Approval Flow
```
Create Material → Assign to Items → Send to Client → Client Approves/Rejects
```

### Scope Item Lifecycle
```
Pending → In Design → Awaiting Approval → Approved → In Production → Complete
                                                          ↓
                                              Track production_percentage (0-100%)
                                                          ↓
                                              Mark as installed
```

### Report Publishing
```
Create Report → Add Sections → Reorder (drag-drop) → Publish
                                                        ↓
                                              Email sent to team
                                              Notifications created
```

---

## Cost Tracking Model

Scope items have **three cost types**:

| Type | Fields | Purpose |
|------|--------|---------|
| **Initial** | `initial_unit_cost`, `initial_total_cost` | Budget at creation (never changes) |
| **Actual** | `unit_cost` × `quantity` | Real cost (updated during project) |
| **Sales** | `unit_sales_price`, `total_sales_price` | Client pricing (revenue) |

---

## Server Actions

All database operations go through server actions in `src/lib/actions/`:

| File | Operations |
|------|------------|
| `auth.ts` | Login, password reset, rate limiting |
| `users.ts` | Invite, update, toggle active |
| `materials.ts` | CRUD, approval workflow, image upload, Excel import |
| `scope-items.ts` | CRUD, bulk update, production tracking |
| `reports.ts` | CRUD, publish, sections, sharing, PDF export |
| `project-assignments.ts` | Team management |
| `dashboard.ts` | Stats, tasks, at-risk projects |
| `search.ts` | Global search across entities |
| `drafts.ts` | Save/restore unsaved work |
| `milestones.ts` | CRUD for project milestones |

---

## Custom Hooks

| Hook | Purpose |
|------|---------|
| `useIsMobile()` | Viewport < 768px detection |
| `useIsTablet()` | Viewport < 1200px detection |
| `useFileUpload()` | Complete file upload with drag-drop, validation, previews |
| `useToast()` | Toast notifications (Sonner wrapper) |

---

## UI Component Library

64 UI components in `src/components/ui/` based on shadcn/ui + Radix:

**Forms:** Button, Input, Textarea, Select, Checkbox, Switch, Form (React Hook Form)
**Display:** Card, Badge, Alert, Table, Skeleton, Progress, Avatar
**Navigation:** Sidebar, Breadcrumb, Tabs, Accordion
**Overlays:** Dialog, Sheet, Popover, Dropdown, Tooltip
**Special:** Command (⌘K palette), Calendar, Kanban, Chart, Timeline

---

## Code Patterns

### Sheet Component Structure
```tsx
<SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
  <SheetHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-[color]-50 to-[color]-50">
    {/* Icon + Title + Description */}
  </SheetHeader>
  <form className="px-6 py-6 space-y-5">
    {/* Form fields */}
  </form>
  <SheetFooter className="px-6 py-4 border-t">
    {/* Actions */}
  </SheetFooter>
</SheetContent>
```

### Sortable Table Header
```tsx
function SortableHeader({ field, currentField, direction, onSort, children }) {
  const isActive = currentField === field;
  return (
    <button onClick={() => onSort?.(field)} className="flex items-center gap-1">
      {children}
      {isActive ? (direction === "asc" ? <ArrowUpIcon /> : <ArrowDownIcon />)
                : <ArrowUpDownIcon className="opacity-40" />}
    </button>
  );
}
```

### Three-Tier Attention System
| Tier | Color | Use Case |
|------|-------|----------|
| Critical | `text-rose-600` | Rejected items, failures |
| Warning | `text-amber-600` | Overdue milestones, pending issues |
| Missing | `text-sky-600` | Items not started, missing data |

### Server Action Pattern
```typescript
"use server";

export async function createItem(data: ItemInsert) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Validate & sanitize
  const sanitized = sanitizeText(data.name);

  // Insert with typed payload
  const { data: result, error } = await supabase
    .from("items")
    .insert({ ...data, name: sanitized })
    .select()
    .single();

  if (error) throw error;

  // Log activity
  await logActivity({ action: "item_created", entity_id: result.id });

  return result;
}
```

---

## Performance Optimizations

1. **JWT Metadata Caching** - User role from JWT, not DB query (saves ~3s)
2. **Parallel Data Fetching** - `Promise.all()` for independent queries
3. **Suspense Boundaries** - Streaming SSR for faster first paint
4. **Soft Deletes** - `is_deleted` flag, never hard delete
5. **Activity Log Indexing** - Indexed for fast timeline queries
6. **Draft Auto-save** - Prevent data loss on long forms

---

## External Integrations

| Service | Purpose | Library |
|---------|---------|---------|
| Supabase | Auth + Database + Storage | `@supabase/supabase-js` |
| Resend | Email notifications | `resend` |
| - | PDF Export | `jspdf` |
| - | Excel Import/Export | `xlsx` |
| - | Charts | `recharts` |
| - | Drag-Drop | `@dnd-kit` |

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Email
RESEND_API_KEY=

# App
NEXT_PUBLIC_SITE_URL=
```

---

## Testing

- **Unit Tests:** Vitest (`vitest.config.ts`)
- **E2E Tests:** Playwright (`playwright.config.ts`)
- **Validation Tests:** `src/lib/validations/validations.test.ts`

---

## File Storage Buckets

| Bucket | Content |
|--------|---------|
| `drawings` | PDF and CAD files |
| `materials` | Material images |
| `reports` | Report section photos |
| `snagging` | Defect photos |
| `scope-items` | Scope item images |

All buckets have RLS policies allowing authenticated users to upload/read/update/delete.

---

## Recent Development Sessions

### January 23, 2026 - Projects Page & Attention System
- Three-tier attention system (Critical/Warning/Missing)
- Sortable projects table with progress %
- Installation date column with countdown
- Edit project via sheet (not full page)
- Sheet padding pattern established

### January 21, 2026 - Client Privacy & Notifications
- Hide costs/pricing from client users
- Filter activity feed for client visibility
- Report publish email notifications
- Storage bucket RLS policies
- Management role full project access
