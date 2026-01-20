# Product Roadmap

> **Last Updated:** January 20, 2026

---

## Current Status

### Completed Features
- Authentication (login, logout, password reset)
- Projects CRUD with client assignment
- Scope items with dual-path workflow (Production/Procurement)
- Drawings with revisions and approval cycle
- Materials with images and approval workflow
- Progress reports with lines and photos
- Notifications system
- Activity logging
- Dashboard with stats
- Progress bars in project list
- Contextual dropdown menus

### Recently Fixed
- **Initial Cost Bug (Jan 20, 2026):** `initial_total_cost` no longer overwritten on scope item edits

---

## Phase 1: UX Quick Wins (Current Sprint)

### 1.1 Enhanced Search & Filtering
**Status:** Partially Done

**Remaining:**
- [ ] Status filter chips (visual toggle buttons)
- [ ] Client filter dropdown
- [ ] Date range filter

**Files:** `src/app/(dashboard)/projects/projects-list-client.tsx`

### 1.2 Scope Item Cost Variance Display
**Status:** Ready to implement

**Goal:** Show variance between initial_total_cost and actual cost (unit_cost × quantity)

**Files:**
- `src/app/(dashboard)/projects/[id]/scope/scope-items-table.tsx`
- `src/components/scope-items/scope-item-detail.tsx`

---

## Phase 2: Role-Specific Dashboard

**Status:** TODO

### Goal
Progressive disclosure based on user role. Show relevant information first.

### PM Dashboard ("Mission Control")
- [ ] My Tasks Widget (pending approvals count)
- [ ] At-Risk Projects (overdue milestones)
- Stats Cards (existing)
- Recent Projects (existing)
- Activity Feed (existing)

### Client Dashboard (Simplified)
- [ ] My Project Progress (visual cards)
- [ ] Pending Approvals (drawings/materials awaiting response)
- [ ] Recent Updates

### Admin Dashboard
- All PM widgets
- [ ] User Activity Summary
- [ ] Quick Admin Actions

**New Files:**
```
src/components/dashboard/
├── my-tasks-widget.tsx
├── at-risk-projects.tsx
├── pending-approvals-widget.tsx
└── client-project-progress.tsx

src/lib/actions/dashboard.ts
```

**Database Queries:**
```typescript
// getMyTasks() - Aggregate counts:
// - Materials pending approval (status='sent_to_client')
// - Drawings rejected (need revision)
// - Reports in draft (unpublished)
// - Overdue milestones (due_date < now, !is_completed)

// getAtRiskProjects() - Projects with:
// - Overdue milestones
// - Rejected drawings pending revision
```

---

## Phase 3: Global Command Menu

**Status:** TODO

### Goal
Cmd+K to search and navigate anywhere instantly.

### Features
- [ ] Search projects, clients, users
- [ ] Quick actions (New Project, New Report)
- [ ] Navigation shortcuts
- [ ] Recent items

**New Files:**
```
src/components/layout/command-menu.tsx
src/lib/actions/search.ts
```

**Integration:**
- Add to `src/app/(dashboard)/layout.tsx`
- Keyboard listener for Cmd/Ctrl+K

---

## Phase 4: Sheet Components

**Status:** Partially Done

### Goal
Quick add/edit without full page navigation.

### Implemented
- [x] `scope-item-sheet.tsx` - Quick add/edit scope items

### Remaining
- [ ] `material-sheet.tsx` - Quick add/edit materials
- [ ] `drawing-upload-sheet.tsx` - Upload drawings
- [ ] `file-upload-sheet.tsx` - Reusable upload panel

**Files:**
```
src/components/materials/material-sheet.tsx
src/components/drawings/drawing-upload-sheet.tsx
src/components/shared/file-upload-sheet.tsx
```

---

## Phase 5: Multi-Step Forms

**Status:** TODO

### Goal
Complex forms broken into digestible steps.

### Components
- [ ] Form wizard wrapper
- [ ] Step indicator
- [ ] Navigation (Next/Back)

### Multi-Step Project Creation
1. Project Details (code, name, status, currency)
2. Client Selection (existing or create new)
3. Team Assignment (assign PMs)
4. Review & Create

### Multi-Step Scope Item Creation
1. Item Identity (code, name, description)
2. Specifications (dimensions, quantity, pricing)
3. Path & Timeline (production/procurement, dates)
4. Review & Create

