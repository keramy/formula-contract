# Formula Contract — Complete Testing Guide

> **Last Updated:** February 10, 2026
> **Current Coverage:** 3 unit test files, 6 E2E specs, 0 server action tests
> **Goal:** Comprehensive coverage of schemas, utilities, server actions, and critical user flows

---

## How This Guide Works

This guide gives you **exact prompts** to copy-paste into Claude Code. Each step builds on the previous one. Follow them in order.

Your job is to:
1. Copy the prompt
2. Paste it into Claude Code
3. Let the agent write the tests
4. Run the tests
5. Ask the agent to fix any failures
6. Commit and move to the next step

---

## Current Test Infrastructure (Already Set Up)

Your project already has a mature test setup. **No "Prompt 0" needed** — it's all configured:

| Tool | Config File | Command |
|------|-------------|---------|
| Vitest (unit/integration) | `vitest.config.ts` | `npm test` (watch) / `npm run test:run` (once) |
| Playwright (E2E) | `playwright.config.ts` | `npm run test:e2e` |
| Coverage | Built into Vitest | `npm run test:coverage` |
| Accessibility | axe-core + Playwright | `npm run test:accessibility` |
| Security headers | Playwright | `npm run test:security` |
| Performance | Lighthouse | `npm run test:lighthouse` |

**Existing test files:**
- `src/lib/validations/validations.test.ts` — Schema validation tests (280 lines)
- `src/components/gantt/__tests__/gantt-chart.test.tsx` — Double-click edit trigger
- `src/components/gantt/__tests__/gantt-sidebar.test.tsx` — Collapse button behavior
- `e2e/auth.setup.ts` — Auth session reuse + rate limit handling
- `e2e/login.spec.ts`, `dashboard.spec.ts`, `projects.spec.ts`, `gantt.spec.ts`
- `e2e/accessibility.spec.ts`, `e2e/security.spec.ts`

**Test utilities:**
- `src/test/setup.ts` — Global mocks (Next.js router, Supabase client, jest-dom)
- `src/test/utils.tsx` — `renderUI()` wrapper for React Testing Library

---

## Step 1 — Zod Schema Tests (Expand Existing)

You already have `src/lib/validations/validations.test.ts` with basic coverage. This step fills the gaps.

### What Exists

All 15 schemas live in **one file**: `src/lib/validations/index.ts`
Plus 4 sanitization schemas in `src/lib/sanitize.ts`

| Schema | Existing Tests? | What's Missing |
|--------|----------------|----------------|
| `clientSchema` | Yes (basic) | Edge cases: empty company_name, phone format regex |
| `projectSchema` | Yes (basic) | project_code regex (`/^[A-Z0-9-]+$/`), contract_value_manual negative |
| `scopeItemSchema` | Yes (basic) | quantity min 0.01, all three cost fields, images URL array |
| `loginSchema` | Yes (basic) | password min 6, email format edge cases |
| `signupSchema` | No | All cases needed |
| `productionProgressSchema` | No | 0-100 range, boundary values |
| `drawingApprovalSchema` | No | All drawing statuses, client_comments optional |
| `pmOverrideSchema` | No | pm_override_reason min 10 chars |
| `scopeItemUpdateSchema` | No | Partial validation (all fields optional) |
| Enum schemas (5) | No | Invalid values for each enum |
| `sanitizedText/HTML/URL` | No | XSS payloads, script tags, javascript: URLs |
| `safeValidate()` helper | Yes (basic) | Error shape, multiple errors |
| `parseOptionalNumber()` | Yes (basic) | "abc", "", undefined, "0", negative |

### Prompt 1: Complete Schema Test Coverage

