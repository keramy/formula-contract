# Formula Contract - Component Library
## Document 02: UI Components Specification

**Version:** 1.0  
**Framework:** shadcn/ui + custom components  
**Style:** Notion-inspired

---

## Table of Contents

1. [shadcn/ui Components to Install](#1-shadcnui-components-to-install)
2. [Layout Components](#2-layout-components)
3. [Navigation Components](#3-navigation-components)
4. [Form Components](#4-form-components)
5. [Data Display Components](#5-data-display-components)
6. [Feedback Components](#6-feedback-components)
7. [Custom Components](#7-custom-components)
8. [Component Patterns](#8-component-patterns)

---

## 1. shadcn/ui Components to Install

### Required Components (Install All)

Run these commands in order:

```bash
# Initialize shadcn/ui (if not done)
npx shadcn@latest init

# Core components
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add card
npx shadcn@latest add badge
npx shadcn@latest add avatar
npx shadcn@latest add separator

# Form components
npx shadcn@latest add form
npx shadcn@latest add select
npx shadcn@latest add textarea
npx shadcn@latest add checkbox
npx shadcn@latest add switch
npx shadcn@latest add calendar
npx shadcn@latest add popover
npx shadcn@latest add date-picker

# Navigation
npx shadcn@latest add dropdown-menu
npx shadcn@latest add dialog
npx shadcn@latest add sheet
npx shadcn@latest add tabs
npx shadcn@latest add breadcrumb
npx shadcn@latest add sidebar
npx shadcn@latest add collapsible

# Data display
npx shadcn@latest add table
npx shadcn@latest add progress
npx shadcn@latest add skeleton
npx shadcn@latest add scroll-area

# Feedback
npx shadcn@latest add alert
npx shadcn@latest add alert-dialog
npx shadcn@latest add toast
npx shadcn@latest add tooltip

# Utility
npx shadcn@latest add command
npx shadcn@latest add sonner
```

### Icons Library

```bash
npm install lucide-react
```

---

## 2. Layout Components

### 2.1 AppShell

**Location:** `components/layout/app-shell.tsx`

**Purpose:** Main layout wrapper with sidebar

**Structure:**
```tsx
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

interface AppShellProps {
  children: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export function AppShell({ children, breadcrumbs = [] }: AppShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem>
                    {crumb.href ? (
                      <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

### 2.2 PageHeader

**Location:** `components/layout/page-header.tsx`

**Purpose:** Consistent page title and actions area

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| title | string | Yes | Page title |
| description | string | No | Subtitle/description |
| actions | ReactNode | No | Action buttons |

**Structure:**
```tsx
interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
```

### 2.3 PageContainer

**Location:** `components/layout/page-container.tsx`

**Purpose:** Consistent page padding and max-width

```tsx
interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn("max-w-7xl mx-auto", className)}>
      {children}
    </div>
  );
}
```

---

## 3. Navigation Components

### 3.1 AppSidebar

**Location:** `components/layout/app-sidebar.tsx`

**Purpose:** Main navigation sidebar (collapsible)

**Navigation Items:**
```typescript
const navigationItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    title: "Projects",
    icon: FolderKanban,
    href: "/projects",
  },
  {
    title: "Reports",
    icon: FileText,
    href: "/reports",
  },
  {
    title: "Notifications",
    icon: Bell,
    href: "/notifications",
    badge: true, // Show unread count
  },
];

const adminItems = [
  {
    title: "Users",
    icon: Users,
    href: "/users",
  },
];
```

**Structure:**
```tsx
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { 
  LayoutDashboard, 
  FolderKanban, 
  FileText, 
  Bell, 
  Users,
  LogOut,
  Settings
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function AppSidebar() {
  const { user } = useAuth(); // Your auth hook
  
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <span className="text-sm font-bold">FC</span>
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Formula Contract</span>
                  <span className="text-xs text-muted-foreground">Project Management</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild>
                    <a href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        {user?.role === 'admin' && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild>
                      <a href={item.href}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-medium">{user?.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">{user?.role}</span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  );
}
```

---

## 4. Form Components

### 4.1 FormField (Standard Pattern)

**Usage with react-hook-form + zod:**

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

// Schema
const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
});

// Component
export function ExampleForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* More fields */}
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
```

### 4.2 SearchInput

**Location:** `components/ui/search-input.tsx`

**Purpose:** Search field with icon

```tsx
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({ 
  value, 
  onChange, 
  placeholder = "Search...",
  className 
}: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-9"
      />
      {value && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
          onClick={() => onChange("")}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
```

### 4.3 DatePicker

**Usage:**
```tsx
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DatePickerProps {
  date: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  placeholder?: string;
}

export function DatePicker({ date, onSelect, placeholder = "Pick a date" }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
```

---

## 5. Data Display Components

### 5.1 StatusBadge

**Location:** `components/ui/status-badge.tsx`

**Purpose:** Consistent status display

```tsx
import { Badge } from "@/components/ui/badge";
import { cva, type VariantProps } from "class-variance-authority";

const statusBadgeVariants = cva(
  "font-medium",
  {
    variants: {
      variant: {
        // Project statuses
        tender: "bg-[#fef3c7] text-[#92400e] border-[#f59e0b]",
        active: "bg-[#dbeafe] text-[#1e40af] border-[#2563eb]",
        on_hold: "bg-[#f3f4f6] text-[#4b5563] border-[#9ca3af]",
        completed: "bg-[#d1fae5] text-[#065f46] border-[#10b981]",
        cancelled: "bg-[#fee2e2] text-[#991b1b] border-[#ef4444]",
        
        // Item statuses
        pending: "bg-[#f9fafb] text-[#6b7280] border-[#e5e7eb]",
        in_design: "bg-[#dbeafe] text-[#1e40af] border-[#2563eb]",
        awaiting_approval: "bg-[#fef3c7] text-[#92400e] border-[#f59e0b]",
        approved: "bg-[#d1fae5] text-[#065f46] border-[#10b981]",
        in_production: "bg-[#e0e7ff] text-[#3730a3] border-[#6366f1]",
        complete: "bg-[#d1fae5] text-[#065f46] border-[#10b981]",
        
        // Approval statuses
        sent_to_client: "bg-[#fef3c7] text-[#92400e] border-[#f59e0b]",
        rejected: "bg-[#fee2e2] text-[#991b1b] border-[#ef4444]",
        approved_with_comments: "bg-[#fef9c3] text-[#854d0e] border-[#eab308]",
        
        // Procurement statuses
        pm_approval: "bg-[#f3e8ff] text-[#6b21a8] border-[#9333ea]",
        not_ordered: "bg-[#f9fafb] text-[#6b7280] border-[#e5e7eb]",
        ordered: "bg-[#dbeafe] text-[#1e40af] border-[#2563eb]",
        received: "bg-[#d1fae5] text-[#065f46] border-[#10b981]",
        
        // Path types
        production: "bg-[#dbeafe] text-[#1e40af] border-[#2563eb]",
        procurement: "bg-[#f3e8ff] text-[#6b21a8] border-[#9333ea]",
      },
    },
    defaultVariants: {
      variant: "pending",
    },
  }
);

interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  children: React.ReactNode;
  className?: string;
}

export function StatusBadge({ variant, children, className }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn(statusBadgeVariants({ variant }), className)}>
      {children}
    </Badge>
  );
}
```

**Usage:**
```tsx
<StatusBadge variant="approved">Approved</StatusBadge>
<StatusBadge variant="production">Production</StatusBadge>
<StatusBadge variant="tender">Tender</StatusBadge>
```

### 5.2 DataTable

**Location:** `components/ui/data-table.tsx`

**Purpose:** Reusable table with sorting, filtering

```tsx
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
  ColumnFiltersState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchValue?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchValue,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  React.useEffect(() => {
    if (searchKey && searchValue !== undefined) {
      setColumnFilters([{ id: searchKey, value: searchValue }]);
    }
  }, [searchKey, searchValue]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
    },
  });

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
```

### 5.3 ProgressBar

**Location:** `components/ui/progress-bar.tsx`

**Purpose:** Production percentage display

```tsx
import { Progress } from "@/components/ui/progress";

interface ProgressBarProps {
  value: number; // 0-100
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ProgressBar({ 
  value, 
  showLabel = true, 
  size = "md",
  className 
}: ProgressBarProps) {
  const heights = {
    sm: "h-1.5",
    md: "h-2",
    lg: "h-3",
  };

  const getColor = (val: number) => {
    if (val === 100) return "bg-[#10b981]"; // Success green
    if (val >= 50) return "bg-[#2563eb]"; // Primary blue
    return "bg-[#f59e0b]"; // Warning yellow
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Progress 
        value={value} 
        className={cn(heights[size], "flex-1")}
        indicatorClassName={getColor(value)}
      />
      {showLabel && (
        <span className="text-sm font-medium text-muted-foreground w-10 text-right">
          {value}%
        </span>
      )}
    </div>
  );
}
```

### 5.4 EmptyState

**Location:** `components/ui/empty-state.tsx`

**Purpose:** Empty list/table state

```tsx
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && (
        <p className="text-muted-foreground mt-1 max-w-sm">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
    </div>
  );
}
```

### 5.5 StatsCard

**Location:** `components/ui/stats-card.tsx`

**Purpose:** Dashboard statistics display

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatsCard({ title, value, description, icon: Icon, trend }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <p className={cn(
            "text-xs mt-1",
            trend.isPositive ? "text-green-600" : "text-red-600"
          )}>
            {trend.isPositive ? "+" : ""}{trend.value}% from last month
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## 6. Feedback Components

### 6.1 ConfirmDialog

**Location:** `components/ui/confirm-dialog.tsx`

**Purpose:** Confirmation before destructive actions

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: "default" | "destructive";
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  variant = "default",
  loading = false,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={variant === "destructive" ? "bg-destructive hover:bg-destructive/90" : ""}
            disabled={loading}
          >
            {loading ? "Loading..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### 6.2 Toast Usage

**Setup in layout:**
```tsx
import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

**Usage:**
```tsx
import { toast } from "sonner";

// Success
toast.success("Project created successfully");

// Error
toast.error("Failed to save changes");

// With description
toast.success("Project created", {
  description: "You can now add scope items",
});

// Promise toast (for async operations)
toast.promise(saveProject(), {
  loading: "Saving...",
  success: "Project saved",
  error: "Failed to save",
});
```

---

## 7. Custom Components

### 7.1 FileUpload

**Location:** `components/ui/file-upload.tsx`

**Purpose:** File upload with preview

```tsx
import { Upload, X, FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  files: File[];
  onFilesChange: (files: File[]) => void;
  maxSize?: number; // in MB
}

export function FileUpload({
  accept = "*",
  multiple = false,
  files,
  onFilesChange,
  maxSize = 10,
}: FileUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    
    // Filter by size
    const validFiles = newFiles.filter(
      (file) => file.size <= maxSize * 1024 * 1024
    );
    
    if (multiple) {
      onFilesChange([...files, ...validFiles]);
    } else {
      onFilesChange(validFiles.slice(0, 1));
    }
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
      >
        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          Click to upload or drag and drop
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Max file size: {maxSize}MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          className="hidden"
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-muted rounded-lg"
            >
              <div className="flex items-center gap-3">
                <FileIcon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 7.2 ImageGallery

**Location:** `components/ui/image-gallery.tsx`

**Purpose:** Display multiple images with lightbox

```tsx
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageGalleryProps {
  images: { url: string; name: string }[];
  columns?: 2 | 3 | 4 | 6;
}

export function ImageGallery({ images, columns = 3 }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);

  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    6: "grid-cols-6",
  };

  return (
    <>
      <div className={cn("grid gap-2", gridCols[columns])}>
        {images.map((image, index) => (
          <div
            key={index}
            onClick={() => setSelectedIndex(index)}
            className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
          >
            <img
              src={image.url}
              alt={image.name}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>

      <Dialog open={selectedIndex !== null} onOpenChange={() => setSelectedIndex(null)}>
        <DialogContent className="max-w-4xl p-0">
          {selectedIndex !== null && (
            <div className="relative">
              <img
                src={images[selectedIndex].url}
                alt={images[selectedIndex].name}
                className="w-full h-auto"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => setSelectedIndex(null)}
              >
                <X className="h-4 w-4" />
              </Button>
              {selectedIndex > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2"
                  onClick={() => setSelectedIndex(selectedIndex - 1)}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
              )}
              {selectedIndex < images.length - 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setSelectedIndex(selectedIndex + 1)}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
```

---

## 8. Component Patterns

### 8.1 Loading States

**Always use skeletons for loading:**
```tsx
import { Skeleton } from "@/components/ui/skeleton";

// Card skeleton
<Card>
  <CardHeader>
    <Skeleton className="h-6 w-1/3" />
  </CardHeader>
  <CardContent className="space-y-2">
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-2/3" />
  </CardContent>
</Card>

// Table skeleton
<TableRow>
  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
</TableRow>
```

### 8.2 Error States

**Always handle errors gracefully:**
```tsx
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>
    Failed to load data. Please try again.
  </AlertDescription>
</Alert>
```

### 8.3 Button Variants

| Variant | Usage |
|---------|-------|
| `default` | Primary actions |
| `secondary` | Secondary actions |
| `outline` | Tertiary actions |
| `ghost` | Subtle actions (in tables, cards) |
| `destructive` | Delete, cancel |
| `link` | Inline links |

### 8.4 Form Layout

**Standard form layout:**
```tsx
<form className="space-y-6">
  {/* Two columns on large screens */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <FormField ... />
    <FormField ... />
  </div>
  
  {/* Full width */}
  <FormField ... />
  
  {/* Actions */}
  <div className="flex justify-end gap-2">
    <Button variant="outline">Cancel</Button>
    <Button type="submit">Save</Button>
  </div>
</form>
```

---

## Next Document

→ Continue to [03-Page-Specifications.md](./03-Page-Specifications.md) for page layouts.
