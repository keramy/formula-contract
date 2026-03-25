# Formula Contract - Project Intelligence

> **Last Updated:** March 13, 2026
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
├── hooks/            # use-debounce, use-media-query
├── emails/           # React-email templates (welcome, assignment, milestone, report, drawing)
└── types/            # TypeScript definitions

supabase/migrations/  # Database migrations (001-046)
docs/                 # Extended documentation (see "Documentation Map" below)
```

---

## Database Schema

25 tables total. See `docs/DATABASE.md` for full field definitions.

**Core:** `users`, `clients`, `projects`, `scope_items`, `drawings`, `drawing_revisions`, `materials`, `reports`, `report_lines`, `project_timelines`, `timeline_dependencies`

**Supporting:** `project_assignments`, `item_materials`, `milestones`, `snagging`, `notifications`, `activity_log`, `drafts`, `report_shares`

**CRM (Sales):** `crm_brands`, `crm_architecture_firms`, `crm_contacts`, `crm_opportunities`, `crm_activities`, `crm_brand_firm_links`

### Admin Views (for Supabase Studio browsing)
Instead of browsing raw tables with UUID foreign keys, use these `v_*` views to see human-readable project/item context:

| View | Shows | Key Columns |
|------|-------|-------------|
| `v_scope_items` | Scope items + project/client | `project_code`, `project_name`, `client_name`, `item_code` |
| `v_drawings` | Drawings + project/item | `project_code`, `item_code`, `item_name`, `revision_count` |
| `v_materials` | Materials + project | `project_code`, `material_code`, `linked_items` |
| `v_milestones` | Milestones + project | `project_code`, `milestone_code`, `due_date` |
| `v_snagging` | Snagging + project/item/user | `project_code`, `item_code`, `created_by_name` |
| `v_reports` | Reports + project/creator | `project_code`, `report_code`, `created_by_name` |
| `v_notifications` | Notifications + user/project | `employee_code`, `project_code`, `message_preview` |
| `v_activity_logs` | Activity + user/project | `employee_code`, `project_code`, `action` |
| `v_project_assignments` | Assignments + names | `project_code`, `employee_code`, `user_role` |
| `v_clients` | Clients + project count | `client_code`, `company_name`, `project_count` |
| `v_users` | Users + assignment count | `employee_code`, `role`, `assigned_projects` |
| `v_crm_brands` | Brands + opportunity/activity counts | `brand_code`, `name`, `tier`, `opportunity_count` |
| `v_crm_opportunities` | Opportunities + brand/firm/user names | `opportunity_code`, `brand_name`, `firm_name`, `stage` |
| `v_crm_activities` | Activities + all relation names | `activity_type`, `brand_name`, `firm_name`, `contact_name` |

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
    **Admin views migration 047 applied** - `047_admin_views_scope_drawings_materials.sql` has been run on Supabase
    **PM assignment RLS fix migration 048** - `048_fix_pm_assignment_privilege_escalation.sql` — PMs can only manage assignments for projects they're already assigned to
    **CRM module migration 049 applied** - `049_crm_module.sql` — 6 tables, sequences, auto-code triggers, RLS, indexes, 3 admin views
    **CRM seed data migration 050 applied** - `050_crm_seed_data.sql` — 37 brands, 12 firms, 18 links, 5 opportunities
14. **Adjacent panel alignment** - Both header wrappers must set explicit `height` + `box-border`
15. **Storage paths MUST start with `{projectId}/`** - Migration 040 enforces this via RLS
16. **Use `useBreakpoint()` not `useIsMobile()`** - Old hook deprecated, use `use-media-query.ts`
17. **Mobile card views need role guards** - Cards need explicit `{!isClient && ...}` checks
18. **Views need `security_invoker`** - Always use `DROP VIEW + CREATE VIEW WITH (security_invoker = true)`, not `CREATE OR REPLACE VIEW` (defaults to SECURITY DEFINER, bypasses RLS)
19. **Browse `v_*` views, not raw tables** - In Supabase Studio, use `v_scope_items` instead of `scope_items` to see `project_code`/`project_name` next to each record
20. **PM override uses server action** - `overrideDrawingApproval()` in `lib/actions/drawings.ts` enforces reason validation server-side; never bypass with inline Supabase calls
27. **CRM auto-code inserts need `as any`** - `brand_code`, `firm_code`, `contact_code`, `opportunity_code` are NOT NULL without DEFAULT (trigger fills them), so TypeScript types require them on insert. Use `as any` on the insert payload.
28. **CRM form types use `z.input<>` not `z.infer<>`** - When a Zod schema uses `.default()`, `z.infer` marks the field as required (output) but `zodResolver` works with the input type where defaults are optional. All CRM `FormData` types use `z.input<typeof schema>`.
29. **CRM access roles** - admin = read/write, management = read-only, others (including pm) = no access. Server actions use `requireCrmAccess(["admin"])` for writes, default `["admin", "management"]` for reads.
30. **Supabase email templates must use `token_hash` not `ConfirmationURL`** - Custom SMTP (Resend) email templates must link to `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`. Never use `{{ .ConfirmationURL }}` — it routes through Supabase's `/verify` which uses hash fragments that server-side handlers can't read.
31. **Auth callback handles both `code` and `token_hash`** - `/auth/callback/route.ts` supports PKCE code exchange AND token_hash OTP verification. `/auth/confirm/route.ts` is a secondary handler for the confirm path.

### React Code Health (React Doctor score: 92/100)
21. **Never define components inside other components** - Nested components get recreated every render, destroying state and killing performance. Extract to module scope or a separate file with explicit props.
22. **`next/image fill` always needs `sizes`** - Without `sizes`, Next.js serves the full-resolution image. Match `sizes` to the container: `sizes="64px"` for `size-16`, `sizes="96px"` for `size-24`, etc.
23. **Don't mix named + default exports** - Use `export function Foo()` only. Don't also add `export default Foo` in the same file.
24. **Default prop `[]` needs module constant** - `items = []` in destructuring creates a new array reference each render. Extract: `const EMPTY_ITEMS: Type[] = []` at module scope.
25. **Interactive divs need a11y attrs** - Add `role="button"`, `tabIndex={0}`, `onKeyDown` to any `<div>` with `onClick`.
26. **Deleted shadcn components can be re-added** - Run `npx shadcn@latest add <name>` to restore any removed component (accordion, drawer, form, etc.)

### Security Testing
- Shannon AI pentester targets `http://host.docker.internal:3000` — run `npm run dev` first
- Pentest artifacts go in `shannon_auditfiles/` — excluded from tsconfig, do NOT commit
- After fixing pentest findings: create migration + server action (never UI-only validation for security)

