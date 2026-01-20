# Technical Architecture

> **Last Updated:** January 20, 2026

---

## Overview

Formula Contract follows a modern Next.js App Router architecture with Supabase as the backend. The app is designed for role-based access with a clear separation between server and client components.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Browser                           │
├─────────────────────────────────────────────────────────────────┤
│  React Components (Client)     │    Server Components            │
│  ─────────────────────────     │    ─────────────────            │
│  • Interactive UI              │    • Initial data fetch         │
│  • Form handling               │    • Page rendering             │
│  • React Query mutations       │    • Auth validation            │
│  • Zustand state               │                                 │
├─────────────────────────────────────────────────────────────────┤
│                        Next.js App Router                        │
│  • Route Groups: (auth), (dashboard)                            │
│  • Middleware: Auth protection                                   │
│  • Server Actions: Data mutations                                │
├─────────────────────────────────────────────────────────────────┤
│                          Supabase                                │
│  ┌──────────────┬──────────────┬──────────────┬───────────────┐ │
│  │  PostgreSQL  │     Auth     │   Storage    │  Row Level    │ │
│  │   Database   │   (JWT)      │   (Files)    │   Security    │ │
│  └──────────────┴──────────────┴──────────────┴───────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Architectural Decisions

### 1. Next.js App Router

**Why:** App Router provides React Server Components, streaming, and a cleaner routing model.

**Pattern:**
- Server Components for initial data fetching
- Client Components only where interactivity is needed
- Route groups for layout organization: `(auth)`, `(dashboard)`

```typescript
// Server Component (default)
async function ProjectPage({ params }) {
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("*").eq("id", params.id);
  return <ProjectDetail project={data} />;
}

// Client Component (explicit)
"use client";
function EditButton() {
  const [open, setOpen] = useState(false);
  return <Button onClick={() => setOpen(true)}>Edit</Button>;
}
```

### 2. Server Actions for Mutations

**Why:** Colocate mutation logic with the server, avoid API routes, maintain type safety.

**Pattern:**
```typescript
// src/lib/actions/projects.ts
"use server";

export async function updateProject(id: string, formData: FormData) {
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Mutation
  const { error } = await supabase.from("projects").update({...}).eq("id", id);
  if (error) throw error;

  // Revalidate
  revalidatePath(`/projects/${id}`);
}
```

### 3. React Query for Server State

**Why:** Handles caching, background updates, optimistic updates, and loading states.

**Pattern:**
```typescript
// Queries - for reading data
const { data, isLoading } = useQuery({
  queryKey: ["materials", projectId],
  queryFn: () => getMaterials(projectId),
});

// Mutations - for writing data
const mutation = useMutation({
  mutationFn: createMaterial,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["materials"] });
  },
});
```

### 4. Zustand for Client State

**Why:** Simple, lightweight, no boilerplate. Used sparingly for UI state.

**Usage:** Sheet open/close state, filters, UI preferences.

### 5. Supabase Row Level Security (RLS)

**Why:** Authorization at the database level. Even if app code has bugs, data is protected.

**Pattern:**
```sql
-- Users can only see their assigned projects
CREATE POLICY "Users can view assigned projects"
ON projects FOR SELECT
USING (
  (SELECT is_admin()) OR
  id IN (
    SELECT project_id FROM project_assignments
    WHERE user_id = (SELECT auth.uid())
  )
);
```

---

## Data Flow Patterns

### Reading Data (Server Component)

```
User Request
    │
    ▼
Server Component
    │
    ├── createClient() (server)
    │
    ▼
Supabase Query
    │
    ├── RLS Policy Check
    │
    ▼
Data Returned
    │
    ▼
Render HTML
    │
    ▼
Send to Browser
```

### Writing Data (Server Action + React Query)

```
User Action (button click)
    │
    ▼
React Query Mutation
    │
    ├── Optimistic Update (optional)
    │
    ▼
Server Action
    │
    ├── Auth Check
    ├── Supabase Mutation
    ├── RLS Policy Check
    │
    ▼
Success/Error
    │
    ▼
Invalidate Queries
    │
    ▼
UI Updates
```

---

## Component Patterns

### Sheet Pattern (Quick Actions)

Use shadcn Sheet for quick add/edit without full page navigation:

```tsx
// Parent component controls open state
const [sheetOpen, setSheetOpen] = useState(false);
const [editingId, setEditingId] = useState<string | null>(null);

<Button onClick={() => setSheetOpen(true)}>Add Item</Button>

<ScopeItemSheet
  open={sheetOpen}
  onOpenChange={setSheetOpen}
  itemId={editingId}
  onSuccess={() => setEditingId(null)}
/>
```

### Table Pattern

Use TanStack Table with column definitions:

```tsx
const columns: ColumnDef<ScopeItem>[] = [
  { accessorKey: "item_code", header: "Code" },
  { accessorKey: "name", header: "Name" },
  {
    id: "actions",
    cell: ({ row }) => <ActionsDropdown item={row.original} />,
  },
];

<DataTable columns={columns} data={items} />
```

