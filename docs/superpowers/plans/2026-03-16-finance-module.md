# Finance Module Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Accounts Payable + Receivable module for company-wide payment tracking — suppliers, invoices, partial payments, approval workflow, recurring templates, document uploads, and weekly digest notifications.

**Architecture:** Independent module under `/finance/*` with whitelist-based access control (not role-based). Follows the CRM module pattern exactly — server components for auth guards, client components for data via React Query, server actions for mutations. Database uses same soft-delete, auto-code trigger, and RLS patterns as CRM.

**Tech Stack:** Next.js App Router, TypeScript, Supabase (PostgreSQL + RLS + Storage), React Query, react-hook-form + Zod, shadcn/ui, TanStack Table, Tailwind v4.

---

## File Structure

### New Files to Create

```
supabase/migrations/
  052_finance_module.sql                          # All tables, sequences, triggers, RLS, indexes, views

src/types/
  finance.ts                                      # All type definitions + constants

src/lib/validations/
  finance.ts                                      # All Zod schemas

src/lib/actions/
  finance.ts                                      # All server actions
  __tests__/finance.test.ts                       # Server action tests

src/lib/react-query/
  finance.ts                                      # All React Query hooks
  __tests__/finance.test.ts                       # Hook tests

src/app/(dashboard)/finance/
  page.tsx                                        # Dashboard (server guard + client component)
  finance-dashboard.tsx                           # Dashboard client component (KPIs, cash flow chart)
  access/
    page.tsx                                      # Access management (admin only)
    finance-access-manager.tsx                    # Whitelist management component
  suppliers/
    page.tsx                                      # Supplier list (server guard)
    suppliers-table.tsx                            # Table + mobile cards + sheet trigger
    supplier-sheet.tsx                             # Create/edit supplier form
  invoices/
    page.tsx                                      # Invoice list (server guard)
    invoices-table.tsx                             # Table with status badges, aging colors
    invoice-sheet.tsx                              # Create/edit invoice form
    [id]/
      page.tsx                                    # Invoice detail (payments list, upload, approve)
      invoice-detail.tsx                          # Detail client component
  receivables/
    page.tsx                                      # Receivable list (server guard)
    receivables-table.tsx                         # Table with client names, amounts
    receivable-sheet.tsx                           # Create/edit receivable form
    [id]/
      page.tsx                                    # Receivable detail (incoming payments)
      receivable-detail.tsx                       # Detail client component
  recurring/
    page.tsx                                      # Recurring templates (server guard)
    recurring-table.tsx                           # Template list
    recurring-sheet.tsx                            # Create/edit template form

src/lib/pdf/
  finance-payment-schedule.tsx                    # PDF generator — grouped by supplier, print-ready

src/lib/excel/
  finance-export.ts                               # Excel export — invoices, receivables, payment schedule

src/app/api/cron/
  finance-digest/
    route.ts                                      # API route for weekly digest (triggered by pg_cron)

src/emails/
  finance-summary.tsx                             # Summary email (short table + PDF attached)
  finance-urgent.tsx                              # Urgent email (short table + PDF attached)
```

### Files to Modify

```
src/components/app-sidebar.tsx                    # Update routePermissions for /finance (whitelist-aware)
supabase/migrations/052_finance_module.sql        # pg_cron job for weekly digest (in same migration)
```

---

## Database Design

### Entity Relationship

```
finance_access (whitelist)
  └── users (FK)

finance_categories
  (standalone lookup table)

finance_suppliers
  ├── finance_invoices (1:many)
  │     ├── finance_payments (1:many, direction='outgoing')
  │     └── finance_documents (1:many)
  └── (no direct link to projects — independent)

clients (existing table)
  └── finance_receivables (1:many)
        └── finance_payments (1:many, direction='incoming')

finance_recurring_templates
  └── finance_suppliers (FK, for auto-creating invoices)
```

### Tables

**`finance_access`** — Whitelist of users who can access the finance module
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK → users | UNIQUE, ON DELETE CASCADE |
| can_approve | BOOLEAN DEFAULT false | Can approve outgoing payments |
| granted_by | UUID FK → users | Who added them |
| created_at | TIMESTAMPTZ | |

**`finance_categories`** — Expense/income categories
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | TEXT NOT NULL | e.g. "Materials", "Logistics", "Rent" |
| type | TEXT CHECK | 'expense' or 'income' |
| color | TEXT | For UI badges |
| is_deleted | BOOLEAN DEFAULT false | |
| created_at | TIMESTAMPTZ | |

**`finance_suppliers`** — Vendor registry
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| supplier_code | TEXT UNIQUE NOT NULL | Auto-generated: SUP-001 |
| name | TEXT NOT NULL | Company name |
| contact_person | TEXT | |
| phone | TEXT | |
| email | TEXT | |
| category | TEXT CHECK | 'material_supplier', 'service_provider', 'subcontractor' |
| tax_id | TEXT | Tax number |
| iban | TEXT | Bank account |
| bank_name | TEXT | |
| address | TEXT | |
| notes | TEXT | |
| is_deleted | BOOLEAN DEFAULT false | |
| created_at / updated_at | TIMESTAMPTZ | |

**`finance_invoices`** — Accounts Payable (what we owe)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| invoice_code | TEXT UNIQUE NOT NULL | Auto-generated: INV-001 |
| supplier_id | UUID FK → finance_suppliers | NOT NULL |
| category_id | UUID FK → finance_categories | Optional |
| invoice_number | TEXT | Supplier's own invoice number |
| invoice_date | DATE NOT NULL | |
| due_date | DATE NOT NULL | |
| total_amount | NUMERIC(15,2) NOT NULL | |
| currency | TEXT CHECK ('TRY','USD','EUR') | DEFAULT 'TRY' |
| description | TEXT | |
| status | TEXT CHECK | 'pending', 'awaiting_approval', 'approved', 'partially_paid', 'paid', 'overdue', 'cancelled' |
| requires_approval | BOOLEAN DEFAULT false | If true, must be approved before payment |
| approved_by | UUID FK → users | Who approved |
| approved_at | TIMESTAMPTZ | |
| rejection_reason | TEXT | If rejected |
| notes | TEXT | |
| is_deleted | BOOLEAN DEFAULT false | |
| created_at / updated_at | TIMESTAMPTZ | |

**`finance_receivables`** — Accounts Receivable (what clients owe us)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| receivable_code | TEXT UNIQUE NOT NULL | Auto-generated: RCV-001 |
| client_id | UUID FK → clients | NOT NULL |
| category_id | UUID FK → finance_categories | Optional |
| reference_number | TEXT | Our invoice/reference number |
| issue_date | DATE NOT NULL | |
| due_date | DATE NOT NULL | |
| total_amount | NUMERIC(15,2) NOT NULL | |
| currency | TEXT CHECK ('TRY','USD','EUR') | DEFAULT 'TRY' |
| description | TEXT | |
| status | TEXT CHECK | 'pending', 'partially_received', 'received', 'overdue', 'cancelled' |
| notes | TEXT | |
| is_deleted | BOOLEAN DEFAULT false | |
| created_at / updated_at | TIMESTAMPTZ | |

**`finance_payments`** — All money movements (both directions)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| payment_code | TEXT UNIQUE NOT NULL | Auto-generated: PAY-001 |
| direction | TEXT CHECK ('outgoing','incoming') | NOT NULL |
| invoice_id | UUID FK → finance_invoices | NULL if incoming |
| receivable_id | UUID FK → finance_receivables | NULL if outgoing |
| amount | NUMERIC(15,2) NOT NULL | |
| currency | TEXT CHECK ('TRY','USD','EUR') | |
| payment_date | DATE NOT NULL | |
| payment_method | TEXT CHECK | 'bank_transfer', 'cash', 'check', 'credit_card' |
| reference_number | TEXT | Bank ref, check number |
| notes | TEXT | |
| recorded_by | UUID FK → users | Who entered this payment |
| is_deleted | BOOLEAN DEFAULT false | |
| created_at | TIMESTAMPTZ | |

CHECK constraint: `(invoice_id IS NOT NULL AND receivable_id IS NULL) OR (invoice_id IS NULL AND receivable_id IS NOT NULL)`

