# Formula Contract - Project Intelligence

> **Last Updated:** February 11, 2026
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
│   │   ├── use-media-query.ts    # useMediaQuery, useBreakpoint (standard responsive hook)
│   │   ├── use-mobile.ts         # DEPRECATED — use useBreakpoint() instead
│   │   └── use-toast.ts          # Toast notifications
│   │
│   ├── emails/                   # Email templates (react-email)
│   │   ├── welcome-email.tsx     # New user welcome
│   │   ├── project-assignment-email.tsx  # Assigned to project
│   │   ├── milestone-alert-email.tsx     # Milestone approaching/overdue
│   │   ├── report-published-email.tsx    # Report shared with client
│   │   └── drawing-sent-to-client-email.tsx  # Drawings sent for approval
│   │
│   └── types/                    # TypeScript type definitions
│
├── supabase/
│   └── migrations/               # Database migrations (001-046)
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

### Drawing Send Workflow

Drawings follow a controlled visibility pattern — clients only see drawings that have been explicitly "sent" by the PM:

```
PM uploads drawing → status: "uploaded" (invisible to client)
PM sends to client → status: "sent_to_client" (visible to client)
Client reviews → status: "approved" | "rejected" | "approved_with_comments"
```

**Server Action:** `src/lib/actions/drawings.ts` — `sendDrawingsToClient(projectId, drawingIds[])` handles both single and bulk sends. It updates drawing status, scope item status, creates in-app notifications, sends email via Resend batch API, and logs activity.

**Client Filtering:** `drawings-overview.tsx` filters `visibleItems` for clients — only shows `sent_to_client`, `approved`, `approved_with_comments`, `rejected` statuses.

**PM Badge:** Drawings tab shows amber badge with count of `uploaded` (unsent) drawings.

### Responsive Data View Pattern

The app uses JS-based responsive switching (not CSS show/hide) via `ResponsiveDataView<T>`:

```typescript
// src/components/ui/responsive-data-view.tsx
<ResponsiveDataView
  data={items}
  tableView={<ItemsTable items={items} columns={columns} />}
  renderCard={(item) => <ItemCard key={item.id} item={item} />}
  emptyState={<EmptyState />}
  isLoading={isLoading}
/>
```

**Key Architecture:**
- Uses `useBreakpoint().isMobile` — only the active view is in the DOM (not both hidden/shown)
- `forceView` prop allows manual override for user preference
- `ViewToggle` companion component provides table/cards toggle buttons
- Cards container uses `grid gap-4 sm:grid-cols-2` by default

**`useBreakpoint()` hook** (from `src/hooks/use-media-query.ts`):
```typescript
const { isMobile, isTablet, isDesktop, isMobileOrTablet, isTabletOrDesktop } = useBreakpoint();
// isMobile: max-width: 767px (aligns with Tailwind md: 768px)
// isTablet: 768px-1023px
// isDesktop: 1024px+ (aligns with Tailwind lg:)
```

