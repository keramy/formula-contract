# Formula Contract - Project Intelligence

> **Last Updated:** February 9, 2026
> **Version:** 1.1.0
> **Supabase Project:** `lsuiaqrpkhejeavsrsqc` (contract-eu, eu-central-1)

---

## Quick Start

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (port 3000)
npm run email:dev    # Preview emails (port 3001)
npm run test         # Run unit tests
npm run test:e2e     # Run E2E tests (Playwright)
npm run lint         # Lint code
npm run build        # Production build
```

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
Tender → Active → Scope Items → Drawings/Materials Approval → Production/Procurement → Shipped → Installing → Installed → Complete
         ↓
    Not Awarded (if tender lost to competitor)
```

### Scope Item Progress Tracking
Each scope item tracks workflow progress through multiple states:
- **Shipped** (`is_shipped`) - Item has left the factory
- **Installation Started** (`is_installation_started`) - Installation work has begun on-site
- **Installed** (`is_installed`) - Installation complete

**Progress Calculation Formula:**
- Production items: `(production_percentage × 0.9) + (installation_started ? 5 : 0) + (installed ? 5 : 0)`
- Procurement items: `installed ? 100 : 0`

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
| Gantt Chart | Custom built (components/gantt/) |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
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
│   │   │   │       ├── reports/  # Reports tab
│   │   │   │       └── timeline/ # Standalone Gantt timeline page
│   │   │   ├── clients/          # Client management
│   │   │   ├── finance/          # Financial overview (admin/management only)
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
│   │   ├── finance/              # Finance charts and KPI cards
│   │   ├── milestones/           # Milestone card components
│   │   ├── gantt/                # Gantt chart components (7 files)
│   │   └── forms/                # Shared form components
│   │
│   ├── lib/
│   │   ├── actions/              # Server actions (mutations)
│   │   ├── supabase/             # Supabase client (server/client)
│   │   ├── react-query/          # React Query hooks (incl. timelines.ts)
│   │   ├── pdf/                  # PDF generation (reports)
│   │   │   ├── generate-report-pdf.ts  # Main PDF generator
│   │   │   └── image-helpers.ts        # Image loading/sizing utils
│   │   ├── activity-log/         # Activity logging utilities
│   │   └── notifications/        # Notification utilities
│   │
│   ├── hooks/                    # Custom React hooks
│   │   ├── use-autosave.ts       # Autosave form data to drafts
│   │   ├── use-debounce.ts       # Debounce values
│   │   ├── use-file-upload.ts    # File upload with validation
│   │   ├── use-media-query.ts    # Responsive breakpoints
│   │   ├── use-mobile.ts         # Mobile detection
│   │   └── use-toast.ts          # Toast notifications
│   │
│   ├── emails/                   # Email templates (react-email)
│   │   ├── welcome-email.tsx     # New user welcome
│   │   ├── project-assignment-email.tsx  # Assigned to project
│   │   ├── milestone-alert-email.tsx     # Milestone approaching/overdue
│   │   └── report-published-email.tsx    # Report shared with client
│   │
│   └── types/                    # TypeScript type definitions
│
├── supabase/
│   └── migrations/               # Database migrations (001-045)
│
└── docs/                         # Documentation
    ├── DATABASE.md               # Schema documentation
    ├── ARCHITECTURE.md           # Technical decisions
    └── ROADMAP.md                # Future plans
```

---

## Database Schema (19 Tables)

### Core Entities

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | Internal users | id, email, name, role, is_active |
| `clients` | External client companies | id, company_name, contact_person |
| `projects` | Main entity | id, project_code, name, client_id, status, currency |
| `scope_items` | Line items (furniture pieces) | id, project_id, item_code, item_path, status, unit_cost, initial_total_cost, is_shipped, is_installation_started, is_installed |
| `drawings` | Drawing approval per item | id, item_id, status, current_revision |
| `drawing_revisions` | Revision history | id, drawing_id, revision (A, B, C...), file_url |
| `materials` | Material samples | id, project_id, name, status, images |
| `reports` | Progress reports | id, project_id, is_published, share_with_client |
| `report_lines` | Report content | id, report_id, title, description, photos |
| `project_timelines` | Gantt timeline items | id, project_id, name, item_type, phase_key, parent_id, sort_order, start_date, end_date, priority, progress_override, is_completed |
| `timeline_dependencies` | Dependencies between items | id, project_id, source_id, target_id, dependency_type, lag_days |

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
GanttItemType: "phase" | "task" | "milestone"
PhaseKey: "design" | "production" | "shipping" | "installation"
DependencyType: 0 (FS) | 1 (SS) | 2 (FF) | 3 (SF)
Priority: 1 (Low) | 2 (Normal) | 3 (High) | 4 (Critical)
```