**`finance_recurring_templates`** — Auto-create invoices
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| template_code | TEXT UNIQUE NOT NULL | Auto-generated: REC-001 |
| supplier_id | UUID FK → finance_suppliers | NOT NULL |
| category_id | UUID FK → finance_categories | Optional |
| description | TEXT NOT NULL | What this recurring payment is for |
| amount | NUMERIC(15,2) NOT NULL | |
| currency | TEXT CHECK ('TRY','USD','EUR') | |
| frequency | TEXT CHECK | 'monthly', 'quarterly', 'yearly' |
| day_of_month | INTEGER CHECK (1-28) | Which day to create invoice |
| next_due_date | DATE NOT NULL | Next auto-creation date |
| is_active | BOOLEAN DEFAULT true | |
| requires_approval | BOOLEAN DEFAULT false | |
| is_deleted | BOOLEAN DEFAULT false | |
| created_at / updated_at | TIMESTAMPTZ | |

**`finance_documents`** — Attached files (invoice PDFs, receipts)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| invoice_id | UUID FK → finance_invoices | NULL if for receivable |
| receivable_id | UUID FK → finance_receivables | NULL if for invoice |
| file_name | TEXT NOT NULL | Original filename |
| file_url | TEXT NOT NULL | Supabase Storage URL |
| file_size | INTEGER | Bytes |
| uploaded_by | UUID FK → users | |
| created_at | TIMESTAMPTZ | |

---

## Chunk 1: Database Migration + Types + Validations

### Task 1.1: Database Migration (052_finance_module.sql)

**Files:**
- Create: `supabase/migrations/052_finance_module.sql`

Follow the exact structure from `049_crm_module.sql`:

- [x] **Step 1: Write table DDL** — All 8 tables with constraints, CHECK enums, foreign keys, comments
- [x] **Step 2: Write sequences + auto-code triggers** — `SUP`, `INV`, `RCV`, `PAY`, `REC` prefixes using existing `sequence_metadata` + `generate_entity_code()` pattern
- [x] **Step 3: Write updated_at triggers** — Reuse `update_updated_at_column()` for all tables with `updated_at`
- [x] **Step 4: Write RLS policies** — Key difference from CRM: use `finance_access` whitelist check instead of role check

```sql
-- Helper function for finance access check
CREATE OR REPLACE FUNCTION has_finance_access()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM finance_access
    WHERE user_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION can_approve_finance()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM finance_access
    WHERE user_id = (SELECT auth.uid()) AND can_approve = true
  );
$$;

-- Example RLS pattern (all finance tables use this):
CREATE POLICY "finance_suppliers_select" ON finance_suppliers
  FOR SELECT TO authenticated
  USING ((SELECT has_finance_access()));

CREATE POLICY "finance_suppliers_insert" ON finance_suppliers
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT has_finance_access()));

-- finance_access table: only admins can manage the whitelist
CREATE POLICY "finance_access_select" ON finance_access
  FOR SELECT TO authenticated
  USING ((SELECT get_user_role()) = 'admin' OR user_id = (SELECT auth.uid()));

CREATE POLICY "finance_access_manage" ON finance_access
  FOR ALL TO authenticated
  USING ((SELECT get_user_role()) = 'admin');
```

- [x] **Step 5: Write indexes** — Partial indexes with `WHERE is_deleted = false`
- [x] **Step 6: Write admin views** — `v_finance_invoices`, `v_finance_receivables`, `v_finance_payments`, `v_finance_suppliers` with human-readable joins

```sql
-- Key computed columns in views:
-- v_finance_invoices: supplier_name, total_paid (SUM of payments), remaining (total_amount - total_paid), days_overdue
-- v_finance_receivables: client_name, total_received, remaining, days_overdue
```

- [x] **Step 7: Seed initial categories**

```sql
INSERT INTO finance_categories (name, type, color) VALUES
  ('Materials', 'expense', '#60a5fa'),
  ('Logistics', 'expense', '#f59e0b'),
  ('Rent', 'expense', '#a78bfa'),
  ('Subcontractor', 'expense', '#f97316'),
  ('Utilities', 'expense', '#94a3b8'),
  ('Services', 'expense', '#ec4899'),
  ('Equipment', 'expense', '#14b8a6'),
  ('Project Payment', 'income', '#22c55e'),
  ('Advance Payment', 'income', '#06b6d4'),
  ('Other Income', 'income', '#8b5cf6');
```

- [x] **Step 8: Create Supabase Storage bucket** — `finance-documents` bucket (or reuse pattern from drawings)

Note: Finance documents do NOT use the `{project_id}/` path prefix since this module is project-independent. Storage path: `finance-documents/{invoice_id or receivable_id}/{filename}`. You'll need a separate storage policy that checks `has_finance_access()`.

- [x] **Step 9: Commit**

```bash
git add supabase/migrations/052_finance_module.sql
git commit -m "feat(finance): add database migration — 8 tables, RLS, triggers, views"
```

---

### Task 1.2: TypeScript Types

**Files:**
- Create: `src/types/finance.ts`

Follow `src/types/crm.ts` pattern exactly.

- [x] **Step 1: Define enums as string literal unions**

```typescript
export type SupplierCategory = "material_supplier" | "service_provider" | "subcontractor";
export type InvoiceStatus = "pending" | "awaiting_approval" | "approved" | "partially_paid" | "paid" | "overdue" | "cancelled";
export type ReceivableStatus = "pending" | "partially_received" | "received" | "overdue" | "cancelled";
export type PaymentDirection = "outgoing" | "incoming";
export type PaymentMethod = "bank_transfer" | "cash" | "check" | "credit_card";
export type RecurringFrequency = "monthly" | "quarterly" | "yearly";
export type FinanceCategoryType = "expense" | "income";
```

- [x] **Step 2: Define base row interfaces** — mirror DB columns exactly: `FinanceSupplier`, `FinanceInvoice`, `FinanceReceivable`, `FinancePayment`, `FinanceRecurringTemplate`, `FinanceCategory`, `FinanceAccess`, `FinanceDocument`

- [x] **Step 3: Define extended interfaces with computed/joined fields**

```typescript
export interface FinanceInvoiceWithDetails extends FinanceInvoice {
  supplier?: { name: string; supplier_code: string } | null;
  category?: { name: string; color: string } | null;
  total_paid: number;      // SUM of payments
  remaining: number;       // total_amount - total_paid
  payment_count: number;
  documents?: FinanceDocument[];
}

export interface FinanceReceivableWithDetails extends FinanceReceivable {
  client?: { company_name: string; client_code: string } | null;
  category?: { name: string; color: string } | null;
  total_received: number;
  remaining: number;
  payment_count: number;
}

export interface FinancePaymentWithDetails extends FinancePayment {
  invoice?: { invoice_code: string; supplier_name: string } | null;
  receivable?: { receivable_code: string; client_name: string } | null;
  recorded_by_user?: { name: string } | null;
}

export interface FinanceAccessWithUser extends FinanceAccess {
  user?: { name: string; email: string; role: string } | null;
  granted_by_user?: { name: string } | null;
}
```

- [x] **Step 4: Define dashboard types**

```typescript
export interface FinanceDashboardStats {
  totalPayable: number;          // total outstanding to suppliers
  totalReceivable: number;       // total outstanding from clients
  overduePayable: number;        // overdue amount
  overdueReceivable: number;
  payableCurrency: string;
  thisWeekDue: number;           // amount due this week
  thisWeekDueCount: number;      // number of invoices due this week
  supplierCount: number;
  pendingApprovals: number;      // invoices awaiting approval
  monthlyOutflow: number;        // paid this month
  monthlyInflow: number;         // received this month
}

export interface AgingBucket {
  current: number;    // not yet due
  days30: number;     // 1-30 days overdue
  days60: number;     // 31-60 days overdue
  days90: number;     // 61-90 days overdue
  days90plus: number; // 90+ days overdue
}
```

- [x] **Step 5: Define constants arrays** — `SUPPLIER_CATEGORIES`, `INVOICE_STATUSES`, `RECEIVABLE_STATUSES`, `PAYMENT_METHODS`, `RECURRING_FREQUENCIES`, `CATEGORY_TYPES` (for dropdowns)

- [x] **Step 6: Commit**

```bash
git add src/types/finance.ts
git commit -m "feat(finance): add TypeScript type definitions"
```

---

### Task 1.3: Zod Validation Schemas

**Files:**
- Create: `src/lib/validations/finance.ts`
- Create: `src/lib/validations/__tests__/finance.test.ts`

Follow `src/lib/validations/crm.ts` pattern. Use `z.input<>` for all FormData types.

- [x] **Step 1: Define enum schemas + form schemas**

