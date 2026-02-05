# Formula Contract - Implementation Order
## Document 04: Build Sequence & Dependencies

**Version:** 1.0  
**Timeline:** 4-6 weeks (MVP)  
**Method:** Phase-based, sequential

---

## Overview

Build in this exact order. Each phase depends on the previous one.

```
Phase 0: Setup (Day 1-2)
    ↓
Phase 1: Auth & Layout (Day 3-5)
    ↓
Phase 2: Users (Day 6-7)
    ↓
Phase 3: Projects (Day 8-12)
    ↓
Phase 4: Scope Items (Day 13-17)
    ↓
Phase 5: Drawings (Day 18-21)
    ↓
Phase 6: Materials (Day 22-24)
    ↓
Phase 7: Installation (Day 25-27)
    ↓
Phase 8: Reports (Day 28-30)
    ↓
Phase 9: Client Portal (Day 31-35)
    ↓
Phase 10: Polish & Deploy (Day 36-40)
```

---

## Phase 0: Project Setup

**Duration:** 1-2 days  
**Dependencies:** None

### Step 0.1: Create Next.js Project

```bash
npx create-next-app@latest formula-contract --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd formula-contract
```

### Step 0.2: Install Dependencies

```bash
# shadcn/ui
npx shadcn@latest init

# Answer prompts:
# - Style: Default
# - Base color: Slate
# - CSS variables: Yes
# - tailwind.config.js location: tailwind.config.ts
# - Components location: @/components
# - Utils location: @/lib/utils

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# Forms & Validation
npm install react-hook-form @hookform/resolvers zod

# Data tables
npm install @tanstack/react-table

# Date utilities
npm install date-fns

# Icons
npm install lucide-react

# Toast notifications
npm install sonner

# Font
npm install @fontsource/inter
```

### Step 0.3: Install shadcn Components

```bash
npx shadcn@latest add button input label card badge avatar separator
npx shadcn@latest add form select textarea checkbox switch
npx shadcn@latest add calendar popover
npx shadcn@latest add dropdown-menu dialog sheet tabs breadcrumb
npx shadcn@latest add sidebar collapsible
npx shadcn@latest add table progress skeleton scroll-area
npx shadcn@latest add alert alert-dialog toast tooltip
npx shadcn@latest add command sonner
```

### Step 0.4: Setup Environment

Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Step 0.5: Create Supabase Client

Create `lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

Create `lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore - called from Server Component
          }
        },
      },
    }
  )
}
```

### Step 0.6: Apply Design System

Update `app/globals.css` with design system from `01-Design-System.md`

Update `tailwind.config.ts` with design system from `01-Design-System.md`

### Step 0.7: Create File Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── forgot-password/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── projects/
│   │   │   ├── page.tsx
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── reports/
│   │   ├── notifications/
│   │   └── users/
│   ├── (client)/
│   │   ├── layout.tsx
│   │   └── client/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/           # shadcn components
│   ├── layout/       # AppShell, Sidebar, etc.
│   ├── forms/        # Form components
│   └── features/     # Feature-specific components
│       ├── projects/
│       ├── scope/
│       ├── drawings/
│       ├── materials/
│       ├── reports/
│       └── client/
├── lib/
│   ├── supabase/
│   ├── utils.ts
│   └── validations/  # Zod schemas
├── hooks/            # Custom hooks
├── types/            # TypeScript types
└── constants/        # Enums, constants
```

**Completion Checklist:**
- [ ] Next.js project created
- [ ] All dependencies installed
- [ ] All shadcn components installed
- [ ] Environment variables set
- [ ] Supabase clients created
- [ ] Design system applied
- [ ] File structure created
- [ ] Project runs without errors (`npm run dev`)

---

## Phase 1: Authentication & Layout

**Duration:** 2-3 days  
**Dependencies:** Phase 0

### Step 1.1: Create Types