**Note:** `not_awarded` status is used when a tender is lost to a competitor (distinct from `cancelled` which is an internal decision).

---

## Critical Business Rules

### The Dual Path Pattern
Every `scope_item` has an `item_path` that determines its workflow:

**Production Path:**
```
PENDING → IN_DESIGN → AWAITING_APPROVAL → APPROVED → IN_PRODUCTION → SHIPPED → INSTALLING → INSTALLED
                            ↓
                        REJECTED (back to IN_DESIGN)
```
- Requires drawing upload and client approval
- Requires material selection and approval
- Tracks production_percentage (0-100%)
- Tracks delivery: is_shipped → is_installation_started → is_installed

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

### Currency Formatting Pattern
```typescript
// Always use manual symbols for consistent display (₺, $, €)
// Intl.NumberFormat shows "TRY" instead of "₺" for en-US locale
const currencySymbols: Record<string, string> = { TRY: "₺", USD: "$", EUR: "€" };

function formatCurrency(value: number | null, currency: string): string {
  if (value === null || value === undefined) return "-";
  const symbol = currencySymbols[currency] || currency;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${symbol}${formatted}`;  // ₺1,234.00
}
```

### Recharts Data Types
```typescript
// Recharts Pie/Bar components require index signature on data objects
interface ChartDataItem {
  name: string;
  value: number;
  fill?: string;
  [key: string]: string | number | undefined; // Required for Recharts
}
```

### Gantt Chart Architecture

The Gantt chart is a custom-built component system (not a library). It lives in `src/components/gantt/` with 7 files:

```
gantt-chart.tsx      # Main orchestrator — toolbar, sidebar, timeline, state management
gantt-sidebar.tsx    # Left panel — item names, hierarchy, drag-and-drop reorder
gantt-header.tsx     # Timeline column headers (day/week/month labels)
gantt-row.tsx        # Individual timeline row (background, grid lines, today marker)
gantt-bar.tsx        # Draggable bar for each item (move, resize, progress)
gantt-dependencies.tsx # SVG dependency arrows between items
dependency-dialog.tsx  # Dialog for creating/editing dependency links
types.ts             # Shared types, constants, utility functions
index.ts             # Barrel exports
```

**Key Architecture Decisions:**
- **Sidebar width is auto-calculated** from column widths sum (no manual resize handle)
- **Fixed header height = 48px** across all view modes (day/week/month)
- **Chart area uses `flex-1 min-h-0`** to fill available space (no fixed pixel height)
- **GlassCard wrapper uses `py-0 gap-0`** to override Card base padding
- **Hierarchy is visual only** — indent spacer (20px/level) + chevron, no tree connector lines
- **Row numbers are stable** — pre-computed from full `items` array via `originalIndexMap`, not re-indexed on collapse
- **DnD activation on row numbers** — no visible grip icon, keeps sidebar compact
- **Priority shown as colored left border** (3px) — not inline dot/badge

**Sidebar Column Layout:**

| Column | Default Width | Min | Max |
|--------|--------------|-----|-----|
| # (row num) | 28px | 24 | 60 |
| Name | 200px | 140 | 460 |
| Begin | 64px | 56 | 140 |
| End | 64px | 56 | 140 |
| Days | 56px | 40 | 100 |

**Data Flow:**
```
page.tsx (Server) → fetches project + scope items
  ↓
timeline-client.tsx (Client) → React Query fetches timeline items + dependencies
  ↓
GanttChart → manages view mode, selection, scroll sync, toolbar actions
  ↓