```typescript
// Schemas needed:
export const supplierSchema = z.object({ ... });        // name required, rest optional
export const invoiceSchema = z.object({ ... });         // supplier_id, invoice_date, due_date, total_amount required
export const receivableSchema = z.object({ ... });      // client_id, issue_date, due_date, total_amount required
export const paymentSchema = z.object({ ... });         // amount, payment_date, payment_method required
export const recurringTemplateSchema = z.object({ ... }); // supplier_id, description, amount, frequency, day_of_month required
export const categorySchema = z.object({ ... });         // name, type required

// All form data types use z.input<>, NOT z.infer<>
export type SupplierFormData = z.input<typeof supplierSchema>;
// ... etc
```

Key validations:
- `total_amount` / `amount`: `z.number().positive("Amount must be greater than 0")`
- `due_date` must be a valid date string
- `day_of_month`: `z.number().int().min(1).max(28)` (avoid 29-31 for recurring)
- `iban`: optional, no strict format validation (varies by country)
- `payment_date`: required, cannot be in the future (for recording actual payments)

- [x] **Step 2: Write validation tests** — test required fields, edge cases (negative amounts, future dates for payments)

- [x] **Step 3: Commit**

```bash
git add src/lib/validations/finance.ts src/lib/validations/__tests__/finance.test.ts
git commit -m "feat(finance): add Zod validation schemas and tests"
```

---

## Chunk 2: Server Actions + React Query

### Task 2.1: Server Actions

**Files:**
- Create: `src/lib/actions/finance.ts`
- Create: `src/lib/actions/__tests__/finance.test.ts`

Follow `src/lib/actions/crm.ts` pattern. Key difference: use `requireFinanceAccess()` instead of `requireCrmAccess()`.

- [x] **Step 1: Write access control helper**

```typescript
async function requireFinanceAccess(requireApproval = false) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" as const, supabase: null, user: null };

  // Check whitelist
  const { data: access } = await supabase
    .from("finance_access")
    .select("can_approve")
    .eq("user_id", user.id)
    .single();

  if (!access) return { error: "Not authorized" as const, supabase: null, user: null };
  if (requireApproval && !access.can_approve) {
    return { error: "Approval permission required" as const, supabase: null, user: null };
  }

  return { error: null, supabase, user };
}
```

- [x] **Step 2: Write supplier CRUD** — `getSuppliers()`, `getSupplier(id)`, `createSupplier(input)`, `updateSupplier(id, input)`, `deleteSupplier(id)` (soft delete)

- [x] **Step 3: Write invoice CRUD** — `getInvoices(filters?)`, `getInvoice(id)`, `createInvoice(input)`, `updateInvoice(id, input)`, `deleteInvoice(id)`

Filters should support: `status`, `supplier_id`, `category_id`, `date_range`, `overdue_only`

- [x] **Step 4: Write receivable CRUD** — `getReceivables(filters?)`, `getReceivable(id)`, `createReceivable(input)`, `updateReceivable(id, input)`, `deleteReceivable(id)`

- [x] **Step 5: Write payment actions** — `recordPayment(input)`, `deletePayment(id)`

Critical logic in `recordPayment`:
```typescript
// After inserting payment, update parent status:
// 1. Sum all payments for this invoice/receivable
// 2. If sum >= total_amount → status = 'paid' / 'received'
// 3. If sum > 0 but < total_amount → status = 'partially_paid' / 'partially_received'
// 4. Validate: payment amount cannot exceed remaining balance
```

- [x] **Step 6: Write approval actions** — `approveInvoice(id)`, `rejectInvoice(id, reason)`

```typescript
// Only users with can_approve = true in finance_access
// Sets status from 'awaiting_approval' → 'approved' (or back to 'pending' with reason)
// Logs activity + creates notification for the person who submitted it
```

- [x] **Step 7: Write recurring template CRUD** — `getRecurringTemplates()`, `createRecurringTemplate(input)`, `updateRecurringTemplate(id, input)`, `deleteRecurringTemplate(id)`, `processRecurringTemplates()` (creates invoices when next_due_date <= today)

- [x] **Step 8: Write category CRUD** — `getCategories()`, `createCategory(input)`, `deleteCategory(id)`

- [x] **Step 9: Write access management** — `getFinanceAccessList()`, `grantFinanceAccess(userId, canApprove)`, `revokeFinanceAccess(userId)`, `checkFinanceAccess()` (returns boolean for current user)

These require admin role (NOT finance whitelist — admin manages the whitelist):
```typescript
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", supabase: null, user: null };
  const role = await getUserRoleFromJWT(user, supabase);
  if (role !== "admin") return { error: "Admin required", supabase: null, user: null };
  return { error: null, supabase, user };
}
```

- [x] **Step 10: Write dashboard stats** — `getFinanceDashboardStats()`, `getAgingReport(direction: 'payable' | 'receivable')`

```typescript
// Use Promise.all for parallel queries (same pattern as CRM dashboard)
// thisWeekDue: invoices where due_date BETWEEN now AND end_of_week
```

- [x] **Step 11: Write weekly digest action** — `getWeeklyDigest(userId)`, `sendWeeklyDigestEmails()`

```typescript
// Returns: { dueThisWeek: Invoice[], overdueItems: Invoice[], expectedIncoming: Receivable[], totals: {...} }
// sendWeeklyDigestEmails: iterates finance_access users, calls getWeeklyDigest, sends email via existing email system
```

- [x] **Step 12: Write document upload/delete** — `uploadFinanceDocument(invoiceId | receivableId, files[])`, `deleteFinanceDocument(docId)`

Storage path: `finance-documents/{entity_id}/{timestamp}_{filename}`
(No project_id prefix — this module is project-independent, needs its own storage bucket + policy)

- [x] **Step 13: Write tests** — Test auth guards, CRUD operations, payment status updates, approval flow

- [x] **Step 14: Commit**

```bash
git add src/lib/actions/finance.ts src/lib/actions/__tests__/finance.test.ts
git commit -m "feat(finance): add server actions — CRUD, payments, approvals, digest"
```

---

### Task 2.2: React Query Hooks

**Files:**
- Create: `src/lib/react-query/finance.ts`
- Create: `src/lib/react-query/__tests__/finance.test.ts`

Follow `src/lib/react-query/crm.ts` pattern exactly.

- [x] **Step 1: Define query key factory**

```typescript
export const financeKeys = {
  all: ["finance"] as const,
  access: () => [...financeKeys.all, "access"] as const,
  suppliers: () => [...financeKeys.all, "suppliers"] as const,
  supplierList: () => [...financeKeys.suppliers(), "list"] as const,
  supplierDetail: (id: string) => [...financeKeys.suppliers(), "detail", id] as const,
  invoices: () => [...financeKeys.all, "invoices"] as const,
  invoiceList: (filters?: Record<string, unknown>) => [...financeKeys.invoices(), "list", filters] as const,
  invoiceDetail: (id: string) => [...financeKeys.invoices(), "detail", id] as const,
  receivables: () => [...financeKeys.all, "receivables"] as const,
  receivableList: (filters?: Record<string, unknown>) => [...financeKeys.receivables(), "list", filters] as const,
  receivableDetail: (id: string) => [...financeKeys.receivables(), "detail", id] as const,
  payments: () => [...financeKeys.all, "payments"] as const,
  categories: () => [...financeKeys.all, "categories"] as const,
  recurring: () => [...financeKeys.all, "recurring"] as const,
  dashboard: () => [...financeKeys.all, "dashboard"] as const,
  aging: (direction: string) => [...financeKeys.all, "aging", direction] as const,
};
```

- [x] **Step 2: Write read hooks** — `useSuppliers()`, `useSupplier(id)`, `useInvoices(filters?)`, `useInvoice(id)`, `useReceivables(filters?)`, `useReceivable(id)`, `useCategories()`, `useRecurringTemplates()`, `useFinanceDashboard()`, `useAgingReport(direction)`, `useFinanceAccess()` (for admin page), `useHasFinanceAccess()` (boolean check)

- [x] **Step 3: Write mutation hooks** — `useCreateSupplier()`, `useUpdateSupplier()`, `useDeleteSupplier()`, `useCreateInvoice()`, `useUpdateInvoice()`, `useDeleteInvoice()`, `useRecordPayment()`, `useDeletePayment()`, `useApproveInvoice()`, `useRejectInvoice()`, `useCreateReceivable()`, `useUpdateReceivable()`, `useCreateRecurringTemplate()`, `useUpdateRecurringTemplate()`, `useGrantFinanceAccess()`, `useRevokeFinanceAccess()`, `useCreateCategory()`, `useUploadFinanceDocument()`, `useDeleteFinanceDocument()`

Key: mutations that affect invoices/receivables should invalidate dashboard + aging queries too.

