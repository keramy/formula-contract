# Formula Contract - Project Intelligence

## Project Overview

**What:** Project Management System for furniture manufacturing (Formula Contract)
**Core Flow:** Tender → Active → Scope Items → Drawings/Materials Approval → Production/Procurement → Installation → Close
**Style:** Notion-inspired (clean, minimal, generous whitespace)

---

## Architecture Decisions

### Tech Stack
- **Frontend:** Next.js 16 + React 19 + TypeScript
- **Styling:** Tailwind CSS v4 + shadcn/ui (premium bundui kit)
- **Backend:** Supabase (PostgreSQL + Auth + Storage + RLS)
- **State:** Zustand for client state, React Query patterns for server state
- **Forms:** react-hook-form + zod validation
- **Tables:** @tanstack/react-table

### Routing Structure
```
/login                    # Public - Auth
/forgot-password          # Public - Password reset
/dashboard                # Protected - PM dashboard
/projects                 # Protected - Project list
/projects/[id]            # Protected - Project detail (tabbed)
/projects/[id]/scope      # Tab - Scope items
/projects/[id]/drawings   # Tab - Drawings
/projects/[id]/materials  # Tab - Materials
/projects/[id]/reports    # Tab - Reports
/users                    # Admin only
/settings                 # User settings
```

---

## Database Schema Patterns

### Core Entities (17 tables)
1. **users** - Internal users (6 roles)
2. **clients** - External client companies
3. **projects** - Main entity, has status lifecycle
4. **project_assignments** - M:M users to projects
5. **milestones** - Project milestones with alerts
6. **scope_items** - Line items (dual path: production/procurement)
7. **drawings** - Drawing approval tracking per item
8. **drawing_revisions** - Revision history (A, B, C...)
9. **materials** - Material samples for approval
10. **item_materials** - M:M items to materials
11. **snagging** - Installation punch list
12. **reports** - Weekly/progress reports
13. **report_lines** - Report content with photos
14. **notifications** - In-app notifications
15. **activity_log** - Audit trail

### Key Enums
```typescript
UserRole: "admin" | "pm" | "production" | "procurement" | "management" | "client"
ProjectStatus: "tender" | "active" | "on_hold" | "completed" | "cancelled"
ItemPath: "production" | "procurement"
ItemStatus: "pending" | "in_design" | "awaiting_approval" | "approved" | "in_production" | "complete"
DrawingStatus: "not_uploaded" | "uploaded" | "sent_to_client" | "approved" | "rejected" | "approved_with_comments"
```

### The Dual Path Pattern (Critical!)
Every scope_item has an `item_path`:
- **Production:** Requires drawing + material approval → In Production → Complete
- **Procurement:** PM approval → Order tracking → Received

---

## Code Patterns

### Component Naming
```typescript
// Page components: PascalCase with Page suffix
ProjectsPage, DashboardPage, LoginPage

// Feature components: PascalCase descriptive
ProjectCard, ScopeItemRow, DrawingUploader

// UI components: From shadcn - use as-is
Button, Card, Dialog, Sheet, Table
```

### File Naming
```
kebab-case.tsx     # Components
kebab-case.ts      # Utilities, hooks
UPPER_CASE.md      # Documentation
```

### Data Fetching Pattern
```typescript
// Server Components for initial data
async function ProjectPage({ params }) {
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("*, client:clients(*)")
    .eq("id", params.id)
    .single();

  return <ProjectDetail project={project} />;
}

// Client Components for mutations
"use client";
function UpdateProjectForm({ project }) {
  const [pending, startTransition] = useTransition();
  // Server action for mutation
}
```

### Form Pattern
```typescript
// Always use react-hook-form + zod
const schema = z.object({
  name: z.string().min(1, "Required"),
  status: z.enum(["tender", "active", "on_hold"]),
});

function ProjectForm() {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  });
}
```

### Status Badge Pattern
```tsx
// Use predefined CSS classes from globals.css
<Badge className="status-active">Active</Badge>
<Badge className="status-completed">Completed</Badge>
<Badge className="path-production">Production</Badge>
<Badge className="approval-approved">Approved</Badge>
```

---

## UI/UX Guidelines

### Notion-Style Principles
1. **Generous whitespace** - Don't crowd elements
2. **Subtle borders** - Use `border-border` (light gray)
3. **Minimal shadows** - `shadow-sm` for cards, `shadow-md` for modals
4. **Clean typography** - Inter font, clear hierarchy
5. **Inline editing** - Prefer inline over modals where possible