Create `types/database.ts`:
```typescript
export type UserRole = 'admin' | 'pm' | 'production' | 'procurement' | 'management' | 'client';

export type ProjectStatus = 'tender' | 'active' | 'on_hold' | 'completed' | 'cancelled';

export type ItemPath = 'production' | 'procurement';

export type ItemStatus = 'pending' | 'in_design' | 'awaiting_approval' | 'approved' | 'in_production' | 'complete' | 'on_hold' | 'cancelled';

export type ProcurementStatus = 'pm_approval' | 'not_ordered' | 'ordered' | 'received';

export type DrawingStatus = 'not_uploaded' | 'uploaded' | 'sent_to_client' | 'approved' | 'rejected' | 'approved_with_comments';

export type MaterialStatus = 'pending' | 'sent_to_client' | 'approved' | 'rejected';

export type Currency = 'TRY' | 'USD' | 'EUR';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  language: string;
  email_notifications: boolean;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

// Add more types as needed...
```

### Step 1.2: Create Auth Context

Create `hooks/use-auth.tsx`:
```typescript
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@/types/database';
import { createClient } from '@/lib/supabase/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        setUser(data);
      }
      
      setLoading(false);
    };

    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          setUser(data);
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

### Step 1.3: Create Login Page

Create `app/(auth)/login/page.tsx` - Follow spec in `03-Page-Specifications.md`

### Step 1.4: Create Forgot Password Page

Create `app/(auth)/forgot-password/page.tsx` - Follow spec in `03-Page-Specifications.md`

### Step 1.5: Create Layout Components

1. Create `components/layout/app-shell.tsx`
2. Create `components/layout/app-sidebar.tsx`
3. Create `components/layout/page-header.tsx`
4. Create `components/layout/page-container.tsx`

Follow specs in `02-Component-Library.md`

### Step 1.6: Create Dashboard Layout

Create `app/(dashboard)/layout.tsx`:
```typescript
import { AuthProvider } from '@/hooks/use-auth';
import { AppShell } from '@/components/layout/app-shell';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AppShell>
        {children}
      </AppShell>
    </AuthProvider>
  );
}
```

### Step 1.7: Create Auth Middleware

Create `middleware.ts`:
```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
                     request.nextUrl.pathname.startsWith('/forgot-password');
  
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard') ||
                      request.nextUrl.pathname.startsWith('/projects') ||
                      request.nextUrl.pathname.startsWith('/users') ||
                      request.nextUrl.pathname.startsWith('/reports') ||
                      request.nextUrl.pathname.startsWith('/notifications');

  const isClientPortal = request.nextUrl.pathname.startsWith('/client');

  if (!user && (isDashboard || isClientPortal)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

**Completion Checklist:**
- [ ] Types created
- [ ] Auth context created
- [ ] Login page working
- [ ] Forgot password page working
- [ ] Layout components created
- [ ] Dashboard layout with sidebar
- [ ] Middleware protecting routes
- [ ] Can login and see dashboard shell

---

## Phase 2: User Management

**Duration:** 1-2 days  
**Dependencies:** Phase 1

### Step 2.1: Create Users List Page

Create `app/(dashboard)/users/page.tsx` - Admin only

### Step 2.2: Create Add User Page

Create `app/(dashboard)/users/new/page.tsx`

### Step 2.3: Create User Detail/Edit Page

Create `app/(dashboard)/users/[id]/page.tsx`

**Completion Checklist:**
- [ ] Users list page with table
- [ ] Add user form
- [ ] Edit user form
- [ ] Deactivate user (soft delete)
- [ ] Admin-only access enforced

---

## Phase 3: Projects

**Duration:** 4-5 days  
**Dependencies:** Phase 2

### Step 3.1: Create Clients API

Create API routes or server actions for clients CRUD

### Step 3.2: Create Projects List

Create `app/(dashboard)/projects/page.tsx`
- Table with all columns from spec
- Search and filter
- Status badges

### Step 3.3: Create New Project

Create `app/(dashboard)/projects/new/page.tsx`
- Full form with all fields
- Client selection or creation
- Kickoff document section

### Step 3.4: Create Project Detail

Create `app/(dashboard)/projects/[id]/page.tsx`
- Tab navigation (Overview, Scope, Drawings, Materials, Installation)
- Overview tab content
- Project header with status

### Step 3.5: Create Edit Project

Create `app/(dashboard)/projects/[id]/edit/page.tsx`

### Step 3.6: Create Milestones Component

Create `components/features/projects/milestones.tsx`
- Add milestone
- Mark complete
- Alert settings

**Completion Checklist:**
- [ ] Projects list with search/filter
- [ ] Create project with client
- [ ] Project detail with tabs shell
- [ ] Overview tab with stats
- [ ] Edit project
- [ ] Milestones CRUD
- [ ] Project assignment (multiple PMs)

---

## Phase 4: Scope Items

**Duration:** 4-5 days  
**Dependencies:** Phase 3

### Step 4.1: Create Scope Tab Content

Update project detail page with Scope tab

### Step 4.2: Create Scope Items Table

Create `components/features/scope/scope-table.tsx`
- All columns from spec
- Path badges
- Status badges
- Progress bar (production only)

### Step 4.3: Create Add Scope Item

Create modal or page for adding scope item
- All form fields
- Path selection
- Dimensions fields

### Step 4.4: Create Scope Item Detail

Create `app/(dashboard)/projects/[id]/scope/[itemId]/page.tsx`
- Item details card
- Status card with update
- Production progress slider
- Drawing section (placeholder)
- Materials section (placeholder)

### Step 4.5: Create Status Update

Create status change functionality
- Production path statuses
- Procurement path statuses
- Progress percentage update

**Completion Checklist:**
- [ ] Scope tab shows items table
- [ ] Add scope item form
- [ ] Scope item detail page
- [ ] Update item status
- [ ] Update production percentage
- [ ] Path-specific display
- [ ] Calculated totals (quantity × price)

---

## Phase 5: Drawings

**Duration:** 3-4 days  
**Dependencies:** Phase 4

### Step 5.1: Setup Supabase Storage

Create bucket for drawings in Supabase

### Step 5.2: Create File Upload Component

Create `components/ui/file-upload.tsx` - from Component Library spec

### Step 5.3: Create Drawings Tab

Create drawings tab in project detail
- Table of all drawings by item
- Status filter

### Step 5.4: Create Upload Drawing

Create upload drawing modal
- File upload (PDF, DWG, DXF)
- Revision auto-increment (A, B, C)
- Upload to Supabase Storage

### Step 5.5: Create Drawing Viewer

Create PDF viewer for drawings
- View in modal
- Download button

### Step 5.6: Create Send to Client

Create "Send to Client" action
- Update status
- Create notification

### Step 5.7: Update Item Detail

Update scope item detail to show drawing section
- Current drawing with status
- Upload new revision
- Revision history

**Completion Checklist:**
- [ ] Storage bucket configured
- [ ] File upload working
- [ ] Drawings tab shows all items
- [ ] Upload new drawing/revision
- [ ] View drawing (PDF viewer)
- [ ] Download drawing
- [ ] Send to client action
- [ ] Status tracking
- [ ] Revision history display

---

## Phase 6: Materials

**Duration:** 2-3 days  
**Dependencies:** Phase 5

### Step 6.1: Create Materials Tab

Create materials tab in project detail
- Card grid view
- Status badges

### Step 6.2: Create Add Material

Create add material modal
- Name, specification, supplier
- Image upload (multiple)

### Step 6.3: Create Material Detail

Create material detail modal/page
- Images gallery
- Status
- Approval history

### Step 6.4: Create Send to Client

Create "Send to Client" action for materials

### Step 6.5: Create Assign to Item

Create material assignment to items
- Select materials
- Display on item detail

**Completion Checklist:**
- [ ] Materials tab with card grid
- [ ] Add material with images
- [ ] Material detail view
- [ ] Image gallery
- [ ] Send to client
- [ ] Assign materials to items
- [ ] Status tracking

---

## Phase 7: Installation & Snagging

**Duration:** 2-3 days  
**Dependencies:** Phase 6

### Step 7.1: Create Installation Tab

Create installation tab in project detail
- Items table with installation status
- Progress stats

### Step 7.2: Create Mark Installed

Create bulk/single "Mark as Installed" action

### Step 7.3: Create Snagging List

Create snagging list component
- Add snag with description, photo
- Mark as resolved

### Step 7.4: Create Sign-off Section

Create client sign-off section
- Requirements checklist
- Request sign-off button
- PM override option

**Completion Checklist:**
- [ ] Installation tab shows items
- [ ] Mark items as installed
- [ ] Snagging list CRUD
- [ ] Photo upload for snags
- [ ] Resolve snags
- [ ] Sign-off requirements check
- [ ] Request sign-off
- [ ] PM override with reason

---

## Phase 8: Reports

**Duration:** 2-3 days  
**Dependencies:** Phase 7

### Step 8.1: Create Reports List

Create `app/(dashboard)/reports/page.tsx`
- Table with filters
- Status badges

### Step 8.2: Create New Report

Create `app/(dashboard)/reports/new/page.tsx`
- Project selection
- Report type input
- Dynamic lines (add/remove)
- Photo upload per line

### Step 8.3: Create Report Detail

Create `app/(dashboard)/reports/[id]/page.tsx`
- View published report
- Edit if draft

### Step 8.4: Create Report Preview

Create preview modal showing report layout

### Step 8.5: Create Publish Action

Create publish with sharing options
- Share with client
- Share internal
- Create notifications

**Completion Checklist:**
- [ ] Reports list page
- [ ] Create report with lines
- [ ] Add photos to lines (max 6)
- [ ] Preview report
- [ ] Edit report
- [ ] Publish report
- [ ] Sharing options
- [ ] Notifications sent

---

## Phase 9: Client Portal

**Duration:** 4-5 days  
**Dependencies:** Phase 8

### Step 9.1: Create Client Layout

Create `app/(client)/layout.tsx`
- Simpler sidebar
- Client-specific navigation

### Step 9.2: Create Client Dashboard

Create `app/(client)/client/page.tsx`
- Pending approvals summary
- Project progress
- Quick links

### Step 9.3: Create Client Project View

Create `app/(client)/client/projects/[id]/page.tsx`
- Progress view (read-only)
- Items list
- No pricing visible

### Step 9.4: Create Drawing Approval

Create drawing approval interface
- View drawing
- Approve/Reject/Approve with comments
- Comment field

### Step 9.5: Create Material Approval

Create material approval interface
- View material images
- Approve/Reject

### Step 9.6: Create Client Reports View

Create client view of shared reports
- Read-only
- Only reports shared with client

### Step 9.7: Create Client Snagging View

Create client view of snagging list
- Read-only

**Completion Checklist:**
- [ ] Client layout and navigation
- [ ] Client dashboard
- [ ] Project progress view
- [ ] Drawing approval flow
- [ ] Material approval flow
- [ ] View shared reports
- [ ] View snagging list
- [ ] No pricing visible anywhere
- [ ] Notifications for client

---

## Phase 10: Notifications & Polish

**Duration:** 4-5 days  
**Dependencies:** Phase 9

### Step 10.1: Create Notification System

Create `components/features/notifications/` components
- Notification bell with count
- Notifications dropdown
- Notifications page

### Step 10.2: Implement All Notification Triggers

Add notification creation to all relevant actions:
- Drawing uploaded/sent/approved/rejected
- Material sent/approved/rejected
- Report shared
- Sign-off requested/completed
- Milestone approaching

### Step 10.3: Create Activity Log

Implement activity logging for all actions

### Step 10.4: Dashboard Integration

Complete PM dashboard with all widgets:
- Stats cards
- Priority actions
- My projects
- Activity feed

### Step 10.5: Testing & Bug Fixes

- Test all user flows
- Fix any bugs
- Test all role permissions

### Step 10.6: Performance Optimization

- Add loading states (skeletons)
- Optimize queries
- Add error handling

### Step 10.7: Deploy Preparation

- Environment variables for production
- Vercel deployment
- Domain setup

**Completion Checklist:**
- [ ] Notification bell with unread count
- [ ] Notifications list page
- [ ] All notification triggers working
- [ ] Activity log recording
- [ ] PM dashboard complete
- [ ] All features tested
- [ ] All bugs fixed
- [ ] Loading states everywhere
- [ ] Error handling everywhere
- [ ] Deployed to Vercel
- [ ] Custom domain (optional)

---

## Post-MVP Roadmap

After MVP is complete:

1. **Week 5-6:** Excel import/export for scope items
2. **Week 6-7:** Email notifications
3. **Week 7-8:** PDF export for reports
4. **Week 8-9:** Management dashboard
5. **Week 9-10:** PWA setup

---

## Notes for Claude Code

1. **Always read the spec** before implementing any feature
2. **Match exactly** - Don't add features not in specs
3. **Test after each step** - Ensure it works before moving on
4. **Commit frequently** - Small, logical commits
5. **Ask if unclear** - Better to clarify than assume

---

## Next Document

→ Continue to [05-File-Structure.md](./05-File-Structure.md) for detailed file organization.
