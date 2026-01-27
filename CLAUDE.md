# Formula Contract - Project Intelligence

> **Last Updated:** January 27, 2026
> **Version:** 1.0.0
> **Supabase Project:** `lsuiaqrpkhejeavsrsqc` (contract-eu, eu-central-1)

---

## What is This App?

**Formula Contract** is a Project Management System for Formula International's furniture manufacturing business. It tracks the entire project lifecycle from tender to installation, managing scope items, drawings, materials, and progress reports.

### Core Users
- **PM (Project Manager):** Creates projects, manages scope items, uploads drawings, generates reports
- **Client:** Views project progress, approves/rejects drawings and materials
- **Admin:** Full access, user management
- **Production:** Updates production progress percentages
- **Procurement:** Manages procurement path items, marks as ordered/received
- **Management:** Read-only overview of all projects

### Core Flow
```
Tender → Active → Scope Items → Drawings/Materials Approval → Production/Procurement → Installation → Complete
         ↓
    Not Awarded (if tender lost to competitor)
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Database | Supabase (PostgreSQL + Auth + Storage + RLS) |
| Server State | React Query (TanStack Query) |
| Client State | Zustand |
| Forms | react-hook-form + zod |
| Tables | @tanstack/react-table |
| Deployment | Vercel |

---

## Project Structure

```
formula-contract/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/               # Auth pages (login, forgot-password, etc.)
│   │   ├── (dashboard)/          # Protected pages with sidebar
│   │   │   ├── dashboard/        # Main dashboard
│   │   │   ├── projects/         # Project list and details
│   │   │   │   └── [id]/         # Project detail with tabs
│   │   │   │       ├── scope/    # Scope items tab
│   │   │   │       └── reports/  # Reports tab
│   │   │   ├── clients/          # Client management
│   │   │   ├── users/            # User management (admin only)
│   │   │   └── settings/         # User settings
│   │   └── auth/callback/        # Supabase auth callback
│   │
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── layout/               # App layout (sidebar, header)
│   │   ├── projects/             # Project-related components
│   │   ├── scope-items/          # Scope item components
│   │   ├── drawings/             # Drawing management
│   │   ├── materials/            # Material management
│   │   ├── reports/              # Report components
│   │   ├── notifications/        # Notification dropdown
│   │   ├── dashboard/            # Dashboard widgets
│   │   └── forms/                # Shared form components
│   │
│   ├── lib/
│   │   ├── actions/              # Server actions (mutations)
│   │   ├── supabase/             # Supabase client (server/client)
│   │   ├── react-query/          # React Query hooks
│   │   ├── activity-log/         # Activity logging utilities
│   │   └── notifications/        # Notification utilities
│   │
│   ├── hooks/                    # Custom React hooks
│   └── types/                    # TypeScript type definitions
│
├── supabase/
│   └── migrations/               # Database migrations (001-026)
│
└── docs/                         # Documentation
    ├── DATABASE.md               # Schema documentation
    ├── ARCHITECTURE.md           # Technical decisions
    └── ROADMAP.md                # Future plans
