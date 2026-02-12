# Code Patterns & Architecture Reference

> **Last Updated:** February 12, 2026
> **Purpose:** Detailed code patterns, component architecture, and query examples used throughout Formula Contract.
> **See also:** [CLAUDE.md](../CLAUDE.md) for critical rules and gotchas.

---

## Server Actions (Mutations)

All mutations use Next.js Server Actions. Never mutate from client components.

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

---

## React Query Integration

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

---

## Form Pattern

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

---

## Sheet Pattern (Quick Edit)

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

## Currency Formatting Pattern

```typescript
// Always use manual symbols for consistent display
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

---

## Recharts Data Types

```typescript
// Recharts Pie/Bar components require index signature on data objects
interface ChartDataItem {
  name: string;
  value: number;
  fill?: string;
  [key: string]: string | number | undefined; // Required for Recharts
}
```

---

## Drawing Send Workflow

Drawings follow a controlled visibility pattern — clients only see drawings that have been explicitly "sent" by the PM:

```
PM uploads drawing → status: "uploaded" (invisible to client)
PM sends to client → status: "sent_to_client" (visible to client)
Client reviews → status: "approved" | "rejected" | "approved_with_comments"
```

**Server Action:** `src/lib/actions/drawings.ts` — `sendDrawingsToClient(projectId, drawingIds[])` handles both single and bulk sends. It updates drawing status, scope item status, creates in-app notifications, sends email via Resend batch API, and logs activity.

**Client Filtering:** `drawings-overview.tsx` filters `visibleItems` for clients — only shows `sent_to_client`, `approved`, `approved_with_comments`, `rejected` statuses.

**PM Badge:** Drawings tab shows amber badge with count of `uploaded` (unsent) drawings.

---

## Responsive Data View Pattern

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

---

## Mobile Tab Navigation Pattern

Project detail tabs use bottom-sheet navigation on mobile:

```typescript
// Mobile: Sheet (side="bottom") with full tab list as buttons
// Desktop: TabsList with overflow into DropdownMenu
```

**Key decisions:**
- Mobile tabs open a full bottom sheet (not horizontal scroll)
- Desktop shows first 3 tabs inline, rest in "More" dropdown
- Tab badges (counts) are rendered consistently via `getBadgeText()` helper

---

## Compact Button Pattern

Action buttons accept a `compact` prop for mobile density:

```typescript
// Components: ScopeItemAddButton, ExcelImport, ExcelExport, DownloadTemplateButton
<ScopeItemAddButton compact={isMobile} />
// compact=true → size="sm" + smaller text
// compact=false → default size
```

---

## Gantt Chart Architecture

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