```
Read the existing test file at src/lib/validations/validations.test.ts and the
schema source at src/lib/validations/index.ts.

Expand the existing test file (don't create a new file) with these MISSING tests:

1. **signupSchema** — valid data, missing name, name < 2 chars, password < 6
2. **productionProgressSchema** — 0 (valid), 100 (valid), -1 (reject), 101 (reject), 50.5 (valid)
3. **drawingApprovalSchema** — each valid status value, missing status, invalid status string
4. **pmOverrideSchema** — reason with 10+ chars (pass), reason with 9 chars (fail), empty string (fail)
5. **scopeItemUpdateSchema** — empty object passes (all optional), single field passes
6. **All 5 enum schemas** — valid values pass, random string rejects:
   - projectStatusSchema: "tender", "active", "on_hold", "completed", "cancelled" (valid), "deleted" (invalid)
   - currencySchema: "TRY", "USD", "EUR" (valid), "GBP" (invalid)
   - itemPathSchema: "production", "procurement" (valid), "shipping" (invalid)
   - itemStatusSchema: all 8 values valid, "unknown" invalid
   - unitSchema: "pcs", "set", "m", "m2", "lot" (valid), "kg" (invalid)
7. **scopeItemSchema edge cases**:
   - quantity = 0 (reject, min is 0.01)
   - quantity = 0.01 (pass, boundary)
   - negative initial_unit_cost (reject)
   - images with invalid URL (reject)
   - images with valid URLs array (pass)
   - project_code with lowercase (reject — regex requires uppercase)
   - project_code with spaces (reject)

Also create a new test file: src/lib/__tests__/sanitize.test.ts for:
8. **sanitizeText()** — strips <script>, strips <img onerror>, preserves plain text
9. **sanitizeHTML()** — removes script/iframe, keeps <b>/<em>/<p>
10. **sanitizeURL()** — allows https://, blocks javascript:, adds https:// to bare domains
11. **sanitizedText Zod schema** — transforms HTML to clean text
12. **escapeHTML()** — converts < > " ' & to entities

Run with: npm run test:run
Fix any failures before finishing.
```

> **Checkpoint:** ~40-60 new tests added. Commit:
> ```
> git add -A && git commit -m "test: expand Zod schema and sanitization tests"
> ```

---

## Step 2 — Utility Function Tests

These are pure functions with no database calls — fast to write and run.

### What to Test (Complete Inventory)

| File | Functions | Priority |
|------|-----------|----------|
| `src/lib/utils.ts` | `formatCurrency`, `getNextRevision`, `calculateProgress`, `formatDate`, `generateAvatarFallback` | HIGH — business-critical |
| `src/components/gantt/types.ts` | `daysBetween`, `calculateWorkDays`, `isToday`, `isWeekend`, `generateColumns`, `calculateBarPosition` | HIGH — Gantt relies on these |
| `src/lib/rate-limit.ts` | `checkRateLimit`, `checkLoginRateLimit` + 3 preset limiters | MEDIUM — security |
| `src/lib/slug.ts` | `generateSlug`, `isUUID` | MEDIUM |
| `src/lib/file-validation.ts` | `validateFile`, `sanitizeFileName`, `isSuspiciousFileName`, `getFileTypeCategory`, `formatFileSize` | MEDIUM — security |
| `src/lib/export/export-utils.ts` | `prepareData`, `getNestedValue`, `generateFilename`, `formatters.*` | LOW — UI convenience |

### Prompt 2: Write Utility Tests