```

---

## Database Schema (17 Tables)

### Core Entities

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | Internal users | id, email, name, role, is_active |
| `clients` | External client companies | id, company_name, contact_person |
| `projects` | Main entity | id, project_code, name, client_id, status, currency |
| `scope_items` | Line items (furniture pieces) | id, project_id, item_code, item_path, status, unit_cost, initial_total_cost |
| `drawings` | Drawing approval per item | id, item_id, status, current_revision |
| `drawing_revisions` | Revision history | id, drawing_id, revision (A, B, C...), file_url |
| `materials` | Material samples | id, project_id, name, status, images |
| `reports` | Progress reports | id, project_id, is_published, share_with_client |
| `report_lines` | Report content | id, report_id, title, description, photos |

### Supporting Entities

| Table | Purpose |
|-------|---------|
| `project_assignments` | M:M users to projects |
| `item_materials` | M:M items to materials |
| `milestones` | Project milestones with alerts |
| `snagging` | Installation punch list |
| `notifications` | In-app notifications |
| `activity_log` | Audit trail |
| `drafts` | Autosaved form data |
| `report_shares` | Report sharing permissions |

### Key Enums

```typescript
UserRole: "admin" | "pm" | "production" | "procurement" | "management" | "client"
ProjectStatus: "tender" | "active" | "on_hold" | "completed" | "cancelled" | "not_awarded"
ItemPath: "production" | "procurement"
ItemStatus: "pending" | "in_design" | "awaiting_approval" | "approved" | "in_production" | "complete" | "on_hold" | "cancelled"
DrawingStatus: "not_uploaded" | "uploaded" | "sent_to_client" | "approved" | "rejected" | "approved_with_comments"
MaterialStatus: "pending" | "sent_to_client" | "approved" | "rejected"
ProcurementStatus: "pm_approval" | "not_ordered" | "ordered" | "received"
Currency: "TRY" | "USD" | "EUR"
```

**Note:** `not_awarded` status is used when a tender is lost to a competitor (distinct from `cancelled` which is an internal decision).

---

## Critical Business Rules

### The Dual Path Pattern
Every `scope_item` has an `item_path` that determines its workflow:

**Production Path:**
```
PENDING → IN_DESIGN → AWAITING_APPROVAL → APPROVED → IN_PRODUCTION → COMPLETE
                            ↓
                        REJECTED (back to IN_DESIGN)
```
- Requires drawing upload and client approval
- Requires material selection and approval
- Tracks production_percentage (0-100%)

**Procurement Path:**
```
PM_APPROVAL → NOT_ORDERED → ORDERED → RECEIVED
```
- PM approves for ordering
- Tracks order status
- No drawing required

### Cost Tracking (IMPORTANT!)

**Two separate cost concepts:**
- `initial_total_cost`: Baseline budget, set ONCE at item creation, NEVER updated
- `unit_cost × quantity`: Current actual cost, can be updated anytime

**Bug Fix Applied (Jan 20, 2026):** The `scope-item-sheet.tsx` was incorrectly recalculating `initial_total_cost` on every save. Now it's only set during INSERT, not UPDATE.

### Drawing Approval Cycle
1. PM uploads drawing (revision A)
2. PM sends to client
3. Client reviews and responds: Approve / Reject / Approve with Comments
4. If rejected: New revision (B), repeat
5. PM can override with documented reason (audit logged)

### Soft Deletes
All main entities use `is_deleted` flag. Always filter with `.eq("is_deleted", false)`.

---

## Code Patterns

### Server Actions (Mutations)
```typescript
// src/lib/actions/example.ts
"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateSomething(id: string, data: FormData) {
  const supabase = await createClient();

  // 1. Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // 2. Perform operation (RLS handles authorization)
  const { data: result, error } = await supabase
    .from("table")
    .update({ ... })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  // 3. Revalidate cache
  revalidatePath("/relevant/path");

  return result;
}
```

### React Query Integration
```typescript
// src/lib/react-query/materials.ts
export function useMaterials(projectId: string) {
  return useQuery({
    queryKey: ["materials", projectId],
    queryFn: () => getMaterials(projectId),
  });
}

export function useCreateMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMaterial,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast.success("Material created");
    },
  });
}
```

### Form Pattern
```typescript
const schema = z.object({
  name: z.string().min(1, "Required"),
  status: z.enum(["pending", "approved"]),
});

function MyForm() {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", status: "pending" },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField name="name" control={form.control} render={...} />
      </form>
    </Form>
  );
}
```

### Sheet Pattern (Quick Edit)
```typescript
// Use Sheet for quick add/edit from tables
<Sheet open={open} onOpenChange={setOpen}>
  <SheetContent className="w-full sm:max-w-lg">
    <SheetHeader>
      <SheetTitle>Add Item</SheetTitle>
    </SheetHeader>
    {/* Form content */}
    <SheetFooter>
      <Button onClick={handleSubmit}>Save</Button>
    </SheetFooter>
  </SheetContent>
</Sheet>
```

---

## Supabase Security (CRITICAL)

### RLS Performance - Always Use InitPlan
```sql
-- BAD: auth.uid() evaluated per row (O(n))
USING (user_id = auth.uid())

