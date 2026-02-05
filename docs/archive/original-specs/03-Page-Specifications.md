# Formula Contract - Page Specifications
## Document 03: All Pages Layout & Data Binding

**Version:** 1.0  
**Total Pages:** 25+ pages  
**MVP Pages:** 18 pages

---

## Table of Contents

1. [Authentication Pages](#1-authentication-pages)
2. [Dashboard Pages](#2-dashboard-pages)
3. [Project Pages](#3-project-pages)
4. [Scope Item Pages](#4-scope-item-pages)
5. [Drawing Pages](#5-drawing-pages)
6. [Material Pages](#6-material-pages)
7. [Installation Pages](#7-installation-pages)
8. [Report Pages](#8-report-pages)
9. [Notification Pages](#9-notification-pages)
10. [User Management Pages](#10-user-management-pages)
11. [Client Portal Pages](#11-client-portal-pages)

---

## Page Route Structure

```
/                           → Redirect to /login or /dashboard
/login                      → Login page
/forgot-password            → Password reset request
/reset-password             → Password reset form

/dashboard                  → PM Dashboard

/projects                   → Projects list
/projects/new               → Create project
/projects/[id]              → Project detail (tabs)
/projects/[id]/edit         → Edit project
/projects/[id]/scope        → Scope list (tab)
/projects/[id]/scope/new    → Add scope item
/projects/[id]/scope/[itemId] → Scope item detail
/projects/[id]/drawings     → Drawings list (tab)
/projects/[id]/materials    → Materials list (tab)
/projects/[id]/installation → Installation (tab)
/projects/[id]/reports      → Reports list (tab)

/reports                    → All reports list
/reports/new                → Create report
/reports/[id]               → Report detail
/reports/[id]/edit          → Edit report

/notifications              → Notifications list

/users                      → Users list (Admin only)
/users/new                  → Create user (Admin only)
/users/[id]                 → User detail (Admin only)

/client                     → Client portal dashboard
/client/projects/[id]       → Client project view
/client/projects/[id]/drawings → Client drawings view
/client/projects/[id]/materials → Client materials view
```

---

## 1. Authentication Pages

### 1.1 Login Page

**Route:** `/login`  
**Layout:** Centered, no sidebar  
**Access:** Public

**Components:**
```
┌─────────────────────────────────────────────────────┐
│                                                     │
│                    ┌─────────────┐                  │
│                    │   FC Logo   │                  │
│                    └─────────────┘                  │
│                  Formula Contract                   │
│                 Project Management                  │
│                                                     │
│              ┌───────────────────────┐              │
│              │ Card                  │              │
│              │                       │              │
│              │  Email               │              │
│              │  ┌─────────────────┐ │              │
│              │  │ Input           │ │              │
│              │  └─────────────────┘ │              │
│              │                       │              │
│              │  Password            │              │
│              │  ┌─────────────────┐ │              │
│              │  │ Input (password)│ │              │
│              │  └─────────────────┘ │              │
│              │                       │              │
│              │  ┌─────────────────┐ │              │
│              │  │ Sign In Button  │ │              │
│              │  └─────────────────┘ │              │
│              │                       │              │
│              │  Forgot password?    │              │
│              └───────────────────────┘              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Form Schema:**
```typescript
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});
```

**Actions:**
- On submit: Call `supabase.auth.signInWithPassword()`
- On success: Redirect to `/dashboard` or `/client` (based on role)
- On error: Show toast error

**Code Location:** `app/(auth)/login/page.tsx`

---

### 1.2 Forgot Password Page

**Route:** `/forgot-password`  
**Layout:** Centered, no sidebar  
**Access:** Public

**Form Schema:**
```typescript
const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});
```

**Actions:**
- On submit: Call `supabase.auth.resetPasswordForEmail()`
- On success: Show success message, link to login
- On error: Show toast error

**Code Location:** `app/(auth)/forgot-password/page.tsx`

---

## 2. Dashboard Pages

### 2.1 PM Dashboard

**Route:** `/dashboard`  
**Layout:** AppShell with sidebar  
**Access:** PM, Admin

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Header: Dashboard                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ StatsCard│ │ StatsCard│ │ StatsCard│ │ StatsCard│       │
│  │ Active   │ │ Pending  │ │ Awaiting │ │ Overdue  │       │
│  │ Projects │ │ Items    │ │ Approval │ │ Items    │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Card: Priority Actions                                 │ │
│  │ ┌────────────────────────────────────────────────────┐ │ │
│  │ │ Table: Items needing attention                     │ │ │
│  │ │ - Drawing rejected, needs revision                 │ │ │
│  │ │ - Material pending approval                        │ │ │
│  │ │ - Installation overdue                             │ │ │
│  │ └────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────┐ ┌───────────────────────────┐   │
│  │ Card: My Projects      │ │ Card: Recent Activity     │   │
│  │ ┌────────────────────┐ │ │ ┌───────────────────────┐ │   │
│  │ │ Project cards list │ │ │ │ Activity feed         │ │   │
│  │ │ - Name, status     │ │ │ │ - Last 10 activities  │ │   │
│  │ │ - Progress %       │ │ │ │ - Load more button    │ │   │
│  │ │ - Milestones       │ │ │ └───────────────────────┘ │   │
│  │ └────────────────────┘ │ └───────────────────────────┘   │
│  └────────────────────────┘                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Data Queries:**
```typescript
// Stats
const activeProjects = await supabase
  .from('projects')
  .select('id')
  .in('id', assignedProjectIds)
  .eq('status', 'active')
  .eq('is_deleted', false);

const pendingItems = await supabase
  .from('scope_items')
  .select('id')
  .in('project_id', assignedProjectIds)
  .in('status', ['pending', 'in_design'])
  .eq('is_deleted', false);

const awaitingApproval = await supabase
  .from('drawings')
  .select('id')
  .eq('status', 'sent_to_client');

// Priority actions (items needing attention)
const priorityItems = await supabase
  .from('scope_items')
  .select(`
    id, item_code, name, status, project_id,
    projects(name),
    drawings(status)
  `)
  .in('project_id', assignedProjectIds)
  .or('drawings.status.eq.rejected')
  .limit(5);

// My projects
const myProjects = await supabase
  .from('projects')
  .select(`
    id, name, project_code, status,
    scope_items(id, status, production_percentage)
  `)
  .in('id', assignedProjectIds)
  .eq('is_deleted', false)
  .order('updated_at', { ascending: false })
  .limit(5);

// Activity feed
const activities = await supabase
  .from('activity_log')
  .select('*')
  .in('project_id', assignedProjectIds)
  .order('created_at', { ascending: false })
  .limit(10);
```

**Code Location:** `app/(dashboard)/dashboard/page.tsx`

---

## 3. Project Pages

### 3.1 Projects List

**Route:** `/projects`  
**Layout:** AppShell with sidebar  
**Access:** PM, Admin

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ PageHeader: Projects                    [+ New Project]     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Filters Bar                                            │ │
│  │ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐│ │
│  │ │ SearchInput │ │ Status      │ │ Sort by             ││ │
│  │ │             │ │ [Select]    │ │ [Select]            ││ │
│  │ └─────────────┘ └─────────────┘ └─────────────────────┘│ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ DataTable                                              │ │
│  │ ┌──────┬─────────┬────────┬──────────┬────────┬──────┐ │ │
│  │ │ Code │ Name    │ Client │ Status   │Progress│Action│ │ │
│  │ ├──────┼─────────┼────────┼──────────┼────────┼──────┤ │ │
│  │ │ MBH  │ Marina..│ ABC Co │ [Active] │ 45%    │ •••  │ │ │
│  │ │ TKP  │ Tower...│ XYZ Ltd│ [Tender] │ 0%     │ •••  │ │ │
│  │ └──────┴─────────┴────────┴──────────┴────────┴──────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Table Columns:**
| Column | Type | Sortable | Width |
|--------|------|----------|-------|
| Code | Text | Yes | 80px |
| Name | Text + Link | Yes | flex |
| Client | Text | Yes | 150px |
| Status | StatusBadge | Yes | 100px |
| Progress | ProgressBar | Yes | 120px |
| Items | Count | No | 80px |
| Updated | Date | Yes | 120px |
| Actions | Dropdown | No | 60px |

**Actions Dropdown:**
- View Details
- Edit Project
- Divider
- Delete (soft)

**Code Location:** `app/(dashboard)/projects/page.tsx`

---

### 3.2 Create Project

**Route:** `/projects/new`  
**Layout:** AppShell with sidebar  
**Access:** PM, Admin

**Form Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ PageHeader: New Project                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Card: Project Details                                  │ │
│  │                                                        │ │
│  │   Project Code *         Project Name *                │ │
│  │   ┌─────────────────┐   ┌─────────────────────────┐    │ │
│  │   │ Input           │   │ Input                   │    │ │
│  │   └─────────────────┘   └─────────────────────────┘    │ │
│  │                                                        │ │
│  │   Client                 Status                        │ │
│  │   ┌─────────────────┐   ┌─────────────────────────┐    │ │
│  │   │ Select/Create   │   │ Select                  │    │ │
│  │   └─────────────────┘   └─────────────────────────┘    │ │
│  │                                                        │ │
│  │   Currency               Installation Date             │ │
│  │   ┌─────────────────┐   ┌─────────────────────────┐    │ │
│  │   │ Select          │   │ DatePicker              │    │ │
│  │   └─────────────────┘   └─────────────────────────┘    │ │
│  │                                                        │ │
│  │   Description                                          │ │
│  │   ┌───────────────────────────────────────────────┐    │ │
│  │   │ Textarea                                      │    │ │
│  │   └───────────────────────────────────────────────┘    │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Card: Client Information (if new client)               │ │
│  │                                                        │ │
│  │   Company Name *          Contact Person               │ │
│  │   ┌─────────────────┐    ┌─────────────────────────┐   │ │
│  │   │ Input           │    │ Input                   │   │ │
│  │   └─────────────────┘    └─────────────────────────┘   │ │
│  │                                                        │ │
│  │   Email                   Phone                        │ │
│  │   ┌─────────────────┐    ┌─────────────────────────┐   │ │
│  │   │ Input           │    │ Input                   │   │ │
│  │   └─────────────────┘    └─────────────────────────┘   │ │
│  │                                                        │ │
│  │   Address                                              │ │
│  │   ┌───────────────────────────────────────────────┐    │ │
│  │   │ Textarea                                      │    │ │
│  │   └───────────────────────────────────────────────┘    │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Card: Kickoff Summary (Optional)                       │ │
│  │                                                        │ │
│  │   Summary                                              │ │
│  │   ┌───────────────────────────────────────────────┐    │ │
│  │   │ Textarea                                      │    │ │
│  │   └───────────────────────────────────────────────┘    │ │
│  │                                                        │ │
│  │   Requirements                                         │ │
│  │   ┌───────────────────────────────────────────────┐    │ │
│  │   │ Textarea                                      │    │ │
│  │   └───────────────────────────────────────────────┘    │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│                              [Cancel]  [Create Project]     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Form Schema:**
```typescript
const projectSchema = z.object({
  project_code: z.string().min(2, "Code must be at least 2 characters").max(20),
  name: z.string().min(2, "Name is required"),
  client_id: z.string().optional(),
  status: z.enum(['tender', 'active', 'on_hold', 'completed', 'cancelled']).default('tender'),
  currency: z.enum(['TRY', 'USD', 'EUR']).default('TRY'),
  installation_date: z.date().optional(),
  description: z.string().optional(),
  
  // Client info (if new)
  client_company_name: z.string().optional(),
  client_contact_person: z.string().optional(),
  client_email: z.string().email().optional().or(z.literal('')),
  client_phone: z.string().optional(),
  client_address: z.string().optional(),
  
  // Kickoff
  kickoff_summary: z.string().optional(),
  kickoff_requirements: z.string().optional(),
});
```

**Code Location:** `app/(dashboard)/projects/new/page.tsx`

---

### 3.3 Project Detail

**Route:** `/projects/[id]`  
**Layout:** AppShell with sidebar  
**Access:** PM (assigned), Admin

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ PageHeader: [Project Name]             [Edit] [Actions ▼]   │
│ Subheader: [Code] • [Client] • [Status Badge]               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Tabs                                                   │ │
│  │ [Overview] [Scope] [Drawings] [Materials] [Install]    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Tab Content (varies by tab)                            │ │
│  │                                                        │ │
│  │                                                        │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Tabs:**
1. **Overview** - Project info, stats, milestones, activity
2. **Scope** - Scope items list
3. **Drawings** - All drawings grouped by item
4. **Materials** - Project materials list
5. **Installation** - Installation status, snagging

**Code Location:** `app/(dashboard)/projects/[id]/page.tsx`

---

### 3.4 Project Overview Tab

**Tab Content:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Total    │ │ Complete │ │ In Prod  │ │ Pending  │       │
│  │ Items    │ │ Items    │ │ Items    │ │ Approval │       │
│  │ 24       │ │ 8        │ │ 10       │ │ 6        │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                             │
│  ┌────────────────────────────┐ ┌───────────────────────┐   │
│  │ Card: Project Info         │ │ Card: Milestones      │   │
│  │                            │ │                       │   │
│  │ Client: ABC Company        │ │ ○ Design Complete     │   │
│  │ Contact: John Smith        │ │   Due: 15 Jan 2026    │   │
│  │ Phone: +90 xxx             │ │                       │   │
│  │ Email: john@abc.com        │ │ ○ Production Start    │   │
│  │                            │ │   Due: 20 Jan 2026    │   │
│  │ Currency: USD              │ │                       │   │
│  │ Contract Value: $150,000   │ │ ● Installation        │   │
│  │ Installation: 15 Feb 2026  │ │   Due: 15 Feb 2026    │   │
│  │                            │ │                       │   │
│  │ [View Kickoff Document]    │ │ [+ Add Milestone]     │   │
│  └────────────────────────────┘ └───────────────────────┘   │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Card: Overall Progress                                 │ │
│  │                                                        │ │
│  │ Production: ████████████░░░░░░░░░░░░░░░░░ 45%         │ │
│  │ Installation: ██████░░░░░░░░░░░░░░░░░░░░░ 20%         │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Card: Recent Activity                                  │ │
│  │                                                        │ │
│  │ • Drawing REV-B uploaded for ITEM-001        2h ago    │ │
│  │ • Material "Oak Veneer" approved             5h ago    │ │
│  │ • ITEM-005 status changed to In Production   1d ago    │ │
│  │                                                        │ │
│  │ [View All Activity]                                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Scope Item Pages

### 4.1 Scope List Tab

**Route:** `/projects/[id]` → Scope Tab  
**Access:** PM (assigned), Admin

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Actions Bar                                            │ │
│  │ ┌─────────────┐ ┌───────────┐       [+ Add Item]       │ │
│  │ │ SearchInput │ │ Path ▼    │                          │ │
│  │ │             │ │ All/Prod  │                          │ │
│  │ └─────────────┘ └───────────┘                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ DataTable: Scope Items                                 │ │
│  │ ┌──────┬───────┬────────┬────────┬───────┬─────┬─────┐ │ │
│  │ │ Code │ Name  │ Path   │ Status │ Prog% │ Price│ ••• │ │ │
│  │ ├──────┼───────┼────────┼────────┼───────┼─────┼─────┤ │ │
│  │ │D-001 │Desk A │[Prod]  │In Prod │ 60%   │$500 │ ••• │ │ │
│  │ │C-001 │Chair  │[Proc]  │Ordered │ -     │$200 │ ••• │ │ │
│  │ └──────┴───────┴────────┴────────┴───────┴─────┴─────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Summary Bar                                            │ │
│  │ Total Items: 24 | Total Value: $12,500 | Avg: 45%      │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Table Columns:**
| Column | Type | Sortable | Notes |
|--------|------|----------|-------|
| Code | Text + Link | Yes | Click opens detail |
| Name | Text | Yes | |
| Path | Badge | Yes | Production/Procurement |
| Status | StatusBadge | Yes | Different for each path |
| Progress | ProgressBar | Yes | Only for Production path |
| Qty | Number | No | |
| Unit Price | Currency | No | |
| Total | Currency | Yes | Calculated |
| Actions | Dropdown | No | |

---

### 4.2 Add Scope Item

**Route:** `/projects/[id]/scope/new`  
**Access:** PM (assigned), Admin

**Form Schema:**
```typescript
const scopeItemSchema = z.object({
  item_code: z.string().min(1, "Item code is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  
  // Dimensions
  width: z.number().positive().optional(),
  depth: z.number().positive().optional(),
  height: z.number().positive().optional(),
  
  // Quantity & Pricing
  unit: z.string().default("pcs"),
  quantity: z.number().positive().default(1),
  unit_price: z.number().min(0).optional(),
  
  // Path
  item_path: z.enum(['production', 'procurement']).default('production'),
  
  // Dates
  drawing_receival_date: z.date().optional(),
  planned_completion_date: z.date().optional(),
  
  notes: z.string().optional(),
});
```

---

### 4.3 Scope Item Detail

**Route:** `/projects/[id]/scope/[itemId]`  
**Access:** PM (assigned), Admin, Production (if assigned), Procurement (if assigned)

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Breadcrumb: Projects > [Project] > Scope > [Item Code]      │
│ PageHeader: [Item Name]                    [Edit] [Actions] │
│ Subheader: [Item Code] • [Path Badge] • [Status Badge]      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────────────────────┐ ┌────────────────────┐  │
│  │ Card: Item Details             │ │ Card: Status       │  │
│  │                                │ │                    │  │
│  │ Description:                   │ │ Current Status:    │  │
│  │ Executive desk with drawers    │ │ [In Production]    │  │
│  │                                │ │                    │  │
│  │ Dimensions:                    │ │ Production: 60%    │  │
│  │ 1800 x 800 x 750 mm           │ │ ███████░░░░░░░     │  │
│  │                                │ │                    │  │
│  │ Quantity: 5 pcs                │ │ [Update Status ▼]  │  │
│  │ Unit Price: $500               │ │ [Update Progress]  │  │
│  │ Total: $2,500                  │ │                    │  │
│  │                                │ │                    │  │
│  └────────────────────────────────┘ └────────────────────┘  │
│                                                             │
│  (If Production Path:)                                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Card: Drawing                                          │ │
│  │                                                        │ │
│  │ Status: [Approved]              Rev: B                 │ │
│  │                                                        │ │
│  │ ┌──────────────────┐                                   │ │
│  │ │ PDF Preview      │  [View Full] [Upload New Rev]     │ │
│  │ │                  │                                   │ │
│  │ └──────────────────┘                                   │ │
│  │                                                        │ │
│  │ Revision History:                                      │ │
│  │ • Rev B - Approved - 10 Jan 2026                       │ │
│  │ • Rev A - Rejected - 05 Jan 2026                       │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Card: Materials                                        │ │
│  │                                                        │ │
│  │ ┌────────────┐ ┌────────────┐                          │ │
│  │ │ Oak Veneer │ │ Steel Base │  [+ Assign Material]     │ │
│  │ │ [Approved] │ │ [Pending]  │                          │ │
│  │ └────────────┘ └────────────┘                          │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  (If Procurement Path:)                                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Card: Procurement Status                               │ │
│  │                                                        │ │
│  │ Status: [Ordered]                                      │ │
│  │ Order Date: 10 Jan 2026                                │ │
│  │ Expected Delivery: 25 Jan 2026                         │ │
│  │                                                        │ │
│  │ [Update Status ▼]                                      │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Drawing Pages

### 5.1 Drawings Tab (in Project)

**Route:** `/projects/[id]` → Drawings Tab  
**Access:** PM (assigned), Admin

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Filters                                                │ │
│  │ [Search] [Status: All ▼]                               │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ DataTable: Drawings                                    │ │
│  │ ┌──────┬───────────┬────────┬─────┬──────────┬───────┐ │ │
│  │ │ Item │ Item Name │ Status │ Rev │ Updated  │Actions│ │ │
│  │ ├──────┼───────────┼────────┼─────┼──────────┼───────┤ │ │
│  │ │D-001 │ Desk A    │Approved│ B   │ 10 Jan   │ •••   │ │ │
│  │ │D-002 │ Desk B    │Pending │ -   │ -        │ •••   │ │ │
│  │ │C-001 │ Chair A   │Rejected│ A   │ 08 Jan   │ •••   │ │ │
│  │ └──────┴───────────┴────────┴─────┴──────────┴───────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Actions per row:**
- View Drawing
- Upload New Revision (if not approved)
- Send to Client (if uploaded, not sent)
- View Revision History

---

## 6. Material Pages

### 6.1 Materials Tab (in Project)

**Route:** `/projects/[id]` → Materials Tab  
**Access:** PM (assigned), Admin

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Actions Bar                                            │ │
│  │ [Search] [Status: All ▼]              [+ Add Material] │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ Material│ │ Material│ │ Material│ │ + Add   │           │
│  │ Card    │ │ Card    │ │ Card    │ │ New     │           │
│  │ ┌─────┐ │ │ ┌─────┐ │ │ ┌─────┐ │ │         │           │
│  │ │Image│ │ │ │Image│ │ │ │Image│ │ │         │           │
│  │ └─────┘ │ │ └─────┘ │ │ └─────┘ │ │         │           │
│  │ Oak     │ │ Steel   │ │ Glass   │ │         │           │
│  │ Veneer  │ │ Frame   │ │ Top     │ │         │           │
│  │[Approved│ │[Pending]│ │[Sent]   │ │         │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Material Card:**
```tsx
<Card className="cursor-pointer hover:shadow-md transition-shadow">
  <CardContent className="p-4">
    <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-3">
      {images[0] ? (
        <img src={images[0].url} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Package className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
    </div>
    <h3 className="font-medium truncate">{name}</h3>
    <p className="text-sm text-muted-foreground truncate">{specification}</p>
    <StatusBadge variant={status} className="mt-2">{statusLabel}</StatusBadge>
  </CardContent>
</Card>
```

---

## 7. Installation Pages

### 7.1 Installation Tab (in Project)

**Route:** `/projects/[id]` → Installation Tab  
**Access:** PM (assigned), Admin

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                    │
│  │ Total    │ │ Installed│ │ Pending  │                    │
│  │ Items    │ │          │ │ Snagging │                    │
│  │ 24       │ │ 18       │ │ 3        │                    │
│  └──────────┘ └──────────┘ └──────────┘                    │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Card: Installation Progress                            │ │
│  │                                                        │ │
│  │ DataTable: Items                                       │ │
│  │ ┌────────┬────────────┬───────────┬──────────┬───────┐ │ │
│  │ │ Code   │ Name       │ Status    │ Installed│ Action│ │ │
│  │ ├────────┼────────────┼───────────┼──────────┼───────┤ │ │
│  │ │ D-001  │ Desk A     │ Complete  │ ✓ Yes    │ ▢     │ │ │
│  │ │ D-002  │ Desk B     │ In Prod   │ -        │ ▢     │ │ │
│  │ │ C-001  │ Chair A    │ Received  │ ✓ Yes    │ ▢     │ │ │
│  │ └────────┴────────────┴───────────┴──────────┴───────┘ │ │
│  │                                                        │ │
│  │ [Mark Selected as Installed]                           │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Card: Snagging List                  [+ Add Snag]      │ │
│  │                                                        │ │
│  │ ┌──────────────────────────────────────────────────┐   │ │
│  │ │ ○ Scratch on desk surface - D-001                │   │ │
│  │ │   Added: 12 Jan 2026                             │   │ │
│  │ └──────────────────────────────────────────────────┘   │ │
│  │ ┌──────────────────────────────────────────────────┐   │ │
│  │ │ ● Chair wobbles - C-003 (Resolved)               │   │ │
│  │ │   Added: 10 Jan 2026 | Resolved: 11 Jan 2026     │   │ │
│  │ └──────────────────────────────────────────────────┘   │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Card: Client Sign-off                                  │ │
│  │                                                        │ │
│  │ Status: Pending                                        │ │
│  │                                                        │ │
│  │ Requirements:                                          │ │
│  │ ✓ All items complete                                   │ │
│  │ ✓ All items installed                                  │ │
│  │ ✗ All snagging resolved (1 remaining)                  │ │
│  │                                                        │ │
│  │ [Request Sign-off] (disabled until all resolved)       │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Report Pages

### 8.1 Reports List

**Route:** `/reports`  
**Access:** PM, Admin

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ PageHeader: Reports                        [+ New Report]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Filters                                                │ │
│  │ [Search] [Project ▼] [Type ▼] [Status ▼]              │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ DataTable                                              │ │
│  │ ┌─────────┬───────────┬────────┬────────┬─────┬──────┐ │ │
│  │ │ Project │ Type      │ Status │ Shared │ Date│Action│ │ │
│  │ ├─────────┼───────────┼────────┼────────┼─────┼──────┤ │ │
│  │ │ MBH     │ Weekly    │Published│Client │12Jan│ •••  │ │ │
│  │ │ TKP     │ Progress  │Draft   │ -     │10Jan│ •••  │ │ │
│  │ └─────────┴───────────┴────────┴────────┴─────┴──────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 8.2 Create/Edit Report

**Route:** `/reports/new` or `/reports/[id]/edit`  
**Access:** PM, Admin

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ PageHeader: New Report                    [Preview] [Save]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Card: Report Details                                   │ │
│  │                                                        │ │
│  │   Project *                 Report Type *              │ │
│  │   ┌─────────────────┐      ┌─────────────────────────┐ │ │
│  │   │ Select          │      │ Input (e.g., Weekly)    │ │ │
│  │   └─────────────────┘      └─────────────────────────┘ │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Card: Report Lines                      [+ Add Line]   │ │
│  │                                                        │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │ Line 1                                    [Delete]│  │ │
│  │  │                                                   │  │ │
│  │  │ Title *                                           │  │ │
│  │  │ ┌───────────────────────────────────────────────┐ │  │ │
│  │  │ │ Input                                         │ │  │ │
│  │  │ └───────────────────────────────────────────────┘ │  │ │
│  │  │                                                   │  │ │
│  │  │ Description                                       │  │ │
│  │  │ ┌───────────────────────────────────────────────┐ │  │ │
│  │  │ │ Textarea                                      │ │  │ │
│  │  │ └───────────────────────────────────────────────┘ │  │ │
│  │  │                                                   │  │ │
│  │  │ Photos (max 6)                                    │  │ │
│  │  │ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────────────────────┐   │  │ │
│  │  │ │ img │ │ img │ │ img │ │ + Add Photo         │   │  │ │
│  │  │ └─────┘ └─────┘ └─────┘ └─────────────────────┘   │  │ │
│  │  │                                                   │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │                                                        │ │
│  │  [+ Add Line]                                          │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Card: Sharing Options                                  │ │
│  │                                                        │ │
│  │   ☐ Share with Client                                  │ │
│  │   ☐ Share Internally                                   │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│                              [Save Draft]  [Publish]        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Notification Pages

### 9.1 Notifications List

**Route:** `/notifications`  
**Access:** All authenticated users

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ PageHeader: Notifications               [Mark All Read]     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Tabs: [All] [Unread]                                   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Notification List                                      │ │
│  │                                                        │ │
│  │ ┌──────────────────────────────────────────────────┐   │ │
│  │ │ ● Drawing Approved                         2h ago│   │ │
│  │ │   Drawing for D-001 in project MBH was approved │   │ │
│  │ └──────────────────────────────────────────────────┘   │ │
│  │                                                        │ │
│  │ ┌──────────────────────────────────────────────────┐   │ │
│  │ │ ○ Material Rejected                        1d ago│   │ │
│  │ │   Steel Frame in project TKP was rejected       │   │ │
│  │ └──────────────────────────────────────────────────┘   │ │
│  │                                                        │ │
│  │ [Load More]                                            │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Notification Item:**
- Blue dot for unread
- Click to navigate to related entity
- Mark as read on click

---

## 10. User Management Pages

### 10.1 Users List

**Route:** `/users`  
**Access:** Admin only

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ PageHeader: Users                          [+ Add User]     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ DataTable                                              │ │
│  │ ┌────────┬─────────────┬────────┬────────┬──────┬────┐ │ │
│  │ │ Name   │ Email       │ Role   │ Status │ Last │ •••│ │ │
│  │ ├────────┼─────────────┼────────┼────────┼──────┼────┤ │ │
│  │ │ John   │ john@fc.com │ PM     │ Active │ 2h   │ •••│ │ │
│  │ │ Sarah  │ sarah@fc.com│ Admin  │ Active │ 1d   │ •••│ │ │
│  │ └────────┴─────────────┴────────┴────────┴──────┴────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 10.2 Create User

**Route:** `/users/new`  
**Access:** Admin only

**Form Schema:**
```typescript
const userSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(['admin', 'pm', 'production', 'procurement', 'management', 'client']),
  phone: z.string().optional(),
});
```

---

## 11. Client Portal Pages

### 11.1 Client Dashboard

**Route:** `/client`  
**Layout:** Client layout (simpler sidebar)  
**Access:** Client role only

**Sidebar (Client):**
- Dashboard
- My Project(s)
- Notifications

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ PageHeader: Welcome, [Client Name]                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                    │
│  │ Pending  │ │ Items    │ │ Installed│                    │
│  │ Approvals│ │ Complete │ │          │                    │
│  │ 3        │ │ 18/24    │ │ 15/24    │                    │
│  └──────────┘ └──────────┘ └──────────┘                    │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Card: Pending Approvals                   [View All]   │ │
│  │                                                        │ │
│  │ ┌──────────────────────────────────────────────────┐   │ │
│  │ │ Drawing: D-001 - Executive Desk     [Review]     │   │ │
│  │ └──────────────────────────────────────────────────┘   │ │
│  │ ┌──────────────────────────────────────────────────┐   │ │
│  │ │ Material: Oak Veneer                [Review]     │   │ │
│  │ └──────────────────────────────────────────────────┘   │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Card: Project Progress                                 │ │
│  │                                                        │ │
│  │ [Project Name]                                         │ │
│  │ Production: ████████████░░░░░░░░░░ 60%                │ │
│  │ Installation: ████░░░░░░░░░░░░░░░░ 20%                │ │
│  │                                                        │ │
│  │ [View Full Details]                                    │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 11.2 Client Drawing Approval

**Route:** `/client/projects/[id]/drawings`  
**Access:** Client role only

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ PageHeader: Drawings for Review                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Tabs: [Pending (3)] [Reviewed]                         │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Drawing Card                                           │ │
│  │                                                        │ │
│  │ D-001 - Executive Desk                          Rev A  │ │
│  │                                                        │ │
│  │ ┌──────────────────────────────────────────────────┐   │ │
│  │ │                                                  │   │ │
│  │ │              PDF Viewer                          │   │ │
│  │ │                                                  │   │ │
│  │ │                                                  │   │ │
│  │ └──────────────────────────────────────────────────┘   │ │
│  │                                                        │ │
│  │ [Download PDF] [Download DWG]                          │ │
│  │                                                        │ │
│  │ Comments (optional):                                   │ │
│  │ ┌──────────────────────────────────────────────────┐   │ │
│  │ │ Textarea                                         │   │ │
│  │ └──────────────────────────────────────────────────┘   │ │
│  │                                                        │ │
│  │ [Reject]  [Approve with Comments]  [Approve]           │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Next Document

→ Continue to [04-Implementation-Order.md](./04-Implementation-Order.md) for build sequence.
