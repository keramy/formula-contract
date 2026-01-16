# Formula Contract - Refactoring & Optimization Plan

> **Last Updated**: January 16, 2026
> **Architecture Score**: 7.5/10 → Target: 9/10
> **Total LOC**: 32,618 across 181 files

---

## Quick Reference

| Priority | Symbol | Meaning |
|----------|--------|---------|
| Critical | 🔴 | Security/Breaking issues |
| High | 🟠 | Major improvements |
| Medium | 🟡 | Code quality |
| Low | 🟢 | Nice to have |

---

# Phase 0: Performance Optimization ✅

## Caching & Database

- [x] Fix `cookies() inside unstable_cache()` error
- [x] Create `createServiceRoleClient()` for cached queries
- [x] Implement `getCachedDashboardStats()` with 60s TTL
- [x] Implement `getCachedRecentProjects()` with 60s TTL
- [x] Implement `getCachedProjectDetail()` with 30s TTL
- [x] Add performance profiling utilities (`src/lib/profiling.ts`)
- [x] Add dashboard skeleton loading state

## Infrastructure (Pending User Action)

- [ ] 🟠 Upgrade to Supabase Pro tier ($25/month)
  - Eliminates cold starts
  - Dedicated PgBouncer connection pooling
  - Never pauses project
- [ ] 🟡 Switch to dedicated pooler connection string (after Pro upgrade)
- [ ] 🟢 Consider read replicas for multi-region (future)

---

# Phase 1: Security Fixes 🔴 CRITICAL

> **Timeline**: 3-4 days
> **Priority**: Must complete before production
> **Status**: ✅ COMPLETED (January 16, 2026)

## Client-Side Supabase Calls → Server Actions

These files were making direct Supabase calls from client components, bypassing security layers:

### 1.1 Materials Module ✅

- [x] 🔴 `src/lib/actions/materials.ts` (NEW - 587 lines)
  - Created comprehensive server actions module
  - `createMaterial()` - with sanitization & activity logging
  - `updateMaterial()` - with assignment updates
  - `deleteMaterial()` - soft delete with logging
  - `updateItemMaterialAssignments()` - bulk assignment updates
  - `removeItemMaterial()` - single assignment removal
  - `bulkImportMaterials()` - Excel import with upsert logic
  - `updateMaterialStatus()` - status updates
  - `uploadMaterialImages()` - image upload to storage

- [x] 🔴 `src/components/materials/item-materials-section.tsx` (311 lines)
  - Now uses server actions from `@/lib/actions/materials`
  - Uses `useTransition` for pending states
  - Added toast notifications for feedback

- [x] 🔴 `src/components/materials/material-form-dialog.tsx` (345 lines)
  - Uses `createMaterial()` and `updateMaterial()` server actions
  - Image upload still client-side (required for file picker)
  - Added `projectId` prop for activity logging

- [x] 🔴 `src/components/materials/materials-excel-import.tsx` (232 lines)
  - Uses `bulkImportMaterials()` server action
  - Uses `useTransition` for pending states

### 1.2 Scope Items Module ✅

- [x] 🔴 `src/lib/actions/scope-items.ts` (NEW - 366 lines)
  - Created comprehensive server actions module
  - `bulkUpdateScopeItems()` - bulk field updates with validation
  - `bulkAssignMaterials()` - bulk material assignments
  - `updateScopeItemField()` - single field update
  - `updateProductionPercentage()` - percentage validation
  - `updateInstallationStatus()` - with timestamp handling
  - `deleteScopeItem()` - soft delete with logging

- [x] 🔴 `src/app/(dashboard)/projects/[id]/scope-items-table.tsx` (650 lines)
  - Removed direct `createClient()` calls
  - Uses `bulkUpdateScopeItems()` server action
  - Uses `bulkAssignMaterials()` server action
  - Uses `useTransition` for pending states
  - Added toast notifications for feedback

### 1.3 React Query Hooks ✅

- [x] 🟡 `src/lib/react-query/materials.ts` (NEW - 320 lines)
  - Query hooks: `useMaterials(projectId)`, `useMaterial(materialId)`
  - Mutation hooks with optimistic updates:
    - `useCreateMaterial()` - create with toast feedback
    - `useUpdateMaterial()` - optimistic update + rollback
    - `useDeleteMaterial()` - optimistic removal
    - `useUpdateMaterialStatus()` - status changes
    - `useUpdateItemMaterialAssignments()` - assignment updates
    - `useRemoveItemMaterial()` - single removal
    - `useBulkImportMaterials()` - Excel import

