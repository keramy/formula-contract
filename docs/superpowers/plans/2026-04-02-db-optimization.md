# Database IO Budget Optimization Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop Supabase Disk IO Budget depletion on Small compute by reducing query/write amplification across the app.

**Architecture:** The app creates 11+ Supabase clients per dashboard load and 6+ per project page load, each with redundant `auth.getUser()` calls. Server actions recreate clients internally. `revalidatePath` on mutations triggers full page re-renders that re-run all queries. The fix is layered: (1) share request context to eliminate redundant auth, (2) defer index cleanup until stats accumulate, (3) thin the project page to 2 initial queries, (4) replace revalidatePath with React Query invalidation, (5) consolidate overlapping RLS policies.

**Tech Stack:** Next.js 14 App Router, Supabase JS client (@supabase/ssr), React Query (TanStack), TypeScript

**Current State (measured):**
- Dashboard cold load: ~27 Supabase queries (admin), 11 `createClient()` calls
- Project page load: 6 parallel queries + 1 conditional (drawings)
- Server actions: 104 `auth.getUser()` calls, 141 `createClient()` calls across codebase
- 75 `revalidatePath` calls — each triggers full server re-render + all page queries
- 3 RLS InitPlan issues fixed live (notifications + users)
- Write batching already deployed (gantt, excel import, materials, reports)

---

## Task 1: Shared Request Context (PR 3)

**Goal:** Create a `getRequestContext()` helper that resolves `{supabase, user, role}` once per request. Server actions accept an optional context parameter to skip redundant client creation + auth.

**Files:**
- Modify: `src/lib/supabase/server.ts` — add `getRequestContext()` + `RequestContext` type
- Modify: `src/lib/actions/scope-items.ts` — add optional context param to all functions
- Modify: `src/lib/actions/materials.ts` — same
- Modify: `src/lib/actions/reports.ts` — same
- Modify: `src/lib/actions/drawings.ts` — same
- Modify: `src/lib/actions/milestones.ts` — same
- Modify: `src/lib/actions/project-assignments.ts` — same
- Modify: `src/lib/actions/dashboard.ts` — share single context across all 11 helpers
- Modify: `src/app/(dashboard)/dashboard/page.tsx` — create context once, pass to helpers
- Modify: `src/app/(dashboard)/projects/[id]/page.tsx` — create context once, pass to helpers
- Test: Manual — verify dashboard loads, project page loads, sidebar shows correct role

- [ ] **Step 1: Add RequestContext type and getRequestContext() to server.ts**

Add after the existing `createClient()` function:

```typescript
/**
 * Request context — resolved once per server request, passed to helpers.
 * Eliminates redundant createClient() + auth.getUser() calls.
 */
export interface RequestContext {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User;
  role: string;
}

/**
 * Resolve auth context once per request.
 * Pass the returned context to server action helpers to avoid redundant auth calls.
 */
export async function getRequestContext(): Promise<RequestContext | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const role = await getUserRoleFromJWT(user, supabase);
  return { supabase, user, role };
}
```

- [ ] **Step 2: Update scope-items.ts — add optional context parameter**

For every exported function that starts with `const supabase = await createClient()` + `auth.getUser()`, add an optional `ctx?: RequestContext` parameter. Example pattern for each function:

```typescript
import { type RequestContext } from "@/lib/supabase/server";

export async function getScopeItems(
  projectId: string,
  ctx?: RequestContext
): Promise<ActionResult<ScopeItem[]>> {
  try {
    const supabase = ctx?.supabase ?? await createClient();
    const user = ctx?.user ?? (await supabase.auth.getUser()).data.user;
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }
    // ... rest unchanged
```

Apply this pattern to all 16 exported functions in scope-items.ts. The `ctx ?? fallback` pattern ensures backwards compatibility — existing callers still work without changes.

- [ ] **Step 3: Update materials.ts — same pattern (10 functions)**

Same pattern as Step 2. Add `ctx?: RequestContext` to all 10 exported functions.

- [ ] **Step 4: Update reports.ts — same pattern (19 functions)**

Same pattern. This file has the most duplication (20 `createClient()` calls). Add `ctx?: RequestContext` to all exported functions.

- [ ] **Step 5: Update drawings.ts, milestones.ts, project-assignments.ts**