- [x] **Step 4: Write tests**
- [x] **Step 5: Commit**

```bash
git add src/lib/react-query/finance.ts src/lib/react-query/__tests__/finance.test.ts
git commit -m "feat(finance): add React Query hooks"
```

---

## Chunk 3: UI — Access Management + Suppliers

### Task 3.1: Finance Access Management Page (Admin Only)

**Files:**
- Create: `src/app/(dashboard)/finance/access/page.tsx`
- Create: `src/app/(dashboard)/finance/access/finance-access-manager.tsx`

This page is different from other finance pages — it requires `admin` role, NOT finance whitelist.

- [x] **Step 1: Write server guard page**

```typescript
// page.tsx — admin role check (not finance access check)
const profile = await getUserProfileFromJWT(user, supabase);
if (profile.role !== "admin") redirect("/dashboard");
return <FinanceAccessManager />;
```

- [x] **Step 2: Write access manager component**

UI: A simple table showing whitelisted users with columns: Name, Email, Role, Can Approve (toggle), Added By, Date Added, Actions (Remove).

Above the table: a combobox/select to search users and an "Add User" button.

Uses: `useFinanceAccess()`, `useGrantFinanceAccess()`, `useRevokeFinanceAccess()`

- [x] **Step 3: Commit**

```bash
git add src/app/(dashboard)/finance/access/
git commit -m "feat(finance): add access management page (admin)"
```

---

### Task 3.2: Supplier Pages

**Files:**
- Create: `src/app/(dashboard)/finance/suppliers/page.tsx`
- Create: `src/app/(dashboard)/finance/suppliers/suppliers-table.tsx`
- Create: `src/app/(dashboard)/finance/suppliers/supplier-sheet.tsx`

Follow CRM brands pattern: server guard → table with mobile cards → sheet for create/edit.

- [x] **Step 1: Write server guard page**

```typescript
// Check finance access via server action (not role)
const hasAccess = await checkFinanceAccess();
if (!hasAccess) redirect("/dashboard");
return <SuppliersTable />;
```

- [x] **Step 2: Write suppliers table** — Columns: Code, Name, Category, Contact Person, Phone, Email, Invoice Count. Mobile: card layout. Uses `usePageHeader()` for AppHeader with "New Supplier" action button.

- [x] **Step 3: Write supplier sheet** — Form with all supplier fields. Uses `react-hook-form` + `zodResolver(supplierSchema)`. Same pattern as `brand-sheet.tsx`.

- [x] **Step 4: Commit**

```bash
git add src/app/(dashboard)/finance/suppliers/
git commit -m "feat(finance): add supplier management pages"
```

---

## Chunk 4: UI — Invoices (Payable) + Payments + Approval

### Task 4.1: Invoice List Page

**Files:**
- Create: `src/app/(dashboard)/finance/invoices/page.tsx`
- Create: `src/app/(dashboard)/finance/invoices/invoices-table.tsx`
- Create: `src/app/(dashboard)/finance/invoices/invoice-sheet.tsx`

- [x] **Step 1: Write server guard page**
- [x] **Step 2: Write invoices table**

Key UX features:
- Status badge colors: pending (gray), awaiting_approval (amber), approved (blue), partially_paid (orange), paid (green), overdue (red), cancelled (slate)
- Aging color coding: rows overdue > 30 days get subtle red background
- Filter bar: status dropdown, supplier dropdown, category dropdown, date range
- Columns: Code, Supplier, Invoice #, Date, Due Date, Amount, Paid, Remaining, Status
- "Remaining" column: `total_amount - total_paid`, shown in red if overdue

- [x] **Step 3: Write invoice sheet** — Create/edit form. Supplier select (searchable), category select, dates, amount, currency, description. Toggle: "Requires Approval" checkbox.

- [x] **Step 4: Commit**

---

### Task 4.2: Invoice Detail Page (Payments + Approval + Documents)

**Files:**
- Create: `src/app/(dashboard)/finance/invoices/[id]/page.tsx`
- Create: `src/app/(dashboard)/finance/invoices/[id]/invoice-detail.tsx`

This is the most important page — where payments are recorded, documents uploaded, and approvals happen.

- [x] **Step 1: Write server guard page**
- [x] **Step 2: Write invoice detail component**

Layout sections:
```
┌──────────────────────────────────────────────────┐
│ Invoice INV-001 from ABC Materials    [Edit] [⋮] │
│ Status: Partially Paid                           │
├──────────────────────────────────────────────────┤
│ DETAILS                    │ SUMMARY              │
│ Invoice #: SUP-12345      │ Total:    100,000 TRY │
│ Date: 2026-03-01          │ Paid:      40,000 TRY │
│ Due: 2026-03-30           │ Remaining: 60,000 TRY │
│ Category: Materials       │ [Record Payment]      │
│ Supplier: ABC Materials   │                       │
├──────────────────────────────────────────────────┤
│ APPROVAL (if requires_approval)                   │
│ ┌─────────────────────────────────────────────┐  │
│ │ Awaiting approval  [Approve] [Reject]        │  │
│ └─────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────┤
│ PAYMENTS                                         │
│ ┌─────────┬──────────┬────────────┬───────────┐  │
│ │ Date    │ Amount   │ Method     │ Reference │  │
│ │ Mar 10  │ 40,000   │ Bank Trans │ TR-12345  │  │
│ └─────────┴──────────┴────────────┴───────────┘  │
├──────────────────────────────────────────────────┤
│ DOCUMENTS                                        │
│ 📄 invoice_scan.pdf  📄 receipt.jpg  [Upload]    │
└──────────────────────────────────────────────────┘
```

- [x] **Step 3: Write "Record Payment" dialog** — Opens a dialog/sheet with: amount (pre-filled with remaining), date, method, reference. Validates amount <= remaining.

- [x] **Step 4: Write approval section** — Only visible if `requires_approval`. Approve/Reject buttons only for users with `can_approve = true`. Reject requires reason text.

- [x] **Step 5: Write document upload section** — Upload button + file list with delete. Uses same base64 upload pattern as materials.

- [x] **Step 6: Commit**

```bash
git add src/app/(dashboard)/finance/invoices/
git commit -m "feat(finance): add invoice pages — list, detail, payments, approval, documents"
```

---

## Chunk 5: UI — Receivables

### Task 5.1: Receivable Pages

**Files:**
- Create: `src/app/(dashboard)/finance/receivables/page.tsx`
- Create: `src/app/(dashboard)/finance/receivables/receivables-table.tsx`
- Create: `src/app/(dashboard)/finance/receivables/receivable-sheet.tsx`
- Create: `src/app/(dashboard)/finance/receivables/[id]/page.tsx`
- Create: `src/app/(dashboard)/finance/receivables/[id]/receivable-detail.tsx`

Same pattern as invoices but simpler (no approval workflow).

- [x] **Step 1: Write receivables table** — Columns: Code, Client, Reference #, Issue Date, Due Date, Amount, Received, Remaining, Status. Client select uses existing `clients` table.

- [x] **Step 2: Write receivable sheet** — Client select (searchable from existing clients), dates, amount, currency, description.

- [x] **Step 3: Write receivable detail** — Same layout as invoice detail but with "Record Incoming Payment" instead. No approval section. Documents section included.

- [x] **Step 4: Commit**

```bash
git add src/app/(dashboard)/finance/receivables/
git commit -m "feat(finance): add receivable pages — list, detail, incoming payments"
```

---

## Chunk 6: UI — Dashboard + Aging

### Task 6.1: Finance Dashboard

**Files:**
- Create: `src/app/(dashboard)/finance/page.tsx`
- Create: `src/app/(dashboard)/finance/finance-dashboard.tsx`

- [x] **Step 1: Write server guard** — Check `checkFinanceAccess()`, redirect if not whitelisted

- [x] **Step 2: Write dashboard component**