- [x] 🟡 `src/lib/react-query/scope-items.ts` (NEW - 310 lines)
  - Query hooks: `useScopeItems(projectId)`, `useScopeItem(itemId)`
  - Mutation hooks with optimistic updates:
    - `useBulkUpdateScopeItems()` - bulk field updates
    - `useBulkAssignMaterials()` - bulk material assignments
    - `useUpdateScopeItemField()` - single field update
    - `useUpdateProductionPercentage()` - 0-100 validation
    - `useUpdateInstallationStatus()` - with timestamp
    - `useDeleteScopeItem()` - soft delete

- [x] 🟢 `src/lib/react-query/index.ts` (NEW)
  - Central exports for all React Query hooks
  - Clean import API: `import { useMaterials } from '@/lib/react-query'`

- [ ] 🟢 Create `src/lib/react-query/drawings.ts`
  - `useDrawings(projectId)`
  - `useDrawingMutations()`

---

# Phase 2: Code Organization 🟠 ✅ COMPLETED

> **Timeline**: 3-4 days → Completed January 16, 2026
> **Priority**: High - improves maintainability

## 2.1 Consolidate Server Actions ✅

All server actions have been consolidated into `src/lib/actions/`:

### Final Structure
```
src/lib/actions/
├── index.ts              # Central exports (NEW)
├── auth.ts               # Authentication actions (MOVED)
├── users.ts              # User management actions (MOVED)
├── project-assignments.ts # Team assignment actions (MOVED)
├── reports.ts            # All report operations (MOVED & CONSOLIDATED)
├── materials.ts          # Material CRUD + queries (Phase 1)
├── scope-items.ts        # Scope item operations (Phase 1)
└── (notifications & activity-log remain in lib subdirectories)
```

### Files Deleted (Old Locations)
- ~~`src/app/(auth)/actions.ts`~~ → `lib/actions/auth.ts`
- ~~`src/app/(dashboard)/users/actions.ts`~~ → `lib/actions/users.ts`
- ~~`src/app/(dashboard)/projects/[id]/actions.ts`~~ → `lib/actions/project-assignments.ts`
- ~~`src/app/(dashboard)/projects/[id]/reports/actions.ts`~~ → `lib/actions/reports.ts`

### Import Updates
All 14 files updated to use new centralized import paths:
- Auth pages: 4 files
- User management: 2 files
- Project pages: 8 files

### Tasks

- [ ] 🟠 Create `src/lib/actions/` directory structure
- [ ] 🟠 Move `src/app/(auth)/actions.ts` → `src/lib/actions/auth.ts`
- [ ] 🟠 Move `src/app/(dashboard)/users/actions.ts` → `src/lib/actions/users.ts`
- [ ] 🟠 Move `src/app/(dashboard)/projects/[id]/actions.ts` → `src/lib/actions/projects.ts`
- [ ] 🟠 Split `reports/actions.ts` (617 lines) into:
  - [ ] `src/lib/actions/reports.ts` (~200 lines) - CRUD operations
  - [ ] `src/lib/actions/report-lines.ts` (~150 lines) - Line operations
  - [ ] `src/lib/actions/report-sharing.ts` (~100 lines) - Sharing logic
  - [ ] `src/lib/actions/report-uploads.ts` (~100 lines) - File handling
- [ ] 🟠 Update all imports across the codebase

## 2.2 Create Utility Files

- [ ] 🟠 Create `src/lib/auth-utils.ts`
  ```typescript
  export async function getAuthenticatedUser()
  export async function requireAuth()
  export async function requireRole(allowedRoles: string[])
  ```
  - Simplifies 38 occurrences of auth pattern

- [ ] 🟡 Create `src/lib/constants.ts`
  ```typescript
  export const STATUS_COLORS = { ... }
  export const REPORT_TYPE_COLORS = { ... }
  export const PROJECT_STATUS_CONFIG = { ... }
  ```
  - Centralizes color/status mappings from multiple files

- [ ] 🟡 Create `src/components/layout/` directory
  - [ ] Move `app-sidebar.tsx` → `components/layout/app-sidebar.tsx`
  - [ ] Move `user-menu.tsx` → `components/layout/user-menu.tsx`

## 2.3 Expand React Query Structure

