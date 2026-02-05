# Formula Contract - File Structure
## Document 05: Folder Organization & Naming Conventions

**Version:** 1.0  
**Framework:** Next.js 14 (App Router)

---

## Complete File Structure

```
formula-contract/
├── .env.local                    # Environment variables (DO NOT COMMIT)
├── .env.example                  # Example env file (commit this)
├── .gitignore
├── next.config.js
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── components.json               # shadcn/ui config
│
├── public/
│   ├── favicon.ico
│   └── logo.svg
│
└── src/
    ├── app/
    │   ├── globals.css           # Tailwind + CSS variables
    │   ├── layout.tsx            # Root layout
    │   ├── page.tsx              # Redirect to /login or /dashboard
    │   │
    │   ├── (auth)/               # Auth group (no layout)
    │   │   ├── login/
    │   │   │   └── page.tsx
    │   │   ├── forgot-password/
    │   │   │   └── page.tsx
    │   │   └── reset-password/
    │   │       └── page.tsx
    │   │
    │   ├── (dashboard)/          # Main app group
    │   │   ├── layout.tsx        # Dashboard layout with sidebar
    │   │   │
    │   │   ├── dashboard/
    │   │   │   └── page.tsx      # PM Dashboard
    │   │   │
    │   │   ├── projects/
    │   │   │   ├── page.tsx      # Projects list
    │   │   │   ├── new/
    │   │   │   │   └── page.tsx  # Create project
    │   │   │   └── [id]/
    │   │   │       ├── page.tsx  # Project detail (with tabs)
    │   │   │       ├── edit/
    │   │   │       │   └── page.tsx
    │   │   │       └── scope/
    │   │   │           └── [itemId]/
    │   │   │               └── page.tsx  # Scope item detail
    │   │   │
    │   │   ├── reports/
    │   │   │   ├── page.tsx      # Reports list
    │   │   │   ├── new/
    │   │   │   │   └── page.tsx  # Create report
    │   │   │   └── [id]/
    │   │   │       ├── page.tsx  # Report detail
    │   │   │       └── edit/
    │   │   │           └── page.tsx
    │   │   │
    │   │   ├── notifications/
    │   │   │   └── page.tsx      # Notifications list
    │   │   │
    │   │   └── users/            # Admin only
    │   │       ├── page.tsx      # Users list
    │   │       ├── new/
    │   │       │   └── page.tsx  # Create user
    │   │       └── [id]/
    │   │           └── page.tsx  # User detail/edit
    │   │
    │   └── (client)/             # Client portal group
    │       ├── layout.tsx        # Client layout (simpler sidebar)
    │       └── client/
    │           ├── page.tsx      # Client dashboard
    │           └── projects/
    │               └── [id]/
    │                   ├── page.tsx      # Client project view
    │                   ├── drawings/
    │                   │   └── page.tsx  # Drawings approval
    │                   └── materials/
    │                       └── page.tsx  # Materials approval
    │
    ├── components/
    │   ├── ui/                   # shadcn/ui components (auto-generated)
    │   │   ├── button.tsx
    │   │   ├── input.tsx
    │   │   ├── card.tsx
    │   │   ├── badge.tsx
    │   │   ├── table.tsx
    │   │   ├── dialog.tsx
    │   │   ├── sidebar.tsx
    │   │   └── ... (other shadcn components)
    │   │
    │   ├── layout/               # Layout components
    │   │   ├── app-shell.tsx
    │   │   ├── app-sidebar.tsx
    │   │   ├── client-sidebar.tsx
    │   │   ├── page-header.tsx
    │   │   └── page-container.tsx
    │   │
    │   ├── forms/                # Reusable form components
    │   │   ├── search-input.tsx
    │   │   ├── date-picker.tsx
    │   │   └── file-upload.tsx
    │   │
    │   ├── shared/               # Shared UI components
    │   │   ├── status-badge.tsx
    │   │   ├── progress-bar.tsx
    │   │   ├── empty-state.tsx
    │   │   ├── stats-card.tsx
    │   │   ├── confirm-dialog.tsx
    │   │   ├── data-table.tsx
    │   │   └── image-gallery.tsx
    │   │
    │   └── features/             # Feature-specific components
    │       ├── auth/
    │       │   ├── login-form.tsx
    │       │   └── forgot-password-form.tsx
    │       │
    │       ├── dashboard/
    │       │   ├── stats-cards.tsx
    │       │   ├── priority-actions.tsx
    │       │   ├── projects-list.tsx
    │       │   └── activity-feed.tsx
    │       │
    │       ├── projects/
    │       │   ├── project-card.tsx
    │       │   ├── project-form.tsx
    │       │   ├── project-tabs.tsx
    │       │   ├── milestones.tsx
    │       │   ├── overview-tab.tsx
    │       │   └── client-form.tsx
    │       │
    │       ├── scope/
    │       │   ├── scope-table.tsx
    │       │   ├── scope-item-form.tsx
    │       │   ├── scope-item-detail.tsx
    │       │   ├── status-select.tsx
    │       │   └── progress-slider.tsx
    │       │
    │       ├── drawings/
    │       │   ├── drawings-table.tsx
    │       │   ├── drawing-upload.tsx
    │       │   ├── drawing-viewer.tsx
    │       │   └── revision-history.tsx
    │       │
    │       ├── materials/
    │       │   ├── materials-grid.tsx
    │       │   ├── material-card.tsx
    │       │   ├── material-form.tsx
    │       │   └── material-detail.tsx
    │       │
    │       ├── installation/
    │       │   ├── installation-table.tsx
    │       │   ├── snagging-list.tsx
    │       │   ├── snag-form.tsx
    │       │   └── signoff-section.tsx
    │       │
    │       ├── reports/
    │       │   ├── reports-table.tsx
    │       │   ├── report-form.tsx
    │       │   ├── report-line.tsx
    │       │   ├── report-preview.tsx
    │       │   └── report-detail.tsx
    │       │
    │       ├── notifications/
    │       │   ├── notification-bell.tsx
    │       │   ├── notification-dropdown.tsx
    │       │   └── notification-item.tsx
    │       │
    │       ├── users/
    │       │   ├── users-table.tsx
    │       │   └── user-form.tsx
    │       │
    │       └── client/
    │           ├── client-dashboard.tsx
    │           ├── pending-approvals.tsx
    │           ├── drawing-approval.tsx
    │           └── material-approval.tsx
    │
    ├── lib/
    │   ├── supabase/
    │   │   ├── client.ts         # Browser client
    │   │   ├── server.ts         # Server client
    │   │   └── middleware.ts     # Auth middleware helper
    │   │
    │   ├── utils.ts              # cn() and other utilities
    │   │
    │   ├── validations/          # Zod schemas
    │   │   ├── auth.ts
    │   │   ├── project.ts
    │   │   ├── scope-item.ts
    │   │   ├── drawing.ts
    │   │   ├── material.ts
    │   │   ├── report.ts
    │   │   └── user.ts
    │   │
    │   └── queries/              # Supabase queries
    │       ├── projects.ts
    │       ├── scope-items.ts
    │       ├── drawings.ts
    │       ├── materials.ts
    │       ├── reports.ts
    │       ├── notifications.ts
    │       └── users.ts
    │
    ├── hooks/                    # Custom React hooks
    │   ├── use-auth.tsx
    │   ├── use-projects.ts
    │   ├── use-scope-items.ts
    │   ├── use-notifications.ts
    │   └── use-debounce.ts
    │
    ├── types/                    # TypeScript types
    │   ├── database.ts           # Database types
    │   └── index.ts              # Re-exports
    │
    ├── constants/                # Constants and enums
    │   ├── status.ts             # Status labels and colors
    │   ├── roles.ts              # Role definitions
    │   └── navigation.ts         # Navigation items
    │
    └── middleware.ts             # Next.js middleware (auth)
```