```
Write Vitest unit tests for the following utility functions. Place each test file
in a __tests__/ folder next to the source file.

### File 1: src/lib/__tests__/utils.test.ts
Test functions from src/lib/utils.ts:

- formatCurrency(1234.5, "TRY") → "₺1,234.50"
- formatCurrency(1234.5, "USD") → "$1,234.50"
- formatCurrency(1234.5, "EUR") → "€1,234.50"
- formatCurrency(null, "TRY") → "-"
- formatCurrency(0, "USD") → "$0.00"
- getNextRevision(null) → "A"
- getNextRevision("A") → "B"
- getNextRevision("Z") → what happens? (document behavior)
- calculateProgress(0, 10) → 0
- calculateProgress(5, 10) → 50
- calculateProgress(10, 10) → 100
- calculateProgress(0, 0) → handle gracefully (no division by zero)
- generateAvatarFallback("John Doe") → "JD"
- generateAvatarFallback("Alice") → "A" or "AL" (check actual behavior)
- generateAvatarFallback("") → handle gracefully

### File 2: src/components/gantt/__tests__/gantt-utils.test.ts
Test functions from src/components/gantt/types.ts:

- daysBetween(Jan 1, Jan 1) → 1 (inclusive)
- daysBetween(Jan 1, Jan 10) → 10
- daysBetween(Jan 10, Jan 1) → 10 (absolute value)
- calculateWorkDays with weekends included → same as daysBetween
- calculateWorkDays with Saturday excluded → correct count
- calculateWorkDays with both weekend days excluded → weekdays only
- isToday(new Date()) → true
- isToday(yesterday) → false
- isWeekend(Saturday) → true
- isWeekend(Monday) → false
- generateColumns for day view → one column per day
- generateColumns for month view → one column per month
- calculateBarPosition → correct left offset and width

### File 3: src/lib/__tests__/rate-limit.test.ts
Test from src/lib/rate-limit.ts:

- checkRateLimit → allows up to limit, blocks after
- checkRateLimit → resets after window expires (use vi.useFakeTimers)
- checkLoginRateLimit → 5 attempts per 15 minutes
- remaining count decrements correctly

### File 4: src/lib/__tests__/slug.test.ts
Test from src/lib/slug.ts:

- generateSlug("Hello World") → "hello-world"
- generateSlug("Special!@# Chars") → clean slug
- isUUID("550e8400-e29b-41d4-a716-446655440000") → true
- isUUID("not-a-uuid") → false
- isUUID("") → false

### File 5: src/lib/__tests__/file-validation.test.ts
Test from src/lib/file-validation.ts:

- validateFile with valid image → success
- validateFile with oversized file → reject with size error
- validateFile with wrong MIME type → reject
- sanitizeFileName("../../etc/passwd") → safe name
- sanitizeFileName("normal file.jpg") → preserved
- isSuspiciousFileName("photo.jpg") → false
- isSuspiciousFileName("script.php") → true
- isSuspiciousFileName("../../../etc/passwd") → true
- formatFileSize(1024) → "1.0 KB"
- formatFileSize(1048576) → "1.0 MB"

Run with: npm run test:run
Fix any failures.
```

> **Checkpoint:** ~80-100 new tests. Commit:
> ```
> git add -A && git commit -m "test: add utility function tests"
> ```

---

## Step 3 — Server Action Tests (Most Critical)

**This is the biggest gap.** You have 14 server action files with ~100 functions and ZERO tests. These contain your core business logic, role checks, and data mutations.

### Architecture for Mocking

Your server actions follow this pattern:
```typescript
// src/lib/actions/[entity].ts
"use server";
import { createClient } from "@/lib/supabase/server";

export async function doSomething(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  // ... Supabase queries
}
```

The mock setup in `src/test/setup.ts` already mocks `@/lib/supabase/server`. Tests need to configure the mock's return values per test case.

### Prompt 3A: Scope Item Action Tests (Start Here — Most Complex)