```
src/lib/react-query/
├── provider.tsx         # Existing
├── notifications.ts     # Existing
├── projects.ts          # NEW
├── materials.ts         # NEW
├── drawings.ts          # NEW
├── scope-items.ts       # NEW
├── reports.ts           # NEW
├── users.ts             # NEW
└── clients.ts           # NEW
```

- [ ] 🟠 Create `src/lib/react-query/projects.ts`
- [ ] 🟠 Create `src/lib/react-query/reports.ts`
- [ ] 🟡 Create `src/lib/react-query/users.ts`
- [ ] 🟡 Create `src/lib/react-query/clients.ts`

---

# Phase 3: Component Refactoring 🟠

> **Timeline**: 4-5 days
> **Priority**: High - improves maintainability and testability

## 3.1 Split Large Modal Components

### `report-edit-modal.tsx` (910 lines → ~150 lines)

- [ ] 🟠 Create `src/app/(dashboard)/projects/[id]/reports/modals/`
- [ ] 🟠 Extract `ReportMetadataForm.tsx` (~100 lines)
- [ ] 🟠 Extract `ReportLinesEditor.tsx` (~200 lines)
- [ ] 🟠 Extract `ReportSharingSection.tsx` (~100 lines)
- [ ] 🟠 Create `useReportEditing.ts` hook (~150 lines)
- [ ] 🟠 Refactor `ReportEditModal.tsx` as container (~150 lines)

### `report-creation-modal.tsx` (874 lines → ~150 lines)

- [ ] 🟠 Extract `ReportTypeSelector.tsx` (~80 lines)
- [ ] 🟠 Extract `ReportLineForm.tsx` (~150 lines)
- [ ] 🟠 Reuse components from report-edit-modal
- [ ] 🟠 Refactor `ReportCreationModal.tsx` as container (~150 lines)

## 3.2 Split Large Table Components

### `scope-items-table.tsx` (665 lines → ~300 lines)

- [ ] 🟠 Create `src/app/(dashboard)/projects/[id]/scope-items/`
- [ ] 🟠 Extract `ScopeItemRowEditor.tsx` (~150 lines) - inline editing
- [ ] 🟠 Extract `ScopeItemContextMenu.tsx` (~80 lines) - actions menu
- [ ] 🟠 Create `useScopeItemMutations.ts` hook (~100 lines)
- [ ] 🟠 Refactor `ScopeItemsTable.tsx` for display only (~300 lines)

## 3.3 Split Large Page Components

### `projects/[id]/page.tsx` (617 lines → ~200 lines)

- [ ] 🟡 Extract `ProjectOverviewSection.tsx`
- [ ] 🟡 Extract `ProjectTabsContainer.tsx`
- [ ] 🟡 Create `useProjectData.ts` hook for data fetching
- [ ] 🟡 Refactor main page as composition container

---

# Phase 4: Code Quality Improvements 🟡

> **Timeline**: 2-3 days
> **Priority**: Medium - improves developer experience

## 4.1 Form Handling

- [ ] 🟡 Create `src/hooks/useFormSubmit.ts`
  ```typescript
  export function useFormSubmit<T>(
    submitFn: (data: T) => Promise<void>,
    options?: { onSuccess?: () => void; onError?: (error: Error) => void }
  )
  ```
  - Reduces boilerplate in 5+ form components

- [ ] 🟡 Add Zod schema validation
  - Install: `npm install zod`
  - Create `src/lib/validations/schemas.ts`
  - Add schemas for: Project, Client, User, ScopeItem, Material, Report

## 4.2 Error Handling

- [ ] 🟡 Create `src/lib/errors.ts`
  ```typescript
  export class AuthenticationError extends Error
  export class AuthorizationError extends Error
  export class ValidationError extends Error
  export function handleActionError(error: unknown)
  ```

- [ ] 🟡 Create `src/components/error-boundary.tsx`
- [ ] 🟡 Add error boundaries to major page sections

## 4.3 Loading States

- [ ] 🟢 Create consistent skeleton components
- [ ] 🟢 Add Suspense boundaries for lazy-loaded components
- [ ] 🟢 Implement optimistic updates in React Query mutations

---

# Phase 5: Excel Component Consolidation 🟢

> **Timeline**: 1-2 days
> **Priority**: Low - reduces duplication

## Current Excel Components (Duplicated Patterns)

```
src/components/scope-items/excel-export.tsx
src/components/scope-items/excel-import.tsx (428 lines)
src/components/scope-items/download-template-button.tsx
src/components/materials/materials-excel-export.tsx
src/components/materials/materials-excel-import.tsx (272 lines)
```