Layout:
```
┌─────────────────────────────────────────────────────────────────┐
│ KPI CARDS (top row)                                             │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────┐│
│ │ Total Payable│ │ Total        │ │ Overdue      │ │ Due This ││
│ │ 500K TRY     │ │ Receivable   │ │ 120K TRY     │ │ Week     ││
│ │              │ │ 800K TRY     │ │ (3 invoices) │ │ 85K TRY  ││
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────┘│
├─────────────────────────────────────────────────────────────────┤
│ CASH FLOW CHART (Recharts BarChart — monthly in vs out)        │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │  ▓▓▓  ░░░   ▓▓▓▓  ░░░░   ▓▓▓▓▓  ░░░░░                    │ │
│ │  Jan       Feb         Mar                                  │ │
│ │  ▓ Outgoing  ░ Incoming                                     │ │
│ └─────────────────────────────────────────────────────────────┘ │
├──────────────────────────────┬──────────────────────────────────┤
│ AGING - PAYABLE (pie/bar)   │ AGING - RECEIVABLE (pie/bar)     │
│ Current: 200K               │ Current: 500K                    │
│ 1-30 days: 100K             │ 1-30 days: 200K                  │
│ 31-60 days: 80K             │ 31-60 days: 80K                  │
│ 61-90 days: 40K             │ 90+: 20K                         │
│ 90+: 0                      │                                  │
├──────────────────────────────┴──────────────────────────────────┤
│ PENDING APPROVALS (list — only if user can_approve)            │
│ INV-045 — ABC Materials — 50,000 TRY — due Mar 20 [Approve]   │
│ INV-048 — XYZ Services — 15,000 EUR — due Mar 25 [Approve]    │
├─────────────────────────────────────────────────────────────────┤
│ UPCOMING DUE (next 7 days)                                     │
│ INV-042 — DEF Supply — 30,000 TRY — due Mar 18                │
│ INV-043 — GHI Ltd — 45,000 EUR — due Mar 20                   │
│ RCV-015 — Hilton — 150,000 USD — expected Mar 19              │
└─────────────────────────────────────────────────────────────────┘
```

Uses `GlassCard` for sections, `GradientIcon` for section headers, Recharts for charts.
Remember: Recharts data needs `[key: string]: string | number` index signature.

- [x] **Step 3: Commit**

```bash
git add src/app/(dashboard)/finance/page.tsx src/app/(dashboard)/finance/finance-dashboard.tsx
git commit -m "feat(finance): add dashboard — KPIs, cash flow chart, aging, upcoming"
```

---

## Chunk 7: UI — Recurring Templates

### Task 7.1: Recurring Template Pages

**Files:**
- Create: `src/app/(dashboard)/finance/recurring/page.tsx`
- Create: `src/app/(dashboard)/finance/recurring/recurring-table.tsx`
- Create: `src/app/(dashboard)/finance/recurring/recurring-sheet.tsx`

- [x] **Step 1: Write recurring table** — Columns: Code, Supplier, Description, Amount, Frequency, Day, Next Due, Active (toggle), Actions

- [x] **Step 2: Write recurring sheet** — Supplier select, description, amount, currency, frequency dropdown, day of month (1-28), requires approval toggle

- [x] **Step 3: Add `processRecurringTemplates` trigger mechanism**

For now, this can be a manual "Process Now" button on the recurring page that calls the server action. In the future, this could be a Supabase Edge Function on a cron schedule.

The server action `processRecurringTemplates()`:
```
1. Query all active templates where next_due_date <= today
2. For each: create a new invoice with status = requires_approval ? 'awaiting_approval' : 'pending'
3. Update template's next_due_date based on frequency
4. Return count of created invoices
```

- [x] **Step 4: Commit**

```bash
git add src/app/(dashboard)/finance/recurring/
git commit -m "feat(finance): add recurring template management"
```

---

## Chunk 8: Three-Tier Notification System (Email + PDF)

All emails use **Resend** (already configured). All payment details live in an **attached PDF**, not in the email body. The email body is a short summary table for quick scanning.

### Task 8.1: Payment Schedule PDF Generator

**Files:**
- Create: `src/lib/pdf/finance-payment-schedule.tsx` (PDF template using existing PDF lib)

The PDF is the **core deliverable** — used by all three notification methods. It's a print-ready document that the accounting person can print and work through.

- [ ] **Step 1: Write PDF template**

Reuse existing PDF generation infrastructure from `src/lib/pdf/`. The PDF contains:

```
┌──────────────────────────────────────────────────────────┐
│  FORMULA INTERNATIONAL                                    │
│  Payment Schedule — Mar 16-22, 2026                       │
│  Generated: Mar 17, 2026 08:00                            │
│                                                           │
│  Note: "Updated — 3 new invoices added since Monday"      │
│  (only shown if sender included a note)                   │
│                                                           │
│  Summary: 485,000 TRY (16) + 95,000 EUR (4)              │
│  Overdue: 3 invoices | Awaiting Approval: 2               │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ⚠ OVERDUE                                                │
│  ─────────────────────────────────────────────────────── │
│                                                           │
│  GHI LTD                                                  │
│  Bank: Ziraat Bankası                                     │
│  IBAN: TR55 0001 0000 0012 3456 78                        │
│                                                           │
│  □ INV-039 | 45,000 EUR | Was due: Mar 9 (7 days late)   │
│    Hardware fittings — Q1 order                           │
│    Supplier Invoice #: GHI-2026-445                       │
│    Category: Materials                                    │
│    Status: ✅ Approved | 📎 1 document                     │
│                                                           │
│  Supplier Total: 45,000 EUR                               │
│                                                           │
│  ─────────────────────────────────────────────────────── │
│  DUE THIS WEEK                                            │
│  ─────────────────────────────────────────────────────── │
│                                                           │
│  ABC MATERIALS A.Ş.                                       │
│  Bank: Garanti BBVA                                       │
│  IBAN: TR12 0006 2000 0001 2345 67                        │
│                                                           │
│  □ INV-045 | 60,000 TRY | Due: Mar 18                    │
│    Marble slabs - Project HLT                             │
│    Supplier Invoice #: SUP-2026-1245                      │
│    Category: Materials                                    │
│    Status: ✅ Approved | 📎 1 document                     │
│                                                           │
│  □ INV-053 | 50,000 TRY | Due: Mar 19                    │
│    Granite countertops batch 4                            │
│    Supplier Invoice #: SUP-2026-1301                      │
│    Category: Materials                                    │
│    Status: ✅ Approved                                     │
│                                                           │
│  Supplier Total: 110,000 TRY                              │
│                                                           │
│  ... (remaining suppliers, grouped)                       │
│                                                           │
├──────────────────────────────────────────────────────────┤
│  GRAND TOTALS                                             │
│  TRY:  485,000  (16 invoices)                             │
│  EUR:   95,000  (4 invoices)                              │
├──────────────────────────────────────────────────────────┤
│  EXPECTED INCOMING                                        │
│  Hilton Hotels | RCV-015 | 150,000 USD | Due: Mar 19     │
│    For: Project HLT-001 Phase 2                           │
│    Received so far: 200,000 / 500,000 USD                 │
│                                                           │
│  Marriott      | RCV-018 |  80,000 EUR | Due: Mar 21     │
│    For: Lobby renovation Phase 1                          │
├──────────────────────────────────────────────────────────┤
│  Generated by Formula Contract — Page 1 of 2              │
└──────────────────────────────────────────────────────────┘
```

PDF details per invoice: supplier name, bank, IBAN, invoice code, amount, remaining,
due date with days, description, supplier's invoice number, category, approval status,
document count, □ checkbox for print tracking.

**Grouped by supplier** — bank/IBAN shown once per supplier, all invoices listed under it.
Supplier subtotals shown. Grand totals by currency at the bottom.

**NOT included in PDF:** Tax ID (not necessary per user feedback).

The same PDF template is used for all three notification methods — just with different
invoice sets (all week, custom range, or hand-picked urgent items).

- [ ] **Step 2: Commit**

```bash
git add src/lib/pdf/finance-payment-schedule.tsx
git commit -m "feat(finance): add payment schedule PDF generator"
```

---

### Task 8.2: Email Templates (Short Summary + PDF Attachment)

**Files:**
- Create: `src/emails/finance-summary.tsx` (React Email template — used for both digest and manual)
- Create: `src/emails/finance-urgent.tsx` (React Email template — used for urgent notify)

Emails are **short and scannable** — all detail is in the attached PDF.

- [ ] **Step 3: Write summary email template**

```
Subject: Formula — Weekly Payments: 20 invoices, 485K TRY + 95K EUR

Note: "Updated — 3 new invoices added since Monday"
(only shown if sender included a note)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 THIS WEEK: 20 payments due | 3 overdue | 2 awaiting approval
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 ⚠️ OVERDUE
  Supplier          Invoice    Remaining    Days
  GHI Ltd           INV-039    45,000 EUR    -7
  MNO Logistics     INV-041    22,000 TRY    -3
  PQR Hardware      INV-044    18,000 TRY    -1

 📅 DUE THIS WEEK
  Supplier          Invoice    Remaining    Due
  ABC Materials     INV-045    60,000 TRY   Mar 18
  XYZ Services      INV-048    85,000 TRY   Mar 18
  DEF Supply        INV-051    50,000 TRY   Mar 19
  ... (all rows, compact table)

 TOTALS BY CURRENCY
  TRY:  485,000  (16 invoices)
  EUR:   95,000  (4 invoices)

 💰 EXPECTED INCOMING
  Hilton Hotels     RCV-015   150,000 USD   Mar 19
  Marriott          RCV-018    80,000 EUR   Mar 21

 📎 Full payment schedule with bank details attached as PDF

              [View Dashboard in App →]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

- [ ] **Step 4: Write urgent email template**

```
Subject: ⚠️ Urgent — 3 payments need processing (180K TRY + 35K EUR)