**New Files:**
```
src/components/ui/form-wizard.tsx
src/components/ui/wizard-steps.tsx
src/components/ui/wizard-navigation.tsx
```

---

## Phase 6: Autosave/Draft System

**Status:** Database Ready

### Goal
Never lose form data. Auto-save long forms.

### Database
- [x] `drafts` table created (migration 012)

### Implementation
- [ ] `use-autosave.ts` hook - Debounced save
- [ ] `draft-indicator.tsx` - "Saving..." / "Saved" indicator
- [ ] `src/lib/actions/drafts.ts` - Draft CRUD

### Usage
- Reports (long-form content)
- Large scope items
- Project kickoff forms

**New Files:**
```
src/hooks/use-autosave.ts
src/components/ui/draft-indicator.tsx
src/lib/actions/drafts.ts
```

---

## Phase 7: Grouped Notifications

**Status:** Partially Done

### Current State
- Beautiful UI with icons, badges, timestamps
- React Query integration
- Project badge per notification
- Flat list (not grouped)

### Remaining
- [ ] Group notifications by project_id
- [ ] Project name as group header with unread count
- [ ] Collapse/expand groups

**File:** `src/components/notifications/notifications-dropdown.tsx`

---

## Phase 8: Per-Project Activity Feed

**Status:** TODO

### Goal
See activity for a specific project, filtered by type.

### Features
- [ ] Activity feed component filtered to project
- [ ] Type filter (drawings, materials, scope items)
- [ ] Placed on project detail Overview tab

**New File:** `src/components/projects/project-activity-feed.tsx`

**Modify:** `src/app/(dashboard)/projects/[id]/page.tsx`

---

## Phase 9: Mobile Responsive

**Status:** TODO

### Goal
Full mobile experience for on-site use.

### Components
- [ ] `responsive-data-view.tsx` - Auto-switches table/cards
- [ ] `project-card.tsx` - Mobile card view
- [ ] `use-media-query.ts` - Breakpoint detection

### Navigation
- [ ] Sheet-based mobile sidebar
- [ ] Hamburger menu on small screens

### Forms
- Responsive grid: `grid-cols-1 md:grid-cols-2`
- Sheet width: `w-full sm:w-[540px]`
- Touch-friendly buttons (min 44px height)

**New Files:**
```
src/components/ui/responsive-data-view.tsx
src/components/projects/project-card.tsx
src/hooks/use-media-query.ts
```

---

## Future Integrations

### Email Notifications
- Resend integration for transactional emails
- Drawing approval requests
- Milestone alerts
- Daily/weekly digest option

### PDF Export
- Project summary reports
- Scope item list export
- Drawing approval history

### Excel Import/Export
- Bulk scope item import
- Project data export
- Material list export

### Real-time Updates
- Supabase Realtime for live notifications
- Live production progress updates
- Collaborative editing indicators

### Mobile App
- React Native app
- Push notifications
- Offline capability
- Photo capture from device

---

## Technical Debt

### Performance
- [ ] Optimize large project queries
- [ ] Add pagination to scope items
- [ ] Lazy load heavy components

### Code Quality
- [ ] Add comprehensive TypeScript types
- [ ] Increase test coverage
- [ ] Document complex business logic

### Security
- [ ] Security audit of RLS policies
- [ ] Rate limiting on server actions
- [ ] Input sanitization review

---

## Estimated Timeline

| Phase | Description | Duration |
|-------|-------------|----------|
| 1 | UX Quick Wins | 2-3 days |
| 2 | Role-Specific Dashboard | 3-5 days |
| 3 | Command Menu | 2-3 days |
| 4 | Sheet Components | 3-4 days |
| 5 | Multi-Step Forms | 3-4 days |
| 6 | Autosave/Draft | 2-3 days |
| 7 | Grouped Notifications | 1-2 days |
| 8 | Project Activity Feed | 1-2 days |
| 9 | Mobile Responsive | 4-5 days |

**Total:** ~3-4 weeks

---

## Success Metrics

### User Experience
- Reduced clicks to complete common tasks
- Faster page load times
- Mobile usability score (Lighthouse)

### Business
- Faster project turnaround
- Reduced approval cycle time
- Higher user adoption rate

### Technical
- Zero critical bugs
- < 3s page load time
- 90+ Lighthouse score
