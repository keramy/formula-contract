/**
 * Finance Module Types
 *
 * Type definitions for suppliers, invoices, receivables, payments,
 * recurring templates, categories, access, and documents.
 */

// ============================================================================
// Enums
// ============================================================================

export type SupplierCategory = "material_supplier" | "service_provider" | "subcontractor";

export type InvoiceStatus =
  | "pending"
  | "awaiting_approval"
  | "approved"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled";

export type ReceivableStatus =
  | "pending"
  | "partially_received"
  | "received"
  | "overdue"
  | "cancelled";

export type PaymentDirection = "outgoing" | "incoming";

export type PaymentMethod = "bank_transfer" | "cash" | "check" | "credit_card";

export type RecurringFrequency = "monthly" | "quarterly" | "yearly";

export type FinanceCategoryType = "expense" | "income";

// ============================================================================
// Base Row Types (match database columns)
// ============================================================================

export interface FinanceAccess {
  id: string;
  user_id: string;
  can_approve: boolean;
  granted_by: string | null;
  created_at: string;
}

export interface FinanceCategory {
  id: string;
  name: string;
  type: FinanceCategoryType;
  color: string | null;
  is_deleted: boolean;
  created_at: string;
}

export interface FinanceSupplier {
  id: string;
  supplier_code: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  category: SupplierCategory | null;
  tax_id: string | null;
  iban: string | null;
  bank_name: string | null;
  address: string | null;
  notes: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface FinanceInvoice {
  id: string;
  invoice_code: string;
  supplier_id: string;
  category_id: string | null;
  invoice_number: string | null;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  currency: "TRY" | "USD" | "EUR";
  description: string | null;
  status: InvoiceStatus;
  project_id: string | null;
  vat_rate: number;
  vat_amount: number;
  requires_approval: boolean;
  has_installments: boolean;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface FinanceInstallment {
  id: string;
  invoice_id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  status: "pending" | "paid" | "overdue";
  is_deleted: boolean;
  created_at: string;
}

export interface FinanceReceivable {
  id: string;
  receivable_code: string;
  client_id: string;
  category_id: string | null;
  reference_number: string | null;
  issue_date: string;
  due_date: string;
  total_amount: number;
  currency: "TRY" | "USD" | "EUR";
  description: string | null;
  status: ReceivableStatus;
  notes: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface FinancePayment {
  id: string;
  payment_code: string;
  direction: PaymentDirection;
  invoice_id: string | null;
  receivable_id: string | null;
  amount: number;
  currency: "TRY" | "USD" | "EUR";
  payment_date: string;
  payment_method: PaymentMethod | null;
  reference_number: string | null;
  notes: string | null;
  recorded_by: string | null;
  is_deleted: boolean;
  created_at: string;
}

export interface FinanceRecurringTemplate {
  id: string;
  template_code: string;
  supplier_id: string;
  category_id: string | null;
  description: string;
  amount: number;
  currency: "TRY" | "USD" | "EUR";
  frequency: RecurringFrequency;
  day_of_month: number;
  next_due_date: string;
  is_active: boolean;
  requires_approval: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface FinanceDocument {
  id: string;
  invoice_id: string | null;
  receivable_id: string | null;
  file_name: string;
  file_url: string;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
}

// ============================================================================
// Extended Types (with joined relations)
// ============================================================================

export interface FinanceSupplierWithStats extends FinanceSupplier {
  invoice_count: number;
  total_outstanding: number;
}

export interface FinanceInvoiceWithDetails extends FinanceInvoice {
  supplier?: { name: string; supplier_code: string; iban: string | null; bank_name: string | null } | null;
  category?: { name: string; color: string | null } | null;
  project?: { name: string; project_code: string } | null;
  approver?: { name: string } | null;
  total_paid: number;
  remaining: number;
  payment_count: number;
  days_overdue: number;
  last_payment_date: string | null;
  document_count: number;
  first_document_url: string | null;
  documents?: FinanceDocument[];
  payments?: FinancePayment[];
  installments?: FinanceInstallment[];
}

export interface FinanceReceivableWithDetails extends FinanceReceivable {
  client?: { company_name: string; client_code: string } | null;
  category?: { name: string; color: string | null } | null;
  total_received: number;
  remaining: number;
  payment_count: number;
  days_overdue: number;
  last_payment_date: string | null;
  document_count: number;
  first_document_url: string | null;
  documents?: FinanceDocument[];
  payments?: FinancePayment[];
}

export interface FinancePaymentWithDetails extends FinancePayment {
  invoice?: { invoice_code: string } | null;
  receivable?: { receivable_code: string } | null;
  supplier?: { name: string } | null;
  client?: { company_name: string } | null;
  recorded_by_user?: { name: string } | null;
}

export interface FinanceAccessWithUser extends FinanceAccess {
  user?: { name: string; email: string; role: string } | null;
  granted_by_user?: { name: string } | null;
}

export interface FinanceRecurringWithSupplier extends FinanceRecurringTemplate {
  supplier?: { name: string; supplier_code: string } | null;
  category?: { name: string; color: string | null } | null;
}

// ============================================================================
// Dashboard Types
// ============================================================================

export interface FinanceDashboardStats {
  totalPayable: number;
  totalReceivable: number;
  overduePayable: number;
  overdueReceivable: number;
  payableCurrency: string;
  thisWeekDue: number;
  thisWeekDueCount: number;
  supplierCount: number;
  pendingApprovals: number;
  monthlyOutflow: number;
  monthlyInflow: number;
}

export interface AgingBucket {
  current: number;
  days30: number;
  days60: number;
  days90: number;
  days90plus: number;
}

export interface CashFlowMonth {
  month: string;
  outgoing: number;
  incoming: number;
  [key: string]: string | number; // Recharts index signature
}

// ============================================================================
// Notification Types
// ============================================================================

export interface WeeklyDigestData {
  dueThisWeek: FinanceInvoiceWithDetails[];
  overdueItems: FinanceInvoiceWithDetails[];
  expectedIncoming: FinanceReceivableWithDetails[];
  pendingApprovals: FinanceInvoiceWithDetails[];
  totalsByurrency: Record<string, { amount: number; count: number }>;
}

export interface ManualSummaryOptions {
  dateRange: "this_week" | "rest_of_week" | "next_week" | "custom";
  customStart?: string;
  customEnd?: string;
  includeOverdue: boolean;
  includeIncoming: boolean;
  includeAlreadyPaid: boolean;
  note?: string;
}

// ============================================================================
// VAT Rates (Turkey KDV)
// ============================================================================

export const VAT_RATES: { value: number; label: string }[] = [
  { value: 0, label: "No VAT (0%)" },
  { value: 1, label: "1% — Basic food, agriculture" },
  { value: 10, label: "10% — Textiles, furniture, food services" },
  { value: 20, label: "20% — Standard rate" },
];

// ============================================================================
// Filter Types
// ============================================================================

export interface InvoiceFilters {
  status?: InvoiceStatus;
  supplier_id?: string;
  category_id?: string;
  project_id?: string;
  date_from?: string;
  date_to?: string;
  overdue_only?: boolean;
  limit?: number;
  offset?: number;
}

export interface ReceivableFilters {
  status?: ReceivableStatus;
  client_id?: string;
  category_id?: string;
  date_from?: string;
  date_to?: string;
  overdue_only?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

export const SUPPLIER_CATEGORIES: { value: SupplierCategory; label: string }[] = [
  { value: "material_supplier", label: "Material Supplier" },
  { value: "service_provider", label: "Service Provider" },
  { value: "subcontractor", label: "Subcontractor" },
];

export const INVOICE_STATUSES: { value: InvoiceStatus; label: string; color: string }[] = [
  { value: "pending", label: "Pending", color: "#94a3b8" },
  { value: "awaiting_approval", label: "Awaiting Approval", color: "#f59e0b" },
  { value: "approved", label: "Approved", color: "#60a5fa" },
  { value: "partially_paid", label: "Partially Paid", color: "#f97316" },
  { value: "paid", label: "Paid", color: "#22c55e" },
  { value: "overdue", label: "Overdue", color: "#ef4444" },
  { value: "cancelled", label: "Cancelled", color: "#6b7280" },
];

export const RECEIVABLE_STATUSES: { value: ReceivableStatus; label: string; color: string }[] = [
  { value: "pending", label: "Pending", color: "#94a3b8" },
  { value: "partially_received", label: "Partially Received", color: "#f97316" },
  { value: "received", label: "Received", color: "#22c55e" },
  { value: "overdue", label: "Overdue", color: "#ef4444" },
  { value: "cancelled", label: "Cancelled", color: "#6b7280" },
];

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check" },
  { value: "credit_card", label: "Credit Card" },
];

export const RECURRING_FREQUENCIES: { value: RecurringFrequency; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

export const CATEGORY_TYPES: { value: FinanceCategoryType; label: string }[] = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
];

export const CURRENCIES: { value: "TRY" | "USD" | "EUR"; label: string; symbol: string }[] = [
  { value: "TRY", label: "TRY", symbol: "₺" },
  { value: "USD", label: "USD", symbol: "$" },
  { value: "EUR", label: "EUR", symbol: "€" },
];