Sent by: Kerem Çolak
Note: "These suppliers are blocking production. Process today."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Supplier          Invoice    Remaining    Due
  ABC Materials     INV-045    60,000 TRY   Mar 18
  XYZ Services      INV-048    85,000 TRY   Mar 18
  RST Fittings      INV-053    35,000 EUR   Mar 20

 TOTAL: 180,000 TRY + 35,000 EUR

 📎 Payment details with bank info attached as PDF

              [View in App →]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

- [ ] **Step 5: Commit**

```bash
git add src/emails/finance-summary.tsx src/emails/finance-urgent.tsx
git commit -m "feat(finance): add email templates — summary and urgent with PDF attachment"
```

---

### Task 8.3: Three Notification Methods (Server Actions + Cron + UI)

**Files:**
- Modify: `src/lib/actions/finance.ts` (add notification/PDF actions)
- Create: `src/app/api/cron/finance-digest/route.ts` (Vercel Cron)

**Method 1 — Automatic Weekly Digest (every Monday 8 AM)**

- [ ] **Step 6: Write `sendWeeklyDigestEmails()` server action**

```typescript
// 1. Get all users in finance_access
// 2. Collect all invoices due this week + overdue + expected incoming
//    — include full supplier details (name, bank, IBAN)
//    — group by supplier
// 3. Generate PDF buffer using finance-payment-schedule template
// 4. For each whitelisted user:
//    a. Render finance-summary.tsx email (short summary table)
//    b. Send via Resend with PDF attached:
//       filename: "Formula_Payments_{dateRange}.pdf"
//    c. Create in-app notification:
//       "Weekly Finance Summary — 20 payments (485K TRY + 95K EUR) due this week"
// 5. Log activity: "finance_weekly_digest_sent"
```

- [ ] **Step 7: Create API route + pg_cron trigger**

```
Create: src/app/api/cron/finance-digest/route.ts
```

```typescript
// API route that generates and sends the weekly digest.
// Protected by a CRON_SECRET bearer token (env var).
// Triggered by Supabase pg_cron — NOT Vercel Cron.
//
// export async function GET(request: Request) {
//   const authHeader = request.headers.get("authorization");
//   if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
//     return Response.json({ error: "Unauthorized" }, { status: 401 });
//   }
//   const result = await sendWeeklyDigestEmails();
//   return Response.json(result);
// }
```

In the migration (`052_finance_module.sql`), add pg_cron job:

```sql
-- pg_cron: trigger weekly digest every Monday at 08:00 UTC
-- This calls the Next.js API route which handles PDF generation + email sending
-- pg_cron runs inside Supabase, so the trigger is independent of Vercel
SELECT cron.schedule(
  'finance-weekly-digest',
  '0 8 * * 1',  -- Every Monday at 08:00 UTC
  $$
  SELECT net.http_post(
    url := current_setting('app.site_url') || '/api/cron/finance-digest',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.cron_secret')),
    body := '{}'::jsonb
  );
  $$
);
```

Note: `pg_cron` + `pg_net` must be enabled in Supabase dashboard (Extensions).
`app.site_url` and `app.cron_secret` are set as Supabase database settings.

**Method 2 — Manual "Send Payment Summary" Button (dashboard)**

- [ ] **Step 8: Write `sendManualSummary(options)` server action**

```typescript
interface ManualSummaryOptions {
  dateRange: "this_week" | "rest_of_week" | "next_week" | "custom";
  customStart?: string;  // ISO date, only if dateRange === "custom"
  customEnd?: string;
  includeOverdue: boolean;
  includeIncoming: boolean;
  includeAlreadyPaid: boolean;
  note?: string;  // optional message shown at top of email + PDF
}

// Same logic as weekly digest but with configurable date range and filters.
// The note appears at the top of both the email body and the PDF.
// PDF filename: "Formula_Payments_{startDate}-{endDate}.pdf"
// If sent mid-week with note, subject includes "Updated":
//   "Formula — Updated Payment Summary (Mar 16-22) — 23 invoices, 530K TRY + 95K EUR"
```

UI on dashboard: "Send Payment Summary" button opens a dialog:
```
┌──────────────────────────────────────────┐
│ Send Payment Summary                      │
│                                           │
│ Date Range:                               │
│  ○ Rest of this week (Mar 19-22)          │
│  ● This week (Mar 16-22)                  │
│  ○ Next week (Mar 23-29)                  │
│  ○ Custom range...                        │
│                                           │
│ Include:                                  │
│  ☑ Overdue items                          │
│  ☑ Expected incoming                      │
│  ☐ Already paid this week                 │
│                                           │
│ Note (optional):                          │
│ ┌───────────────────────────────────────┐ │
│ │ Updated — 3 new invoices added       │ │
│ │ since Monday                          │ │
│ └───────────────────────────────────────┘ │
│                                           │
│            [Cancel]  [Send Summary]       │
└──────────────────────────────────────────┘
```

**Method 3 — Multi-Select "Notify Team" (invoice table + dashboard)**

- [ ] **Step 9: Write `notifyTeamUrgent(invoiceIds[], note?)` server action**

```typescript
// 1. Fetch all selected invoices with full supplier details (name, IBAN, bank)
// 2. Group by supplier for the PDF
// 3. Generate PDF buffer (same template, just filtered to selected invoices)
// 4. For each whitelisted user:
//    a. Send urgent email via Resend with PDF attached
//       filename: "Formula_Urgent_Payments_{date}.pdf"
//    b. Create in-app notification:
//       "⚠️ Urgent: 3 payments (180K TRY) need processing — from {senderName}"
// 5. Log activity: "finance_urgent_notify_sent" with invoice IDs
```

Two ways to trigger:

**A. Multi-select from invoice table:**
- Checkboxes on the invoice table rows
- When 1+ rows selected, a floating action bar appears: "Notify Team (3 selected)"
- Clicking opens dialog with: selected invoices summary (read-only), note textarea, Send button

**B. "Notify Overdue" button on dashboard:**
- One-click button that auto-selects all overdue + due today invoices
- Opens same dialog pre-filled with those invoices + note field

- [ ] **Step 10: Add notification UI to invoice table and dashboard**

Invoice table additions:
- Row checkboxes (select column)
- Floating action bar when rows selected: "Notify Team ({n})" button
- Notify dialog with invoice summary + note field

Dashboard additions:
- "Send Payment Summary" button in page header actions
- "Notify Overdue" button in the overdue section (only visible if overdue items exist)
- Send Summary dialog (date range + filters + note)

- [ ] **Step 11: Commit**

```bash
git add src/lib/actions/finance.ts src/app/api/cron/finance-digest/ src/emails/ src/lib/pdf/finance-payment-schedule.tsx
git commit -m "feat(finance): add three-tier notifications — auto digest, manual summary, multi-select urgent — all with PDF attachment"
```

---

## Chunk 9: Excel Export

### Task 9.1: Excel Export (In-App Only)

**Files:**
- Create: `src/lib/excel/finance-export.ts`
- Modify: `src/lib/actions/finance.ts` (add export actions)

Uses `exceljs` library for server-side Excel generation. PDF is for emails, Excel is for in-app download only.

- [ ] **Step 1: Install exceljs**

```bash
npm install exceljs
```

- [ ] **Step 2: Write Excel generator functions**

```typescript
// Three export functions, all return a Buffer:

// 1. exportInvoices(filters?) — all invoices matching current table filters
//    Columns: Invoice Code, Supplier, Supplier Invoice #, Date, Due Date,
//    Amount, Currency, Paid, Remaining, Status, Category, Description
//    Filename: Formula_Invoices_{date}.xlsx

// 2. exportReceivables(filters?) — all receivables matching current table filters
//    Columns: Receivable Code, Client, Reference #, Issue Date, Due Date,
//    Amount, Currency, Received, Remaining, Status, Category, Description
//    Filename: Formula_Receivables_{date}.xlsx

// 3. exportPaymentSchedule(dateRange, options) — same data as the PDF
//    Grouped by supplier with IBAN, bank details in columns
//    Columns: Supplier, IBAN, Bank, Invoice Code, Amount, Remaining,
//    Due Date, Description, Supplier Invoice #, Category, Status
//    Auto-filter enabled, column widths auto-sized
//    Subtotal rows per supplier, grand total row at bottom
//    Separate sheet for "Expected Incoming"
//    Filename: Formula_Payment_Schedule_{dateRange}.xlsx
```