GanttSidebar + GanttHeader + GanttRow/GanttBar + GanttDependencies
```

**React Query Pattern (timelines.ts):**
- All mutations use optimistic updates (cancel queries → snapshot → update cache → rollback on error)
- Query key factory: `timelineKeys.list(projectId)`, `timelineKeys.dependencyList(projectId)`
- `staleTime: 30s` — timeline data changes frequently during editing sessions

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
11. **Recharts index signature** - Data types need `[key: string]: string | number` for Pie/Bar charts
12. **Gantt GlassCard needs `py-0 gap-0`** - Card base has both padding and flex gap that must be overridden
13. **Timeline migration 045 required** - `045_gantt_rewrite.sql` must run on Supabase before Gantt UI works
14. **Adjacent panel alignment** — When two side-by-side panels need matching row heights, both header wrappers must set explicit `height` + `box-border` so `border-b` is counted inside

### Git on Windows
- CRLF warnings are normal (`LF will be replaced by CRLF`) - safe to ignore
- If `gh` CLI unavailable, create PRs via GitHub web: `https://github.com/{owner}/{repo}/pull/new/{branch}`
- Always use `-u` flag on first push: `git push -u origin branch-name`

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

## Lessons Learned / Mistakes to Avoid

### PDF Generation (`src/lib/pdf/generate-report-pdf.ts`)

| Issue | Wrong Approach | Correct Approach |
|-------|---------------|------------------|
| **Photo borders** | Drew gray rectangle borders around every photo with `doc.rect(..., "S")` | Photos look cleaner without borders - remove border drawing code |
| **Fixed photo sizing** | Used hardcoded `photoHeight = photoWidth * 0.75` regardless of page space | Calculate dynamic size based on `availableHeight` and cap at 1.5x default |
| **Duplicated code** | Had separate implementations for `generateReportPdfBase64` and `downloadReportPdf` | Extract shared `generatePdfDocument()` function, reuse in both |
| **Placeholder borders** | Used `"FD"` (fill + draw) for placeholder rectangles | Use `"F"` (fill only) for borderless placeholders |

**Dynamic Photo Sizing Algorithm:**
```typescript
// Calculate available space and optimal photo height
const defaultPhotoHeight = photoWidth * 0.75; // 4:3 baseline
const photoRows = Math.ceil(photos.length / photosPerRow);
const availableHeight = maxContentY - y - 8; // Leave margin
const maxHeightPerRow = (availableHeight - (photoRows - 1) * photoGap) / photoRows;

// Expand if space allows, but cap at 1.5x to avoid absurdly large photos
const photoHeight = Math.min(
  Math.max(defaultPhotoHeight, maxHeightPerRow),
  defaultPhotoHeight * 1.5
);
```

### jsPDF Drawing Modes
- `"S"` = Stroke only (draws border)
- `"F"` = Fill only (no border)
- `"FD"` = Fill + Draw (fill with border)

**Rule:** When you don't want borders, always use `"F"` not `"FD"`.

### PDF V2 Template Design (Feb 2026)
- **2-column photo grid** (not 3) with 3:2 aspect ratio
- **Smart photo layouts:** single (16:9 full-width), triple (hero + 2 side), standard (2-col grid)
- **Inline teal section numbers** (01, 02) instead of badge boxes
- **Section dividers** between sections (gray horizontal line)
- **Print-friendly:** No page borders, minimal ink, "Confidential" in footer
- **Helper function pattern:** Extract `drawImage()` for letterbox-fit logic
- **COLORS constant:** Define all colors at top of file for consistency

### Code Extraction Pattern
When two functions share 90%+ similar code:
1. Extract the common logic into an internal function
2. Have both public functions call the internal one
3. Return intermediate results (like `{ doc, fileName }`) for flexibility

### Image Helper Functions
Extracted to `src/lib/pdf/image-helpers.ts`:
- `loadImageWithDimensions()` - Converts URL to base64 with dimension info
- `calculateFitDimensions()` - Calculates aspect-ratio-preserving fit dimensions
- `ImageData` type - Standardized image data interface

### Code Review Fixes (Feb 2026)

| Issue | File | Fix |
|-------|------|-----|
| **RLS Performance Bug** | `supabase/migrations/012_add_drafts_table.sql` | Fixed in migration 035 - changed `auth.uid()` to `(SELECT auth.uid())` for InitPlan optimization |
| **Non-existent column** | `src/lib/actions/scope-items.ts:745` | Changed `unit_cost: null` to `initial_unit_cost: null` in `splitScopeItem()` |
| **Debug console.logs** | `src/lib/actions/reports.ts` | Removed 15+ debug `console.log` statements from notification functions |
| **Weak password generation** | `src/lib/actions/users.ts:251` | Replaced `Math.random()` with `crypto.randomBytes()` for secure temp passwords |
| **Missing Error Boundary** | `src/app/(dashboard)/layout.tsx` | Added ErrorBoundary component to catch rendering errors gracefully |
| **Missing ARIA labels** | `scope-items-table.tsx:618` | Added `aria-label` to icon-only buttons for screen reader accessibility |