Same pattern for remaining files:
- drawings.ts: 2 functions
- milestones.ts: 7 functions (note: `getMilestones()` doesn't auth-check, still add ctx for client reuse)
- project-assignments.ts: 4 functions

- [ ] **Step 6: Update dashboard.ts — share single context across all 11 helpers**

Add `ctx?: RequestContext` to all 11 exported dashboard functions. Same fallback pattern.

- [ ] **Step 7: Update dashboard/page.tsx — create context once**

Replace the current pattern:
```typescript
// BEFORE: each helper creates its own client
const [cachedStats, cachedRecent] = await Promise.all([...]);
const [tasks, atRisk, ...] = await Promise.all([
  safe(getMyTasks(), ...),
  safe(getAtRiskProjects(), ...),
  // ...
]);
```

With:
```typescript
// AFTER: resolve auth once, pass to all helpers
const ctx = await getRequestContext();
if (!ctx) redirect("/login");

const [cachedStats, cachedRecent] = await Promise.all([...]);  // cached — don't need ctx
const [tasks, atRisk, ...] = await Promise.all([
  safe(getMyTasks(undefined, ctx), ...),
  safe(getAtRiskProjects(undefined, ctx), ...),
  // ...
]);
```

This eliminates ~11 redundant `createClient()` + `auth.getUser()` calls per dashboard load.

- [ ] **Step 8: Update projects/[id]/page.tsx — create context once**

The project page already creates a client + auth. Replace the pattern to use `getRequestContext()` and pass it to the remaining helper calls (`getProjectAssignments`).

- [ ] **Step 9: TypeScript check**

Run: `npx tsc --noEmit --pretty`
Expected: 0 errors

- [ ] **Step 10: Manual test — verify dashboard and project pages load correctly**

1. Load dashboard — should show correct role, projects, stats
2. Load a project page — should show all tabs
3. Edit a scope item — mutation should work
4. Check Vercel logs for errors

- [ ] **Step 11: Commit**

```bash
git add src/lib/supabase/server.ts src/lib/actions/ src/app/\(dashboard\)/
git commit -m "perf: shared request context — eliminate redundant auth/client creation

Each server action now accepts optional RequestContext parameter.
Dashboard: 11 createClient() calls → 1.
Project page: helpers reuse page-level client.
Backwards compatible — callers without context still work."
```

---

## Task 2: Index Audit Baseline (PR 7 — Prep)

**Goal:** Reset index usage stats and let them accumulate for 3-7 days before dropping anything. Save current index list for comparison.

**Files:**
- Create: `supabase/migrations/059_index_audit_reset.sql` — reset stats + document current indexes
- No code changes needed

- [ ] **Step 1: Reset index usage statistics**

Run in Supabase SQL Editor (NOT as migration — this is operational):
```sql
SELECT pg_stat_reset();
```

This resets all `idx_scan` counters so we get fresh usage data from real traffic.

- [ ] **Step 2: Save current index inventory for later comparison**

Create the migration file as documentation only (no DROP statements yet):

```sql
-- ============================================================================
-- Migration 059: Index Audit Baseline
-- Purpose: Document all indexes for review after 7 days of usage stats
-- Action: Review pg_stat_user_indexes after Apr 9, 2026
-- DO NOT DROP anything in this migration — it's a documentation checkpoint
-- ============================================================================

-- Current index count: 175 (all show idx_scan=0 due to recent DB restart)
-- Hot write tables to prioritize:
--   scope_items: 10 indexes
--   activity_log: 3 indexes
--   materials: 4 indexes
--   gantt_items: 6 indexes
--   notifications: 5 indexes
--
-- IMPORTANT: Never drop primary key indexes (*_pkey) or unique constraint indexes (*_key)
-- Only candidates: custom performance indexes (idx_*) that show 0 scans after 7 days
--
-- Run this query after Apr 9 to get real usage data:
-- SELECT relname, indexrelname, idx_scan, pg_size_pretty(pg_relation_size(indexrelid))
-- FROM pg_stat_user_indexes WHERE schemaname = 'public' AND idx_scan = 0
-- AND indexrelname LIKE 'idx_%' ORDER BY pg_relation_size(indexrelid) DESC;
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/059_index_audit_reset.sql
git commit -m "docs: index audit baseline — review after 7 days of usage stats"
```

---

## Task 3: Thin Project Page — Complete Lazy Loading (PR 1)

**Goal:** Reduce project page from 6 parallel queries to 2 (project + scope items). All other data defers to React Query hooks when tabs are activated.

**Files:**
- Modify: `src/app/(dashboard)/projects/[id]/page.tsx` — remove snagging, milestones, assignments, materials from Promise.all
- Modify: `src/app/(dashboard)/projects/[id]/snagging-overview.tsx` — self-fetch via `useProjectSnagging()`
- Modify: `src/app/(dashboard)/projects/[id]/milestones-overview.tsx` — self-fetch via `useProjectMilestones()`
- Modify: `src/app/(dashboard)/projects/[id]/team-overview.tsx` — self-fetch via `useProjectAssignments()`
- Modify: `src/app/(dashboard)/projects/[id]/materials-overview.tsx` — self-fetch via `useMaterials()`
- Modify: `src/app/(dashboard)/projects/[id]/drawings-overview.tsx` — self-fetch via new hook
- Modify: `src/app/(dashboard)/projects/[id]/project-overview.tsx` — accept optional props, self-fetch missing data
- Modify: `src/app/(dashboard)/projects/[id]/project-tabs.tsx` — make all count props optional
- Create: `src/lib/react-query/drawings.ts` — new React Query hooks for drawings
- Modify: `src/lib/react-query/project-tabs.ts` — add drawings hook if not creating separate file
- Modify: `src/lib/actions/drawings.ts` — add `getProjectDrawings()` server action for hook
- Test: Manual — verify all tabs load data when clicked, Overview shows data

- [ ] **Step 1: Create getProjectDrawings server action**

In `src/lib/actions/drawings.ts`, add:

```typescript
export async function getProjectDrawings(projectId: string, ctx?: RequestContext) {
  const supabase = ctx?.supabase ?? await createClient();
  const { data } = await supabase
    .from("drawings")
    .select("id, item_id, status, current_revision, sent_to_client_at")
    .eq("project_id", projectId);
  return data || [];
}
```

Note: drawings don't have `project_id` directly — they're linked via `scope_items.project_id`. Check the actual schema. If drawings link via item_id, the query needs a join or the caller needs to pass item_ids. Verify the actual column structure before implementing.

- [ ] **Step 2: Add useProjectDrawings hook**

In `src/lib/react-query/project-tabs.ts`, add:

```typescript
export function useProjectDrawings(projectId: string, productionItemIds: string[]) {
  return useQuery({
    queryKey: projectTabKeys.drawings(projectId),
    queryFn: async () => {
      if (productionItemIds.length === 0) return [];
      const { getProjectDrawings } = await import("@/lib/actions/drawings");
      return getProjectDrawings(projectId);
    },
    staleTime: 60_000,
    enabled: productionItemIds.length > 0,
  });
}
```

- [ ] **Step 3: Make ProjectTabs count props all optional**

In `project-tabs.tsx`, change interface:

```typescript
interface ProjectTabsProps {
  children: React.ReactNode;
  scopeItemsCount: number;        // keep — from scope items (always fetched)
  openSnaggingCount?: number;     // optional — deferred
  milestonesCount?: number;       // optional — deferred
  incompleteMilestonesCount?: number;  // optional — deferred
  reportsCount?: number;          // already optional
  assignmentsCount?: number;      // optional — deferred
  drawingsReadyCount?: number;    // already optional
  isClient: boolean;
}
```

Set defaults to 0 in destructuring.

- [ ] **Step 4: Convert SnaggingOverview to self-fetch**

```typescript
// snagging-overview.tsx
import { useProjectSnagging } from "@/lib/react-query/project-tabs";
import { Skeleton } from "@/components/ui/skeleton";

export function SnaggingOverview({
  projectId,
  snaggingItems: initialItems,  // optional — may not be passed
  scopeItems,
}: SnaggingOverviewProps) {
  const { data: fetchedItems, isLoading } = useProjectSnagging(projectId);
  const snaggingItems = initialItems ?? fetchedItems ?? [];

  if (isLoading && !initialItems) {
    return <Skeleton className="h-48 w-full" />;
  }
  // ... rest unchanged
```

Make `snaggingItems` optional in the interface.

- [ ] **Step 5: Convert MilestonesOverview to self-fetch**

Same pattern as Step 4 using `useProjectMilestones()`.

- [ ] **Step 6: Convert TeamOverview to self-fetch**

Same pattern using `useProjectAssignments()`.

- [ ] **Step 7: Convert MaterialsOverview to self-fetch**

Same pattern using `useMaterials()` from `src/lib/react-query/materials.ts`.

- [ ] **Step 8: Convert DrawingsOverview to self-fetch**

Same pattern using the new `useProjectDrawings()` hook from Step 2.

- [ ] **Step 9: Update ProjectOverview — make deferred props optional**

`project-overview.tsx` receives milestones, snagging, assignments, activities. Make these optional with defaults:

```typescript
interface ProjectOverviewProps {
  // ... keep required: projectId, projectUrlId, project, scopeItems, drawings, materials
  milestones?: Milestone[];          // optional — lazy
  snaggingItems?: Snagging[];       // optional — lazy
  assignments?: Assignment[];        // optional — lazy
  recentActivities?: Activity[];     // already optional
  canEdit: boolean;
  isClient: boolean;
}
```

Inside the component, use React Query hooks as fallback:

```typescript
const { data: fetchedMilestones } = useProjectMilestones(projectId);
const milestones = milestonesProp ?? fetchedMilestones ?? [];
// ... same for snagging, assignments
```

- [ ] **Step 10: Slim down page.tsx Promise.all**

Remove snagging, milestones, assignments, materials from `Promise.all`. Keep only:
1. Project with client (needed for header + routing)
2. Scope items (default tab content)

Drawings: fetch conditionally after scope items (needed for overview progress calculation).

Remove all props that were deferred — tab components now self-fetch.

- [ ] **Step 11: TypeScript check**

Run: `npx tsc --noEmit --pretty`
Expected: 0 errors

- [ ] **Step 12: Manual test — verify all tabs load**

1. Load project page — Overview tab should show (with loading states for deferred data)
2. Click each tab — data should load via React Query
3. Check network tab — queries should fire only when tab is activated
4. Verify Scope Items tab still works (area mapping may need adjustment)

- [ ] **Step 13: Commit**

```bash
git add src/app/\(dashboard\)/projects/\[id\]/ src/lib/react-query/ src/lib/actions/drawings.ts
git commit -m "perf: thin project page — defer tab data to React Query

Project page load: 6 queries → 2 (project + scope items).
Tab components self-fetch via React Query when activated.
New useProjectDrawings hook for drawings tab.
Overview uses React Query fallback for deferred data."
```

---

## Task 4: Replace revalidatePath with React Query Invalidation (PR 2)

**Goal:** Remove `revalidatePath` from project mutation server actions and replace with React Query `invalidateQueries` in the calling components. This is the highest-impact change but riskiest — do it AFTER Tasks 1-3 reduce the cost of each revalidation.

**Files:**
- Modify: `src/lib/actions/scope-items.ts` — remove `revalidatePath` from all functions
- Modify: `src/lib/actions/materials.ts` — same
- Modify: `src/lib/actions/reports.ts` — same
- Modify: `src/lib/actions/drawings.ts` — same
- Modify: `src/lib/actions/milestones.ts` — same
- Modify: `src/lib/actions/project-assignments.ts` — same
- Modify: `src/components/scope-items/scope-item-sheet.tsx` — add invalidateQueries after mutation
- Modify: `src/components/scope-items/excel-import.tsx` — add invalidateQueries after import
- Modify: `src/components/materials/material-sheet.tsx` — add invalidateQueries after mutation
- Modify: `src/components/drawings/drawing-approval.tsx` — add invalidateQueries after mutation
- Modify: `src/app/(dashboard)/projects/[id]/milestones-overview.tsx` — add invalidateQueries after mutation
- Modify: `src/app/(dashboard)/projects/[id]/team-overview.tsx` — add invalidateQueries after mutation
- Modify: `src/app/(dashboard)/projects/[id]/reports-overview.tsx` — add invalidateQueries after mutation
- Test: Manual — verify every mutation still updates the UI

**IMPORTANT:** This task requires identifying EVERY component that calls a server action and relies on `revalidatePath` for UI refresh. Missing one means the UI won't update after that mutation. Do this incrementally — one entity type at a time.

- [ ] **Step 1: Scope Items — remove revalidatePath, add client invalidation**

In `scope-items.ts`, remove all `revalidatePath(...)` calls (8 total). The server action just returns success/failure.

In every component that calls scope item mutations, add `queryClient.invalidateQueries()` after the mutation succeeds. The components already use `useTransition` — add invalidation in the transition callback.

Pattern for components NOT using `useMutation`:
```typescript
import { useQueryClient } from "@tanstack/react-query";

// Inside component:
const queryClient = useQueryClient();

// After successful mutation:
startTransition(async () => {
  const result = await updateScopeItemField(...);
  if (result.success) {
    queryClient.invalidateQueries({ queryKey: ["scope-items", projectId] });
    // Also invalidate overview data if needed:
    queryClient.invalidateQueries({ queryKey: ["project-tabs", "snagging", projectId] });
  }
});
```

Search for every component that imports from `@/lib/actions/scope-items` and add the invalidation.

- [ ] **Step 2: Materials — same pattern**

Remove `revalidatePath` from materials.ts (7 calls). Add `invalidateQueries` in material components.

- [ ] **Step 3: Reports — same pattern**

Remove from reports.ts (8 calls). Add invalidation in report components.

- [ ] **Step 4: Drawings — same pattern**

Remove from drawings.ts (2 calls). Add invalidation in drawing components.

- [ ] **Step 5: Milestones — same pattern**

Remove from milestones.ts (4 calls). Add invalidation in milestones-overview.tsx.

- [ ] **Step 6: Project Assignments — same pattern**

Remove from project-assignments.ts (2 calls). Add invalidation in team-overview.tsx.

- [ ] **Step 7: Verify NO revalidatePath remains on project routes**

```bash
grep -r "revalidatePath.*projects" src/lib/actions/ --include="*.ts"
```

Expected: 0 results (only CRM, finance, and users should have revalidatePath remaining).

- [ ] **Step 8: TypeScript check**

Run: `npx tsc --noEmit --pretty`
Expected: 0 errors

- [ ] **Step 9: Manual test — verify EVERY mutation updates UI**

Test each mutation type:
1. Edit scope item field → table should update
2. Delete scope item → should disappear
3. Import Excel → items should appear
4. Approve drawing → status should change
5. Add material → should appear in list
6. Complete milestone → should show as complete
7. Add team member → should appear
8. Create report → should appear in list

If any UI doesn't update, the invalidation was missed for that call site.

- [ ] **Step 10: Commit**

```bash
git add src/lib/actions/ src/components/ src/app/
git commit -m "perf: replace revalidatePath with React Query invalidation on project mutations

Removed 31 revalidatePath calls from project-related server actions.
Each mutation no longer triggers full server re-render + 2-6 query re-run.
UI updates via queryClient.invalidateQueries() in calling components.
Remaining revalidatePath: CRM (12), Finance (28), Users (4) — unchanged."
```

---

## Task 5: RLS Policy Consolidation (PR 8)

**Goal:** Merge overlapping permissive RLS policies on drawings and scope_items. Performance advisor flagged 10 issues.

**Files:**
- Create: `supabase/migrations/060_consolidate_rls_policies.sql`
- Test: Manual — verify all roles can still read/write the correct data

- [ ] **Step 1: Inspect current overlapping policies**

Run in SQL Editor:
```sql
SELECT tablename, policyname, permissive, cmd, roles, qual
FROM pg_policies
WHERE tablename IN ('drawings', 'scope_items')
AND cmd = 'UPDATE'
ORDER BY tablename, policyname;
```

- [ ] **Step 2: Write migration to consolidate**

For `drawings`: merge "Client update drawings for approval" and "Update drawings" into a single policy that handles both cases.

For `scope_items`: merge "Client update scope items for approval" and "Update scope items" into a single policy.

```sql
-- ============================================================================
-- Migration 060: Consolidate overlapping RLS policies
-- Applied: [date]
-- Issue: Performance advisor flagged multiple permissive UPDATE policies
--        PostgreSQL evaluates ALL permissive policies (OR'd), wasting CPU
-- ============================================================================

-- Drawings: merge two UPDATE policies into one
DROP POLICY IF EXISTS "Client update drawings for approval" ON drawings;
DROP POLICY IF EXISTS "Update drawings" ON drawings;
CREATE POLICY "Update drawings" ON drawings
  FOR UPDATE USING (
    -- Assigned team members can update
    EXISTS (
      SELECT 1 FROM project_assignments pa
      JOIN scope_items si ON si.project_id = pa.project_id
      WHERE si.id = drawings.item_id
      AND pa.user_id = (SELECT auth.uid())
    )
  );

-- Scope items: merge two UPDATE policies into one
-- (Check actual policy conditions first before writing the merge)
```

**IMPORTANT:** Read the actual policy `qual` conditions in Step 1 before writing the merge. The above is a template — the actual conditions must preserve the same access semantics.

- [ ] **Step 3: Apply migration to Supabase**

Use the Supabase MCP `apply_migration` tool or run in SQL Editor.

- [ ] **Step 4: Test all roles**

Verify:
- Admin can update drawings and scope items
- PM can update drawings and scope items for assigned projects
- Client can update drawings (approval only) and scope items (approval only)
- Production can update scope items (production_percentage)

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/060_consolidate_rls_policies.sql
git commit -m "perf: consolidate overlapping RLS UPDATE policies on drawings + scope_items"
```

---

## Task 6: Dashboard Simplification (PR 4 — Only If Needed)

**Goal:** Reduce dashboard queries by passing shared context and collapsing redundant queries. Only execute this task if Tasks 1-4 don't stabilize the IO budget.

**Prerequisite:** Task 1 (shared context) must be complete.

**Files:**
- Modify: `src/lib/actions/dashboard.ts` — collapse related queries
- Modify: `src/app/(dashboard)/dashboard/page.tsx` — pass shared context
- Test: Manual — verify dashboard loads correctly for all roles

- [ ] **Step 1: Pass shared context to all dashboard helpers**

This should already be done in Task 1 Step 7. Verify that all dashboard helpers receive `ctx` and skip redundant `createClient()`.

- [ ] **Step 2: Merge related dashboard queries**

Several dashboard helpers query the same tables:
- `getFinancialOverview()` and `getProjectsByStatus()` both query `projects`
- `getMyTasks()` and `getDashboardMilestones()` both query `milestones`

Merge these into combined functions:

```typescript
async function getProjectsWithStatus(ctx: RequestContext) {
  const { data } = await ctx.supabase
    .from("projects")
    .select("id, status, name, project_code, currency, contract_value_manual, client_id")
    .eq("is_deleted", false);
  return data || [];
}

// Then derive both financial overview AND project-by-status from the same data
```

- [ ] **Step 3: Increase cache TTL for admin stats**

In `cache.ts`, increase TTL from 60s to 300s (5 minutes) for dashboard stats:

```typescript
const STATS_CACHE_TTL = 300;  // 5 minutes (was 60s)
```

Dashboard stats don't need to be real-time for admin users.

- [ ] **Step 4: Test all dashboard roles**

Verify: Admin, PM, Production, Procurement, Client, Management all see correct data.

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions/dashboard.ts src/app/\(dashboard\)/dashboard/ src/lib/cache.ts
git commit -m "perf: collapse dashboard queries and increase cache TTL"
```

---

## Success Metrics

After each task, measure:

| Metric | Before | After Task 1 | After Task 3 | After Task 4 | Target |
|--------|--------|-------------|-------------|-------------|--------|
| Dashboard queries (admin cold) | 27 | ~16 | ~16 | ~10 | <15 |
| Dashboard `createClient()` calls | 11 | 1 | 1 | 1 | 1 |
| Project page queries | 6 | 6 | 2 | 2 | 2 |
| Queries per mutation (revalidatePath) | 6 | 6 | 2 | 0 | 0 |
| IO Budget after 1hr normal use | <20% | >40% | >60% | >80% | >50% |

**How to measure:**
- Supabase Dashboard > Observability > Metrics (IO Budget %)
- Vercel function logs (query count per request)
- `console.log` profiling already in page.tsx
- `pg_stat_statements` for query frequency (after stats accumulate)

---

## Rollback Plan

Each task is independently reversible:
- **Task 1:** Remove `ctx` parameters, revert to `createClient()` in each function
- **Task 2:** No code changes, just documentation
- **Task 3:** Re-add server-side fetches to page.tsx Promise.all, remove self-fetch from tabs
- **Task 4:** Re-add `revalidatePath` calls, remove `invalidateQueries` from components
- **Task 5:** Re-create the original separate RLS policies (save the DROP'd policy definitions before merging)
- **Task 6:** Revert dashboard.ts and cache.ts changes
