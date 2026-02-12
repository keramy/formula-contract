# Lessons Learned / Mistakes to Avoid

> **Last Updated:** February 12, 2026
> **Purpose:** Documented pitfalls and their fixes — read this before making changes to these areas.
> **See also:** [CLAUDE.md](../CLAUDE.md) for critical rules and gotchas.

---

## PDF Generation (`src/lib/pdf/generate-report-pdf.ts`)

| Issue | Wrong Approach | Correct Approach |
|-------|---------------|------------------|
| **Photo borders** | Drew gray rectangle borders around every photo with `doc.rect(..., "S")` | Photos look cleaner without borders - remove border drawing code |
| **Fixed photo sizing** | Used hardcoded `photoHeight = photoWidth * 0.75` regardless of page space | Calculate dynamic size based on `availableHeight` and cap at 1.5x default |
| **Duplicated code** | Had separate implementations for `generateReportPdfBase64` and `downloadReportPdf` | Extract shared `generatePdfDocument()` function, reuse in both |
| **Placeholder borders** | Used `"FD"` (fill + draw) for placeholder rectangles | Use `"F"` (fill only) for borderless placeholders |

**Dynamic Photo Sizing Algorithm:**
```typescript
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

---

## PDF V2 Template Design (Feb 2026)

- **2-column photo grid** with uniform 1:1 square frames (not 3:2 — works for all orientations)
- **Smart photo layouts:** single (16:9 full-width hero), triple (hero + 2 square), standard (2-col square grid)
- **Cover-crop via canvas pre-rendering:** `prepareImageForFrame()` renders each image into exact frame dimensions on a canvas, then passes the bitmap to jsPDF. Always uses cover mode (no contain/letterbox).
- **Inline teal section numbers** (01, 02) instead of badge boxes
- **Section dividers** between sections (gray horizontal line)
- **Print-friendly:** No page borders, minimal ink, "Confidential" in footer
- **Description clamping:** Long descriptions truncated to 3 lines with ellipsis + "Description truncated for layout." note
- **Image cache:** `preparedImageCache` (keyed by URL + frame dims) avoids reprocessing the same image
- **COLORS constant:** Define all colors at top of file for consistency

---

## PDF Photo Layout Lessons (Feb 2026)

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

---

## Code Extraction Pattern

When two functions share 90%+ similar code:
1. Extract the common logic into an internal function
2. Have both public functions call the internal one
3. Return intermediate results (like `{ doc, fileName }`) for flexibility

---

## Image Helper Functions

Extracted to `src/lib/pdf/image-helpers.ts`:
- `loadImageWithDimensions()` - Converts URL to base64 with dimension info
- `calculateFitDimensions()` - Calculates aspect-ratio-preserving fit dimensions
- `ImageData` type - Standardized image data interface

---

## Code Review Fixes (Feb 2026)

| Issue | File | Fix |
|-------|------|-----|
| **RLS Performance Bug** | `supabase/migrations/012_add_drafts_table.sql` | Fixed in migration 035 - changed `auth.uid()` to `(SELECT auth.uid())` for InitPlan optimization |
| **Non-existent column** | `src/lib/actions/scope-items.ts:745` | Changed `unit_cost: null` to `initial_unit_cost: null` in `splitScopeItem()` |
| **Debug console.logs** | `src/lib/actions/reports.ts` | Removed 15+ debug `console.log` statements from notification functions |
| **Weak password generation** | `src/lib/actions/users.ts:251` | Replaced `Math.random()` with `crypto.randomBytes()` for secure temp passwords |
| **Missing Error Boundary** | `src/app/(dashboard)/layout.tsx` | Added ErrorBoundary component to catch rendering errors gracefully |
| **Missing ARIA labels** | `scope-items-table.tsx:618` | Added `aria-label` to icon-only buttons for screen reader accessibility |

---

## Gantt Chart Layout Lessons (Feb 2026)

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

---

## Storage Path Bug (Feb 2026)

| Issue | Wrong Approach | Correct Approach |
|-------|---------------|------------------|
| **Report PDF upload path** | `pdfs/${fileName}` — flat path without project UUID | `${projectId}/${reportId}/${fileName}` — matches RLS requirement |
| **Missing projectId param** | `uploadReportPdf(reportId, base64, projectCode, type)` — no way to build correct path | Added `projectId` as 3rd parameter |
| **Cascading silent failure** | Upload fails → report publishes anyway → email "View Report" links to page instead of PDF | Upload succeeds → `pdf_url` saved to DB → email links directly to PDF file |

**Cascade Effect:** Storage upload failures can silently degrade downstream features. In this case:
- `uploadReportPdf()` failed → `pdf_url` was never saved → email notifications fell back to page URL instead of direct PDF link
- The report still "worked" (DB insert + client-side download) so the bug was hard to notice

---

## Favicon / Icon Gotcha (Feb 2026)

| Issue | Wrong Approach | Correct Approach |
|-------|---------------|------------------|
| **Turbopack ICO build failure** | Use `.ico` file with non-RGBA PNG embedded | Remove `.ico`, use `src/app/icon.png` (Next.js auto-serves it as favicon) |
| **Branding via CSS text** | `<div class="bg-primary-700 text-white font-bold">FC</div>` | `<img src="/icons/icon-192x192.png" alt="FC" class="size-8 rounded-lg" />` |

**Key Rule:** Next.js Turbopack requires RGBA-format PNGs inside `.ico` files. If your ICO fails to build, just use `src/app/icon.png` instead — Next.js auto-generates the `<link rel="icon">` tag from it.

---

## Mobile UI Density Pass (Feb 2026)

| Issue | Wrong Approach | Correct Approach |
|-------|---------------|------------------|
| **CSS show/hide for responsive** | `<div className="hidden md:block">` for table + `<div className="md:hidden">` for cards — both in DOM | Use `ResponsiveDataView` with JS-based `useBreakpoint()` — only active view in DOM |
| **Mobile breakpoint off-by-one** | `useIsMobile()` with `(max-width: 768px)` — overlaps Tailwind's `md: 768px` | `useBreakpoint()` with `(max-width: 767px)` — clean boundary at 768px |
| **Mobile tab overflow** | Horizontal scrolling `TabsList` — tabs clip on narrow screens | Bottom sheet (`Sheet side="bottom"`) with full tab list as buttons |
| **Desktop tab overflow** | All tabs in one row — wraps on medium screens | First 3 tabs visible + "More" `DropdownMenu` for the rest |
| **Action button density** | Same button size on all breakpoints | `compact` prop pattern — `size="sm"` on mobile, default on desktop |
| **Role guards on cards** | Tables enforce role via column visibility — assumed cards inherit | Cards need explicit `{!isClient && ...}` guards on edit/delete actions |

**Key Rule:** When adding a mobile card view for an existing table, always audit the table's role-based column visibility and replicate those guards in the card's action menu. Tables hide columns for clients; cards must do the same with conditional rendering.

---

## Key Takeaways (Distilled)

- Always use `(SELECT auth.uid())` pattern when creating new RLS policies
- Database schema uses `initial_unit_cost` and `actual_unit_cost`, NOT `unit_cost`
- Remove debug logs before production - keep only error logs (`console.error`)
- Use `crypto.randomBytes()` for any security-sensitive random generation, never `Math.random()`
- Wrap page content with `<ErrorBoundary>` to prevent white-screen crashes
- Add `aria-label` to all icon-only buttons for accessibility (WCAG 2.1 compliance)
- **All storage paths must start with `{projectId}/`** — migration 040 enforces this via RLS
- Every Supabase Storage upload path MUST start with `{projectId}/` — flat paths like `pdfs/` or `uploads/` will be silently rejected