---

## Naming Conventions

### Files & Folders

| Type | Convention | Example |
|------|------------|---------|
| Folders | kebab-case | `scope-items`, `forgot-password` |
| React Components | PascalCase.tsx | `StatusBadge.tsx`, `ProjectForm.tsx` |
| Utility files | kebab-case.ts | `use-auth.ts`, `database.ts` |
| Page files | `page.tsx` | Always `page.tsx` in App Router |
| Layout files | `layout.tsx` | Always `layout.tsx` |

### Components

| Type | Convention | Example |
|------|------------|---------|
| Component name | PascalCase | `StatusBadge`, `ProjectForm` |
| Props interface | `{Component}Props` | `StatusBadgeProps`, `ProjectFormProps` |
| Component file | kebab-case.tsx | `status-badge.tsx`, `project-form.tsx` |

### Functions & Variables

| Type | Convention | Example |
|------|------------|---------|
| Functions | camelCase | `getProjects`, `handleSubmit` |
| Variables | camelCase | `isLoading`, `projectData` |
| Constants | SCREAMING_SNAKE | `MAX_FILE_SIZE`, `API_URL` |
| Types | PascalCase | `Project`, `UserRole` |
| Enums | PascalCase | `ProjectStatus`, `ItemPath` |

### Database

| Type | Convention | Example |
|------|------------|---------|
| Tables | snake_case (plural) | `projects`, `scope_items` |
| Columns | snake_case | `created_at`, `item_code` |
| Foreign keys | `{table}_id` | `project_id`, `user_id` |
| Enums | snake_case | `project_status`, `item_path` |