```
Write integration tests for src/lib/actions/scope-items.ts. This is the most
complex server action file (1,121 lines, 20 functions).

Create: src/lib/actions/__tests__/scope-items.test.ts

The existing mock in src/test/setup.ts already mocks @/lib/supabase/server.
Read that setup file first to understand the mock structure, then configure
return values per test.

Focus on these HIGH PRIORITY functions:

1. **getScopeItems(projectId)**
   - Returns items filtered by is_deleted = false
   - Authenticated user required

2. **updateProductionPercentage(projectId, itemId, percentage)**
   - Valid: 0, 50, 100
   - Invalid: -1, 101, "abc"
   - Must be authenticated

3. **updateShippedStatus(projectId, itemId, isShipped, shippedAt?)**
   - Sets is_shipped flag and timestamp
   - Verify shippedAt is recorded

4. **updateInstallationStatus(projectId, itemId, isInstalled)**
   - Sets is_installed flag
   - Verify installed_at timestamp

5. **deleteScopeItem(projectId, itemId)**
   - Soft delete: sets is_deleted = true (NOT hard delete)
   - Uses service role client

6. **splitScopeItem(params)**
   - Creates new item from existing one
   - New item has initial_unit_cost: null (IMPORTANT — was a bug fix)
   - Verify parent_item_id is set correctly

7. **bulkUpdateScopeItems(projectId, itemIds, field, value)**
   - Only allows these 11 fields: status, item_path, notes, actual_unit_cost,
     unit_sales_price, production_percentage, procurement_status, is_shipped,
     is_installation_started, is_installed, and a few others
   - Rejects unauthorized field names

For each function, test:
- Success case with valid data
- Rejects when not authenticated (supabase.auth.getUser returns null)
- Rejects with invalid parameters
- Handles Supabase errors gracefully

IMPORTANT: Read the actual source code in src/lib/actions/scope-items.ts
before writing tests. Don't guess the behavior — verify it.

Run with: npm run test:run
```

### Prompt 3B: Materials and Drawings Action Tests

```
Write integration tests for:

1. src/lib/actions/materials.ts → src/lib/actions/__tests__/materials.test.ts
2. Look for drawing-related actions in src/lib/actions/ and test those too.

For materials, test:
- createMaterial — valid input, missing required fields
- updateMaterialStatus — valid transitions: pending → sent_to_client → approved/rejected
- deleteMaterial — MUST check role is admin or pm (uses getUserRoleFromJWT)
  - Admin can delete → success
  - PM can delete → success
  - Production role tries to delete → should be rejected
  - Client role tries to delete → should be rejected
- bulkImportMaterials — upsert logic: existing updated, new inserted
- uploadMaterialImages — file validation

For drawings (if there are drawing server actions):
- Drawing revision sequence: null → "A" → "B" → "C"
- Drawing approval: only valid statuses accepted
- PM override: requires reason with min 10 characters (pmOverrideSchema)
- Client can only approve/reject (not upload or override)

Read the actual source files before writing tests.
Run with: npm run test:run
```

### Prompt 3C: Auth and Rate Limiting Action Tests

```
Write integration tests for src/lib/actions/auth.ts.
Create: src/lib/actions/__tests__/auth.test.ts

Test:
1. **loginAction(email, password)**
   - Successful login → returns user data, updates last_login_at
   - Invalid credentials → returns error (not throw)
   - Rate limiting: after 5 failed attempts, should be blocked
   - Empty email/password → validation error

2. **requestPasswordResetAction(email, redirectUrl)**
   - Valid email → triggers reset
   - Rate limiting: 3 attempts per hour
   - Empty email → validation error

3. **updatePasswordAction(newPassword, clearMustChangeFlag)**
   - Valid password (6+ chars) → success
   - Password too short → reject
   - Rate limiting: 5 per hour

4. **checkAuthStatusAction()**
   - Authenticated → returns user
   - Not authenticated → returns null/error

For rate limiting tests, use vi.useFakeTimers() to simulate time passing.
Mock the rate limit store to test limits without actually waiting.

Run with: npm run test:run
```

### Prompt 3D: Timeline (Gantt) Action Tests