### Color Usage
```
Primary (Blue #2563EB)    → Actions, links, active states
Success (Green #10B981)   → Approved, complete, installed
Warning (Amber #F59E0B)   → Pending, attention needed
Destructive (Red #EF4444) → Rejected, cancelled, delete
Muted (Gray)              → Secondary text, backgrounds
```

### Component Spacing
```
Page container: px-6 py-6
Card padding: p-6
Button: px-4 py-2
Table cell: px-4 py-3
Form gap: gap-6 (vertical)
```

---

## Business Logic

### Project Lifecycle
```
TENDER → ACTIVE → ON_HOLD (optional) → COMPLETED
                ↓
            CANCELLED
```

### Item Status Flow (Production Path)
```
PENDING → IN_DESIGN → AWAITING_APPROVAL → APPROVED → IN_PRODUCTION → COMPLETE
                            ↓
                        REJECTED (back to IN_DESIGN)
```

### Drawing Approval Cycle
```
1. PM uploads drawing (revision A)
2. PM sends to client
3. Client reviews in portal
4. Client: Approve / Reject / Approve with Comments
5. If rejected: New revision (B), repeat
6. PM can override with reason (audit logged)
```

### Calculated Fields
```typescript
// Project contract value
contract_value_calculated = SUM(scope_items.total_price)

// Project progress
progress = (items_complete / total_items) * 100

// Item total price
total_price = unit_price * quantity
```

---

## Role Permissions

| Action | Admin | PM | Production | Procurement | Management | Client |
|--------|-------|-----|------------|-------------|------------|--------|
| Create Project | ✓ | ✓ | - | - | - | - |
| Edit Project | ✓ | ✓ | - | - | - | - |
| View All Projects | ✓ | - | - | - | ✓ | - |
| Manage Users | ✓ | - | - | - | - | - |
| Upload Drawings | ✓ | ✓ | ✓ | - | - | - |
| Approve Drawings | - | - | - | - | - | ✓ |
| Update Production % | ✓ | ✓ | ✓ | - | - | - |
| Mark Ordered | ✓ | ✓ | - | ✓ | - | - |

---

## File Storage Structure (Supabase Storage)

```
drawings/
  {project_id}/
    {item_id}/
      {revision}_drawing.pdf
      {revision}_cad.dwg
      {revision}_markup.pdf

materials/
  {project_id}/
    {material_id}/
      image_1.jpg
      image_2.jpg

reports/
  {project_id}/
    {report_id}/
      photo_1.jpg

snagging/
  {project_id}/
    {snag_id}/
      photo_1.jpg
```

---

## Testing Checklist

Before any feature is complete:
- [ ] Works for all relevant user roles
- [ ] Form validation shows proper errors
- [ ] Loading states displayed
- [ ] Error states handled gracefully
- [ ] Mobile responsive
- [ ] Activity logged where required
- [ ] Notifications created where specified

---

## Common Gotchas

1. **Always check `is_deleted`** - Soft delete pattern used
2. **Currency matters** - Projects have currency field (TRY/USD/EUR)
3. **Drawing revisions are immutable** - Never edit, create new revision
4. **Client portal is read-only** - Clients can only view and approve/reject
5. **PM override needs reason** - Can't skip approval without documented reason

---

## Quick Reference

### Supabase Queries
```typescript
// Get project with relations
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

// Get user's assigned projects
const { data } = await supabase
  .from("projects")
  .select("*")
  .eq("is_deleted", false)
  .in("id", userProjectIds);
```

### Status Update Pattern
```typescript
// Always log activity on status changes
async function updateStatus(itemId: string, newStatus: ItemStatus) {
  const { data, error } = await supabase
    .from("scope_items")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", itemId)
    .select()
    .single();

  if (data) {
    await logActivity("status_change", "scope_item", itemId, {
      old_status: oldStatus,
      new_status: newStatus,
    });
  }
}
```

---

## Implementation Priority (MVP)

1. **Auth** - Login, logout, password reset
2. **Projects CRUD** - List, create, edit, archive
3. **Scope Items** - Add items, set path, basic status
4. **Drawings** - Upload, revision, send to client
5. **Materials** - Add, images, send to client
6. **Client Portal** - View-only, approve/reject
7. **Installation** - Mark installed, snagging
8. **Reports** - Create, add lines, publish
9. **Dashboard** - PM overview
10. **Notifications** - In-app alerts
