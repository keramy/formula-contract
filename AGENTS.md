# Agent Communication Log

## Current Status
Last updated by: Claude Code
Timestamp: 2026-04-22

---

## Per-Day Working-Days Calendar on Gantt Toolbar — Apr 22, 2026
Agent: Claude Code
Status: **IMPLEMENTED — NOT pushed. Awaiting user test.**

### What changed
Per-day working-days bitmask for Gantt, stored per-project at `projects.gantt_working_days` (SMALLINT NOT NULL DEFAULT 62). Bit 0=Sun, bit 1=Mon, ..., bit 6=Sat — matches JS `Date.getDay()`. Default 62 (0b0111110) = Mon-Fri.

UI: gear button in Gantt toolbar opens a checkbox list (Mon..Sun) per-project. Toggling a day runs `setProjectWorkingDays()` which **auto-adjusts each task's end_date** so the task's pre-existing working-day count is preserved under the new mask.

Duration labels (sidebar, table, bar tooltip) use `formatDuration(item, mask)` so a Mon→Fri task reads "5d" under Mon-Fri but "6d" if Sat becomes working (6 working days Mon→Sat calendar stays — user can shrink manually).

Dependency propagation math now working-day aware: lag_days is interpreted as **working days**, `calculateConstrainedDate` uses `addWorkingDaysServer(..., mask)` rather than raw calendar days.