```
Write integration tests for src/lib/actions/timelines.ts.
Create: src/lib/actions/__tests__/timelines.test.ts

Test:
1. **getTimelineItems(projectId)**
   - Returns items sorted by sort_order
   - Computes progress from linked scope items
   - Handles empty project (no timeline items)

2. **createTimelineItem(input)**
   - Valid task creation
   - Valid phase creation
   - Valid milestone creation (start_date = end_date)
   - Missing required fields → reject
   - Invalid item_type → reject

3. **updateTimelineItem(timelineId, input)**
   - Update name, dates, priority
   - Partial updates (only some fields)

4. **updateTimelineItemDates(timelineId, startDate, endDate)**
   - Valid date range
   - endDate before startDate → verify behavior

5. **deleteTimelineItem(timelineId)**
   - Successful deletion
   - Non-existent ID → handle gracefully

6. **reorderTimelineItems(projectId, itemIds)**
   - Reorders by updating sort_order
   - Valid ID array

7. **createTimelineDependency(input)**
   - Valid FS (Finish-to-Start) dependency
   - All 4 dependency types: 0 (FS), 1 (SS), 2 (FF), 3 (SF)
   - lag_days positive (delay) and negative (lead time)
   - Self-dependency (source = target) → should reject

8. **deleteTimelineDependency(dependencyId)**
   - Successful deletion

Read src/lib/actions/timelines.ts for exact parameter shapes.
Run with: npm run test:run
```

> **Checkpoint:** This is the biggest commit:
> ```
> git add -A && git commit -m "test: add server action integration tests"
> ```

---

## Step 4 — React Query Hook Tests

### What to Test

Your React Query hooks are in `src/lib/react-query/` with these files:
- `timelines.ts` — 10 hooks with optimistic updates
- Plus others for materials, notifications, etc.

### Prompt 4: React Query Hook Tests

```
Read src/lib/react-query/timelines.ts carefully.

Write tests in src/lib/react-query/__tests__/timelines.test.ts for:

1. **Query key factory** (timelineKeys):
   - timelineKeys.all → ["timelines"]
   - timelineKeys.list("proj-123") → ["timelines", "list", "proj-123"]
   - timelineKeys.dependencyList("proj-123") → ["timelines", "dependencies", "proj-123"]
   - Verify keys are unique and consistent

2. **useTimelineItems hook**:
   - enabled: false when projectId is empty string
   - staleTime is 30 seconds (30_000ms)
   - Calls getTimelineItems with correct projectId

3. **Optimistic update logic** (test the onMutate callbacks):
   - useCreateTimelineItem.onMutate: adds temp item to cache
   - useDeleteTimelineItem.onMutate: removes item from cache
   - useUpdateTimelineItemDates.onMutate: updates dates in cache
   - Error rollback: onError restores previous cache snapshot

4. **useReorderTimelineItems optimistic update**:
   - Reorders only the specified subset of items
   - Items not in the reorder set stay in place

Use @tanstack/react-query testing utilities:
- QueryClient with default options (retry: false for tests)
- renderHook from @testing-library/react
- Wrapper component with QueryClientProvider

Also find and test query key factories in other React Query files
(materials, notifications, etc.) — just the key factories, not the hooks.

Run with: npm run test:run
```

> **Checkpoint:**
> ```
> git add -A && git commit -m "test: add React Query hook tests"
> ```

---

## Step 5 — E2E Tests (Expand Existing)

You already have a solid E2E foundation with auth setup, login, dashboard, and projects specs. These prompts add the **missing critical flows**.

### What Exists vs What's Missing

| Flow | Status | File |
|------|--------|------|
| Auth setup + session reuse | Done | `e2e/auth.setup.ts` |
| Login flow | Done | `e2e/login.spec.ts` |
| Dashboard load + navigation | Done | `e2e/dashboard.spec.ts` |
| Projects list + navigation | Done | `e2e/projects.spec.ts` |
| Gantt timeline basic | Done | `e2e/gantt.spec.ts` |
| Accessibility (axe-core) | Done | `e2e/accessibility.spec.ts` |
| Security headers | Done | `e2e/security.spec.ts` |
| **Drawing approval cycle** | **MISSING** | — |
| **Scope item dual-path** | **MISSING** | — |
| **Role access control matrix** | **MISSING** | — |
| **Material approval flow** | **MISSING** | — |
| **Mobile viewport** | **MISSING** | — |

### Prompt 5A: Auth Fixtures for Multiple Roles

