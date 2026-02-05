# Formula Contract - MVP Scope
## Document 10: Feature Definitions & Boundaries

**Version:** 1.0  
**Timeline:** 4-6 weeks  
**Status:** Approved

---

## MVP Definition

The Minimum Viable Product includes all features necessary for Formula Contract to manage projects from tender through installation, with client approval workflows.

---

## Feature Matrix

### ✅ In MVP

| Module | Feature | Priority | Notes |
|--------|---------|----------|-------|
| **Auth** | Email/password login | P0 | Required |
| **Auth** | Password reset | P0 | Required |
| **Auth** | Session management | P0 | Auto logout |
| **Users** | Create users | P0 | Admin only |
| **Users** | Assign roles | P0 | 6 roles |
| **Users** | Deactivate users | P1 | Soft delete |
| **Projects** | Create project | P0 | With client |
| **Projects** | Edit project | P0 | |
| **Projects** | Change status | P0 | 5 statuses |
| **Projects** | Assign multiple PMs | P0 | |
| **Projects** | View project detail | P0 | Tabs layout |
| **Projects** | Delete project | P1 | Soft delete |
| **Projects** | Milestones | P1 | CRUD + alerts |
| **Scope** | Add scope items | P0 | Single add |
| **Scope** | Edit scope items | P0 | |
| **Scope** | Dual path (Prod/Proc) | P0 | Core feature |
| **Scope** | Update status | P0 | |
| **Scope** | Update production % | P0 | 0-100 slider |
| **Scope** | View item detail | P0 | |
| **Scope** | Change item path | P1 | Anytime |
| **Drawings** | Upload drawing | P0 | PDF + CAD |
| **Drawings** | Auto revision (A,B,C) | P0 | |
| **Drawings** | Send to client | P0 | Status change |
| **Drawings** | View drawing | P0 | PDF viewer |
| **Drawings** | Download drawing | P0 | |
| **Drawings** | Revision history | P1 | |
| **Drawings** | PM override approval | P1 | With reason |
| **Materials** | Add material | P0 | With images |
| **Materials** | Multiple images | P0 | JSONB array |
| **Materials** | Send to client | P0 | |
| **Materials** | Assign to items | P1 | M:N relation |
| **Installation** | Mark item installed | P0 | |
| **Installation** | Snagging list | P0 | CRUD |
| **Installation** | Snag photos | P0 | |
| **Installation** | Resolve snags | P0 | |
| **Reports** | Create report | P0 | |
| **Reports** | Add lines with photos | P0 | Max 6/line |
| **Reports** | Publish report | P0 | |
| **Reports** | Share options | P0 | Client/Internal |
| **Reports** | View report | P0 | |
| **Reports** | Edit draft report | P1 | |
| **Dashboard** | PM stats cards | P0 | 4 cards |
| **Dashboard** | Priority actions | P1 | |
| **Dashboard** | My projects list | P0 | |
| **Dashboard** | Activity feed | P1 | |
| **Notifications** | In-app notifications | P0 | |
| **Notifications** | Unread count | P0 | Bell icon |
| **Notifications** | Mark as read | P0 | |
| **Client** | Client login | P0 | |
| **Client** | View project progress | P0 | No pricing |
| **Client** | Approve/reject drawings | P0 | |
| **Client** | Approve/reject materials | P0 | |
| **Client** | Add comments | P0 | |
| **Client** | View shared reports | P0 | |
| **Client** | View snagging (read) | P1 | |

---

### ❌ NOT in MVP (Post-MVP)

| Module | Feature | Target | Notes |
|--------|---------|--------|-------|
| **Scope** | Excel import | Week 5-6 | Bulk add items |
| **Scope** | Excel export | Week 5-6 | |
| **Notifications** | Email notifications | Week 6-7 | Supabase Edge Functions |
| **Reports** | PDF export | Week 7-8 | Using pdf-lib or similar |
| **Drawings** | Client markup upload | Week 7 | Client uploads marked PDF |
| **Drawings** | Analytics | Week 8 | Revision count, avg time |
| **Dashboard** | Management dashboard | Week 8-9 | All projects view |
| **Dashboard** | Client dashboard | Week 8-9 | Simplified view |
| **Calendar** | Milestone calendar | Week 9 | Visual calendar |
| **Search** | Global search | Week 9-10 | Search all entities |
| **PWA** | Install as app | Week 10 | Add to home screen |

---

### 🚀 Future (Month 3+)

| Feature | Description |
|---------|-------------|
| iOS App | Native app using Expo (React Native) |
| Custom production steps | Per-item custom workflow steps |
| Project close checklist | Formal close-out process |
| Multi-language | Turkish + English toggle in UI |
| Advanced reporting | More report templates |
| Document templates | Reusable document templates |
| Budget tracking | Cost tracking against budget |
| Time tracking | Time spent per item |
| Vendor portal | Portal for suppliers |

---

## User Stories (MVP)

### PM User Stories

1. **As a PM, I can log in** so that I can access my assigned projects.

2. **As a PM, I can create a new project** with client information, so that I can start managing it.

3. **As a PM, I can add scope items** with codes from the client's list, so that I can track each piece.

4. **As a PM, I can assign items to Production or Procurement path** so that they follow the correct workflow.

