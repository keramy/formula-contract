# Changelog - Formula Contract

> **Last Updated:** February 12, 2026
> **Purpose:** Complete list of implemented features, organized chronologically.

---

## Completed Features (as of Feb 2026)

### Core System
- Auth (login, logout, password reset)
- Projects CRUD with client assignment
- Scope items (dual path, status workflow)
- Drawings (upload, revisions, approval cycle)
- Materials (images, approval)
- Reports (create, lines, publish, share)
- Notifications system
- Activity logging
- Version system with CI/CD integration

### Project Status & Tracking
- "Not Awarded" project status for lost tenders
- Shipped status tracking with date
- Installation started status tracking (between shipped and installed)
- Project Overview redesign (unified compact card with progress ring + info bar)
- Currency formatting fix (always shows symbols with 2 decimals)

### Dashboard & Finance
- Dashboard redesign (compact layout, This Week widget, Projects Status Chart)
- Dashboard consolidation (DashboardOverviewCard merges This Week + Projects Status)
- Finance module (`/finance` page with KPIs, budget charts, project costs table)

### PDF & Reports
- PDF report improvements (borderless photos, dynamic sizing to fill available space)
- PDF code refactor (unified generator, extracted image helpers)
- PDF V2 template (2-column photos, inline section numbers, print-friendly)
- PDF photo improvements — canvas-based cover-crop rendering, uniform 1:1 square grid frames, description clamping (3 lines max), image cache
- Report activity tracking (admin-only view/download stats)
- Report creation wizard (2-step: Content → Share & Publish)
- Report types update (daily, site, installation, snagging)
- Report PDF storage path fix (paths now start with `{projectId}/` per RLS requirement)

### Drawings
- Bulk send drawings to client (single-click send all uploaded drawings)
- Client drawing visibility filtering (clients only see sent/approved/rejected drawings)
- Drawing email notifications (clients get email + in-app notification when drawings are sent)
- PM reminder badge on Drawings tab (amber badge showing "X ready to send")
- Drawing approval server action migration (single send also triggers email now)
- Drawings overview UI polish (compact stats bar + flush table layout)

### Gantt Chart / Timeline
- Gantt chart system (custom-built, 7 components in `components/gantt/`)
- Standalone timeline page (`/projects/[id]/timeline`) with React Query + optimistic updates
- Timeline dependencies (FS/SS/FF/SF with lag days)
- Timeline hierarchy (phases → tasks → subtasks with indent/outdent)
- Timeline drag-and-drop (bar move/resize + sidebar reorder via @dnd-kit)
- Timeline priority system (Low/Normal/High/Critical with colored borders)

### UI & Mobile
- FC logo icon integration (favicon, apple-icon, PWA manifest, replaced CSS "FC" blocks with logo image)
- Mobile UI density pass — `ResponsiveDataView` component, `useBreakpoint()` hook, `ScopeItemCard`, bottom-sheet tab nav, compact action buttons, denser card layouts
- Milestone cards view toggle (Cards/Timeline)
- Team members stats card on Users page

### Code Quality
- Milestone email notifications (create/complete alerts)
- Code review & cleanup (RLS fix, schema bug fix, debug logs removed)