Your current `auth.setup.ts` only authenticates one user (admin). To test role-based access, you need multiple roles.

```
Read the existing e2e/auth.setup.ts to understand how authentication works.

Right now it only saves one session to .auth/user.json. We need to test
multiple roles. There are two approaches:

Option A (if you have test accounts for each role):
Create e2e/fixtures.ts that exports role-specific test functions:
- pmTest — authenticated as a PM user
- clientTest — authenticated as a Client user
- productionTest — authenticated as a Production user
- adminTest — authenticated as an Admin user

Option B (if only one test account exists):
We test role-based behavior through the existing admin account and
verify UI elements that should/shouldn't appear for different roles.

First, check:
1. What test credentials exist? (look at auth.setup.ts defaults:
   admin@formulacontract.com / Admin123!)
2. Are there test users for other roles in the Supabase database?
3. What does the middleware/layout do for role-based routing?
   Check src/middleware.ts and src/app/(dashboard)/layout.tsx

Tell me what you find, then we'll decide which approach to use.
Don't write tests yet — just investigate.
```

### Prompt 5B: Drawing Approval Cycle E2E

```
Write a Playwright E2E test: e2e/drawing-approval.spec.ts

This is the most critical workflow in the app. Read these files first:
- src/components/drawings/ (all files — understand the UI)
- src/app/(dashboard)/projects/[id]/scope/[itemId]/ (scope item detail page)
- src/lib/actions/scope-items.ts (drawing-related functions)

Test flow (using admin account which can act as both PM and override):
1. Navigate to a project with active scope items
2. Find a production-path scope item
3. Upload a drawing (use a small test image — create a 1x1 PNG in the test)
4. Verify it appears as "Revision A"
5. Check the drawing status shows correctly
6. If possible, test the approval/rejection UI

IMPORTANT:
- Look at the ACTUAL components to find correct selectors
- Use getByRole, getByText, or data-testid — not CSS selectors
- The drawing approval cycle involves: upload → send to client → approve/reject
- PM can override approval with a reason (min 10 characters)
- Check if the file upload uses a standard <input type="file"> or a
  custom drag-drop component

If the full multi-role cycle isn't testable with a single account,
at minimum test: navigate to drawings → verify UI elements → test upload.

Run with: npx playwright test e2e/drawing-approval.spec.ts --headed
```

### Prompt 5C: Role Access Control E2E

```
Write a Playwright E2E test: e2e/role-access.spec.ts

Read the following files to understand route protection:
- src/middleware.ts (or src/app/middleware.ts)
- src/app/(dashboard)/layout.tsx
- src/app/(dashboard)/finance/page.tsx (admin/management only)
- src/app/(dashboard)/users/page.tsx (admin only)

Test with the authenticated admin account:
1. Verify admin can access ALL pages:
   - /dashboard
   - /projects
   - /clients
   - /finance
   - /users
   - /settings

2. For each page, verify it loads without error (no redirect, no 403)

3. Check that the sidebar navigation shows correct items for the role:
   - Admin should see: Dashboard, Projects, Clients, Finance, Users, Settings
   - Look at the actual sidebar component to verify the exact items

4. Navigate to a non-existent route → verify 404 handling

Since we may only have one test account (admin), focus on verifying:
- All admin-accessible pages load correctly
- Sidebar navigation renders all expected links
- No console errors on any page

Run with: npx playwright test e2e/role-access.spec.ts --headed
```

### Prompt 5D: Mobile Viewport E2E

```
Write a Playwright E2E test: e2e/mobile.spec.ts

Test the app on mobile viewport (390x844 — iPhone 14).

Use Playwright's device emulation:
import { devices } from '@playwright/test';
const iPhone = devices['iPhone 14'];

Test these flows:
1. Login page renders correctly on mobile
2. Dashboard loads and is usable (cards stack vertically)
3. Sidebar/hamburger menu works (open/close)
4. Projects list is scrollable
5. Navigate to a project detail page — tabs work
6. Navigate to timeline page — Gantt chart is visible (may need horizontal scroll)

For each page, verify:
- No horizontal overflow (page width <= viewport width)
- Key action buttons are visible and tappable
- Text is readable (not cut off)

This matters because production and field workers use the app on phones.

Run with: npx playwright test e2e/mobile.spec.ts --headed
```

