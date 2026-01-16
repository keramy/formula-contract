# Formula Contract - Master Development Plan

## Last Updated: January 17, 2026

---

# Current Status

| Area | Status | Notes |
|------|--------|-------|
| **Supabase Plan** | Pro | Upgraded Jan 17, 2026 |
| **Region** | Mumbai (ap-south-1) | EU migration planned |
| **Database Security** | Hardened | All advisor issues fixed |
| **Code Architecture** | Refactored | Server actions consolidated |
| **Testing** | Setup complete | Playwright + CI configured |

---

# COMPLETED FEATURES

## Core Application Features

| Feature | Status | Key Files |
|---------|--------|-----------|
| Reports Module (Full CRUD) | Done | `lib/actions/reports.ts` |
| Reports Table (Excel-style) | Done | `reports-table.tsx` |
| Report Sharing (User Picker) | Done | `report_shares` table |
| PDF Export (Turkish fonts) | Done | `report-pdf-export.tsx` |
| Mark as Installed | Done | `installation-status-editor.tsx` |
| Procurement Status | Done | `procurement-status-editor.tsx` |
| Dashboard UI | Done | Glassmorphism design |
| User Management | Done | Temp password flow |
| Role-Based Access | Done | Middleware + sidebar |
| Client Permissions | Done | View-only + approvals |
| Team Assignment | Done | `team-overview.tsx` |
| Force Password Change | Done | First login redirect |
| Profile Settings | Done | `/profile` page |
| Notifications | Done | Bell icon + dropdown |
| Activity Log | Done | Audit trail |

## Database Security (Jan 17, 2026)

| Migration | Purpose | Status |
|-----------|---------|--------|
| `003_fix_function_search_paths.sql` | Secured 5 functions with search_path | Done |
| `004_fix_rls_init_plan.sql` | Optimized 3 RLS policies | Done |
| `005_add_fk_indexes.sql` | Added 15 FK indexes | Done |
| `006_consolidate_rls_policies.sql` | Split 10 FOR ALL policies | Done |
| `007_fix_remaining_advisor_issues.sql` | Fixed remaining issues | Done |

## Code Architecture (Jan 16-17, 2026)

| Task | Status |
|------|--------|
| Server actions → `src/lib/actions/` | Done |
| React Query hooks for materials | Done |
| React Query hooks for scope-items | Done |
| Caching utilities | Done |
| Performance profiling | Done |
| Dashboard skeleton loading | Done |
| Playwright e2e tests setup | Done |
| GitHub Actions CI workflow | Done |

## Supabase Advisor Status

| Category | Issues | Status |
|----------|--------|--------|
| Function Search Path | 0 | Fixed |
| Auth RLS InitPlan | 0 | Fixed |
| Multiple Permissive Policies | 0 | Fixed |
| Unindexed FKs | 0 | Fixed |
| Security Definer Views | 8 | False positive (ignore) |
| Activity Log INSERT | 1 | Intentional |
| Unused Indexes | 37 | Expected (new app) |

---

# FUTURE DEVELOPMENT

## HIGH PRIORITY

### 1. Region Migration (EU)
- [ ] Create new project in Frankfurt (eu-central-1)
- [ ] Run all migrations
- [ ] Update environment variables
- [ ] Pause Mumbai project
- **Cost:** $10/month during transition

### 2. Testing & QA
- [ ] Run e2e tests for all features
- [ ] Mobile responsiveness review
- [ ] Lighthouse performance audit
- [ ] Accessibility check (WCAG)

### 3. Bug Fixes & Polish
- [ ] Review console errors
- [ ] Form validation edge cases
- [ ] Loading states consistency

## MEDIUM PRIORITY

### 4. Snagging Module
- [ ] Create snagging list UI
- [ ] Photo upload for issues
- [ ] Resolution tracking

### 5. React Query Expansion
- [ ] `src/lib/react-query/drawings.ts`
- [ ] `src/lib/react-query/projects.ts`
- [ ] `src/lib/react-query/users.ts`

### 6. Component Refactoring
- [ ] Split `report-edit-modal.tsx` (910 lines)
- [ ] Split `report-creation-modal.tsx` (874 lines)
- [ ] Split `scope-items-table.tsx` (665 lines)

## LOW PRIORITY

### 7. Documentation
- [ ] Update README
- [ ] API documentation
- [ ] User guide for clients

### 8. Analytics
- [ ] Dashboard charts (Recharts)
- [ ] Progress visualizations
- [ ] Export functionality

---

# TECH STACK

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) |
| React | 19 with Server Actions |
| Database | Supabase Pro (PostgreSQL + Auth + Storage) |
| UI | shadcn/ui + Tailwind CSS v4 |
| State | React Query + Zustand |
| Forms | React Hook Form + Zod |
| Testing | Playwright + Lighthouse |
| CI/CD | GitHub Actions |
| Email | Resend |
| Excel | SheetJS (xlsx) |
| PDF | jsPDF |

---

# FILE STRUCTURE

```
src/
├── app/
│   ├── (auth)/           # Login, password reset
│   └── (dashboard)/      # Protected routes
├── components/
│   ├── ui/               # shadcn components
│   ├── materials/        # Material components
│   ├── reports/          # Report components
│   └── scope-items/      # Scope item components
├── lib/
│   ├── actions/          # Server actions (consolidated)
│   ├── react-query/      # Query hooks
│   ├── supabase/         # Supabase clients
│   ├── cache.ts          # Caching utilities
│   └── profiling.ts      # Performance profiling
└── types/                # TypeScript types

supabase/
├── migrations/           # 7 migration files
└── schema.sql            # Base schema reference

e2e/                      # Playwright tests
.github/workflows/        # CI configuration
```

---

# ENVIRONMENT VARIABLES

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://dovxdlrltkefqhkascoa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Email
RESEND_API_KEY=re_xxx
```

---

# GIT WORKFLOW

```bash
# Current branch
master

# Remote
origin: https://github.com/keramy/formula-contract.git

# Latest commit (Jan 17, 2026)
e0e1fd7: feat: Major refactoring + Supabase security/performance fixes
```

---

# NOTES

- All Supabase advisor security/performance issues resolved
- Server actions centralized in `src/lib/actions/`
- React Query hooks available for materials and scope-items
- E2E testing configured but tests need to be run
- Region migration to EU postponed (can do anytime)