### Gantt Chart Layout Lessons (Feb 2026)

| Issue | Wrong Approach | Correct Approach |
|-------|---------------|------------------|
| **Tree connector lines** | Complex L-shaped SVG/CSS connectors with `treeLineInfo` map | Simple indent spacer (`level * 20px`) + chevron icon — clean and predictable |
| **Card base padding** | Assumed `py-0` was enough to kill whitespace | Card base has both `py-6` AND `gap-6` — must override both: `py-0 gap-0` |
| **Fixed chart height** | `height: 400px` on chart area | Use `flex-1 min-h-0` to fill available space dynamically |
| **Sidebar resize handle** | Draggable resize divider between sidebar and timeline | Auto-width from column widths sum — simpler and aligned |
| **Row numbers on collapse** | `visibleItems.map((_, index) => index + 1)` re-indexes | Pre-compute `originalIndexMap` from full items array |
| **Duration column header** | "DURATION" truncated at 56px | Renamed to "DAYS" — fits the column width |
| **Priority display** | Inline colored dot/badge taking horizontal space | Colored left border (3px) on the row — space-efficient |
| **DnD grip icon** | Visible 6-dot grip icon causing alignment issues | Move DnD activation to row number span — invisible but functional |
| **Panel header alignment** | Wrapper div with `border-b` but no explicit `height` — border adds outside children = 1px taller | Set explicit `height` + `box-border` + `overflow-hidden` on both sidebar and timeline header wrappers |

**Key Rule:** When the Gantt sidebar feels cluttered, simplify — remove visual elements rather than adding more spacing. Indentation + text weight (bold parent vs muted child) is enough hierarchy signal.

**Key Takeaways:**
- Always use `(SELECT auth.uid())` pattern when creating new RLS policies
- Database schema uses `initial_unit_cost` and `actual_unit_cost`, NOT `unit_cost`
- Remove debug logs before production - keep only error logs (`console.error`)
- Use `crypto.randomBytes()` for any security-sensitive random generation, never `Math.random()`
- Wrap page content with `<ErrorBoundary>` to prevent white-screen crashes
- Add `aria-label` to all icon-only buttons for accessibility (WCAG 2.1 compliance)

---

## Current Status (Feb 2026)

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
- Shipped status tracking with date
- Installation started status tracking (between shipped and installed)
- Project Overview redesign (unified compact card with progress ring + info bar)
- Currency formatting fix (always shows ₺/$/€ symbols with 2 decimals)
- PDF report improvements (borderless photos, dynamic sizing to fill available space)
- PDF code refactor (unified generator, extracted image helpers)
- Milestone email notifications (create/complete alerts)
- Report activity tracking (admin-only view/download stats)
- Report creation wizard (2-step: Content → Share & Publish)
- Report types update (daily, site, installation, snagging)
- Code review & cleanup (RLS fix, schema bug fix, debug logs removed)
- Finance module (`/finance` page with KPIs, budget charts, project costs table)
- Dashboard consolidation (DashboardOverviewCard merges This Week + Projects Status)
- PDF V2 template (2-column photos, inline section numbers, print-friendly)
- Milestone cards view toggle (Cards/Timeline)
- Team members stats card on Users page
- Gantt chart system (custom-built, 7 components in `components/gantt/`)
- Standalone timeline page (`/projects/[id]/timeline`) with React Query + optimistic updates
- Timeline dependencies (FS/SS/FF/SF with lag days)
- Timeline hierarchy (phases → tasks → subtasks with indent/outdent)
- Timeline drag-and-drop (bar move/resize + sidebar reorder via @dnd-kit)
- Timeline priority system (Low/Normal/High/Critical with colored borders)

### In Progress
- Gantt chart UI polish (testing phase — migration 045 needs to run on Supabase before data appears)

### Planned
- Global capacity view (cross-project phase workload overview)
- Mobile optimization
- Command menu (Cmd+K)
- PDF Executive Summary generation

---

## Design System (Quick Reference)

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#2563eb` (blue-600) | Main actions, links, active states |
| Primary Hover | `#1d4ed8` (blue-700) | Button hover |
| Background | `#ffffff` | Page background |
| Foreground | `#1f2937` (gray-800) | Primary text |
| Muted | `#f9fafb` (gray-50) | Subtle backgrounds |
| Muted Foreground | `#6b7280` (gray-500) | Secondary text |
| Border | `#e5e7eb` (gray-200) | All borders |