> **Checkpoint:**
> ```
> git add -A && git commit -m "test: add E2E tests for critical user journeys"
> ```

---

## Step 6 — CI Pipeline Updates

Your `.github/workflows/ci.yml` already runs lint, typecheck, unit tests, and build. The main gap is E2E tests are not in CI.

### Prompt 6: Update CI Pipeline

```
Read .github/workflows/ci.yml and update it:

The current pipeline runs: Lint → TypeCheck → Test (vitest) → Build

Add a new stage AFTER Build:

Stage: E2E Tests (only if previous stages pass)
- Install Playwright browsers (npx playwright install chromium --with-deps)
- Start the built app: npx next start &
- Wait for server: npx wait-on http://localhost:3000
- Run E2E tests: npx playwright test --project=chromium
- Upload Playwright report as artifact on failure

Environment variables needed (use GitHub Secrets):
- NEXT_PUBLIC_SUPABASE_URL (from env)
- NEXT_PUBLIC_SUPABASE_ANON_KEY (from env)
- E2E_TEST_EMAIL (test account credentials)
- E2E_TEST_PASSWORD (test account credentials)

Cache strategy:
- Cache node_modules (key: package-lock.json hash)
- Cache Playwright browsers (key: playwright version)
- Cache .next/cache (build cache)

IMPORTANT:
- The E2E stage should be optional (continue-on-error: true) initially
  since we need to add the secrets to GitHub first
- Upload playwright-report/ and test-results/ as artifacts (7-day retention)
- Add a comment explaining what secrets need to be configured

Don't modify the existing stages, only add the new one.
```

> **Checkpoint:**
> ```
> git add -A && git commit -m "ci: add E2E test stage to CI pipeline"
> ```

---

## Quick Reference — All Commands

| What | Command |
|------|---------|
| Run all unit tests (once) | `npm run test:run` |
| Run unit tests (watch mode) | `npm test` |
| Run with coverage report | `npm run test:coverage` |
| Run a specific test file | `npx vitest run src/lib/__tests__/utils.test.ts` |
| Run E2E tests (Chromium) | `npm run test:e2e` |
| Run E2E with visible browser | `npx playwright test --headed` |
| Run one E2E test | `npx playwright test e2e/drawing-approval.spec.ts` |
| Run E2E in UI mode | `npm run test:e2e:ui` |
| See E2E test report | `npx playwright show-report` |
| Run accessibility audit | `npm run test:accessibility` |
| Run security audit | `npm run test:security` |
| Run performance audit | `npm run test:performance` |
| Run all audits | `npm run test:audit` |
| Type check | `npx tsc --noEmit` |
| Lint | `npm run lint` |

---

## When Tests Fail — Fix Prompt

Copy-paste this whenever tests fail:

```
The following tests are failing. Read the error messages, look at the
relevant source code, and fix the tests. Don't change the source code
unless there's an actual bug — usually the test needs to be fixed to
match how the code actually works.

If you DO find an actual bug in the source code, tell me before fixing
it so I can verify.

[paste the error output here]
```

---

## Adding Tests for New Features

Every time you build a new feature, use this prompt:

```
I just added [describe the feature]. Write tests for it following the
patterns in the existing test files:

1. Unit tests for any new Zod schemas (add to src/lib/validations/validations.test.ts)
2. Unit tests for any new utility functions (__tests__/ folder next to source)
3. Integration tests for any new server actions (src/lib/actions/__tests__/)
4. If it's a user-facing flow, write an E2E test in e2e/

Use the existing mock setup from src/test/setup.ts for Supabase mocking.
Run ALL existing tests too to check for regressions: npm run test:run
```