Excel styling:
- Header row: bold, colored background matching the app theme
- Overdue rows: light red background
- Currency columns: number format with thousand separators
- Auto-filter on all columns
- Freeze top row (headers always visible when scrolling)

- [ ] **Step 3: Write server actions for download**

```typescript
// Server actions that generate Excel and return base64-encoded buffer:
export async function exportInvoicesToExcel(filters?: InvoiceFilters): Promise<ActionResult<string>>
export async function exportReceivablesToExcel(filters?: ReceivableFilters): Promise<ActionResult<string>>
export async function exportPaymentScheduleToExcel(options: ManualSummaryOptions): Promise<ActionResult<string>>
```

- [ ] **Step 4: Add React Query mutation hooks**

```typescript
export function useExportInvoices() { ... }
export function useExportReceivables() { ... }
export function useExportPaymentSchedule() { ... }
```

- [ ] **Step 5: Add export buttons to UI**

| Page | Button | What it exports |
|------|--------|----------------|
| Invoice table header | "Export" dropdown → "Export to Excel" | Current filtered invoices |
| Receivable table header | "Export" dropdown → "Export to Excel" | Current filtered receivables |
| Finance dashboard | "Export Report" button | Payment schedule (same date range as Send Summary) |

Client-side download helper:
```typescript
// Decode base64 → Blob → trigger download via hidden <a> tag
function downloadExcel(base64: string, filename: string) { ... }
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/excel/finance-export.ts src/lib/actions/finance.ts src/lib/react-query/finance.ts
git commit -m "feat(finance): add Excel export — invoices, receivables, payment schedule"
```

---

## Chunk 10: Sidebar Update + Final Integration

### Task 10.1: Update Sidebar for Whitelist-Aware Access

**Files:**
- Modify: `src/components/app-sidebar.tsx`

- [x] **Step 1: Update sidebar to conditionally show Finance**

The sidebar currently shows Finance for admin/management. Since the whitelist is the real gate, we have two options:

**Option A (Simple):** Keep sidebar as-is. Admin/management see the nav item. Non-whitelisted users get redirected from the page. This is how it works today.

**Option B (Better UX):** Pass `hasFinanceAccess` from the dashboard layout into the sidebar. Only show the Finance nav item if the user is whitelisted.

Recommend **Option A** for v1 — it's simpler and the redirect is graceful. Can upgrade to Option B later.

- [x] **Step 2: Add sub-navigation within finance pages**

Add a tab bar or secondary nav within the finance layout for: Dashboard, Invoices, Receivables, Suppliers, Recurring, Access (admin only).

- [x] **Step 3: Update CLAUDE.md** — Add finance module gotchas, migration 052, enums, access pattern

- [x] **Step 4: Final commit**

```bash
git add src/components/app-sidebar.tsx CLAUDE.md
git commit -m "feat(finance): sidebar integration and documentation"
```

---

## Frontend Design Specification

All designs use existing components — GlassCard, GradientIcon, shadcn/ui, Recharts. Zero new visual patterns.
Design can be refined after initial build — this is the starting point.

### Color Assignments

| Element | Color | Rationale |
|---------|-------|-----------|
| Finance icon (sidebar/headers) | `amber` | WalletIcon, money semantic |
| Paid / Received status | `emerald` | Success — matches "Approved" |
| Overdue | `rose` | Danger — matches "Rejected" |
| Pending / Awaiting Approval | `amber` | Warning — matches "On Hold" |
| Partially Paid | `blue` | Info — in-progress state |
| Incoming (receivables section) | `teal` | Distinct from outgoing |

### Status Badges

```typescript
const INVOICE_STATUS_STYLES: Record<InvoiceStatus, { variant: string; color: string }> = {
  pending:            { variant: "secondary",   color: "gray" },
  awaiting_approval:  { variant: "warning",     color: "amber" },    // with dot
  approved:           { variant: "default",     color: "blue" },
  partially_paid:     { variant: "warning",     color: "orange" },
  paid:               { variant: "default",     color: "emerald" },  // with checkmark
  overdue:            { variant: "destructive", color: "rose" },     // row gets bg-rose-50/30
  cancelled:          { variant: "secondary",   color: "gray" },     // muted text
};
```

### Page Designs

#### 1. Finance Dashboard (`/finance`)

```
AppHeader: GradientIcon amber + "Finance" + "Payment Overview"
Actions: [Send Summary] [Export ▾]

KPI CARDS — grid gap-4 sm:grid-cols-2 lg:grid-cols-4
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ GradientIcon │ │ GradientIcon │ │ GradientIcon │ │ GradientIcon │
│ rose         │ │ teal         │ │ rose         │ │ amber        │
│              │ │              │ │              │ │              │
│ Total        │ │ Total        │ │ Overdue      │ │ Due This     │
│ Payable      │ │ Receivable   │ │              │ │ Week         │
│ 485,000 TRY  │ │ 800,000 TRY  │ │ 120,000 TRY  │ │ 85,000 TRY   │
│ text-2xl     │ │ text-2xl     │ │ text-2xl     │ │ text-2xl     │
│ font-bold    │ │ font-bold    │ │ font-bold    │ │ font-bold    │
│ tabular-nums │ │ tabular-nums │ │ tabular-nums │ │ tabular-nums │
│              │ │              │ │              │ │              │
│ 16 invoices  │ │ 8 clients    │ │ 3 invoices   │ │ 5 invoices   │
│ text-xs muted│ │ text-xs muted│ │ text-xs muted│ │ text-xs muted│
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘

CASH FLOW CHART — GlassCard
  Header: GradientIcon blue + "Cash Flow"
  Recharts BarChart — grouped bars per month
  ▓ Outgoing (rose-400)    ░ Incoming (emerald-400)

AGING — grid gap-4 lg:grid-cols-2
  Left GlassCard: GradientIcon rose + "Aging - Payable"
    Recharts horizontal BarChart (current, 1-30, 31-60, 61-90, 90+)
  Right GlassCard: GradientIcon teal + "Aging - Receivable"
    Same chart for receivables

PENDING APPROVALS — GlassCard (only if user has can_approve)
  Header: GradientIcon amber + "Pending Approvals" + count badge
  List items with [Approve] [Reject] inline buttons

UPCOMING & OVERDUE — GlassCard
  Header: GradientIcon violet + "Upcoming & Overdue"
  Right side: [Notify Overdue] button (only if overdue exists)
  Overdue items: bg-rose-50/50 border-rose-200 subtle tint
  Due items: normal styling
  Incoming items: teal accent

QUICK LINKS — grid gap-3 sm:grid-cols-2 lg:grid-cols-5
  [Invoices →] [Receivables →] [Suppliers →] [Recurring →] [Access →]
```

#### 2. Invoices Table (`/finance/invoices`)

```
AppHeader: GradientIcon amber + "Invoices" + "Accounts Payable"
Actions: [Export ▾] [+ New Invoice]

FILTER BAR — flex flex-col sm:flex-row gap-3
  Status dropdown | Supplier dropdown | Category dropdown | Date range | Search

DESKTOP — GlassCard > Table
  Columns: ☐ | Code | Supplier | Inv # | Due Date | Amount/Remaining | Status
  Overdue rows: bg-rose-50/30 subtle tint
  Sortable columns, click row to navigate to detail

MOBILE — space-y-3, GlassCard per invoice
  ☐ INV-045 — ABC Materials              🟠 Partially Paid
  Marble slabs | SUP-2026-1245
  60,000 / 100,000 TRY    Due: Mar 18 (2 days)
                           [View] [Edit]

FLOATING ACTION BAR — when rows selected (fixed bottom, border-t, backdrop-blur)
  "3 selected"                [Notify Team (3)] [Clear Selection]
```

#### 3. Invoice Detail (`/finance/invoices/[id]`)