**IMPORTANT:** Always use `useBreakpoint()` for responsive logic. The old `useIsMobile()` from `use-mobile.ts` is deprecated (used `768px` which was off-by-one vs Tailwind's `md:` breakpoint).

### Mobile Tab Navigation Pattern

Project detail tabs use bottom-sheet navigation on mobile:

```typescript
// Mobile: Sheet (side="bottom") with full tab list as buttons
// Desktop: TabsList with overflow into DropdownMenu
```

**Key decisions:**
- Mobile tabs open a full bottom sheet (not horizontal scroll)
- Desktop shows first 3 tabs inline, rest in "More" dropdown
- Tab badges (counts) are rendered consistently via `getBadgeText()` helper

### Compact Button Pattern

Action buttons accept a `compact` prop for mobile density:

```typescript
// Components: ScopeItemAddButton, ExcelImport, ExcelExport, DownloadTemplateButton
<ScopeItemAddButton compact={isMobile} />
// compact=true → size="sm" + smaller text
// compact=false → default size
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
13. **Timeline migration 045 applied** - `045_gantt_rewrite.sql` has been run on Supabase
14. **Adjacent panel alignment** — When two side-by-side panels need matching row heights, both header wrappers must set explicit `height` + `box-border` so `border-b` is counted inside
15. **Storage paths MUST start with `{projectId}/`** — Migration 040 enforces RLS via `storage_project_id()` which extracts the first path segment as UUID. Any path that doesn't start with a valid project UUID will be silently rejected by storage policies. This applies to ALL buckets (drawings, materials, reports, scope-items).
16. **Use `useBreakpoint()` not `useIsMobile()`** — The old hook from `use-mobile.ts` is deprecated. `useBreakpoint()` from `use-media-query.ts` aligns correctly with Tailwind's `md:` breakpoint (767px vs 768px).
17. **Mobile card views need role guards** — When creating mobile card alternatives for tables, ensure client-role users can't see edit/delete/split actions. Tables have this via column definitions, but cards need explicit `{!isClient && ...}` checks.

### Git on Windows
- CRLF warnings are normal (`LF will be replaced by CRLF`) - safe to ignore
- If `gh` CLI unavailable, create PRs via GitHub web: `https://github.com/{owner}/{repo}/pull/new/{branch}`
- Always use `-u` flag on first push: `git push -u origin branch-name`

---

## File Storage (Supabase Storage)

**CRITICAL:** All storage paths MUST start with `{project_id}/` as the first segment. Migration 040's `storage_project_id()` function extracts this UUID for RLS verification via `is_assigned_to_project()`. Paths that don't follow this pattern will fail silently.

```
drawings/{project_id}/{item_id}/{revision}_drawing.pdf
materials/{project_id}/{material_id}/image_1.jpg
reports/{project_id}/{report_id}/photo_1.jpg
reports/{project_id}/{report_id}/{project_code}_{type}_{date}_{id}.pdf   ← report PDFs
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
- **2-column photo grid** with uniform 1:1 square frames (not 3:2 — works for all orientations)
- **Smart photo layouts:** single (16:9 full-width hero), triple (hero + 2 square), standard (2-col square grid)
- **Cover-crop via canvas pre-rendering:** `prepareImageForFrame()` renders each image into exact frame dimensions on a canvas, then passes the bitmap to jsPDF. Always uses cover mode (no contain/letterbox).
- **Inline teal section numbers** (01, 02) instead of badge boxes
- **Section dividers** between sections (gray horizontal line)
- **Print-friendly:** No page borders, minimal ink, "Confidential" in footer
- **Description clamping:** Long descriptions truncated to 3 lines with ellipsis + "Description truncated for layout." note
- **Image cache:** `preparedImageCache` (keyed by URL + frame dims) avoids reprocessing the same image
- **COLORS constant:** Define all colors at top of file for consistency

### PDF Photo Layout Lessons (Feb 2026)

| Issue | Wrong Approach | Correct Approach |
|-------|---------------|------------------|
| **Cover/contain fit mode** | URL-based keyword detection (`_contain`, `detail`, `proof`) to auto-switch fit mode | Always use cover — users don't control URL markers, keywords cause false positives |
| **Gray letterbox bars** | Canvas pre-filled with gray placeholder + contain mode → visible gray bars | Cover mode fills entire frame, no background needed |
| **Varying grid row heights** | Per-row orientation detection (3:2 landscape, 3:4 portrait, 1:1 mixed) | Uniform 1:1 square grid — same height every row, works for all orientations |
| **Cache key collision** | `imageData.base64.slice(0, 80)` — JPEG headers are identical across images | Use photo URL as cache key (unique per image) |
| **Missing try/catch** | Single/triple layouts had no error handling on `drawImage` | Wrap all `drawImage` calls in try/catch with placeholder fallback |
| **Dead import** | `calculateFitDimensions` imported but no longer used after canvas rewrite | Remove unused imports after refactoring |

**Key Rule:** For PDF photo grids, use uniform 1:1 square frames with cover-crop. This handles any mix of landscape/portrait photos with consistent row heights. Don't try to be clever with per-photo orientation detection — it creates uneven rows that look amateur.

**Photo Layout Reference:**
- Single photo: full-width 16:9 hero frame
- Triple: 16:9 hero + 2 square side-by-side
- Grid (2+ photos): uniform 1:1 square frames, 2 columns

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

### Storage Path Bug (Feb 2026)

| Issue | Wrong Approach | Correct Approach |
|-------|---------------|------------------|
| **Report PDF upload path** | `pdfs/${fileName}` — flat path without project UUID | `${projectId}/${reportId}/${fileName}` — matches RLS requirement |
| **Missing projectId param** | `uploadReportPdf(reportId, base64, projectCode, type)` — no way to build correct path | Added `projectId` as 3rd parameter |
| **Cascading silent failure** | Upload fails → report publishes anyway → email "View Report" links to page instead of PDF | Upload succeeds → `pdf_url` saved to DB → email links directly to PDF file |

### Favicon / Icon Gotcha (Feb 2026)

| Issue | Wrong Approach | Correct Approach |
|-------|---------------|------------------|
| **Turbopack ICO build failure** | Use `.ico` file with non-RGBA PNG embedded | Remove `.ico`, use `src/app/icon.png` (Next.js auto-serves it as favicon) |
| **Branding via CSS text** | `<div class="bg-primary-700 text-white font-bold">FC</div>` | `<img src="/icons/icon-192x192.png" alt="FC" class="size-8 rounded-lg" />` |

**Key Rule:** Next.js Turbopack requires RGBA-format PNGs inside `.ico` files. If your ICO fails to build, just use `src/app/icon.png` instead — Next.js auto-generates the `<link rel="icon">` tag from it.

### Mobile UI Density Pass (Feb 2026)

| Issue | Wrong Approach | Correct Approach |
|-------|---------------|------------------|
| **CSS show/hide for responsive** | `<div className="hidden md:block">` for table + `<div className="md:hidden">` for cards — both in DOM | Use `ResponsiveDataView` with JS-based `useBreakpoint()` — only active view in DOM |
| **Mobile breakpoint off-by-one** | `useIsMobile()` with `(max-width: 768px)` — overlaps Tailwind's `md: 768px` | `useBreakpoint()` with `(max-width: 767px)` — clean boundary at 768px |
| **Mobile tab overflow** | Horizontal scrolling `TabsList` — tabs clip on narrow screens | Bottom sheet (`Sheet side="bottom"`) with full tab list as buttons |
| **Desktop tab overflow** | All tabs in one row — wraps on medium screens | First 3 tabs visible + "More" `DropdownMenu` for the rest |
| **Action button density** | Same button size on all breakpoints | `compact` prop pattern — `size="sm"` on mobile, default on desktop |
| **Role guards on cards** | Tables enforce role via column visibility — assumed cards inherit | Cards need explicit `{!isClient && ...}` guards on edit/delete actions |

**Key Rule:** When adding a mobile card view for an existing table, always audit the table's role-based column visibility and replicate those guards in the card's action menu. Tables hide columns for clients; cards must do the same with conditional rendering.

**Key Rule:** Every Supabase Storage upload path MUST start with `{projectId}/` — this is enforced by migration 040's `storage_project_id()` RLS function. When adding new upload code, always check: "Does my path start with a project UUID?"

**Cascade Effect:** Storage upload failures can silently degrade downstream features. In this case:
- `uploadReportPdf()` failed → `pdf_url` was never saved → email notifications fell back to page URL instead of direct PDF link
- The report still "worked" (DB insert + client-side download) so the bug was hard to notice

**Key Takeaways:**
- Always use `(SELECT auth.uid())` pattern when creating new RLS policies
- Database schema uses `initial_unit_cost` and `actual_unit_cost`, NOT `unit_cost`
- Remove debug logs before production - keep only error logs (`console.error`)
- Use `crypto.randomBytes()` for any security-sensitive random generation, never `Math.random()`
- Wrap page content with `<ErrorBoundary>` to prevent white-screen crashes
- Add `aria-label` to all icon-only buttons for accessibility (WCAG 2.1 compliance)
- **All storage paths must start with `{projectId}/`** — migration 040 enforces this via RLS. Flat paths like `pdfs/` or `uploads/` will be silently rejected

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
- Bulk send drawings to client (single-click send all uploaded drawings)
- Client drawing visibility filtering (clients only see sent/approved/rejected drawings)
- Drawing email notifications (clients get email + in-app notification when drawings are sent)
- PM reminder badge on Drawings tab (amber badge showing "X ready to send")
- Drawing approval server action migration (single send also triggers email now)
- Drawings overview UI polish (compact stats bar + flush table layout)
- FC logo icon integration (favicon, apple-icon, PWA manifest, replaced CSS "FC" blocks with logo image across sidebar, mobile header, and all auth pages)
- Report PDF storage path fix (paths now start with `{projectId}/` per RLS requirement)
- Mobile UI density pass — `ResponsiveDataView` component, `useBreakpoint()` hook, `ScopeItemCard`, bottom-sheet tab nav, compact action buttons, denser card layouts across all project detail tabs (scope items, drawings, materials, reports, financials, overview)
- PDF photo improvements — canvas-based cover-crop rendering, uniform 1:1 square grid frames, description clamping (3 lines max), image cache, removed unused contain/keyword fit mode logic

### In Progress
- Gantt chart UI polish (testing phase — migration 045 applied to Supabase, data is live)
- Mobile optimization (responsive data views done, remaining: role guards on mobile cards, Gantt tablet support, full mobile E2E testing)

### Planned
- Global capacity view (cross-project phase workload overview)
- Command menu (Cmd+K)
- PDF Executive Summary generation

### Known Issues (from Codex mobile review)
- `ScopeItemCard` missing client role guards — Edit/Split/Delete actions visible to client users
- `ExportButton` removed from scope items — Excel export only available via separate button now
- `totalInitialCost` display removed from scope items summary bar
- `use-mobile.ts` orphaned — still exists but no longer imported anywhere (can be deleted)
- `canEdit` prop on `ProjectDetailHeader` is dead code (accepted but unused)
- Gantt chart blocked for tablets via `isMobileOrTablet` — may be too restrictive

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

| Component | Padding (Desktop) | Padding (Mobile) | Gap |
|-----------|-------------------|-------------------|-----|
| Page container | `px-6 py-6` | `px-4 py-4` | - |
| Card | `p-6` | `p-3` to `p-4` | - |
| Button | `px-4 py-2` | same | `gap-2` |
| Form fields | - | - | `gap-6` (vertical) |
| KPI/stat cards | `p-4` | `p-3` | - |

**Mobile density pattern:** Use `p-3 md:p-4` or `p-4 md:p-6` for responsive card padding.

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
| `ResponsiveDataView` | Table/card view switcher based on breakpoint | Scope items, drawings, reports, materials |
| `ViewToggle` | Manual table/cards toggle button group | Used with ResponsiveDataView |
| `ScopeItemCard` | Mobile card view for scope items | Scope items tab (mobile only) |

**Note:** `StatusBadge` and `Badge` are complementary — StatusBadge handles semantic statuses (success/warning/danger) with rounded-full pills; Badge is a generic rectangular label. Do NOT try to merge them.

###
Before starting any task, read AGENTS.md for the latest context from other agents.
After completing any task, update AGENTS.md with:
- What you did
- Which files you changed
- Any warnings or issues for the next agent
- What should be done next