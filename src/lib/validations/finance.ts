/**
 * Finance Validation Schemas
 *
 * Zod schemas for all finance entity forms.
 * Uses z.input<> for FormData types (not z.infer<>) — see CLAUDE.md gotcha #28.
 */

import { z } from "zod";

// ============================================================================
// Enum Schemas
// ============================================================================

export const supplierCategorySchema = z.enum([
  "material_supplier",
  "service_provider",
  "subcontractor",
]);

export const invoiceStatusSchema = z.enum([
  "pending",
  "awaiting_approval",
  "approved",
  "partially_paid",
  "paid",
  "overdue",
  "cancelled",
]);

export const receivableStatusSchema = z.enum([
  "pending",
  "partially_received",
  "received",
  "overdue",
  "cancelled",
]);

export const paymentDirectionSchema = z.enum(["outgoing", "incoming"]);

export const paymentMethodSchema = z.enum([
  "bank_transfer",
  "cash",
  "check",
  "credit_card",
]);

export const recurringFrequencySchema = z.enum(["monthly", "quarterly", "yearly"]);

export const financeCurrencySchema = z.enum(["TRY", "USD", "EUR"]);

export const categoryTypeSchema = z.enum(["expense", "income"]);

// ============================================================================
// Supplier Schema
// ============================================================================

export const supplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required").max(200, "Name too long"),
  contact_person: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("Invalid email").optional().or(z.literal("")).nullable(),
  category: supplierCategorySchema.optional().nullable(),
  tax_id: z.string().optional().nullable(),
  iban: z.string()
    .optional()
    .nullable()
    .transform((val) => val ? val.replace(/\s/g, "").toUpperCase() : val)
    .refine(
      (val) => !val || (val.startsWith("TR") && val.length === 26),
      { message: "Turkish IBAN must be 26 characters starting with TR (e.g. TR33 0006 1005 1978 6457 8413 26)" }
    ),
  bank_name: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type SupplierFormData = z.input<typeof supplierSchema>;

// ============================================================================
// Invoice Schema
// ============================================================================

export const invoiceSchema = z.object({
  supplier_id: z.string().uuid("Supplier is required"),
  category_id: z.string().uuid().optional().nullable(),
  invoice_number: z.string().optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
  invoice_date: z.string().min(1, "Invoice date is required"),
  due_date: z.string().optional().default(""),
  total_amount: z.number().positive("Amount must be greater than 0"),
  currency: financeCurrencySchema.default("TRY"),
  vat_rate: z.number().min(0).max(100).default(0),
  description: z.string().optional().nullable(),
  requires_approval: z.boolean().default(false),
  approved_by: z.string().uuid().optional().nullable(),
  has_installments: z.boolean().default(false),
  installments: z.array(z.object({
    amount: z.number().positive("Amount must be greater than 0"),
    due_date: z.string().min(1, "Due date is required"),
  })).optional().nullable(),
  notes: z.string().optional().nullable(),
}).refine(
  (data) => data.has_installments || (data.due_date && data.due_date.length > 0),
  { message: "Due date is required", path: ["due_date"] }
);

export type InvoiceFormData = z.input<typeof invoiceSchema>;

// ============================================================================
// Receivable Schema
// ============================================================================

export const receivableSchema = z.object({
  client_id: z.string().uuid("Client is required"),
  category_id: z.string().uuid().optional().nullable(),
  reference_number: z.string().optional().nullable(),
  issue_date: z.string().min(1, "Issue date is required"),
  due_date: z.string().min(1, "Due date is required"),
  total_amount: z.number().positive("Amount must be greater than 0"),
  currency: financeCurrencySchema.default("TRY"),
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type ReceivableFormData = z.input<typeof receivableSchema>;

// ============================================================================
// Payment Schema
// ============================================================================

export const paymentSchema = z.object({
  amount: z.number().positive("Amount must be greater than 0"),
  payment_date: z.string().min(1, "Payment date is required"),
  payment_method: paymentMethodSchema,
  reference_number: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type PaymentFormData = z.input<typeof paymentSchema>;

// ============================================================================
// Recurring Template Schema
// ============================================================================

export const recurringTemplateSchema = z.object({
  supplier_id: z.string().uuid("Supplier is required"),
  category_id: z.string().uuid().optional().nullable(),
  description: z.string().min(1, "Description is required").max(500, "Description too long"),
  amount: z.number().positive("Amount must be greater than 0"),
  currency: financeCurrencySchema.default("TRY"),
  frequency: recurringFrequencySchema.default("monthly"),
  day_of_month: z.number().int().min(1, "Day must be 1-28").max(28, "Day must be 1-28"),
  next_due_date: z.string().min(1, "Next due date is required"),
  requires_approval: z.boolean().default(false),
});

export type RecurringTemplateFormData = z.input<typeof recurringTemplateSchema>;

// ============================================================================
// Category Schema
// ============================================================================

export const categorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(100, "Name too long"),
  type: categoryTypeSchema,
  color: z.string().optional().nullable(),
});

export type CategoryFormData = z.input<typeof categorySchema>;

// ============================================================================
// Notify Team Schema (for urgent notification dialog)
// ============================================================================

export const notifyTeamSchema = z.object({
  invoice_ids: z.array(z.string().uuid()).min(1, "Select at least one invoice"),
  note: z.string().optional().nullable(),
});

export type NotifyTeamFormData = z.input<typeof notifyTeamSchema>;

// ============================================================================
// Send Summary Schema (for manual digest dialog)
// ============================================================================

export const sendSummarySchema = z.object({
  date_range: z.enum(["this_week", "rest_of_week", "next_week", "custom"]),
  custom_start: z.string().optional().nullable(),
  custom_end: z.string().optional().nullable(),
  include_overdue: z.boolean().default(true),
  include_incoming: z.boolean().default(true),
  include_already_paid: z.boolean().default(false),
  note: z.string().optional().nullable(),
});

export type SendSummaryFormData = z.input<typeof sendSummarySchema>;