---

## Business Rules Test Checklist

These are the rules that MUST be verified in tests. If any of these break, the app is fundamentally broken:

### Cost Tracking (CRITICAL)
- [ ] `initial_total_cost` is set ONCE at creation, NEVER updated
- [ ] `actual_unit_cost × quantity` can be updated anytime
- [ ] `splitScopeItem()` sets `initial_unit_cost: null` on the new item

### Dual-Path Workflow
- [ ] Production items require drawing approval before production tracking
- [ ] Procurement items follow: PM_APPROVAL → NOT_ORDERED → ORDERED → RECEIVED
- [ ] Drawing revisions increment: A → B → C (never skip)
- [ ] PM override requires reason with 10+ characters

### Role Permissions
- [ ] Admin: full CRUD on everything
- [ ] PM: CRUD on assigned projects, scope items, drawings, reports
- [ ] Production: READ assigned projects, UPDATE production progress ONLY
- [ ] Procurement: READ assigned projects, UPDATE procurement items ONLY
- [ ] Management: READ only
- [ ] Client: READ assigned projects, approve/reject drawings and materials ONLY

### Progress Calculation
- [ ] Production: `(production_percentage × 0.9) + (installation_started ? 5 : 0) + (installed ? 5 : 0)`
- [ ] Procurement: `installed ? 100 : 0`

### Security
- [ ] Soft deletes: `is_deleted` filter applied in all queries
- [ ] Rate limiting on auth endpoints (5 login attempts / 15 min)
- [ ] Input sanitization on all text fields (XSS prevention)
- [ ] File validation rejects suspicious filenames (path traversal, executables)

---

## Priority Order

| # | What | Tests Added | Effort | Impact |
|---|------|-------------|--------|--------|
| 1 | Expand Zod schema tests | ~50 | 30 min | Medium — catches form bugs |
| 2 | Utility function tests | ~80 | 1 hour | Medium — catches calculation errors |
| 3 | Scope item action tests | ~40 | 2 hours | **HIGH — core business logic** |
| 4 | Materials/drawings action tests | ~30 | 1.5 hours | **HIGH — approval workflows** |
| 5 | Auth/rate limiting action tests | ~20 | 1 hour | **HIGH — security** |
| 6 | Timeline action tests | ~30 | 1 hour | Medium — new feature |
| 7 | React Query hook tests | ~20 | 1 hour | Low — data layer |
| 8 | E2E: drawing approval | ~5 | 1.5 hours | **HIGH — critical workflow** |
| 9 | E2E: role access control | ~10 | 1 hour | Medium — security verification |
| 10 | E2E: mobile viewport | ~5 | 30 min | Medium — field worker UX |
| 11 | CI pipeline update | — | 30 min | HIGH — automation |

**Total: ~290 new tests across 6-8 sessions**

---

## CLAUDE.md Testing Section

Add this to your CLAUDE.md (if not already present) so every Claude session knows the rules:

```markdown
## Testing Guidelines

### Test Stack
- Unit & Integration: Vitest (`vitest.config.ts`, tests in `__tests__/` folders)
- E2E: Playwright (`playwright.config.ts`, tests in `e2e/` folder)
- Coverage: `npm run test:coverage` (v8 provider)

### Conventions
- Unit/integration tests: `[filename].test.ts` in `__tests__/` next to source
- E2E tests: `e2e/[feature-name].spec.ts`
- Mock setup: `src/test/setup.ts` (Next.js router + Supabase client)
- Test utility: `src/test/utils.tsx` (`renderUI()` wrapper)

### When Writing Tests
- Mock Supabase via the setup file, configure return values per test
- Test all 6 roles for permission-sensitive actions
- Test status transitions follow valid paths (no skipping steps)
- Test soft delete uses is_deleted flag (never hard delete core entities)
- Use vi.useFakeTimers() for rate limiting tests
```
