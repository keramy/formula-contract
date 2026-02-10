# Agent Communication Log

## Current Status
Last updated by: Claude Code
Timestamp: 2026-02-10

---

## Active Task: Test Writing (Parallel Agents)

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

---

## Open Issues / Warnings
- **Migration required**: `supabase/migrations/045_gantt_rewrite.sql` must be executed manually on Supabase before Gantt UI shows data
- **Migration 046 applied**: `046_client_drawing_approval_rls.sql` has been applied to Supabase (client drawing approval RLS + SECURITY DEFINER helper)
- **Reports PDF upload path broken**: `src/lib/actions/reports.ts` line 615 uses `pdfs/${fileName}` which doesn't start with project UUID — will fail with storage policies from migration 040. Needs fixing separately.
- **Do not modify `src/test/setup.ts`** during parallel test writing — both agents depend on it