### Payments Module
32. **Payments routes are `/payments/*` not `/finance/*`** — Old `/finance` page (project budgets) preserved separately at `finance-budget.ts`
33. **Whitelist access, not role-based** — `finance_access` table controls who sees the module. `has_finance_access()` SQL function for RLS. Admin manages whitelist at `/payments/access`
34. **`@ts-nocheck` on `finance.ts`** — Remove after applying migrations and running `npx supabase gen types typescript`
35. **`users` table uses `is_active` not `is_deleted`** — Other tables use `is_deleted` but users table is different
36. **Native `<select>` in Dialogs** — Radix Select dropdown doesn't work inside Dialog (z-index portal issue). Use native HTML `<select>` instead
37. **IBAN validation Turkish only** — 26 chars starting with TR, auto-strips spaces. In `supplierSchema` Zod validation
38. **Invoice `total_amount` is VAT-exclusive** — `vat_rate` and `vat_amount` stored separately. VAT calculated on form, saved on creation
39. **Installment percentages are UI-only** — DB stores real amounts. Conversion happens in `onSubmit` before server action call
40. **`exceljs` for Excel export** — Server-side generation, base64 transfer to client, download via temporary `<a>` tag
41. **Migrations 052-055 applied** — `052_finance_module.sql` (8 tables), `053_finance_installments.sql`, `054_finance_vat.sql`, `055_finance_project_link.sql`

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

## Current Status (Mar 2026)

### Recently Completed
- Payments Module (Mar 17-23, 2026): Full AP/AR payment tracking under `/payments`. 8 DB tables (migrations 052-055), whitelist-based access. Invoices with VAT/installments/project linking/approval, receivables, suppliers with real-time IBAN validation. Notification system: 3 methods (auto weekly digest via pg_cron, manual summary with timeframe picker, urgent multi-select notify) — all with PDF attachment via Resend. Excel export (3 types). Preview drawer with documents. Simplified status badges with hover tooltips (Ready to Pay, Needs Approval, etc.). Paperclip indicator for document attachments. Spreadsheet-style tables. 698 tests (128 validation + 61 server action). React Doctor 100/100.
- Password Reset Flow Fix (Mar 13, 2026): Configured Resend as custom SMTP for Supabase Auth emails. Fixed password reset flow by using `token_hash` pattern in email templates instead of `{{ .ConfirmationURL }}`. Added `/auth/confirm/route.ts` server-side handler. Branded email template matching existing design system.
- CRM Module (Feb 27, 2026): Full sales CRM — 6 tables, 37 brands, 12 firms, pipeline kanban, contacts, activities timeline. Routes: `/crm/*` for admin/pm/management.
- React Doctor code health audit: score improved from 76 → 92 → 100/100
- CRM UI Polish (Mar 2, 2026): Migrated all 6 CRM pages to `usePageHeader()` AppHeader pattern, replaced `<Loader2Icon>` spinners with `<Skeleton>` loading states, added timeline dots, polished kanban cards/columns, improved detail page typography with `GradientIcon` section headers. 9 files modified, zero new files.

### In Progress
- Gantt chart UI polish (migration 045 applied, data is live)
- Mobile optimization (responsive data views done, Gantt tablet enabled, remaining: full E2E testing)

### Planned
- Payments: sequential multi-step approval (plan in memory, deferred)
- Global capacity view (cross-project phase workload overview)
- Command menu (Cmd+K)
- PDF Executive Summary generation

### Known Issues
- `shannon_auditfiles/` excluded from tsconfig.json — contains pentest artifacts with TS errors (intentional)

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