### Form Pattern

Always use react-hook-form + zod:

```tsx
const schema = z.object({
  name: z.string().min(1, "Required"),
  quantity: z.number().min(1),
});

function MyForm() {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
```

---

## File Organization

### Route Groups

```
app/
├── (auth)/                 # No sidebar, public layout
│   ├── login/
│   ├── forgot-password/
│   └── layout.tsx          # Auth layout
│
├── (dashboard)/            # With sidebar, protected
│   ├── dashboard/
│   ├── projects/
│   │   ├── page.tsx        # List
│   │   ├── new/page.tsx    # Create
│   │   └── [id]/           # Detail
│   │       ├── page.tsx    # Overview tab
│   │       ├── scope/      # Scope items tab
│   │       └── reports/    # Reports tab
│   └── layout.tsx          # Dashboard layout
```

### Component Organization

```
components/
├── ui/                     # shadcn/ui primitives
│   ├── button.tsx
│   ├── card.tsx
│   └── ...
│
├── layout/                 # App-wide layout
│   ├── app-sidebar.tsx
│   ├── header.tsx
│   └── nav-user.tsx
│
├── projects/               # Project feature
│   ├── project-card.tsx
│   ├── project-form.tsx
│   └── projects-table.tsx
│
├── scope-items/            # Scope items feature
│   ├── scope-item-sheet.tsx
│   ├── scope-items-table.tsx
│   └── scope-item-image-upload.tsx
```

### Server Actions Organization

```
lib/actions/
├── index.ts                # Central exports
├── auth.ts                 # Auth actions
├── users.ts                # User CRUD
├── projects.ts             # Project CRUD
├── scope-items.ts          # Scope item CRUD
├── materials.ts            # Material CRUD
├── reports.ts              # Report CRUD
└── project-assignments.ts  # Assignment management
```

---

## Security Architecture

### Authentication Flow

1. User submits credentials
2. Supabase Auth validates
3. JWT issued with user claims
4. JWT stored in HTTP-only cookie
5. Middleware validates JWT on protected routes

### Authorization Layers

| Layer | Mechanism | Purpose |
|-------|-----------|---------|
| Route | Middleware | Block unauthenticated access |
| Action | Auth check | Verify user before mutation |
| Database | RLS Policies | Enforce data-level permissions |

### RLS Helper Functions

```sql
-- Check if user is admin
CREATE FUNCTION is_admin() RETURNS boolean AS $$
  SELECT role = 'admin' FROM users WHERE id = (SELECT auth.uid())
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Check project assignment
CREATE FUNCTION is_assigned_to_project(p_id uuid) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_assignments
    WHERE project_id = p_id AND user_id = (SELECT auth.uid())
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;
```

---

## Performance Considerations

### Database

- **Indexes:** All FK columns indexed
- **RLS InitPlan:** Use `(SELECT auth.uid())` not `auth.uid()`
- **Partial indexes:** For nullable FK columns

### Frontend

- **Server Components:** Reduce client JS bundle
- **React Query caching:** Avoid redundant fetches
- **Image optimization:** Next.js Image component
- **Code splitting:** Dynamic imports for heavy components

### Queries

```typescript
// Efficient: Select only needed fields
const { data } = await supabase
  .from("projects")
  .select("id, name, status")
  .eq("is_deleted", false);

// Efficient: Batch related data
const { data } = await supabase
  .from("projects")
  .select(`
    *,
    client:clients(company_name),
    items:scope_items(count)
  `)
  .eq("id", projectId)
  .single();
```

---

## Error Handling

### Server Actions

```typescript
export async function updateProject(id: string, data: ProjectData) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("projects").update(data).eq("id", id);

    if (error) {
      console.error("Supabase error:", error);
      throw new Error("Failed to update project");
    }

    revalidatePath(`/projects/${id}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### React Query

```typescript
const mutation = useMutation({
  mutationFn: updateProject,
  onError: (error) => {
    toast.error(error.message);
  },
  onSuccess: () => {
    toast.success("Project updated");
    queryClient.invalidateQueries({ queryKey: ["projects"] });
  },
});
```

---

## Testing Strategy

### Unit Tests
- Utility functions
- Form validation schemas
- Data transformation functions

### Integration Tests
- Server actions with mocked Supabase
- Component rendering with mock data

### E2E Tests (Playwright)
- Critical user flows
- Role-based access scenarios
- Form submissions

---

## Future Considerations

### Scaling

- **Database:** Supabase handles scaling, consider read replicas for heavy read loads
- **Edge Functions:** Move complex logic to Supabase Edge Functions
- **CDN:** Static assets via Vercel CDN

### Features

- **Real-time:** Supabase Realtime for live updates
- **Email:** Resend or similar for transactional emails
- **PDF Generation:** React-PDF for reports
- **Mobile:** Consider React Native with shared types