```
AppHeader: ← Back | INV-045 — ABC Materials
Actions: [Notify Team] [Edit]

STATUS BANNER (conditional) — bg-rose-50 border-rose-200 rounded-lg p-3
  "⚠ This invoice is 7 days overdue"

LAYOUT — grid gap-5 lg:grid-cols-3

LEFT (lg:col-span-2):

  GlassCard — DETAILS
    GradientIcon blue + "Invoice Details"
    Two-column grid of label:value pairs
    Labels: text-sm text-muted-foreground
    Values: text-sm font-medium

  GlassCard — APPROVAL (only if requires_approval)
    GradientIcon amber + "Approval"
    Status display + [Approve] [Reject] buttons (if can_approve)
    Rejection shows reason, approval shows approver + date

  GlassCard — PAYMENT HISTORY
    GradientIcon emerald + "Payment History"
    Simple table: PAY code | Date | Amount | Method | Reference | 🗑
    Footer: [+ Record Payment] button

  GlassCard — DOCUMENTS
    GradientIcon violet + "Documents" + count badge
    File cards grid: filename, size, [View] [Delete]
    Footer: [+ Upload Document] button

RIGHT (lg:col-span-1):

  GlassCard — SUMMARY (lg:sticky lg:top-20)
    Total          100,000 TRY    text-2xl font-bold
    Paid            70,000 TRY    text-emerald-600
    ──────────────────────────
    Remaining       30,000 TRY    text-lg font-bold text-rose-600

    Progress bar: div h-2 rounded-full bg-base-200
      Inner div: bg-emerald-500, width = paid/total percentage

    Status badge: 🟠 Partially Paid

    Supplier Bank Details:
    Bank: Garanti BBVA
    IBAN: TR12 0006 2000...    [Copy button]

    [Record Payment] — primary button, full width
```

#### 4. Receivables Table + Detail (`/finance/receivables`)

Same layout as Invoices but:
- No checkbox multi-select (no urgent notify for receivables)
- No approval section in detail
- "Record Incoming Payment" instead of "Record Payment"
- Teal accent color for incoming amounts
- Client name from existing `clients` table instead of supplier

#### 5. Suppliers Table (`/finance/suppliers`)

Follows CRM Brands table pattern exactly:
- Desktop: GlassCard > Table (Code, Name, Category, Contact, Phone, Email, Invoice Count)
- Mobile: GlassCard cards with key info
- Sheet (right slide-out) for create/edit
- `usePageHeader()` with "New Supplier" action

#### 6. Recurring Templates (`/finance/recurring`)

Simple table + sheet pattern (like CRM Contacts):
- Columns: Code, Supplier, Description, Amount, Frequency, Day, Next Due, Active (toggle)
- Sheet for create/edit
- "Process Now" button in header to trigger manual processing

#### 7. Access Management (`/finance/access`) — Admin Only

Simple table:
- Columns: Name, Email, Role, Can Approve (toggle switch), Added By, Date Added, [Remove]
- Above table: User search combobox + "Add User" button
- No sheet needed — inline toggle for can_approve, dialog for add

### Dialog Designs

#### Send Summary Dialog (Sheet, right side, max-w-md)

```
"Send Payment Summary"
"Send a summary email with PDF to all finance team members."

Date Range — RadioGroup in GlassCard subtle
  ○ Rest of this week (Mar 19-22)
  ● This week (Mar 16-22)
  ○ Next week (Mar 23-29)
  ○ Custom range... (shows DatePicker if selected)

Include — Checkboxes
  ☑ Overdue items
  ☑ Expected incoming
  ☐ Already paid this week

Note (optional) — Textarea, 3 rows

[Cancel]  [Send Summary + PDF]
```

#### Notify Team Dialog (Dialog, centered modal)

```
"⚠️ Notify Finance Team"

Selected invoices — bg-base-50 rounded-lg p-3
  • INV-045 — ABC Materials — 60,000 TRY
  • INV-048 — XYZ Services — 85,000 TRY
  Total: 145,000 TRY

Message to team (optional) — Textarea

"Email will include a PDF with full payment details and bank information."

[Cancel]  [Send Urgent Notification]
```

#### Record Payment Dialog (Dialog, centered)

```
"Record Payment"
"Remaining: 30,000 TRY"

Amount *             Payment Date *
[30,000]             [Mar 17, 2026]
(pre-filled remaining) (DatePicker)

Payment Method *
[Bank Transfer ▾]

Reference Number
[TR-2026-0317-001]

Notes
[textarea]

[Cancel]  [Record Payment]
```

### Sub-Navigation (Finance Tab Bar)

Horizontal tab bar below AppHeader in finance layout:

```
[Dashboard] [Invoices] [Receivables] [Suppliers] [Recurring] [Access*]

* Access tab only visible for admin role
```

Styling: `border-b border-base-200`, active tab has `border-b-2 border-primary text-primary`,
inactive tabs `text-muted-foreground hover:text-foreground`.

### Responsive Breakpoints

| Breakpoint | Layout |
|------------|--------|
| Mobile (<640px) | Single column, card views, stacked filters, sheet forms |
| Tablet (640-1024px) | 2-column KPI grid, table view begins |
| Desktop (>1024px) | 4-column KPIs, 3-column detail layout, full table |

Uses `useBreakpoint()` hook (not `useIsMobile()`).

---

## Implementation Order (Dependency Graph)

```
Task 1.1 (Migration) ──→ Task 1.2 (Types) ──→ Task 1.3 (Validations)
                                                       │
                                                       ▼
                                              Task 2.1 (Server Actions)
                                                       │
                                                       ▼
                                              Task 2.2 (React Query)
                                                       │
                              ┌────────────────────────┼────────────────────────┐
                              ▼                        ▼                        ▼
                     Task 3.1 (Access)        Task 3.2 (Suppliers)     Task 6.1 (Dashboard)
                                                       │
                              ┌─────────────────────────┤
                              ▼                         ▼
                     Task 4.1-4.2 (Invoices)   Task 5.1 (Receivables)
                              │                         │
                              ├─────────────────────────┤
                              ▼                         ▼
                     Task 7.1 (Recurring)      Task 8.1-8.3 (PDF + Email + Notifications)
                                                       │
                                                       ▼
                                              Task 9.1 (Excel Export)
                                                       │
                                                       ▼
                                              Task 10.1 (Integration)
```

Tasks 3.1, 3.2, and 6.1 can run in parallel after Task 2.2.
Tasks 4 and 5 can run in parallel.
Tasks 7 and 8 can run in parallel.
Task 9 (Excel) depends on Tasks 4 and 5 (needs invoice/receivable data structures).

---

## Testing Checklist

### Access Control
- [ ] Finance access whitelist works (only whitelisted users can access)
- [ ] Admin can add/remove users from whitelist
- [ ] Can approve toggle works correctly
- [ ] Non-whitelisted admin/management get redirected from /finance

### Suppliers
- [ ] Supplier CRUD with all fields
- [ ] Supplier search/filter works

### Invoices (Payable)
- [ ] Invoice creation with supplier link
- [ ] Partial payment recording updates status correctly
- [ ] Payment amount cannot exceed remaining balance
- [ ] Approval workflow: submit → approve/reject → record payment
- [ ] Document upload and delete for invoices
- [ ] Multi-select row checkboxes work in invoice table

### Receivables
- [ ] Receivable creation with existing client link
- [ ] Incoming payment recording updates status correctly

### Recurring Templates
- [ ] Recurring template creates invoices correctly
- [ ] Next due date advances after processing

### Dashboard
- [ ] Dashboard KPIs show correct totals
- [ ] Aging report buckets are calculated correctly
- [ ] Cash flow chart renders with correct data

### Notifications (Three-Tier)
- [ ] Auto weekly digest: pg_cron triggers API route, email sent with PDF attached
- [ ] Manual summary: dialog with date range/filters/note, email + PDF sent
- [ ] Urgent notify: multi-select invoices, note field, email + PDF sent
- [ ] "Notify Overdue" button auto-selects correct invoices
- [ ] PDF content: grouped by supplier, IBANs, checkboxes, subtotals, grand totals
- [ ] In-app notifications created for all three methods

### Excel Export
- [ ] Invoice table exports to Excel with current filters applied
- [ ] Receivable table exports to Excel with current filters applied
- [ ] Payment schedule exports with supplier grouping, IBANs, totals
- [ ] Excel has auto-filter, frozen header row, proper number formatting
- [ ] Download triggers correctly in browser

### General
- [ ] Mobile responsive at 375px width
- [ ] All soft deletes filter with `is_deleted = false`
- [ ] Currency displays correctly (TRY/USD/EUR)
- [ ] Activity log entries created for key actions
- [ ] pg_cron + pg_net extensions enabled in Supabase
