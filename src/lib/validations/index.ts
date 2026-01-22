/**
 * Zod Validation Schemas
 * Central location for all form validation schemas
 */

import { z } from "zod";

// ============================================
// Common Schemas
// ============================================

export const emailSchema = z.string().email("Invalid email address");

export const phoneSchema = z
  .string()
  .regex(/^[+]?[\d\s-()]+$/, "Invalid phone number")
  .optional()
  .or(z.literal(""));

// ============================================
// Client Schemas
// ============================================

export const clientSchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  contact_person: z.string().optional().nullable(),
  email: emailSchema.optional().or(z.literal("")).nullable(),
  phone: phoneSchema.nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type ClientFormData = z.infer<typeof clientSchema>;

// ============================================
// Project Schemas
// ============================================

export const projectStatusSchema = z.enum([
  "tender",
  "active",
  "on_hold",
  "completed",
  "cancelled",
]);

export const currencySchema = z.enum(["TRY", "USD", "EUR"]);

export const projectSchema = z.object({
  project_code: z
    .string()
    .min(1, "Project code is required")
    .max(20, "Project code must be 20 characters or less")
    .regex(/^[A-Z0-9-]+$/, "Only uppercase letters, numbers, and hyphens allowed"),
  name: z.string().min(1, "Project name is required").max(100, "Name too long"),
  description: z.string().optional().nullable(),
  client_id: z.string().uuid("Invalid client").optional().nullable(),
  status: projectStatusSchema.default("tender"),
  currency: currencySchema.default("TRY"),
  installation_date: z.string().optional().nullable(),
  contract_value_manual: z.number().min(0, "Value must be positive").optional().nullable(),
});

export type ProjectFormData = z.infer<typeof projectSchema>;

// ============================================
// Scope Item Schemas
// ============================================

export const itemPathSchema = z.enum(["production", "procurement"]);

export const itemStatusSchema = z.enum([
  "pending",
  "in_design",
  "awaiting_approval",
  "approved",
  "in_production",
  "complete",
  "on_hold",
  "cancelled",
]);

export const unitSchema = z.enum(["pcs", "set", "m", "m2", "lot"]);

export const scopeItemSchema = z.object({
  item_code: z
    .string()
    .min(1, "Item code is required")
    .max(20, "Item code must be 20 characters or less"),
  name: z.string().min(1, "Item name is required").max(100, "Name too long"),
  description: z.string().optional().nullable(),
  width: z.number().min(0, "Width must be positive").optional().nullable(),
  depth: z.number().min(0, "Depth must be positive").optional().nullable(),
  height: z.number().min(0, "Height must be positive").optional().nullable(),
  unit: unitSchema.default("pcs"),
  quantity: z.number().min(0.01, "Quantity must be greater than 0").default(1),
  // Initial cost (budgeted, set once at creation)
  initial_unit_cost: z.number().min(0, "Initial cost must be positive").optional().nullable(),
  // Actual cost (entered later)
  actual_unit_cost: z.number().min(0, "Actual cost must be positive").optional().nullable(),
  // Sales price (what client pays)
  unit_sales_price: z.number().min(0, "Price must be positive").optional().nullable(),
  item_path: itemPathSchema.default("production"),
  status: itemStatusSchema.default("pending"),
  notes: z.string().optional().nullable(),
  images: z.array(z.string().url()).optional().nullable(),
});

export type ScopeItemFormData = z.infer<typeof scopeItemSchema>;

// Partial schema for updates
export const scopeItemUpdateSchema = scopeItemSchema.partial();

export type ScopeItemUpdateData = z.infer<typeof scopeItemUpdateSchema>;

// Production progress update
export const productionProgressSchema = z.object({
  production_percentage: z.number().min(0).max(100),
});

// ============================================
// Drawing Schemas
// ============================================

export const drawingStatusSchema = z.enum([
  "pending",
  "in_review",
  "approved",
  "approved_with_comments",
  "rejected",
]);

export const drawingApprovalSchema = z.object({
  status: drawingStatusSchema,
  client_comments: z.string().optional().nullable(),
});

export const pmOverrideSchema = z.object({
  pm_override_reason: z.string().min(10, "Please provide a detailed reason (min 10 characters)"),
});

// ============================================
// Auth Schemas
// ============================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
});

export type SignupFormData = z.infer<typeof signupSchema>;

// ============================================
// Helper Functions
// ============================================

/**
 * Safely parse and validate data with Zod schema
 * Returns { success: true, data } or { success: false, errors }
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Convert Zod errors to simple key-value pairs
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".");
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  }

  return { success: false, errors };
}

/**
 * Get the first error message from validation result
 */
export function getFirstError(errors: Record<string, string>): string {
  const keys = Object.keys(errors);
  return keys.length > 0 ? errors[keys[0]] : "Validation failed";
}

/**
 * Parse string to number, returning null for empty/invalid
 */
export function parseOptionalNumber(value: string | undefined): number | null {
  if (!value || value.trim() === "") return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

/**
 * Parse string to integer, returning default for empty/invalid
 */
export function parseIntWithDefault(value: string | undefined, defaultValue: number): number {
  if (!value || value.trim() === "") return defaultValue;
  const num = parseInt(value, 10);
  return isNaN(num) ? defaultValue : num;
}