5. **As a PM, I can upload drawings** for production items, so that they can be sent for approval.

6. **As a PM, I can send drawings to clients** so that they can review and approve.

7. **As a PM, I can see when drawings are approved or rejected** so that I can take action.

8. **As a PM, I can override drawing approval** with a reason, so that production can proceed when needed.

9. **As a PM, I can add materials** with images, so that clients can approve finishes.

10. **As a PM, I can update production percentage** so that I know how far along each item is.

11. **As a PM, I can mark items as installed** so that I can track installation progress.

12. **As a PM, I can add snagging items** with photos, so that issues are documented.

13. **As a PM, I can create weekly reports** with photos, so that I can share progress.

14. **As a PM, I can publish reports** and choose who sees them.

15. **As a PM, I can see my dashboard** with stats and priority actions.

16. **As a PM, I can see notifications** when things need my attention.

---

### Client User Stories

1. **As a client, I can log in** to see my project status.

2. **As a client, I can see project progress** without seeing pricing information.

3. **As a client, I can view drawings** sent for my approval.

4. **As a client, I can approve or reject drawings** with comments.

5. **As a client, I can view materials** sent for my approval.

6. **As a client, I can approve or reject materials** with comments.

7. **As a client, I can see reports** shared with me.

8. **As a client, I can see the snagging list** for my project.

9. **As a client, I can see notifications** when I need to take action.

---

### Admin User Stories

1. **As an admin, I can create new users** with any role.

2. **As an admin, I can deactivate users** who should no longer have access.

3. **As an admin, I can see all projects** regardless of assignment.

4. **As an admin, I can assign PMs to projects** so they can manage them.

---

## Acceptance Criteria

### Project Management

- [ ] Projects are only visible to assigned PMs (or admins)
- [ ] Project code is unique across all projects
- [ ] Contract value auto-calculates from scope items
- [ ] Multiple PMs can be assigned to one project
- [ ] Status changes are logged
- [ ] Soft delete preserves data

### Scope Items

- [ ] Item code is unique within a project
- [ ] Changing path from Production to Procurement removes drawing requirement
- [ ] Total price auto-calculates (quantity × unit price)
- [ ] Production percentage only applies to Production path
- [ ] Procurement status only applies to Procurement path

### Drawings

- [ ] One drawing record per scope item
- [ ] Revisions auto-increment (A → B → C)
- [ ] Drawing must be uploaded before sending to client
- [ ] Client approval/rejection is recorded with timestamp
- [ ] PM can override and proceed with reason logged

### Materials

- [ ] Materials are approved per project (not per item)
- [ ] Multiple images can be uploaded per material
- [ ] Materials can be assigned to multiple items
- [ ] Client approval/rejection is recorded

### Client Portal

- [ ] Clients only see their assigned project(s)
- [ ] Clients cannot see pricing anywhere
- [ ] Clients can only view (not edit) most data
- [ ] Clients can approve/reject drawings and materials
- [ ] Clients can add comments when approving/rejecting

### Reports

- [ ] Reports have lines with title, description, photos
- [ ] Maximum 6 photos per report line
- [ ] Reports can be saved as draft
- [ ] Published reports cannot be edited
- [ ] Sharing controls: client, internal, or both

---

## Technical Boundaries

### What We're Using

| Category | Choice |
|----------|--------|
| Frontend | Next.js 14 (App Router) |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Hosting | Vercel |
| State | React Query (optional) or React state |

### What We're NOT Doing in MVP

- No dark mode (light only)
- No offline support
- No real-time updates (page refresh required)
- No email notifications (in-app only)
- No PDF generation
- No Excel import/export
- No mobile app (web only, responsive)
- No custom domains for clients
- No SSO / Google login
- No two-factor authentication

---

## Success Metrics

MVP is successful when:

1. ✅ PM can create a project and add 20+ scope items
2. ✅ PM can upload drawings and get client approval
3. ✅ Client can log in and approve/reject items
4. ✅ PM can track production progress to 100%
5. ✅ PM can create and publish a weekly report
6. ✅ PM can manage snagging through to resolution
7. ✅ All data is persisted and retrievable
8. ✅ Role-based access works correctly

---

## Timeline Summary

| Week | Phase | Deliverables |
|------|-------|--------------|
| 1 | Setup + Auth | Project setup, login, layout |
| 2 | Users + Projects | User management, project CRUD |
| 3 | Scope Items | Item management, dual path |
| 4 | Drawings | Upload, revisions, approval |
| 5 | Materials + Installation | Materials, snagging |
| 6 | Reports + Client | Reports, client portal |
| 7 | Polish | Testing, bug fixes, deploy |

---

## Questions to Resolve Before Starting

All questions have been resolved. See chat transcript for decisions.

Key decisions made:
- Item codes are user-entered (from client scope list)
- Project codes are user-entered initials
- Three currencies: TRY, USD, EUR
- Separate dimension fields (width, depth, height)
- Soft delete for all main entities
- Multi-language support ready (en/tr)
- Materials approved per project, not per item

---

## Sign-off

This MVP scope is approved and ready for development.

**Next Step:** Begin Phase 0 (Project Setup) following [04-Implementation-Order.md](./04-Implementation-Order.md)