### Status Colors

| Status | Background | Text | Border |
|--------|------------|------|--------|
| Tender | `#fef3c7` | `#92400e` | `#f59e0b` |
| Active | `#dbeafe` | `#1e40af` | `#2563eb` |
| On Hold | `#f3f4f6` | `#4b5563` | `#9ca3af` |
| Completed | `#d1fae5` | `#065f46` | `#10b981` |
| Cancelled | `#fee2e2` | `#991b1b` | `#ef4444` |

### Semantic Colors

- **Success:** `#10b981` (emerald-500)
- **Warning:** `#f59e0b` (amber-500)
- **Destructive:** `#ef4444` (red-500)

### Item Path Colors

| Path | Background | Text | Border |
|------|------------|------|--------|
| Production | `#dbeafe` | `#1e40af` | `#2563eb` |
| Procurement | `#f3e8ff` | `#6b21a8` | `#9333ea` |

### Typography

- **Font:** Inter (Google Fonts)
- **Headings:** font-semibold to font-bold
- **Body:** font-normal

### Spacing (Notion-style: generous whitespace)

| Component | Padding | Gap |
|-----------|---------|-----|
| Page container | `px-6 py-6` | - |
| Card | `p-6` | - |
| Button | `px-4 py-2` | `gap-2` |
| Form fields | - | `gap-6` (vertical) |

### Border Radius

| Component | Radius |
|-----------|--------|
| Button | `rounded-md` (6px) |
| Input | `rounded-md` (6px) |
| Card | `rounded-lg` (8px) |
| Modal | `rounded-xl` (12px) |
| Badge | `rounded-sm` (4px) |

### Shadows (Notion-style: subtle)

| Component | Shadow |
|-----------|--------|
| Card | `shadow-sm` (or none with border) |
| Card Hover | `shadow` |
| Dropdown | `shadow-md` |
| Modal | `shadow-lg` |

### Button Sizing

| Context | Size Prop | Dimensions | Example |
|---------|-----------|------------|---------|
| Icon-only (toolbar, header) | `size="icon"` | `size-9` (36px) | Edit, Delete icons |
| Compact row actions | `size="sm"` | `h-8 px-3` | Filter clear, view toggle |
| Standard actions | default | `h-9 px-4 py-2` | Submit, Cancel, Save |
| Large CTA | `size="lg"` | `h-10 px-6` | Primary page actions |

**Rules:**
- Icon-only buttons must always have `aria-label` for accessibility
- Icon-only buttons should use `Tooltip` wrapper for discoverability
- Use `size="sm"` for inline/toolbar actions to keep UI compact

### Sheet vs Dialog Usage

| Component | Use For | Position | Example |
|-----------|---------|----------|---------|
| **Sheet** | Quick edit/create from tables | Side panel (right) | Add scope item, edit project |
| **Dialog** | Confirmations, alerts, small forms | Centered modal | Delete confirm, approval reason |
| **AlertDialog** | Destructive confirmations | Centered modal | Delete project, remove user |

**Rules:**
- **Sheet** for any form triggered from a table row or list (preserves context)
- **Dialog** for confirmation prompts, small inputs, or actions that don't need table context
- **AlertDialog** when the action is destructive and needs explicit "are you sure?"
- Sheet width: `w-full sm:max-w-lg` (standard), `sm:max-w-2xl` (wide forms)

### Component Hierarchy (ui-helpers.tsx)

| Component | Purpose | Usage |
|-----------|---------|-------|
| `GlassCard` | Primary card wrapper | 44+ files, dominant pattern |
| `StatusBadge` | Semantic status pills with optional dot | Project/item statuses |
| `Badge` | Generic label/count badges | Counts, tags, categories |
| `GradientIcon` | Icon with colored background | Card headers, empty states |
| `GradientAvatar` | User initials with gradient | Team lists, assignments |
| `EmptyState` | Placeholder for empty content | Lists with no data |
| `StatCard` | KPI display with trend | Dashboard, finance |

**Note:** `StatusBadge` and `Badge` are complementary — StatusBadge handles semantic statuses (success/warning/danger) with rounded-full pills; Badge is a generic rectangular label. Do NOT try to merge them.

###
Before starting any task, read AGENTS.md for the latest context from other agents.
After completing any task, update AGENTS.md with:
- What you did
- Which files you changed
- Any warnings or issues for the next agent
- What should be done next