### Files changed
- `supabase/migrations/069_project_gantt_working_days.sql` (NEW — DROPs the reverted `gantt_skip_weekends`, adds `gantt_working_days SMALLINT DEFAULT 62`)
- `src/components/gantt/gantt-types.ts` — `DEFAULT_WORKING_DAYS_MASK`, `DAY_LABELS`, `isWorkingDay`, `workingDaysBetween(start,end,mask)`, `addWorkingDays(date,days,mask)`, `formatWorkingDaysMask(mask)`. `formatDuration(item, mask=127)` accepts mask.
- `src/lib/actions/timelines.ts` — `getProjectWorkingDays()`, `setProjectWorkingDays(projectId, mask)` server action with auto-adjust. `propagateDependencyDates` loads mask and passes it to `calculateConstrainedDate(depType, lag, srcStart, srcEnd, mask)`. Added `addWorkingDaysServer()` + `workingDaysBetweenServer()` helpers (can't import from "use client" gantt-types into "use server").
- `src/lib/react-query/timelines.ts` — `useSetProjectWorkingDays(projectId)`.
- `src/components/gantt/gantt-toolbar.tsx` — new `WorkingDaysMenu` sub-component (gear icon + 7 checkboxes, guards against all-off).
- `src/components/gantt/gantt-chart.tsx` — new `workingDaysMask` + `onWorkingDaysChange` props, forwarded to toolbar / sidebar / timeline / table.
- `src/components/gantt/gantt-sidebar.tsx`, `gantt-table.tsx`, `gantt-timeline.tsx`, `gantt-bar.tsx` — accept `workingDaysMask?` and pass it to `formatDuration(item, mask ?? 127)` calls.
- `src/app/(dashboard)/projects/[id]/timeline/timeline-client.tsx` — reads `workingDaysMask` prop, owns local optimistic state, wires `useSetProjectWorkingDays`.
- `src/app/(dashboard)/projects/[id]/timeline-overview.tsx` — passes prop through.
- `src/app/(dashboard)/projects/[id]/page.tsx` — SELECT adds `gantt_working_days`; passes through with `(project as any)?.gantt_working_days ?? 62` since generated types lag.
- `src/app/(dashboard)/timeline/[projectId]/page.tsx` — SELECT adds `gantt_working_days`, `Project` interface adds the field, result cast via `unknown` to bypass stale types.

### Prior reverted attempt (commit 9a5a3ec)
The first stab was a project-wide **skip_weekends boolean** with its own migration 068. User rejected — wanted per-timeline UI with per-day granularity. Revert: `git revert --no-edit 9a5a3ec` → local commit `b7832a4`. DB column `gantt_skip_weekends` was dropped as part of migration 069 (`DROP COLUMN IF EXISTS`).

### Duration math (per user spec)
Inclusive count of days where the bit is set: Mon→Fri under Mon-Fri = 5d, Mon→Sat under Mon-Sat = 6d, Mon→Mon under Mon-Sat = 7d, Mon→Mon under all-days = 8d.

### Warnings for next agent
- **DO NOT PUSH** until the user tests locally. Memory file `feedback_test_before_push_strict.md` and user's direct instruction: "dont keep pushing things without testing it". Commit b7832a4 (revert) is also unpushed.
- Migration 069 IS applied live on Supabase (via MCP `apply_migration`, name: `project_gantt_working_days`), so the DB column already exists. The on-disk `supabase/migrations/069_project_gantt_working_days.sql` mirrors it but is NOT tracked in `supabase_migrations` table (same as 051-063).
- Generated Supabase TS types (`src/types/database.ts` likely) DO NOT yet know about `gantt_working_days`. Regenerate via `npx supabase gen types typescript` when convenient and drop the `as unknown` / `as any` casts in the two page files.
- TypeScript tree: clean (`tsc --noEmit` exits 0).
- Lint: 4 NEW `no-explicit-any` errors in timelines.ts at the `(supabase as any)` casts used to read `gantt_working_days`. These match the pre-existing pattern in the same file (lines 360/456/484/593) — not gating the build. Same reason as above.
- `propagateDependencyDates` now treats `lag_days` as **working days** under the mask. If anyone finds an older dependency whose lag was intended as calendar days, they'll see a shift after the next propagation run. Behavioral change, worth flagging.

### Testing checklist for user
- Toolbar gear shows current mask label ("Mon-Fri" / "Mon-Sat" / etc).
- Toggling Sat on should shorten a Mon-Fri-5d task's calendar span (still 5d of working, but now compresses out Fri→Sat). Check with `/timeline/[projectId]` and also the Timeline tab on project page.
- Dropdown refuses to let you turn off the last checked day (no-working-days guard).
- Non-admin/non-PM should not see working-days mutations (`onWorkingDaysChange` gated on `canEdit`).
- Dependency chains rebuild using mask-aware lag after toggles (toast reports "N tasks re-scheduled").

---

## Supabase IO Budget / RLS Recursion Fix — Apr 3, 2026
Agent: Claude Code + external AI agent review
Status: **DONE — Root cause found and fixed. App fully operational.**

### Root Cause
`get_user_role()` and `is_assigned_to_project()` were NOT `SECURITY DEFINER`. When called from RLS policies, they triggered RLS on the tables they queried, causing infinite recursion (`stack depth limit exceeded`). Fix: `ALTER FUNCTION ... SECURITY DEFINER` (migration 059).

### All Changes (17 commits total)
**Database fixes (applied live):**
- Migration 058: RLS InitPlan for notifications + users
- Migration 059: SECURITY DEFINER on get_user_role() + is_assigned_to_project()
- authenticated role timeout: 8s → 30s
- Disabled extensions: pg_graphql, pg_net, pg_cron
- Synced user names to JWT metadata

**Code improvements:**
- Shared request context with React cache() (66 functions across 7 files)
- Thin project detail page (6 → 2 server queries, lazy React Query tabs)
- Thin projects list page (6 → 2 server queries)
- Replaced 31 revalidatePath with React Query invalidation
- Removed Gantt drag/resize/reorder (586 lines)
- Removed middleware last_active_at write
- Disabled Link prefetch on all dashboard/sidebar links
- Layout uses JWT metadata only (no DB query)
- Dashboard staged queries + failure tracking with dev warning
- Error states on /projects, /clients, /users (visible errors vs silent empty)
- Notifications: removed revalidatePath("/")
- Fixed React Rules of Hooks in 5 tab components

**Metrics:**
- TypeScript: 0 errors
- Tests: 676 passing
- React Doctor: 96/100
- Dashboard queries: ~27 → ~8 per load
- Project page queries: 9 → 2 per load

### Warnings for Next Agent
- RLS helper functions MUST be SECURITY DEFINER — see CLAUDE.md gotcha #42
- Migrations 051-059 applied live but NOT tracked in supabase_migrations table
- authenticated role timeout is 30s (Supabase default is 8s) — monitor
- Medium compute active ($85/mo) — can downgrade to Small after stability verified
- Progress bars removed from /projects list (deferred enrichment)
- Gantt drag/resize removed — users edit via form dialogs

---

## Disk IO Budget Depletion Fix — Apr 2, 2026
Agent: Claude Code
Status: **DONE — Write spikes fixed, lazy loading applied, build passes (0 TS errors)**

### Root Cause
Supabase support confirmed: "big spikes in requests to WRITE to the database" before each crash. Database is tiny (<5MB), cache hit rates 99%+. The problem was **burst write frequency**, not data volume.

### Write Spike Fixes (Critical — Crash Prevention)
1. **Gantt reordering** (`src/lib/actions/timelines.ts`): Changed from N concurrent UPDATE queries via `Promise.all()` to batched groups of 5. Reordering 50 tasks was firing 50 simultaneous writes.
2. **Excel import** (`src/components/scope-items/excel-import.tsx`): Changed from sequential 2N queries (1 SELECT + 1 INSERT/UPDATE per item) to: 1 batch SELECT → batch INSERTs (groups of 20) → batch UPDATEs (groups of 5). 100-item import went from 200 roundtrips to ~7.
3. **Bulk material assignment** (`src/lib/actions/scope-items.ts`): Changed from nested M×N loop (individual SELECT + INSERT) to: 1 batch SELECT → 1 batch INSERT. 10×10 assignment went from 100 writes to 2.
4. **Report line reordering** (`src/lib/actions/reports.ts`): Same as gantt — batched groups of 5 instead of N concurrent.
5. **Materials import batch size** (`src/lib/actions/materials.ts`): Reduced from 10 to 5 concurrent updates per batch.

### Read Reduction (Performance — IO Budget Conservation)
6. **Project page lazy loading** (`src/app/(dashboard)/projects/[id]/page.tsx`): Removed 3 queries from `Promise.all()` (reports, activities, areas). Page load reduced from 9 → 6 parallel queries. Reports now lazy-load via React Query hook in `reports-overview.tsx`.

### Verified OK (No Changes Needed)
- Drafts RLS already uses `(SELECT auth.uid())` InitPlan (migration 035)
- All mutation buttons already have `isPending`/`isLoading` guards
- `revalidatePath` removal DEFERRED — components use direct server action calls without React Query mutations. Requires component-by-component migration to `useMutation` first.

### Files Changed
- `src/lib/actions/timelines.ts` — Batched reorder
- `src/lib/actions/reports.ts` — Batched reorder
- `src/lib/actions/scope-items.ts` — Batch material assignment
- `src/lib/actions/materials.ts` — Smaller batch size
- `src/components/scope-items/excel-import.tsx` — Batch import
- `src/app/(dashboard)/projects/[id]/page.tsx` — Lazy loading (9→6 queries)
- `src/app/(dashboard)/projects/[id]/reports-overview.tsx` — Self-fetch via React Query
- `src/app/(dashboard)/projects/[id]/project-tabs.tsx` — Optional reportsCount

### Warnings for Next Agent
- DO NOT remove `revalidatePath` from scope-items, materials, drawings, milestones, reports unless you first wire up `useMutation` + `invalidateQueries` in their UI components
- Excel export currently shows `null` for area codes/names (areas deferred from server fetch). Low priority.
- If DB depletes again, check `pg_stat_statements` for `shared_blks_read` to find new culprits
- The `revalidatePath` in `scope-items.ts` still triggers 6-query re-render on every scope item edit. This is the next optimization target.

---

## Gantt Chart Clean Rewrite v2 — Mar 30, 2026
Agent: Claude Code
Status: **DONE — Complete clean rewrite from scratch. 682 tests passing. Migration 056 created.**

### What changed
Deleted ALL old gantt files (15 files) and rebuilt from scratch based on Figma designs + implementation guide. Key architectural change: single `ganttRows` array with absolute Y positioning guarantees perfect sidebar/timeline alignment.

**Migration:**
- `supabase/migrations/056_gantt_critical_path_description.sql` — Adds `description text` + `is_on_critical_path boolean` to `gantt_items`

**Created (13 new files in `src/components/gantt/`):**
- `gantt-types.ts` — Types, constants, `buildGanttRows()` (THE alignment guarantee), `computeStats()`, date utilities
- `use-gantt-state.ts` — Custom hook owning all chart UI state (panel, viewMode, zoom, selection, collapse, scroll)
- `gantt-chart.tsx` — Main orchestrator (~280 lines, wires all sub-components)
- `gantt-stats-bar.tsx` — Top 52px bar (title, stats dots, progress, export)
- `gantt-toolbar.tsx` — 44px toolbar (Timeline/Table toggle, +Add Task, scale, grid/deps toggle, expand/collapse)
- `gantt-sidebar.tsx` — Left panel using `ganttRows` absolute positioning, dnd-kit reorder
- `gantt-timeline.tsx` — Right panel: header (day/week/month), grid, bars, dependency arrows, today line
- `gantt-bar.tsx` — Task bar (progress fill + %), milestone diamond + label, drag handles
- `gantt-dependency-arrows.tsx` — SVG overlay with rounded 8px corners, type-specific colors
- `gantt-table.tsx` — Spreadsheet view with 9 columns, phase accent bars, critical path badges
- `gantt-dependency-dialog.tsx` — Create/edit dependency links dialog
- `gantt-status-bar.tsx` — Bottom 34px summary strip
- `index.ts` — Barrel exports

**Modified:**
- `src/lib/actions/timelines.ts` — Added `description` + `is_on_critical_path` to GanttItem type and CRUD
- `src/lib/react-query/timelines.ts` — Added new fields to optimistic temp item
- `src/app/(dashboard)/projects/[id]/timeline/timeline-client.tsx` — Rewired data mapping to build tree structure with `children[]`, pass new props

### Key architecture: Single source of truth
Both sidebar and timeline receive the same `GanttRow[]` array from `buildGanttRows()`. Each row has a pre-computed `y` position. Both columns use `position: absolute; top: row.y`. No separate layout calculations anywhere.

### Extended session additions (Mar 31)
- Bracket bars, bar labels, critical path toggle, conditional health colors, search, context menu, baseline comparison, drag perf fix, zoom controls, indent/outdent multi-select, full-page layout, depth styling, selected row accent

### Performance crisis + fixes (Apr 1, 2026)
- Supabase Disk IO Budget depleted on both Micro AND Small compute tiers
- Root cause: `revalidatePath` on every gantt action triggered 9+ queries per click, rapid testing exhausted IO
- Supabase upgraded from Micro → Small, but still recovering (support ticket submitted)

**Performance fixes applied:**
- ✅ `revalidatePath` removed from all 8 timeline server actions
- ✅ `isPending` guard on Add Task (prevents rapid-fire mutations)
- ✅ RLS functions updated to InitPlan pattern on Supabase (live)
- ✅ React Query hooks created for lazy tab loading (`src/lib/react-query/project-tabs.ts`)
- ✅ New server actions: `getMilestones()`, `getSnaggingItems()`, `getRecentActivities()`
- ❌ Project page Promise.all refactor — infrastructure ready, needs live DB to wire up

**Supabase API key change:** New `sb_publishable_` keys available but require newer `@supabase/supabase-js`. Currently using legacy `eyJ...` keys. Migration deferred.

### What should be done next (when Supabase recovers)
1. **Verify DB is back** — test `SELECT 1` via MCP, try login
2. **Apply migrations 056 + 057** — gantt description/critical_path + baselines
3. **Test performance fixes** — verify no more 5s POST on gantt actions
4. **Complete project page lazy-load refactor** — wire React Query hooks to tab components, remove heavy queries from Promise.all
5. **Update timeline-form-dialog** with description + critical path fields
6. **Write tests** for `buildGanttRows()`, `computeStats()`, `getBarHealthColor()`
7. **Remove `as any` casts** after `npx supabase gen types typescript`
8. **Visual QA** of gantt against Figma frames
9. **Audit all server actions** for unnecessary `revalidatePath` calls (not just timeline)

---

## Receivables Table Polish — Mar 25, 2026
Agent: Claude Code
Status: **DONE**

### What changed
- `src/app/(dashboard)/payments/receivables/receivables-table.tsx` — Polished to match invoices table:
  - Replaced inline `Badge` + `STATUS_BADGE_MAP` with `ReceivableStatusBadge` component (tooltip-enabled)
  - Added `last_payment_date` display below progress bar in Received column
  - Added paperclip document indicator column (width 40px) — single doc links directly, multi-doc links to detail page
  - Added row click navigation to detail page
  - Matched search bar styling (smaller icon, `h-9`, `sm:max-w-44`)
  - Matched filter bar gap (`gap-2` not `gap-3`)
  - Updated `minWidth` to 820 and `colSpan` to 8
  - Removed unused `Badge` import, `ReceivableStatus` import, `STATUS_BADGE_MAP` constant, `getStatusLabel` function

---

## Complete: Payments Module (AP/AR) — Mar 17-23, 2026
Agent: Claude Code
Status: **DONE — All features built. Migrations 052-055 applied. 698 tests passing. React Doctor 100/100.**

### What was built

**Payments Module** — company-wide accounts payable + receivable tracking under `/payments`. Independent from project budgets (`/finance` preserved separately). Whitelist-based access via `finance_access` table.

#### Database (Applied to Supabase)
- `supabase/migrations/052_finance_module.sql` — 8 tables, helper functions, sequences, triggers, RLS, indexes, views, seeds
- `supabase/migrations/053_finance_installments.sql` — installment plan support
- `supabase/migrations/054_finance_vat.sql` — vat_rate + vat_amount columns on invoices
- `supabase/migrations/055_finance_project_link.sql` — project_id FK on invoices
- Storage bucket: `finance-documents` (public)

#### Infrastructure
- `src/types/finance.ts` — All types, FinanceInstallment, VAT_RATES constant, project on extended type
- `src/lib/validations/finance.ts` — Zod schemas with conditional due_date (.refine), vat_rate, project_id
- `src/lib/actions/finance.ts` — All server actions (@ts-nocheck): CRUD, payments, approvals, installments, approvers, VAT calc, project linking, dashboard stats, aging, cash flow, document upload, getProjectsForFinance
- `src/lib/actions/finance-budget.ts` — Old project budget functions (preserved)
- `src/lib/react-query/finance.ts` — All hooks including useProjectsForFinance(), useApprovers()

#### UI Pages (28+ files under src/app/(dashboard)/payments/)
- `layout.tsx` + `payments-tab-bar.tsx` — Tab navigation (Dashboard, Invoices, Receivables, Suppliers, Recurring, Access)
- **Dashboard** — Compact KPI cards, cash flow chart with custom tooltip + empty state, aging reports
- **Access** — Admin whitelist manager (add/remove users, toggle can_approve)
- **Suppliers** — Table + mobile cards + create/edit sheet
- **Invoices** — Table with multi-select + inline selection actions, create/edit sheet with:
  - Inline "+ New Supplier" creation from dropdown
  - Installment plan toggle with dynamic rows + sum validation
  - Single approver dropdown (conditional)
  - File attachment at creation
  - Unsaved changes protection (confirmation dialog)
- **Invoice Detail** — Payments section, approval workflow, documents, summary sidebar with IBAN copy + progress bar
- **Receivables** — Table, sheet (inline useClients hook), detail with incoming payments
- **Recurring** — Table with active toggle, "Process Now" button, create/edit sheet

#### Modified Files
- `src/components/app-sidebar.tsx` — Added "Payments" nav entry with BanknoteIcon
- `src/app/(dashboard)/finance/page.tsx` — Import changed from `finance.ts` to `finance-budget.ts`

### Bugs Fixed During Testing
- `getAvailableUsers()` used `is_deleted` but `users` table uses `is_active`
- Hydration error: `<Skeleton>` (div) inside `<p>` tags
- Invoice `due_date` validation blocked form submit when installments enabled
- v_finance_suppliers view had ungrouped column error in SQL
- Radix Select inside Dialog z-index issue — replaced with native `<select>` for payment method

### UI Polish (Mar 21)
- Invoice table: spreadsheet-style cell borders, zebra striping, fixed column widths (tableLayout: fixed)
- Due date: single line `10.04.2026 · 20 days left` with color-coded urgency
- Paid column: amount on top + thin progress bar with percentage below
- KPI cards: compact, no CardContent wrapper, padding on GlassCard directly
- Cash flow chart: CartesianGrid, custom tooltip with net calc, empty state
- Quick links removed (redundant with tab bar), "New Invoice" removed from dashboard header
- Preview drawer redesign: colored header, 3-column amount grid, installments list, bank details card
- Unsaved changes protection on invoice form (block outside click, confirmation dialog)
- Inline "+ New Supplier" creation from supplier dropdown
- VAT dropdown with live subtotal/VAT/total calculation
- Project linking dropdown with "General expense" default
- Installment percentage mode toggle (₺/%) with auto-calculation
- Payment notes displayed in payment history
- IBAN validation: Turkish only (TR, 26 chars, auto-strips spaces)
- dd.mm.yyyy date format throughout

### Session 3 (Mar 23): Tests + Notifications + Polish
- **Tests**: 128 validation tests + 61 server action tests (including 13 notification tests) — 698 total, all passing
- **Notification system**: PDF generator (jsPDF, grouped by supplier), 2 email templates (React Email), Resend individual sends with PDF attachment, cron route
- **Send Summary dialog**: timeframe picker (this week, next 2 weeks, this month, all outstanding)
- **Notify Team dialog**: multi-select invoices + note field
- **Bulk approve**: select multiple awaiting_approval invoices → "Approve (N)" button
- **Status badges**: simplified labels with hover tooltips (Ready to Pay, Needs Approval, Partially Paid) via InvoiceStatusBadge component
- **Document indicator**: paperclip icon on invoice rows — 1 doc = direct open, 2+ = preview drawer
- **Real-time IBAN validation**: `mode: "onChange"` on supplier form
- **PDF polish**: company header, supplier numbering, Bank/IBAN always shown with "—" for missing, human-readable status labels

### What remains (nice-to-haves)
- Apply same polish to receivables (VAT, project linking, preview drawer, status badges)
- Remove @ts-nocheck after regenerating Supabase types
- Sequential approval (deferred — plan saved in memory)
- pg_cron setup in Supabase (enable extensions + schedule job)

### Build & Test Status
- `npx tsc --noEmit` — **0 errors**
- `npx vitest run` — **698 tests passing**
- `npx react-doctor . --score` — **100/100**
- Migrations 052-055 — **Applied to Supabase**

---

## Completed: Project Areas Feature (Mar 2, 2026)
Agent: Claude Code
Status: **DONE — Build passes, 509 tests pass. Migration 051 NOT yet applied to Supabase.**

### What was done

**New feature: Project Areas** — spatial organization for scope items (Floor → Area → Scope Items). Areas have user-defined area codes (e.g., "MB" for Master Bedroom), grouped by floor.

#### Database (Migration 051 — NOT YET APPLIED)
- `supabase/migrations/051_project_areas.sql` — New `project_areas` table, `area_id` FK on `scope_items`, RLS policies, indexes, admin view `v_project_areas`

#### Server Actions (NEW)
- `src/lib/actions/project-areas.ts` — CRUD: `getProjectAreas`, `createProjectArea`, `updateProjectArea`, `deleteProjectArea`, `bulkGetOrCreateAreas` (batch upsert for Excel import)

#### Excel Template + Import
- `src/lib/excel-template.ts` — Added 3 new columns (`floor`, `area_name`, `area_code`) to template, parser, and export
- `src/components/scope-items/excel-import.tsx` — Auto-creates areas during import via `bulkGetOrCreateAreas`, preview shows area badges

#### UI Components
- `src/components/scope-items/scope-item-sheet.tsx` — Area dropdown (grouped by floor) in the form
- `src/components/scope-items/scope-item-card.tsx` — Area code badge on cards
- `src/components/scope-items/scope-items-filter-bar.tsx` — Area filter dropdown + `applyFilters` logic

#### Data Flow (Page + Table)
- `src/app/(dashboard)/projects/[id]/page.tsx` — Fetches areas in parallel Promise.all, passes to table + export
- `src/app/(dashboard)/projects/[id]/scope-items-table.tsx` — Area lookup map, passes area_code to cards + rows + filter bar

#### Types
- `src/types/database.ts` — Added `project_areas` table types + `area_id` on `scope_items`
- `src/lib/activity-log/constants.ts` — Added 3 area action constants

### Files created (2)
1. `supabase/migrations/051_project_areas.sql`
2. `src/lib/actions/project-areas.ts`

### Files modified (8)
1. `src/types/database.ts`
2. `src/lib/activity-log/constants.ts`
3. `src/lib/excel-template.ts`
4. `src/components/scope-items/excel-import.tsx`
5. `src/components/scope-items/scope-item-sheet.tsx`
6. `src/components/scope-items/scope-item-card.tsx`
7. `src/components/scope-items/scope-items-filter-bar.tsx`
8. `src/app/(dashboard)/projects/[id]/page.tsx`
9. `src/app/(dashboard)/projects/[id]/scope-items-table.tsx`

### Build & Test Status
- `npm run build` — **PASSES** (zero errors)
- `npm run test` — **509 tests pass** (zero regressions)

### What remains
- **Apply migration 051** to Supabase (`lsuiaqrpkhejeavsrsqc`)
- **Update CLAUDE.md** — Add migration 051 note, gotcha for area feature
- Visual QA: test Excel import with area columns, test area dropdown in form, test area filter
- Optional: add a dedicated "Areas Management" section to the project detail page for CRUD

---

## Completed: CRM UI Polish (Mar 2, 2026)
Agent: Claude Code
Status: **DONE — Build passes, 509 tests pass, CLAUDE.md updated.**

### What was done (purely visual/CSS — no logic changes, no new files)

**Batch 1: Page headers → AppHeader integration (6 files)**
- Replaced inline `<h1>` headers + back buttons with `usePageHeader()` + `setContent()` in all 6 CRM pages
- CRM dashboard, brands, firms, contacts, activities, pipeline — all now render in the shared AppHeader bar
- Action buttons (New Brand, Log Activity, etc.) moved to AppHeader `actions` slot
- Replaced `<Loader2Icon>` spinners with `<Skeleton>` loading states (table skeletons for list pages, timeline skeletons for activities, progress bar skeletons for dashboard)
- KPI `"..."` text replaced with `<Skeleton className="h-7 w-10 inline-block" />`
- `space-y-4` → `space-y-5`, filter toolbars → `flex flex-col sm:flex-row gap-3`

**Batch 2: Kanban & Pipeline polish**
- `kanban.tsx`: `bg-base-50/50` → `bg-base-50/70`, `p-2` → `p-2.5`, column header border-b added, card hover → `hover:border-primary/20 transition-all`
- `pipeline-board.tsx`: `<Separator />` → subtle `<div className="h-px bg-base-200/60" />`, value text `font-semibold`, priority badge `py-0.5`, mobile `rounded-xl` + hover treatment

**Batch 3: Detail pages (brands/[id] + firms/[id])**
- DetailRow labels: `text-sm font-medium` → `text-xs font-medium uppercase tracking-wide` (stronger hierarchy)
- DetailRow padding: `py-2` → `py-2.5`
- All section card headers now have `GradientIcon` before `CardTitle`
- `font-bold` → `font-semibold` in page titles
- List items: `p-2` → `p-3`, hover → `hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all`
- Empty states: centered with icon + `py-8`
- VendorStepper connector: `w-6` → `w-8`

**Batch 4: Activities timeline polish**
- Timeline dots added: `<div className="absolute -left-[29px] top-4 size-3 rounded-full border-2 border-base-200 bg-card" />`
- Timeline container: `pl-4 space-y-3 border-border` → `pl-6 space-y-4 border-base-200`
- DateHeader: CalendarIcon `text-muted-foreground` → `text-primary`, `py-2` → `py-3`
- ActivityCard: `hover="subtle"` → `hover="primary"`
- Outcome section: `border-t pt-2` → `border-t border-base-100 pt-2.5`

### Files modified (9 total)
1. `src/app/(dashboard)/crm/crm-dashboard.tsx` — AppHeader, Skeleton KPIs, hover polish
2. `src/app/(dashboard)/crm/brands/brands-table.tsx` — AppHeader, table skeleton
3. `src/app/(dashboard)/crm/firms/firms-table.tsx` — AppHeader, table skeleton
4. `src/app/(dashboard)/crm/contacts/contacts-table.tsx` — AppHeader, table skeleton
5. `src/app/(dashboard)/crm/activities/activities-timeline.tsx` — AppHeader, timeline skeleton, dots, hover
6. `src/app/(dashboard)/crm/pipeline/pipeline-board.tsx` — AppHeader, card/mobile polish
7. `src/components/ui/kanban.tsx` — bg, padding, border, hover
8. `src/app/(dashboard)/crm/brands/[id]/page.tsx` — DetailRow, GradientIcon headers, hover, empty states
9. `src/app/(dashboard)/crm/firms/[id]/page.tsx` — DetailRow, GradientIcon headers, hover, empty states

### Build & Test status
- `npm run build` — **PASSES** (zero errors, all CRM routes visible)
- `npm run test` — **509 tests pass** (zero regressions)
- `CLAUDE.md` — Updated Current Status section

### What remains
- Nothing — task complete. Ready for visual QA if desired.

---

## Previous: CRM Module (Feb 27, 2026)

Full CRM module implemented — see "CRM Module Implementation" entry below for details.

---

## Previous Task: Test Writing (Parallel Agents)

### Shared Rules (BOTH agents must follow)
- **Mock setup file: `src/test/setup.ts` — DO NOT MODIFY.** Both agents depend on it. If you need a different mock shape, create a local mock within your test file using `vi.mock()`.
- **Test location:** `__tests__/` folder next to source files
- **File naming:** `[source-name].test.ts`
- **Run command:** `npm run test:run`
- **Existing tests to NOT break:** `src/lib/validations/validations.test.ts`, `src/components/gantt/__tests__/gantt-chart.test.tsx`, `src/components/gantt/__tests__/gantt-sidebar.test.tsx`
- **Import pattern:** `import { describe, it, expect, vi, beforeEach } from 'vitest';`
- **Full testing guide:** `docs/TESTING-GUIDE.md` — read this for detailed test case specs

### Test Infrastructure (Already Set Up)
- Vitest config: `vitest.config.ts` (jsdom env, `@` alias → `src/`)
- Global mocks: `src/test/setup.ts` (Next.js router, Supabase client, jest-dom)
- Test utility: `src/test/utils.tsx` (`renderUI()` wrapper)
- Playwright config: `playwright.config.ts` (E2E in `e2e/` folder)

---

### Codex Assignment (Schema + Utility Tests)

**Priority:** Do these in order. Run `npm run test:run` after completing each file.

#### 1. Expand Zod schema tests
**File to edit:** `src/lib/validations/validations.test.ts` (already exists, ~280 lines)
**Source:** `src/lib/validations/index.ts` (15 schemas)

Add tests for these MISSING schemas:
- `signupSchema` — valid data, missing name, name < 2 chars, password < 6
- `productionProgressSchema` — 0 (valid), 100 (valid), -1 (reject), 101 (reject), 50.5 (valid)
- `drawingApprovalSchema` — each valid status, missing status, invalid status
- `pmOverrideSchema` — reason 10+ chars (pass), 9 chars (fail), empty (fail)
- `scopeItemUpdateSchema` — empty object passes (all optional), single field passes
- All 5 enum schemas — valid values pass, invalid string rejects:
  - `projectStatusSchema`: "tender"/"active"/"on_hold"/"completed"/"cancelled" valid, "deleted" invalid
  - `currencySchema`: "TRY"/"USD"/"EUR" valid, "GBP" invalid
  - `itemPathSchema`: "production"/"procurement" valid, "shipping" invalid
  - `itemStatusSchema`: all 8 valid, "unknown" invalid
  - `unitSchema`: "pcs"/"set"/"m"/"m2"/"lot" valid, "kg" invalid
- `scopeItemSchema` edge cases:
  - quantity = 0 (reject, min 0.01), quantity = 0.01 (pass)
  - negative initial_unit_cost (reject)
  - images with invalid URL (reject), valid URL array (pass)
  - project_code with lowercase/spaces (reject — regex: `/^[A-Z0-9-]+$/`)

#### 2. Sanitization tests
**File to create:** `src/lib/__tests__/sanitize.test.ts`
**Source:** `src/lib/sanitize.ts`

Test:
- `sanitizeText()` — strips `<script>`, strips `<img onerror>`, preserves plain text, handles null/undefined
- `sanitizeHTML()` — removes script/iframe, keeps `<b>`/`<em>`/`<p>`
- `sanitizeURL()` — allows https://, blocks `javascript:`, adds https:// to bare domains
- `escapeHTML()` — converts `<`, `>`, `"`, `'`, `&` to entities
- `sanitizeObject()` — recursively sanitizes nested object fields
- `sanitizedText` Zod schema — transforms HTML input to clean text
- `createSanitizedString()` — minLength/maxLength/required options

#### 3. Core utility tests
**File to create:** `src/lib/__tests__/utils.test.ts`
**Source:** `src/lib/utils.ts`

Test:
- `formatCurrency(1234.5, "TRY")` → `"₺1,234.50"`, same for USD (`$`) and EUR (`€`)
- `formatCurrency(null, "TRY")` → `"-"`, `formatCurrency(0, "USD")` → `"$0.00"`
- `getNextRevision(null)` → `"A"`, `("A")` → `"B"`, test up to Z
- `calculateProgress(0, 10)` → 0, `(5, 10)` → 50, `(10, 10)` → 100, `(0, 0)` → no crash
- `generateAvatarFallback("John Doe")` → `"JD"`, single name, empty string

#### 4. Gantt utility tests
**File to create:** `src/components/gantt/__tests__/gantt-utils.test.ts`
**Source:** `src/components/gantt/types.ts`

Test:
- `daysBetween(Jan 1, Jan 1)` → 1 (inclusive), `(Jan 1, Jan 10)` → 10
- `calculateWorkDays` with weekends included → same as daysBetween
- `calculateWorkDays` with Saturday excluded → correct count
- `calculateWorkDays` with both excluded → weekdays only
- `isToday(new Date())` → true, `isToday(yesterday)` → false
- `isWeekend(Saturday)` → true, `isWeekend(Monday)` → false
- `generateColumns` for day/week/month views → correct column count and labels
- `calculateBarPosition` → correct left offset and width relative to date range

#### 5. Slug utility tests
**File to create:** `src/lib/__tests__/slug.test.ts`
**Source:** `src/lib/slug.ts`

Test:
- `generateSlug("Hello World")` → `"hello-world"`, special chars stripped
- `isUUID("550e8400-e29b-41d4-a716-446655440000")` → true
- `isUUID("not-a-uuid")` → false, `isUUID("")` → false

#### 6. Rate limit tests
**File to create:** `src/lib/__tests__/rate-limit.test.ts`
**Source:** `src/lib/rate-limit.ts`

Test (use `vi.useFakeTimers()`):
- `checkRateLimit` — allows up to limit, blocks after, resets after window
- `checkLoginRateLimit` — 5 attempts per 15 minutes
- remaining count decrements correctly
- After time window expires → allows again

#### 7. File validation tests
**File to create:** `src/lib/__tests__/file-validation.test.ts`
**Source:** `src/lib/file-validation.ts`

Test:
- `validateFile` with valid image → success, oversized → reject, wrong MIME → reject
- `sanitizeFileName("../../etc/passwd")` → safe name
- `isSuspiciousFileName("photo.jpg")` → false, `("script.php")` → true, `("../../../etc/passwd")` → true
- `formatFileSize(1024)` → `"1.0 KB"`, `(1048576)` → `"1.0 MB"`
- `getFileTypeCategory` for image/pdf/cad/document files

#### When Done
- Run `npm run test:run` — ALL tests must pass (including existing ones)
- Update this file (AGENTS.md) with: which files you created, how many tests, any issues found
- Do NOT start on Claude Code's assignment (server action tests)

### Codex Assignment Results (Completed)

Agent: Codex  
Date: 2026-02-10

Files updated/created:
- `src/lib/validations/validations.test.ts` (expanded to 54 tests)
- `src/lib/__tests__/sanitize.test.ts` (14 tests)
- `src/lib/__tests__/utils.test.ts` (8 tests)
- `src/components/gantt/__tests__/gantt-utils.test.ts` (13 tests)
- `src/lib/__tests__/slug.test.ts` (4 tests)
- `src/lib/__tests__/rate-limit.test.ts` (4 tests)
- `src/lib/__tests__/file-validation.test.ts` (9 tests)

Supporting code change:
- `src/lib/file-validation.ts`
  - Exported `isSuspiciousFileName` for direct testing
  - Fixed `sanitizeFileName` to sanitize extension characters (prevents `/` leakage from malicious names like `../../etc/passwd`)

Verification runs:
- Ran `npm run test:run` after each of the 7 assignment steps.
- New/updated Codex assignment tests pass.

Open issue encountered (pre-existing, outside assignment scope):
- `src/components/gantt/__tests__/gantt-sidebar.test.tsx`
  - Failing test: `shows collapse button only when a parent has more than one child`
  - Current assertion mismatch: expected `1`, received `2`

---

### Claude Code Assignment (Server Action + React Query Tests)

**Status:** COMPLETED

#### Results

Agent: Claude Code
Date: 2026-02-10

Files created:
- `src/lib/actions/__tests__/scope-items.test.ts` (52 tests)
- `src/lib/actions/__tests__/materials.test.ts` (45 tests)
- `src/lib/actions/__tests__/auth.test.ts` (20 tests)
- `src/lib/actions/__tests__/timelines.test.ts` (40 tests)
- `src/lib/react-query/__tests__/timelines.test.ts` (23 tests)

**Total: 180 tests, all passing**

Mock infrastructure pattern:
- Chainable Supabase mock factory (`createChainMock`) reused across all server action test files
- Local `vi.mock("@/lib/supabase/server")` in each file (since `src/test/setup.ts` only mocks client-side)
- Service role client mock for soft deletes (`deleteScopeItem`, `deleteMaterial`)
- Storage mock for `uploadMaterialImages`
- `renderHook` + `QueryClientProvider` for React Query hook tests

Key test coverage:
- **scope-items**: getScopeItems, bulkUpdate (11-field whitelist), splitScopeItem (null initial_unit_cost), soft delete via service role
- **materials**: role-based auth (admin/pm only for delete), bulkImport upsert logic, all 3 status transitions, storage upload
- **auth**: rate limiting integration, must_change_password flag, email enumeration prevention
- **timelines**: all 4 dependency types (FS/SS/FF/SF), fixed phase protection, reparenting on delete, role checks
- **react-query**: query key factory, optimistic updates, error rollback + toast notifications

#### 6. E2E tests (COMPLETED)

Agent: Claude Code
Date: 2026-02-10

Files created:
- `e2e/drawing-approval.spec.ts` (8 tests: 3 pass, 5 skip gracefully)
- `e2e/role-access.spec.ts` (19 tests: 19 pass)
- `e2e/mobile.spec.ts` (16 tests: 15 pass, 1 skip)

**Total E2E: 43 tests, 37 passing, 6 graceful skips, 0 failures**

Key test coverage:
- **role-access**: unauthenticated redirect (6 routes), admin route access (6 routes), sidebar nav items by href, sidebar navigation with Promise.all URL wait, create project button (icon-only `+`), finance KPIs, project detail tabs
- **mobile**: sidebar hidden at 375px, Sheet overlay trigger, Sheet dialog navigation (scoped to `[role="dialog"]` to avoid overlay intercept), sidebar auto-close, no horizontal overflow, cards-not-table at <640px, view toggle hidden on mobile, header fits viewport, tablet sidebar inline, tablet table view, desktop layout, resize transition
- **drawing-approval**: project detail loads, scope items tab navigation, scope item click (sheet or navigation), drawing content detection, upload button visibility, send-to-client/PM-override (skip when no matching status in data)

Lessons learned:
- `waitForLoadState("networkidle")` hangs on pages with React Query/Supabase realtime — use `"load"` instead
- `a[href^="/projects/"]` matches `/projects/new` — always exclude with `:not([href*="new"])`
- Next.js `Link` clicks need `Promise.all([waitForURL(), click()])` for reliable navigation detection
- Sheet overlay (`data-slot="sheet-overlay"`) intercepts pointer events — target links inside `[role="dialog"]`
- Sidebar can be icon-only mode — use `a[href="/path"]` selectors, not text-based

---

## Previous Completed Tasks

### Gantt Sidebar Polish (Feb 9, 2026)
Agent: Claude Code
Files: gantt-sidebar.tsx (rewrite), gantt-chart.tsx, gantt-header.tsx, timeline/page.tsx, timeline-client.tsx
Summary: Removed tree connectors, simplified hierarchy, fixed spacing/alignment, auto-width sidebar, flex-1 chart area.

### 1px Header Alignment Fix (Feb 10, 2026)
Agent: Claude Code
File: `src/components/gantt/gantt-header.tsx`
Summary: Added explicit `height` + `box-border` + `overflow-hidden` on wrapper to match sidebar header.

### Testing Guide Created (Feb 10, 2026)
Agent: Claude Code
File: `docs/TESTING-GUIDE.md`
Summary: Comprehensive testing guide with codebase-specific prompts, real file paths, and priority ordering.

---

### Drawing Approval Bug Fixes (Feb 10, 2026)
Agent: Claude Code

**5 bugs fixed in the drawing approval workflow:**

1. **Client sees PM Override button** — `scope-item-sheet.tsx`: Changed `userRole={userRole}` to `userRole={isClient ? "client" : userRole}`
2. **No toast notifications on approval** — `drawing-approval.tsx`: Added `toast` import from "sonner" and success/error calls to all 4 handlers
3. **Record Approval silently fails for clients** — Created RLS migration `046_client_drawing_approval_rls.sql` adding client UPDATE policies on `drawings` and `scope_items` tables (applied to Supabase)
4. **DrawingsOverview doesn't refresh after approval** — `drawings-overview.tsx`: Added `useRouter` + `router.refresh()` on view sheet close and upload success
5. **Pending Approvals widget links to wrong tab** — `pending-approvals-widget.tsx`: Changed link to include `?tab=drawings` or `?tab=materials`; `project-tabs.tsx`: Added `useSearchParams` support to read `?tab=` param

Files changed:
- `src/components/scope-items/scope-item-sheet.tsx`
- `src/components/drawings/drawing-approval.tsx`
- `src/app/(dashboard)/projects/[id]/drawings-overview.tsx`
- `src/app/(dashboard)/projects/[id]/project-tabs.tsx`
- `src/components/dashboard/pending-approvals-widget.tsx`
- `supabase/migrations/046_client_drawing_approval_rls.sql` (NEW — applied to Supabase)

**Also fixed earlier in same session:**
- Drawing upload sheet: scope item pre-selection, CAD-only upload support
- File validation: Turkish character transliteration for Supabase Storage

### Drawing Approval Workflow - Round 2 (Feb 10, 2026)
Agent: Claude Code

**4 additional fixes for the drawing approval workflow:**

1. **Storage RLS path error** — All upload paths in `drawing-upload-sheet.tsx`, `drawing-upload.tsx`, and `scope-item-image-upload.tsx` now include `projectId` as first path segment (required by migration 040's `storage_project_id` function)
2. **400 error on client drawing approval** — RLS policy subquery caused circular evaluation. Created SECURITY DEFINER helper `get_item_project_id(uuid)` in migration 046, rewrote client UPDATE policies to use it. Applied to Supabase.
3. **Pending approvals missing scope item code** — Added `itemCode` field to `PendingApproval` interface and widget display (`dashboard.ts`, `pending-approvals-widget.tsx`)
4. **Client can't view/download drawing file** — `scope-item-sheet.tsx` now fetches `drawing_revisions` alongside drawings and shows PDF/CAD download links
5. **Replace file for uploaded revision** — `drawing-approval.tsx`: Added "Replace File" dialog for PM/Admin to replace the file on an existing revision without creating a new revision letter

Files changed:
- `src/components/drawings/drawing-upload-sheet.tsx` (storage path fix)
- `src/components/drawings/drawing-upload.tsx` (added projectId prop, storage path fix)
- `src/components/scope-items/scope-item-image-upload.tsx` (added projectId prop, storage path fix)
- `src/components/scope-items/scope-item-sheet.tsx` (fetch drawing_revisions, show file download links)
- `src/components/drawings/drawing-approval.tsx` (replace file feature)
- `src/lib/actions/dashboard.ts` (added itemCode to PendingApproval)
- `src/components/dashboard/pending-approvals-widget.tsx` (display item code)
- `supabase/migrations/046_client_drawing_approval_rls.sql` (updated with SECURITY DEFINER helper)

### Drawing Approval Workflow - Round 3 (Feb 10, 2026)
Agent: Claude Code

**2 UX improvements to the drawing approval workflow:**

1. **Client markup upload on approval** — `drawing-approval.tsx`: Added file upload field to the approval dialog for "Approved" and "Approved with Comments" selections. Upload goes to Supabase Storage (`drawings/{projectId}/{scopeItemId}/markup_...`), URL saved to `drawing_revisions.client_markup_url`. Allows clients to attach a signed/stamped copy as proof of approval.

2. **Confirmation dialog for new revision on approved drawings** — Three changes:
   - `drawings-overview.tsx`: Hidden "Upload Drawing" header button and per-row "New Rev" button for clients. Added AlertDialog confirmation when PM/Admin clicks "New Rev" on an already-approved drawing.
   - `drawing-upload.tsx`: Added `drawingStatus` prop and internal AlertDialog confirmation for approved drawings before opening the upload dialog.
   - `scope/[itemId]/page.tsx`: Removed "client" from `canUploadDrawings` role list (clients should never upload revisions). Passes `drawingStatus` to `DrawingUpload`.

Files changed:
- `src/components/drawings/drawing-approval.tsx` (markup file upload in approval dialog)
- `src/components/drawings/drawing-upload.tsx` (confirmation dialog, `drawingStatus` prop)
- `src/app/(dashboard)/projects/[id]/drawings-overview.tsx` (hide for clients, confirmation dialog)
- `src/app/(dashboard)/projects/[id]/scope/[itemId]/page.tsx` (remove client from upload roles, pass drawingStatus)

### Bulk Send Drawings + Client Visibility + Email Notifications (Feb 10, 2026)
Agent: Claude Code

**Feature: Bulk "Send All to Client" + client drawing visibility + email notifications**

Files created:
- `src/emails/drawing-sent-to-client-email.tsx` — Email template for drawing notifications
- `src/lib/actions/drawings.ts` — Server action: `sendDrawingsToClient(projectId, drawingIds[])`

Files modified:
- `src/lib/activity-log/constants.ts` — Added `DRAWINGS_BULK_SENT_TO_CLIENT` action constant
- `src/components/drawings/drawing-approval.tsx` — Replaced client-side send with `sendDrawingsToClient()` server action (single send now also triggers email + in-app notifications)
- `src/app/(dashboard)/projects/[id]/drawings-overview.tsx` — Added bulk send button, confirmation dialog, client-side filtering (hides unsent drawings from clients), client empty state
- `src/app/(dashboard)/projects/[id]/project-tabs.tsx` — Added `drawingsReadyCount` prop and amber badge for "ready to send" count
- `src/app/(dashboard)/projects/[id]/page.tsx` — Computes `drawingsReadyCount` from drawings data, passes to ProjectTabs

Key behaviors:
- PM sees "Send All to Client (X)" button when drawings have `uploaded` status
- Clicking shows AlertDialog confirmation listing item codes
- After send: drawings → `sent_to_client`, scope items → `awaiting_approval`
- Client receives email + in-app notification
- Activity logged with drawing IDs and item codes
- Client view hides `uploaded` and `not_uploaded` drawings
- Drawings tab shows amber badge with count (PM/Admin only)

UI polish:
- Drawings overview layout consolidated: removed floating header + CardHeader, stats bar with middot separators sits directly above edge-to-edge table in a `py-0 gap-0` GlassCard
- Buttons use `size="sm"`, shorter labels ("Send All (3)", "Upload")
- Card base `py-6 gap-6` overridden to zero for flush table layout

Build verified: `npm run build` passes.

### Reports PDF Storage Path Fix + Cleanup (Feb 10, 2026)
Agent: Claude Code

**Root cause:** `uploadReportPdf()` used `pdfs/${fileName}` as storage path — violated migration 040's RLS which requires `{projectId}/...` format. Upload silently failed → `pdf_url` never saved → email "View Report" button linked to page instead of PDF.

**Cascading fix:** Also fixed the email "View Report" button behavior — with the upload now succeeding, `pdf_url` gets saved to DB, and the email notification uses the direct PDF link instead of falling back to the reports page URL.

Files changed:
- `src/lib/actions/reports.ts` — Added `projectId` param to `uploadReportPdf()`, changed path to `${projectId}/${reportId}/${fileName}`
- `src/app/(dashboard)/projects/[id]/report-creation-modal.tsx` — Pass `projectId` to `uploadReportPdf()`, removed 6 debug console.logs
- `src/app/(dashboard)/projects/[id]/reports-table.tsx` — Pass `projectId` to `uploadReportPdf()`, removed 4 debug console.logs

Documentation updated:
- `CLAUDE.md` — Added storage path rule to Gotchas (#15), updated File Storage section with RLS note + PDF path, added Storage Path Bug lesson with cascade effect documentation

All 289 tests pass. No type errors in changed files.

---

### FC Logo Icons Integration (Feb 11, 2026)
Agent: Claude Code

**Feature: Replace CSS-generated "FC" text blocks with professional logo assets**

Files created:
- `src/app/manifest.ts` — PWA web manifest with app name, theme color (#0f3d2e), and icon references
- `src/app/apple-icon.png` — 180x180 Apple touch icon (from fc_icons_vignette)
- `src/app/icon.png` — 192x192 PWA icon (Next.js auto-serves as favicon)
- `public/icons/icon-192x192.png` — Web manifest icon
- `public/icons/icon-512x512.png` — PWA splash / Android icon
- `public/icons/icon-32x32.png` — Standard favicon PNG

Files modified:
- `src/app/layout.tsx` — Added `icons` metadata (32x32 icon + 180x180 apple-touch-icon)
- `src/components/app-sidebar.tsx` — Replaced CSS "FC" div with `<img>` tag
- `src/components/layout/mobile-header.tsx` — Replaced CSS "FC" div with `<img>` tag
- `src/app/(auth)/login/page.tsx` — Replaced CSS "FC" div with `<img>` tag
- `src/app/(auth)/forgot-password/page.tsx` — Replaced CSS "FC" div with `<img>` tag
- `src/app/(auth)/reset-password/page.tsx` — Replaced CSS "FC" div with `<img>` tag
- `src/app/(auth)/change-password/page.tsx` — Replaced CSS "FC" div with `<img>` tag
- `src/app/(auth)/setup-password/page.tsx` — Replaced CSS "FC" div with `<img>` tag

Files deleted:
- `src/app/favicon.ico` — Removed (contained non-RGBA PNG, incompatible with Turbopack)
- `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, `public/window.svg` — Unused default Next.js assets

Notes:
- The original `favicon.ico` had a non-RGBA PNG embedded which caused Turbopack build failure. Removed it — Next.js auto-serves `src/app/icon.png` as the favicon instead.
- Build verified: `npm run build` passes, Next.js auto-generates `/apple-icon.png`, `/icon.png`, `/manifest.webmanifest` routes.

---

### Codex Mobile UI Density Improvements (Feb 11, 2026)
Agent: Codex (reviewed by Claude Code)

**34 files modified, 1 new file created — mobile + desktop UI density/consistency improvements**

Key changes:
- `src/components/ui/responsive-data-view.tsx` (NEW) — Generic `ResponsiveDataView<T>` + `ViewToggle` for table/card switching
- `src/components/scope-items/scope-item-card.tsx` (NEW) — Mobile card view for scope items
- `src/hooks/use-media-query.ts` — Added `useBreakpoint()` hook (replaces `useIsMobile()`)
- `src/app/(dashboard)/projects/[id]/project-tabs.tsx` — Bottom-sheet tabs (mobile) + dropdown overflow (desktop)
- `src/app/(dashboard)/projects/[id]/scope-items-table.tsx` — ResponsiveDataView integration, 2x2 summary grid
- `src/app/(dashboard)/projects/[id]/project-overview.tsx` — Removed inline ProjectEditSheet, links to `/edit` page
- `src/app/(dashboard)/projects/[id]/project-detail-header.tsx` — Removed edit button from header
- Multiple action buttons — Added `compact` prop for mobile density
- All project detail tabs (drawings, materials, reports, financials) — Denser mobile layouts

Review findings (open issues):
- `ScopeItemCard` missing `{!isClient && ...}` guards on Edit/Split/Delete actions
- `ExportButton` removed from scope items — users may miss Excel export
- `totalInitialCost` no longer displayed in scope items summary
- `use-mobile.ts` is orphaned (no imports) — safe to delete
- `canEdit` prop on `ProjectDetailHeader` is dead code
- Gantt chart blocked for tablets (`isMobileOrTablet`) — may be too restrictive

Build verified: TypeScript clean, 289/289 tests pass.

### PDF Photo Layout Improvements (Feb 11, 2026)
Agent: Codex (initial), Claude Code (review + fixes)

**Codex added canvas-based image rendering + description clamping. Claude Code reviewed and fixed bugs, then simplified.**

Files modified:
- `src/lib/pdf/generate-report-pdf.ts` — Major refactor of photo rendering pipeline

What Codex added:
- `prepareImageForFrame()` — canvas pre-rendering for deterministic cover/contain
- `getPhotoFitMode()` — URL-based keyword detection for contain mode
- Description clamping to 3 lines with ellipsis
- Image cache for repeated same-image draws

What Claude Code fixed/changed:
- **Bug fix:** Cache key collision — changed from `base64.slice(0,80)` to photo URL
- **Bug fix:** Added try/catch to single/triple photo layouts (grid already had it)
- **Removed:** `getPhotoFitMode()`, `PhotoFitMode` type, `criticalKeywords` array — unnecessary, caused false-positive gray bars
- **Removed:** Gray background fill in canvas — not needed with cover-only mode
- **Removed:** Dead `calculateFitDimensions` import
- **Simplified:** Always cover mode (no contain), uniform 1:1 square grid frames
- **Deleted:** `report-layout-preview-after-implementation.png` (dev artifact)

Final photo layout:
- Single: 16:9 hero | Triple: 16:9 hero + 2 square | Grid: uniform 1:1 square
- All photos cover-cropped into frames, no gray bars, uniform row heights

Build verified: TypeScript clean, 289/289 tests pass.

### CLAUDE.md Revision (Feb 11, 2026)
Agent: Claude Code

Updated CLAUDE.md with mobile UI + PDF session learnings:
- Added `ResponsiveDataView`, `useBreakpoint()`, compact button, and mobile tab patterns to Code Patterns
- Updated hooks section (deprecated `use-mobile.ts`)
- Added `ResponsiveDataView`, `ViewToggle`, `ScopeItemCard` to Component Hierarchy
- Added mobile density pass to Completed status
- Moved Mobile optimization to In Progress
- Added Known Issues section (from Codex review)
- Added Mobile UI Density lessons learned table
- Updated Design System spacing table with mobile padding values
- Added gotchas #16 (`useBreakpoint` not `useIsMobile`) and #17 (mobile card role guards)

---

### Admin Views for Supabase Studio (Feb 12, 2026)
Agent: Claude Code

**Created 5 admin-friendly database views for browsing in Supabase Studio without UUID soup.**

Files created:
- `supabase/migrations/047_admin_views_scope_drawings_materials.sql` — 5 new views with `security_invoker = true`

Views added:
- `v_scope_items` — project_code, project_name, client_name + item data (118 rows)
- `v_drawings` — project_code, item_code, item_name + drawing status, revision_count
- `v_materials` — project_code, material_code + linked_items count
- `v_milestones` — project_code, milestone_code + due_date
- `v_snagging` — project_code, item_code + created_by_name, resolved_by_name

Applied to Supabase: Yes (project lsuiaqrpkhejeavsrsqc)
Security advisor: Clean (no new warnings from our views)

Lesson learned: `CREATE OR REPLACE VIEW` defaults to `SECURITY DEFINER` — must use `DROP VIEW + CREATE VIEW WITH (security_invoker = true)` instead.

CLAUDE.md updated: Added admin views table to Database Schema section, gotchas #18 and #19, migration 047 note.

---

### Shannon Pentest Fixes — PM Self-Assignment & Override Enforcement (Feb 16, 2026)
Agent: Claude Code

**2 security vulnerabilities fixed from Shannon AI pentest findings:**

1. **PM Self-Assignment Privilege Escalation** — Migration 048 adds `is_assigned_to_project(project_id)` check to INSERT/UPDATE/DELETE policies on `project_assignments`. PMs can no longer self-assign to projects they're not already on. Admins unaffected.

2. **PM Override Reason Not Enforced Server-Side** — Created `overrideDrawingApproval()` server action in `src/lib/actions/drawings.ts`. Updated `src/components/drawings/drawing-approval.tsx` to use it instead of inline Supabase `.update()`. Override reason validation is now server-enforced.

Files created:
- `supabase/migrations/048_fix_pm_assignment_privilege_escalation.sql`

Files modified:
- `src/lib/actions/drawings.ts` — Added `overrideDrawingApproval()` server action
- `src/components/drawings/drawing-approval.tsx` — `handlePMOverride` now calls server action
- `docs/DATABASE.md` — Added migration 048 to table
- `CLAUDE.md` — Added migration 048 note + gotcha #20

**Migration 048 status:** Applied to Supabase (Feb 17, 2026).

---

### React Doctor Score Fix — 76 → 92 (Feb 18–26, 2026)
Agent: Claude Code

**Goal:** Improve React Doctor score from 76 to 85+. **Final score: 92/100 ("Great")**

**Phase 1: Deleted 46 dead code files** (biggest impact — ~200+ warnings removed)
- 15 source files: `use-autosave`, `use-file-upload`, `use-toast`, `mobile-header`, `page-header-setter`, `projects-status-chart`, `this-week-widget`, `project-activity-feed`, `compose-refs`, `profiling`, `actions/index.ts`, `react-query/index.ts`, `report-form-dialog`, `report-line-editor`, `emails/tailwind.config.ts`
- 31 unused shadcn UI components: `accordion`, `aspect-ratio`, `breadcrumb`, `button-group`, `carousel`, `collapsible`, `draft-indicator`, `drawer`, `empty-state-illustrations`, `empty`, `field`, `form`, `hover-card`, `input-group`, `input-otp`, `item`, `kanban`, `kbd`, `menubar`, `native-select`, `navigation-menu`, `page-loader`, `pagination`, `reel`, `resizable`, `rich-text-display`, `rich-text-editor`, `sonner`, `timeline`, `toast`, `toggle-group`, `toggle`

**Phase 2: Fixed 5 nested component errors**
- Created `src/components/ui/sort-indicator.tsx` — shared component, replaced duplicates in `financials-overview.tsx` and `project-costs-table.tsx`
- Moved `ResizeHandle` to module scope in `gantt-sidebar.tsx` with explicit props
- Extracted `SortableRow` to `src/components/gantt/sortable-row.tsx` (145-line component)
- Moved `SortHeader` to module scope in `reports-table.tsx` with explicit props

**Phase 3: Next.js Image optimization**
- Converted 6 static `<img>` to `<Image>` with width/height: `app-sidebar`, `login`, `forgot-password`, `setup-password`, `reset-password`, `change-password`
- Converted 2 dynamic `<img>` to `<Image unoptimized>`: `scope-item-sheet`, `ui-helpers`
- Added `sizes` to 11 fill Image instances: `material-card`, `scope-item-image-upload`, `item-materials-section` (×2), `sortable-section`, `section-form-dialog`, `snagging-form-dialog`, `snagging-overview`, `material-form-dialog`, `scope/[itemId]/page`, `material-sheet`

### Accessibility & Warning Cleanup (Feb 18, 2026)
Agent: Claude Code

**Phase 4: Accessibility fixes**
- `gantt-bar.tsx` — Added `role="button"`, `tabIndex={0}`, `onKeyDown` handler to milestone div and bar content div (2 interactive divs)
- `gantt-chart.tsx` — Added `role="presentation"` to scrollable timeline div with `onClick={handleBackgroundClick}`
- `team-share-selector.tsx` — Added `htmlFor="team-share-list"` to Label, added `id="team-share-list"` to associated container

**Phase 5a: Removed duplicate `export default` (kept named exports)**
Gantt files: `gantt-bar.tsx`, `gantt-chart.tsx`, `gantt-sidebar.tsx`, `gantt-header.tsx`, `gantt-dependencies.tsx`
Email files: `welcome-email.tsx`, `project-assignment-email.tsx`, `milestone-alert-email.tsx`, `report-published-email.tsx`, `drawing-sent-to-client-email.tsx`
UI files: `export-button.tsx`, `scope-items-filter-bar.tsx`

Additional duplicate exports removed (Feb 26): `error-boundary.tsx`, `timeline-overview.tsx`, `dependency-dialog.tsx`, `gantt-row.tsx`
Deleted dead file: `src/lib/actions/drafts.ts` (zero imports)

**Phase 5b: Extracted `= []` default props to module-level constants**
- `gantt-chart.tsx` — `EMPTY_DEPENDENCIES: GanttDependency[]` for `dependencies = []`
- `project-overview.tsx` — `EMPTY_ACTIVITIES: Activity[]` for `recentActivities = []`
- `projects-list-client.tsx` — `EMPTY_CLIENTS: Client[]` for `clients = []`

Files changed (14 total):
- `src/components/gantt/gantt-bar.tsx`
- `src/components/gantt/gantt-chart.tsx`
- `src/components/gantt/gantt-sidebar.tsx`
- `src/components/gantt/gantt-header.tsx`
- `src/components/gantt/gantt-dependencies.tsx`
- `src/components/reports/team-share-selector.tsx`
- `src/emails/welcome-email.tsx`
- `src/emails/project-assignment-email.tsx`
- `src/emails/milestone-alert-email.tsx`
- `src/emails/report-published-email.tsx`
- `src/emails/drawing-sent-to-client-email.tsx`
- `src/components/ui/export-button.tsx`
- `src/components/scope-items/scope-items-filter-bar.tsx`
- `src/app/(dashboard)/projects/[id]/project-overview.tsx`
- `src/app/(dashboard)/projects/projects-list-client.tsx`

---

### CRM Module Implementation (Feb 27, 2026)
Agent: Claude Code

**Full Sales CRM module added — 6 database tables, 2 migrations, ~25 new files, 8 new routes.**

#### Database (Applied to Supabase)
- `supabase/migrations/049_crm_module.sql` — 6 tables (crm_brands, crm_architecture_firms, crm_contacts, crm_opportunities, crm_activities, crm_brand_firm_links), sequences, auto-code triggers (BRD/ARCH/CON/OPP), RLS policies, indexes, 3 admin views (v_crm_brands, v_crm_opportunities, v_crm_activities)
- `supabase/migrations/050_crm_seed_data.sql` — 37 brands, 12 architecture firms, 18 brand-firm links, 5 opportunities

#### Infrastructure
- `src/lib/compose-refs.ts` — Re-created ref-merging utility (deleted in React Doctor cleanup)
- `src/components/ui/kanban.tsx` — Re-created kanban board UI primitive using @dnd-kit

#### Application Logic
- `src/types/crm.ts` — All CRM types, enums, extended types (CrmBrandWithStats, CrmOpportunityWithRelations, etc.), constants arrays
- `src/lib/validations/crm.ts` — Zod schemas for all entity forms (5 schemas, 7 enum schemas). Uses `z.input<>` for FormData types (not `z.infer<>`) to work with `zodResolver` + `.default()` fields
- `src/lib/actions/crm.ts` — ~20 server actions with `requireCrmAccess()` auth helper. Insert calls use `as any` for auto-code fields (trigger fills them). Includes: CRUD for brands/firms/contacts/opportunities, pipeline grouping, activities timeline, dashboard stats
- `src/lib/react-query/crm.ts` — Query key factory + hooks with optimistic updates (pipeline drag, brand delete), toast notifications, staleTime: 60s
- `src/lib/activity-log/constants.ts` — Added 12 CRM action constants

#### Pages & UI
- `src/components/app-sidebar.tsx` — CRM nav item (TargetIcon, amber, admin/pm/management)
- `src/app/(dashboard)/crm/page.tsx` + `crm-dashboard.tsx` — Dashboard with 4 KPIs, pipeline summary, upcoming actions
- `src/app/(dashboard)/crm/brands/` — Table + sheet + detail page (with related opportunities/activities)
- `src/app/(dashboard)/crm/firms/` — Table + sheet + detail page (with linked brands)
- `src/app/(dashboard)/crm/pipeline/` — Kanban board (desktop) + collapsible list (mobile), drag-and-drop stage changes
- `src/app/(dashboard)/crm/contacts/` — Table + sheet
- `src/app/(dashboard)/crm/activities/` — Timeline grouped by date + log dialog

#### Type Regeneration
- `src/types/database.ts` — Regenerated from Supabase to include CRM tables. Convenience type aliases (ClientInsert, ProjectUpdate, etc.) manually re-appended.

#### Build & Tests
- `npm run build` — 0 errors, all 8 CRM routes visible
- `npm run test` — 289/289 tests pass (no regressions)
- Security advisor — No CRM-related warnings (only pre-existing: clients, materials, notifications, scope_items, snagging)

#### Key Patterns / Gotchas
- Auto-code trigger fields (brand_code, firm_code, etc.) need `as any` on insert since TypeScript types require them but DB triggers fill them
- `z.input<>` not `z.infer<>` for form data types when schema uses `.default()`
- `composeRefs` must accept `T | null` parameter since React refs pass `null` on unmount
- CRM access: admin (full), pm (read + write), management (read-only), others (no access)

---

## Applied Migrations & Warnings
- **Migration 045 applied**: `045_gantt_rewrite.sql` has been executed on Supabase — Gantt data is live
- **Migration 046 applied**: `046_client_drawing_approval_rls.sql` has been applied to Supabase (client drawing approval RLS + SECURITY DEFINER helper)
- **Migration 047 applied**: `047_admin_views_scope_drawings_materials.sql` has been applied to Supabase (5 admin views with security_invoker)
- **Migration 048 applied**: `048_fix_pm_assignment_privilege_escalation.sql` — PMs can only manage assignments for projects they're already assigned to
- **Migration 049 applied**: `049_crm_module.sql` — 6 CRM tables, sequences, auto-code triggers, RLS policies, indexes, 3 admin views
- **Migration 050 applied**: `050_crm_seed_data.sql` — 37 brands, 12 firms, 18 links, 5 opportunities (verified: BRD-001..BRD-037, ARCH-001..ARCH-012, OPP-001..OPP-005)
- ~~**Reports PDF upload path broken**~~ — **FIXED** (Feb 10, 2026): Changed storage path from `pdfs/${fileName}` to `${projectId}/${reportId}/${fileName}` in `uploadReportPdf()`. Also added `projectId` parameter to function signature and updated both callers (`report-creation-modal.tsx`, `reports-table.tsx`). Debug console.logs removed from both callers.
- **Do not modify `src/test/setup.ts`** during parallel test writing — both agents depend on it
- **Gantt sidebar test fixed**: Pre-existing test mismatch was already corrected by Codex agent — all 289 tests pass
- ~~**Pre-existing TS error**~~ — **FIXED**: `e2e/accessibility.spec.ts` replaced custom `AxeViolation` interface with `import type { Result } from "axe-core"`
- ~~**Remaining TS errors**~~ — **FIXED**: `e2e/gantt.spec.ts:3` added `Page` type annotation, `scope-items.test.ts:562` removed redundant `id` before spread
- **TypeScript: 0 errors** — full codebase compiles clean as of Feb 10, 2026
- **Tests: 289 passing, 0 failures** — all 14 test files pass

---

## React Doctor Sweep (April 27, 2026)

### Score: 75 → 86 (+11)
Started at 75/100 with 8 errors and 496 warnings; ended at 86/100 with 0 errors and ~458 warnings. The remaining warnings are mostly architectural patterns intentionally chosen by the team (form-dialog state-init, optimistic-UI editors, shadcn public exports).

### Phase Summary
- **Phase 1 — Critical correctness** (8 errors → 0): Hook-order violation in `materials-overview.tsx` (early return before useMemo + 6 useCallback hooks), `useEffect` state-reset in `notifications/page.tsx:90`, plus quick fixes in `calendar.tsx`, `timeline-form-dialog.tsx`, `chart.tsx`.
- **Phase 2 — Next.js patterns**: Wrapped `UsersTable` and `ProjectTabs` in `<Suspense>` for `useSearchParams`. Added eslint-disable + comment for blob-URL `<img>` in `batch-photo-upload.tsx`. Several flagged items were false positives (login already wrapped, dashboard staged queries are intentional, invoice-sheet awaits are dependent).
- **Phase 3 — Accessibility**: Drop zones got `role="button" tabIndex={0} onKeyDown`. Resize handles got `role="separator" aria-orientation="vertical"`. Notification project-name spans got keyboard support. 5 labels got `htmlFor`/`id` associations. Removed 2 `autoFocus` props.
- **Phase 4 — Performance**: Split 5 chart files into `*-impl.tsx` + `next/dynamic` wrappers (BudgetTrendChart, BudgetBreakdown, ProjectStatusChart, MaterialsStatusChart, ProductionProgressChart). Extracted inline cash-flow chart from `payments-dashboard.tsx` to `cash-flow-chart{,-impl}.tsx`. Sidebar `useMemo` → lazy `useState` pattern.
- **Phase 5 — Design polish + array keys**: 27 array-index keys converted to stable strings (`skel-${i}`, `${entry.status}`, `${file.name}-${i}`, etc.). Removed gradient text on setup-password. Replaced `animate-bounce` with `animate-pulse`. Renamed `renderExtraAction()` function-prop to `extraAction` ReactNode.
- **Phase 6 — State & effects (partial)**: Login query-param `useEffect` → lazy `useState` initializer with `ERROR_PARAM_MESSAGES` map. Deferred 18 form-dialog `useEffect` form-init refactors (would require parent-level `key`-prop remount across ~12 dialogs — high risk of regression for marginal score).
- **Phase 7 — Dead code audit**: All 11 "unused" files have legitimate uses (k6 load-tests run manually, scripts/* manual utilities, `e2e/*.setup.ts` matched by playwright `testMatch` pattern, `src/test/utils.tsx` documented in TESTING-GUIDE.md, shannon_auditfiles excluded by tsconfig). 162+99 unused exports/types include shadcn public surface and types-defined-for-completeness — kept.
- **Phase 8 — useReducer (deferred)**: 42 components flagged. Status editors (installation/production/shipped/procurement) need `useState(prop)` for **optimistic UI** — local state IS the source of truth for in-flight edits, prop is the on-error revert target. Form dialogs are independent-state cases where useReducer is anti-pattern.
- **Phase 9 — Giant components (deferred)**: 43 components flagged. Top targets (`scope-items-table.tsx` 944 lines, `ProjectsListClient` 428 lines) are page-scope components where extracting helpers adds indirection without clear benefit. Defer to feature-driven refactor.

### Files Touched
~50 files modified, 12 new files created (5 chart-impl + 5 chart-wrapper + cash-flow-chart-impl + cash-flow-chart). No tests modified, no migrations.

### What's Next
- Form-dialog form-init refactor pass: convert `useEffect(() => { setX(item.x); ... }, [item])` patterns to `key={item?.id}` + `useState(() => item?.x ?? "")`. Affects ~12 dialogs. Should be done as one focused PR.
- Recharts dynamic imports: 8 of 8 chart files now lazy-load. Verify in production bundle analyzer that initial JS dropped meaningfully.


### React Doctor Sweep — Round 2 (April 27, 2026 cont.)
After the initial sweep that landed at 86/100 with 458 warnings, a second round addressed the "fixable but deferred" items.

**Round A — Array keys + PDF fonts:**
- 15 more skeleton files: `key={i}` → `key={`skel-${i}`}` (CRM tables, payments tables, notifications, payments-dashboard aging buckets)
- `lib/pdf/executive-summary/index.tsx` — bumped 5 instances of `fontSize: 7.5` → `fontSize: 8`

**Round B — change-password redirect to server-side:**
- Split `change-password/page.tsx` into a server component (auth check + `redirect()`) and a `change-password-form.tsx` client component
- Removed the `router.push()` in `useEffect` anti-pattern; auth check now happens server-side before form renders
- Auth check uses `supabase.auth.getUser()` directly — no separate server action call

**Round C — Form-dialog `key={item?.id}` refactor (7 dialogs):**
- `UserFormDialog` — parent (`users-table.tsx` 2 sites) passes `key={editUser?.id ?? "new-user"}`; component now uses lazy `useState(() => editUser?.x ?? "")` initializers and removed the form-init `useEffect`
- `MilestoneFormDialog` — same pattern, parents `milestones-overview.tsx` and `milestone-cards.tsx`
- `SnaggingFormDialog` — same pattern, parent `snagging-overview.tsx`
- `MaterialSheet` — same pattern, parent `materials-overview.tsx` (already conditionally mounted, now also keyed)
- `SectionFormDialog` — same pattern, two parents `report-creation-modal.tsx` and `report-edit-modal.tsx`
- `DrawingUploadSheet` — keyed by `preselectedItemId`
- `GanttDependencyDialog` — keyed by `${selectedDep.sourceId}-${selectedDep.targetId}` or `"new-dep"`
- `ReportEditModal` — keyed by `editReport.id`; the form-init `useEffect` was split: state init moved to lazy `useState`, the `logReportActivity` side-effect remains in a focused effect
- **Skipped:** `MaterialFormDialog` (dead code per knip), `TimelineFormDialog` (form init depends on `itemById` Map computed in component body — lazy init can't access it), CRM sheets (use react-hook-form's `reset()` pattern which is RHF idiom, not a refactor target), `excel-import.tsx` / `team-overview.tsx` / `finance-access-manager.tsx` / `scope-item-sheet.tsx` (legitimate async data-fetch effects, not form-init)

**Result:** 458 → 442 warnings (-16). Score still 86 (bucket is wide). Codebase quality improved meaningfully — 7 form dialogs no longer rely on the cascading-setState-in-useEffect anti-pattern. New rendered dialog state is now derived from props at mount time, with parent-controlled remounts via `key`.

**Pattern documented for future dialogs:**
```tsx
// Parent
{open && <Dialog key={editItem?.id ?? "new"} editItem={editItem} ... />}

// Dialog (no useEffect form init)
const [name, setName] = useState(() => editItem?.name ?? "");
const [other, setOther] = useState(() => editItem?.other ?? "");
```