---

## Import Aliases

Configured in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**Usage:**
```typescript
// Good
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Project } from "@/types/database";

// Bad
import { Button } from "../../../components/ui/button";
```

---

## Component Organization Rules

### 1. One Component Per File

```typescript
// Good: status-badge.tsx
export function StatusBadge() { ... }

// Bad: badges.tsx
export function StatusBadge() { ... }
export function PathBadge() { ... }
export function RoleBadge() { ... }
```

### 2. Co-locate Related Files

```
components/features/projects/
├── project-form.tsx
├── project-form.test.tsx    # Tests next to component
└── project-form.types.ts    # Types if complex
```

### 3. Index Files for Exports (Optional)

```typescript
// components/features/projects/index.ts
export * from './project-form';
export * from './project-card';
export * from './project-tabs';
```

---

## Page Structure Pattern

Every page should follow this structure:

```typescript
// app/(dashboard)/projects/page.tsx

import { Suspense } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { PageContainer } from '@/components/layout/page-container';
import { ProjectsTable } from '@/components/features/projects/projects-table';
import { ProjectsTableSkeleton } from '@/components/features/projects/projects-table-skeleton';

export default function ProjectsPage() {
  return (
    <PageContainer>
      <PageHeader 
        title="Projects"
        actions={<CreateProjectButton />}
      />
      
      <Suspense fallback={<ProjectsTableSkeleton />}>
        <ProjectsTable />
      </Suspense>
    </PageContainer>
  );
}
```

---

## Feature Component Pattern

```typescript
// components/features/projects/project-form.tsx

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { projectSchema, type ProjectFormValues } from '@/lib/validations/project';
import { createProject } from '@/lib/queries/projects';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface ProjectFormProps {
  onSuccess?: () => void;
  initialData?: Partial<ProjectFormValues>;
}

export function ProjectForm({ onSuccess, initialData }: ProjectFormProps) {
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: initialData ?? {
      name: '',
      project_code: '',
      // ...
    },
  });

  const onSubmit = async (values: ProjectFormValues) => {
    try {
      await createProject(values);
      toast.success('Project created successfully');
      onSuccess?.();
    } catch (error) {
      toast.error('Failed to create project');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Form fields */}
      </form>
    </Form>
  );
}
```

---

## Query Pattern

```typescript
// lib/queries/projects.ts

import { createClient } from '@/lib/supabase/client';
import { Project, ProjectFormValues } from '@/types/database';

export async function getProjects() {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      clients(company_name),
      scope_items(id, status)
    `)
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getProjectById(id: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      clients(*),
      project_assignments(user_id, users(name, email)),
      milestones(*),
      scope_items(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createProject(values: ProjectFormValues) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('projects')
    .insert(values)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProject(id: string, values: Partial<ProjectFormValues>) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('projects')
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProject(id: string) {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('projects')
    .update({ is_deleted: true })
    .eq('id', id);

  if (error) throw error;
}
```

---

## Validation Schema Pattern

```typescript
// lib/validations/project.ts

import { z } from 'zod';

export const projectSchema = z.object({
  project_code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(20, 'Code must be at most 20 characters'),
  name: z
    .string()
    .min(2, 'Name is required'),
  client_id: z
    .string()
    .uuid()
    .optional(),
  status: z
    .enum(['tender', 'active', 'on_hold', 'completed', 'cancelled'])
    .default('tender'),
  currency: z
    .enum(['TRY', 'USD', 'EUR'])
    .default('TRY'),
  installation_date: z
    .date()
    .optional(),
  description: z
    .string()
    .optional(),
  contract_value_manual: z
    .number()
    .min(0)
    .optional(),
});

export type ProjectFormValues = z.infer<typeof projectSchema>;
```

---

## Next Document

→ Continue to [06-Supabase-Setup.md](./06-Supabase-Setup.md) for database setup.
