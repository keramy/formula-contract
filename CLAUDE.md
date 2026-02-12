# Formula Contract - Project Intelligence

> **Last Updated:** February 12, 2026
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

### Progress Calculation
- Production items: `(production_percentage * 0.9) + (installation_started ? 5 : 0) + (installed ? 5 : 0)`
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
| Gantt Chart | Custom built (`components/gantt/`, 7 files) |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Deployment | Vercel |

---

## Project Structure (Top-Level)

```
src/
├── app/              # Next.js App Router — (auth)/, (dashboard)/, auth/callback
├── components/       # UI (shadcn), layout, projects, scope-items, drawings, materials, reports, gantt, dashboard, finance
├── lib/              # actions/ (server), supabase/ (client/server), react-query/, pdf/, activity-log/, notifications/
├── hooks/            # use-autosave, use-debounce, use-file-upload, use-media-query, use-toast
├── emails/           # React-email templates (welcome, assignment, milestone, report, drawing)
└── types/            # TypeScript definitions

supabase/migrations/  # Database migrations (001-046)
docs/                 # Extended documentation (see "Documentation Map" below)
```

---

## Database Schema

19 tables total. See `docs/DATABASE.md` for full field definitions.

**Core:** `users`, `clients`, `projects`, `scope_items`, `drawings`, `drawing_revisions`, `materials`, `reports`, `report_lines`, `project_timelines`, `timeline_dependencies`

**Supporting:** `project_assignments`, `item_materials`, `milestones`, `snagging`, `notifications`, `activity_log`, `drafts`, `report_shares`

### Key Enums
```
UserRole:         admin | pm | production | procurement | management | client
ProjectStatus:    tender | active | on_hold | completed | cancelled | not_awarded
ItemPath:         production | procurement
ItemStatus:       pending | in_design | awaiting_approval | approved | in_production | complete | on_hold | cancelled
DrawingStatus:    not_uploaded | uploaded | sent_to_client | approved | rejected | approved_with_comments
MaterialStatus:   pending | sent_to_client | approved | rejected
ProcurementStatus: pm_approval | not_ordered | ordered | received
Currency:         TRY | USD | EUR
GanttItemType:    phase | task | milestone
DependencyType:   0 (FS) | 1 (SS) | 2 (FF) | 3 (SF)
Priority:         1 (Low) | 2 (Normal) | 3 (High) | 4 (Critical)
```

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
- Requires drawing upload + client approval + material approval
- Tracks `production_percentage` (0-100%) and delivery states

**Procurement Path:**
```
PM_APPROVAL → NOT_ORDERED → ORDERED → RECEIVED
```
- PM approves for ordering, tracks order status, no drawing required

### Cost Tracking (IMPORTANT!)
- `initial_total_cost`: Baseline budget, set ONCE at creation, NEVER updated
- `unit_cost * quantity`: Current actual cost, can be updated anytime
- **Bug fix applied:** `scope-item-sheet.tsx` no longer recalculates `initial_total_cost` on save

### Drawing Approval Cycle
1. PM uploads drawing (revision A) → 2. PM sends to client → 3. Client approves/rejects → 4. If rejected: new revision (B) → 5. PM can override with documented reason (audit logged)

### Soft Deletes
All main entities use `is_deleted` flag. Always filter with `.eq("is_deleted", false)`.

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
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public  -- REQUIRED!
AS $$ ... $$;
```

### RLS Helper Functions
`get_user_role()`, `is_assigned_to_project(uuid)`, `is_client_for_project(uuid)`, `is_admin()`

---

## File Storage (Supabase Storage)

**CRITICAL:** All storage paths MUST start with `{project_id}/` as the first segment. Migration 040's `storage_project_id()` function extracts this UUID for RLS. Paths that don't follow this pattern will fail silently.

```
drawings/{project_id}/{item_id}/{revision}_drawing.pdf
materials/{project_id}/{material_id}/image_1.jpg
reports/{project_id}/{report_id}/photo_1.jpg
reports/{project_id}/{report_id}/{project_code}_{type}_{date}_{id}.pdf
scope-items/{project_id}/{item_id}/image_1.jpg
```

---

## Common Tasks

### Adding a New Scope Item Field
1. Add migration: `supabase/migrations/XXX_add_field.sql`
2. Update types: `src/types/database.ts`
3. Update form: `src/components/scope-items/scope-item-sheet.tsx`
4. Update display: relevant table/detail components

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
14. **Adjacent panel alignment** - Both header wrappers must set explicit `height` + `box-border`
15. **Storage paths MUST start with `{projectId}/`** - Migration 040 enforces this via RLS
16. **Use `useBreakpoint()` not `useIsMobile()`** - Old hook deprecated, use `use-media-query.ts`
17. **Mobile card views need role guards** - Cards need explicit `{!isClient && ...}` checks

### Git on Windows
- CRLF warnings are normal (`LF will be replaced by CRLF`) - safe to ignore
- Always use `-u` flag on first push: `git push -u origin branch-name`

---

## Testing Checklist

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

```bash
npm run version:patch   # 1.0.0 → 1.0.1 (bug fixes)
npm run version:minor   # 1.0.0 → 1.1.0 (new features)
npm run version:major   # 1.0.0 → 2.0.0 (breaking changes)
```

---

## Current Status (Feb 2026)

### In Progress
- Gantt chart UI polish (migration 045 applied, data is live)
- Mobile optimization (responsive data views done, remaining: role guards, Gantt tablet, E2E testing)

### Planned
- Global capacity view (cross-project phase workload overview)
- Command menu (Cmd+K)
- PDF Executive Summary generation

### Known Issues
- `ExportButton` removed from scope items — Excel export via separate button
- `totalInitialCost` display removed from scope items summary bar

**Full changelog:** See [docs/CHANGELOG.md](./docs/CHANGELOG.md)

---

## Documentation Map

| Document | Contents |
|----------|----------|
| **[docs/PATTERNS.md](./docs/PATTERNS.md)** | Code patterns (server actions, React Query, forms, sheets, currency, Recharts, responsive views, Gantt architecture, Supabase queries) |
| **[docs/LESSONS_LEARNED.md](./docs/LESSONS_LEARNED.md)** | Wrong vs correct approach tables for PDF, Gantt, Storage, Mobile, Icons, Code Review |
| **[docs/DESIGN-HANDBOOK.md](./docs/DESIGN-HANDBOOK.md)** | Design principles, color system, typography, spacing, component patterns, code tokens |
| **[docs/DATABASE.md](./docs/DATABASE.md)** | Full database schema, field definitions, migrations |
| **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** | Technical architecture decisions |
| **[docs/CHANGELOG.md](./docs/CHANGELOG.md)** | Completed features list |
| **[docs/ROADMAP.md](./docs/ROADMAP.md)** | Future plans |
| **[docs/TESTING-GUIDE.md](./docs/TESTING-GUIDE.md)** | Testing strategy and guides |

---

###
Before starting any task, read AGENTS.md for the latest context from other agents.
After completing any task, update AGENTS.md with:
- What you did
- Which files you changed
- Any warnings or issues for the next agent
- What should be done next