## Target Structure

- [ ] 🟢 Create `src/components/excel/`
- [ ] 🟢 Create `BaseExcelImporter.tsx` - reusable import logic
- [ ] 🟢 Create `BaseExcelExporter.tsx` - reusable export logic
- [ ] 🟢 Create `DownloadTemplateButton.tsx` - shared component
- [ ] 🟢 Refactor scope-items Excel to use base components
- [ ] 🟢 Refactor materials Excel to use base components

---

# Phase 6: Testing & Documentation 🟢

> **Timeline**: Ongoing
> **Priority**: Low - quality assurance

## Testing

- [ ] 🟢 Add unit tests for server actions
- [ ] 🟢 Add integration tests for critical flows
- [ ] 🟢 Add E2E tests with Playwright (setup exists)
- [ ] 🟢 Run Lighthouse audits after each phase

## Documentation

- [ ] 🟢 Update README with architecture overview
- [ ] 🟢 Document server action patterns
- [ ] 🟢 Document React Query usage patterns
- [ ] 🟢 Add JSDoc comments to utility functions

---

# Progress Tracking

## Completed Tasks

| Date | Task | Phase |
|------|------|-------|
| 2026-01-16 | Fixed `cookies()` inside `unstable_cache()` error | Phase 0 |
| 2026-01-16 | Created `createServiceRoleClient()` | Phase 0 |
| 2026-01-16 | Implemented dashboard caching | Phase 0 |
| 2026-01-16 | Added performance profiling utilities | Phase 0 |
| 2026-01-16 | Created this refactoring plan | - |

## Current Sprint

| Task | Status | Assigned |
|------|--------|----------|
| Upgrade to Supabase Pro | ⏳ Pending User | - |
| Move materials to server actions | 📋 Planned | - |
| Move scope-items to server actions | 📋 Planned | - |

---

# Files to Modify Summary

## High Priority (Security)

| File | Lines | Action |
|------|-------|--------|
| `src/components/materials/item-materials-section.tsx` | 311 | Move queries to server actions |
| `src/components/materials/material-form-dialog.tsx` | 384 | Move mutations to server actions |
| `src/components/materials/materials-excel-import.tsx` | 272 | Move bulk ops to server actions |
| `src/app/(dashboard)/projects/[id]/scope-items-table.tsx` | 665 | Extract mutations to server actions |

## High Priority (Organization)

| File | Lines | Action |
|------|-------|--------|
| `src/app/(dashboard)/projects/[id]/reports/actions.ts` | 617 | Split into 4 files |
| `src/app/(dashboard)/projects/[id]/report-edit-modal.tsx` | 910 | Split into 5 components |
| `src/app/(dashboard)/projects/[id]/report-creation-modal.tsx` | 874 | Split into 3 components |
| `src/app/(dashboard)/projects/[id]/page.tsx` | 617 | Extract sections |

## New Files to Create

| File | Purpose |
|------|---------|
| `src/lib/actions/*.ts` | Consolidated server actions |
| `src/lib/auth-utils.ts` | Auth helper functions |
| `src/lib/constants.ts` | Centralized constants |
| `src/lib/react-query/*.ts` | React Query hooks per domain |
| `src/hooks/useFormSubmit.ts` | Form submission hook |
| `src/lib/validations/schemas.ts` | Zod validation schemas |

---

# Architecture Decisions

## Why Consolidate Server Actions?

1. **Single Source of Truth**: All business logic in one place
2. **Easier Testing**: Can test actions in isolation
3. **Better Imports**: `import { createProject } from '@/lib/actions/projects'`
4. **Consistent Patterns**: All actions follow same structure

## Why React Query for Everything?

1. **Automatic Caching**: No manual cache invalidation
2. **Optimistic Updates**: Better UX for mutations
3. **Background Refetching**: Data stays fresh
4. **Deduplication**: Same query from multiple components = 1 request
5. **DevTools**: Easy debugging with React Query DevTools

## Why Split Large Files?

1. **Single Responsibility**: Each file does one thing
2. **Easier Testing**: Smaller units to test
3. **Better Code Review**: Smaller PRs
4. **Faster Development**: Find code faster
5. **Tree Shaking**: Only import what you need

---

# Notes

- Always run `npm run build` after major refactoring to catch TypeScript errors
- Run Lighthouse audit after each phase to track performance
- Update this document as tasks are completed
- Add new tasks as they're discovered during refactoring