-- GOOD: auth.uid() evaluated once via InitPlan (O(1))
USING (user_id = (SELECT auth.uid()))
```

### Function Security
```sql
-- Always set search_path to prevent schema injection
CREATE OR REPLACE FUNCTION public.my_function()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public  -- REQUIRED!
AS $$ ... $$;
```

### RLS Helper Functions (SECURITY DEFINER)
- `get_user_role()` - Returns current user's role
- `is_assigned_to_project(uuid)` - Checks project assignment
- `is_client_for_project(uuid)` - Checks if user is client
- `is_admin()` - Checks admin role

---

## Common Tasks

### Adding a New Scope Item Field
1. Add migration: `supabase/migrations/XXX_add_field.sql`
2. Update types: `src/types/database.ts`
3. Update form: `src/components/scope-items/scope-item-sheet.tsx`
4. Update display: relevant table/detail components

### Creating a Migration
```sql
-- supabase/migrations/XXX_description.sql
ALTER TABLE scope_items ADD COLUMN new_field text;

-- Always add index for FK columns
CREATE INDEX IF NOT EXISTS idx_table_fk ON table(fk_column);
```

### Adding a Server Action
1. Create in `src/lib/actions/[entity].ts`
2. Add React Query hook in `src/lib/react-query/[entity].ts`
3. Use in component with `useMutation`

---

## Important Gotchas

1. **Always check `is_deleted`** - Soft delete pattern used everywhere
2. **Currency matters** - Projects have currency field (TRY/USD/EUR)
3. **Drawing revisions are immutable** - Never edit, create new revision
4. **Client portal is read-only** - Clients can only view and approve/reject
5. **PM override needs reason** - Can't skip approval without documented reason
6. **Never update `initial_total_cost`** - Only set during item creation
7. **Always use `(SELECT auth.uid())`** - Never bare `auth.uid()` in RLS
8. **Functions need `SET search_path`** - Security requirement
9. **Server actions for mutations** - Never mutate from client components
10. **React Query for server state** - Don't duplicate in useState

---

## File Storage (Supabase Storage)

```
drawings/{project_id}/{item_id}/{revision}_drawing.pdf
materials/{project_id}/{material_id}/image_1.jpg
reports/{project_id}/{report_id}/photo_1.jpg
scope-items/{project_id}/{item_id}/image_1.jpg
```

---

## Quick Supabase Queries

```typescript
// Get project with all relations
const { data } = await supabase
  .from("projects")
  .select(`
    *,
    client:clients(*),
    items:scope_items(*, drawing:drawings(*)),
    assignments:project_assignments(user:users(*))
  `)
  .eq("id", projectId)
  .eq("is_deleted", false)
  .single();

// Get scope items with materials
const { data } = await supabase
  .from("scope_items")
  .select(`
    *,
    drawing:drawings(*),
    item_materials(material:materials(*))
  `)
  .eq("project_id", projectId)
  .eq("is_deleted", false);
```

---

## Testing Checklist

Before any feature is complete:
- [ ] Works for all relevant user roles
- [ ] Form validation shows proper errors
- [ ] Loading states displayed
- [ ] Error states handled gracefully
- [ ] Mobile responsive (test at 375px width)
- [ ] Activity logged where required
- [ ] Notifications created where specified
- [ ] `is_deleted` filter applied in queries

---

## Versioning

The app uses semantic versioning with CI/CD integration:

```bash
# Bump version (updates package.json, creates git tag, pushes)
npm run version:patch   # 1.0.0 → 1.0.1 (bug fixes)
npm run version:minor   # 1.0.0 → 1.1.0 (new features)
npm run version:major   # 1.0.0 → 2.0.0 (breaking changes)
```

Version is displayed in the sidebar footer and injected at build time via `next.config.ts`.

---

## Current Status (Jan 2026)

### Completed
- Auth (login, logout, password reset)
- Projects CRUD with client assignment
- Scope items (dual path, status workflow)
- Drawings (upload, revisions, approval cycle)
- Materials (images, approval)
- Reports (create, lines, publish, share)
- Notifications system
- Activity logging
- Dashboard redesign (compact layout, This Week widget, Projects Status Chart)
- Version system with CI/CD integration
- "Not Awarded" project status for lost tenders

### In Progress
- Financial module (see FINANCIAL-MODULE-PLAN.md)

### Planned
- Mobile optimization
- Command menu (Cmd+K)
- PDF Executive Summary generation
