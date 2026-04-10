"use server";

/**
 * Finance Server Actions
 *
 * All finance-related database operations.
 * Access control: whitelist-based (finance_access table), NOT role-based.
 * Pattern: auth check → sanitize → DB → activity log → revalidate.
 */

import { revalidatePath } from "next/cache";
import { createClient, getUserRoleFromJWT } from "@/lib/supabase/server";
import { sanitizeText } from "@/lib/sanitize";
import { logActivity } from "@/lib/activity-log/actions";
import type {
  FinanceSupplier,
  FinanceSupplierWithStats,
  FinanceInvoiceWithDetails,
  FinanceReceivableWithDetails,
  FinancePayment,
  FinanceInstallment,
  FinanceCategory,
  FinanceRecurringWithSupplier,
  FinanceAccessWithUser,
  FinanceDocument,
  FinanceDashboardStats,
  AgingBucket,
  CashFlowMonth,
  InvoiceFilters,
  ReceivableFilters,
} from "@/types/finance";

// ============================================================================
// Types
// ============================================================================

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}


// ============================================================================
// Auth Helpers
// ============================================================================

async function requireFinanceAccess(requireApproval = false) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" as const, supabase: null, user: null };
  }

  const { data: access } = await supabase
    .from("finance_access")
    .select("can_approve")
    .eq("user_id", user.id)
    .single();

  if (!access) {
    return { error: "Not authorized" as const, supabase: null, user: null };
  }

  if (requireApproval && !access.can_approve) {
    return {
      error: "Approval permission required" as const,
      supabase: null,
      user: null,
    };
  }

  return { error: null, supabase, user };
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return {
      error: "Not authenticated" as const,
      supabase: null,
      user: null,
    };
  const role = await getUserRoleFromJWT(user, supabase);
  if (role !== "admin")
    return { error: "Admin required" as const, supabase: null, user: null };
  return { error: null, supabase, user };
}

// ============================================================================
// Get Projects for Invoice Linking
// ============================================================================

export async function getProjectsForFinance(): Promise<
  ActionResult<{ id: string; name: string; project_code: string }[]>
> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const { data, error: dbError } = await supabase
    .from("projects")
    .select("id, name, project_code")
    .eq("is_deleted", false)
    .not("status", "eq", "cancelled")
    .order("project_code");

  if (dbError) return { success: false, error: dbError.message };
  return { success: true, data: data || [] };
}

// ============================================================================
// Get Approvers (users with can_approve in finance_access)
// ============================================================================

export async function getApprovers(): Promise<
  ActionResult<{ id: string; name: string }[]>
> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const { data, error: dbError } = await supabase
    .from("finance_access")
    .select("user_id, user:users!finance_access_user_id_fkey(id, name)")
    .eq("can_approve", true);

  if (dbError) return { success: false, error: dbError.message };

  const approvers = (data || []).map((row: { user: { id: string; name: string } | null }) => ({
    id: row.user?.id || "",
    name: row.user?.name || "Unknown",
  })).filter((a: { id: string }) => a.id);

  return { success: true, data: approvers };
}

// ============================================================================
// Get Users for Access Manager (Admin only)
// ============================================================================

export async function getAvailableUsers(): Promise<
  ActionResult<{ id: string; name: string; email: string; role: string }[]>
> {
  const { error, supabase } = await requireAdmin();
  if (error) return { success: false, error };

  const { data, error: dbError } = await supabase
    .from("users")
    .select("id, name, email, role")
    .eq("is_active", true)
    .order("name");

  if (dbError) return { success: false, error: dbError.message };
  return { success: true, data: data || [] };
}

// ============================================================================
// Finance Access Check (for pages)
// ============================================================================

export async function checkFinanceAccess(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("finance_access")
    .select("id")
    .eq("user_id", user.id)
    .single();

  return !!data;
}

// ============================================================================
// Access Management (Admin only)
// ============================================================================

export async function getFinanceAccessList(): Promise<
  ActionResult<FinanceAccessWithUser[]>
> {
  const { error, supabase } = await requireAdmin();
  if (error) return { success: false, error };

  const { data, error: dbError } = await supabase!
    .from("finance_access")
    .select(
      `
      *,
      user:users!finance_access_user_id_fkey(name, email, role),
      granted_by_user:users!finance_access_granted_by_fkey(name)
    `
    )
    .order("created_at", { ascending: false });

  if (dbError) return { success: false, error: dbError.message };
  return { success: true, data: data as FinanceAccessWithUser[] };
}

export async function grantFinanceAccess(
  userId: string,
  canApprove: boolean
): Promise<ActionResult<{ id: string }>> {
  const { error, supabase, user } = await requireAdmin();
  if (error) return { success: false, error };

  const { data, error: dbError } = await supabase!
    .from("finance_access")
    .insert({
      user_id: userId,
      can_approve: canApprove,
      granted_by: user!.id,
    })
    .select("id")
    .single();

  if (dbError) {
    if (dbError.code === "23505")
      return { success: false, error: "User already has finance access" };
    return { success: false, error: dbError.message };
  }

  await logActivity({
    action: "finance_access_granted",
    entityType: "finance_access",
    entityId: data.id,
    details: { userId, canApprove },
  });

  revalidatePath("/payments");
  return { success: true, data: { id: data.id } };
}

export async function revokeFinanceAccess(
  userId: string
): Promise<ActionResult> {
  const { error, supabase } = await requireAdmin();
  if (error) return { success: false, error };

  const { error: dbError } = await supabase!
    .from("finance_access")
    .delete()
    .eq("user_id", userId);

  if (dbError) return { success: false, error: dbError.message };

  await logActivity({
    action: "finance_access_revoked",
    entityType: "finance_access",
    entityId: userId,
    details: { userId },
  });

  revalidatePath("/payments");
  return { success: true };
}

export async function updateFinanceApproval(
  userId: string,
  canApprove: boolean
): Promise<ActionResult> {
  const { error, supabase } = await requireAdmin();
  if (error) return { success: false, error };

  const { error: dbError } = await supabase!
    .from("finance_access")
    .update({ can_approve: canApprove })
    .eq("user_id", userId);

  if (dbError) return { success: false, error: dbError.message };

  revalidatePath("/payments");
  return { success: true };
}

// ============================================================================
// Categories
// ============================================================================

export async function getCategories(): Promise<
  ActionResult<FinanceCategory[]>
> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const { data, error: dbError } = await supabase!
    .from("finance_categories")
    .select("*")
    .eq("is_deleted", false)
    .order("type")
    .order("name");

  if (dbError) return { success: false, error: dbError.message };
  return { success: true, data: data as FinanceCategory[] };
}

export async function createCategory(
  input: Record<string, unknown>
): Promise<ActionResult<{ id: string }>> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const sanitized = {
    name: sanitizeText((input.name as string).trim()),
    type: input.type as string,
    color: input.color ? (input.color as string) : null,
  };

  const { data, error: dbError } = await supabase!
    .from("finance_categories")
    .insert(sanitized)
    .select("id")
    .single();

  if (dbError) return { success: false, error: dbError.message };

  revalidatePath("/payments");
  return { success: true, data: { id: data.id } };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const { error: dbError } = await supabase!
    .from("finance_categories")
    .update({ is_deleted: true })
    .eq("id", id);

  if (dbError) return { success: false, error: dbError.message };

  revalidatePath("/payments");
  return { success: true };
}

// ============================================================================
// Suppliers
// ============================================================================

export async function getSuppliers(): Promise<
  ActionResult<FinanceSupplierWithStats[]>
> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const { data: suppliers, error: dbError } = await supabase!
    .from("finance_suppliers")
    .select("*")
    .eq("is_deleted", false)
    .order("name");

  if (dbError) return { success: false, error: dbError.message };

  const { data: invoiceCounts } = await supabase!
    .from("finance_invoices")
    .select("supplier_id")
    .eq("is_deleted", false)
    .not("status", "in", '("paid","cancelled")');

  const countMap: Record<string, number> = {};
  invoiceCounts?.forEach((i) => {
    countMap[i.supplier_id] = (countMap[i.supplier_id] || 0) + 1;
  });

  const result = (suppliers as FinanceSupplier[]).map((s) => ({
    ...s,
    invoice_count: countMap[s.id] || 0,
    total_outstanding: 0,
  }));

  return { success: true, data: result };
}

export async function getSupplier(
  id: string
): Promise<ActionResult<FinanceSupplier>> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const { data, error: dbError } = await supabase!
    .from("finance_suppliers")
    .select("*")
    .eq("id", id)
    .eq("is_deleted", false)
    .single();

  if (dbError) return { success: false, error: dbError.message };
  return { success: true, data: data as FinanceSupplier };
}

export async function createSupplier(
  input: Record<string, unknown>
): Promise<ActionResult<{ id: string }>> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const sanitized = {
    name: sanitizeText((input.name as string).trim()),
    contact_person: input.contact_person
      ? sanitizeText((input.contact_person as string).trim())
      : null,
    phone: input.phone ? (input.phone as string).trim() : null,
    email: input.email ? (input.email as string).trim() : null,
    category: input.category ? (input.category as string) : null,
    tax_id: input.tax_id ? (input.tax_id as string).trim() : null,
    iban: input.iban ? (input.iban as string).trim() : null,
    bank_name: input.bank_name
      ? sanitizeText((input.bank_name as string).trim())
      : null,
    address: input.address
      ? sanitizeText((input.address as string).trim())
      : null,
    notes: input.notes
      ? sanitizeText((input.notes as string).trim())
      : null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error: dbError } = await supabase!
    .from("finance_suppliers")
    .insert(sanitized as any)
    .select("id")
    .single();

  if (dbError) return { success: false, error: dbError.message };

  await logActivity({
    action: "finance_supplier_created",
    entityType: "finance_supplier",
    entityId: data.id,
    details: { name: sanitized.name },
  });

  revalidatePath("/payments");
  return { success: true, data: { id: data.id } };
}

export async function updateSupplier(
  id: string,
  input: Record<string, unknown>
): Promise<ActionResult> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const sanitized = {
    name: sanitizeText((input.name as string).trim()),
    contact_person: input.contact_person
      ? sanitizeText((input.contact_person as string).trim())
      : null,
    phone: input.phone ? (input.phone as string).trim() : null,
    email: input.email ? (input.email as string).trim() : null,
    category: input.category ? (input.category as string) : null,
    tax_id: input.tax_id ? (input.tax_id as string).trim() : null,
    iban: input.iban ? (input.iban as string).trim() : null,
    bank_name: input.bank_name
      ? sanitizeText((input.bank_name as string).trim())
      : null,
    address: input.address
      ? sanitizeText((input.address as string).trim())
      : null,
    notes: input.notes
      ? sanitizeText((input.notes as string).trim())
      : null,
  };

  const { error: dbError } = await supabase!
    .from("finance_suppliers")
    .update(sanitized)
    .eq("id", id);

  if (dbError) return { success: false, error: dbError.message };

  await logActivity({
    action: "finance_supplier_updated",
    entityType: "finance_supplier",
    entityId: id,
    details: { name: sanitized.name },
  });

  revalidatePath("/payments");
  return { success: true };
}

export async function deleteSupplier(id: string): Promise<ActionResult> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const { error: dbError } = await supabase!
    .from("finance_suppliers")
    .update({ is_deleted: true })
    .eq("id", id);

  if (dbError) return { success: false, error: dbError.message };

  await logActivity({
    action: "finance_supplier_deleted",
    entityType: "finance_supplier",
    entityId: id,
  });

  revalidatePath("/payments");
  return { success: true };
}

// ============================================================================
// Invoices
// ============================================================================

export async function getInvoices(
  filters?: InvoiceFilters
): Promise<ActionResult<FinanceInvoiceWithDetails[]>> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  let query = supabase!
    .from("finance_invoices")
    .select(
      `
      *,
      supplier:finance_suppliers!finance_invoices_supplier_id_fkey(name, supplier_code, iban, bank_name),
      category:finance_categories!finance_invoices_category_id_fkey(name, color),
      project:projects!finance_invoices_project_id_fkey(name, project_code),
      approver:users!finance_invoices_approved_by_fkey(name)
    `
    )
    .eq("is_deleted", false);

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.supplier_id)
    query = query.eq("supplier_id", filters.supplier_id);
  if (filters?.category_id)
    query = query.eq("category_id", filters.category_id);
  if (filters?.project_id) {
    if (filters.project_id === "general") {
      query = query.is("project_id", null);
    } else {
      query = query.eq("project_id", filters.project_id);
    }
  }
  if (filters?.date_from) query = query.gte("due_date", filters.date_from);
  if (filters?.date_to) query = query.lte("due_date", filters.date_to);
  if (filters?.overdue_only) {
    query = query
      .lt("due_date", new Date().toISOString().split("T")[0])
      .not("status", "in", '("paid","cancelled")');
  }

  const { data: invoices, error: dbError } = await query.order("due_date");

  if (dbError) return { success: false, error: dbError.message };

  const invoiceIds = invoices?.map((i) => i.id) || [];
  const paymentMap: Record<
    string,
    { total_paid: number; payment_count: number; last_payment_date: string | null }
  > = {};

  if (invoiceIds.length > 0) {
    const { data: payments } = await supabase!
      .from("finance_payments")
      .select("invoice_id, amount, payment_date")
      .in("invoice_id", invoiceIds)
      .eq("is_deleted", false);

    payments?.forEach((p) => {
      if (!paymentMap[p.invoice_id!]) {
        paymentMap[p.invoice_id!] = { total_paid: 0, payment_count: 0, last_payment_date: null };
      }
      paymentMap[p.invoice_id!].total_paid += Number(p.amount);
      paymentMap[p.invoice_id!].payment_count += 1;
      // Track the most recent payment date
      if (!paymentMap[p.invoice_id!].last_payment_date || p.payment_date > paymentMap[p.invoice_id!].last_payment_date!) {
        paymentMap[p.invoice_id!].last_payment_date = p.payment_date;
      }
    });
  }

  // Get document counts per invoice
  const docCountMap: Record<string, { count: number; first_url: string | null }> = {};
  if (invoiceIds.length > 0) {
    const { data: docs } = await supabase!
      .from("finance_documents")
      .select("invoice_id, file_url")
      .in("invoice_id", invoiceIds);

    (docs || []).forEach((d: { invoice_id: string | null; file_url: string }) => {
      if (d.invoice_id && !docCountMap[d.invoice_id]) {
        docCountMap[d.invoice_id] = { count: 0, first_url: d.file_url };
      }
      if (d.invoice_id) docCountMap[d.invoice_id].count += 1;
    });
  }

  const today = new Date().toISOString().split("T")[0];
  const result = (invoices || []).map((inv) => {
    const pm = paymentMap[inv.id] || { total_paid: 0, payment_count: 0, last_payment_date: null };
    const dc = docCountMap[inv.id] || { count: 0, first_url: null };
    const daysOverdue =
      inv.due_date < today && !["paid", "cancelled"].includes(inv.status)
        ? Math.floor(
            (new Date(today).getTime() - new Date(inv.due_date).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 0;

    return {
      ...inv,
      total_paid: pm.total_paid,
      remaining: Number(inv.total_amount) - pm.total_paid,
      payment_count: pm.payment_count,
      days_overdue: daysOverdue,
      last_payment_date: pm.last_payment_date,
      document_count: dc.count,
      first_document_url: dc.first_url,
    };
  }) as FinanceInvoiceWithDetails[];

  return { success: true, data: result };
}

export async function getInvoice(
  id: string
): Promise<ActionResult<FinanceInvoiceWithDetails>> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const { data: invoice, error: dbError } = await supabase!
    .from("finance_invoices")
    .select(
      `
      *,
      supplier:finance_suppliers!finance_invoices_supplier_id_fkey(name, supplier_code, iban, bank_name),
      category:finance_categories!finance_invoices_category_id_fkey(name, color),
      project:projects!finance_invoices_project_id_fkey(name, project_code),
      approver:users!finance_invoices_approved_by_fkey(name)
    `
    )
    .eq("id", id)
    .eq("is_deleted", false)
    .single();

  if (dbError) return { success: false, error: dbError.message };

  const [paymentsResult, documentsResult, installmentsResult] = await Promise.all([
    supabase!
      .from("finance_payments")
      .select("*")
      .eq("invoice_id", id)
      .eq("is_deleted", false)
      .order("payment_date", { ascending: false }),
    supabase!
      .from("finance_documents")
      .select("*")
      .eq("invoice_id", id)
      .order("created_at", { ascending: false }),
    supabase!
      .from("finance_invoice_installments")
      .select("*")
      .eq("invoice_id", id)
      .eq("is_deleted", false)
      .order("installment_number"),
  ]);

  const totalPaid = (paymentsResult.data || []).reduce(
    (sum, p) => sum + Number(p.amount),
    0
  );
  const today = new Date().toISOString().split("T")[0];
  const daysOverdue =
    invoice.due_date < today && !["paid", "cancelled"].includes(invoice.status)
      ? Math.floor(
          (new Date(today).getTime() - new Date(invoice.due_date).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 0;

  return {
    success: true,
    data: {
      ...invoice,
      total_paid: totalPaid,
      remaining: Number(invoice.total_amount) - totalPaid,
      payment_count: paymentsResult.data?.length || 0,
      days_overdue: daysOverdue,
      payments: paymentsResult.data as FinancePayment[],
      documents: documentsResult.data as FinanceDocument[],
      installments: (installmentsResult.data || []) as FinanceInstallment[],
    } as FinanceInvoiceWithDetails,
  };
}

export async function createInvoice(
  input: Record<string, unknown>
): Promise<ActionResult<{ id: string }>> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const requiresApproval = input.requires_approval as boolean;
  const hasInstallments = input.has_installments as boolean;
  const installments = (input.installments as { amount: number; due_date: string }[] | null) || [];

  // If installments, due_date = last installment date
  const dueDateValue = hasInstallments && installments.length > 0
    ? installments[installments.length - 1].due_date
    : (input.due_date as string);

  const sanitized = {
    supplier_id: input.supplier_id as string,
    category_id: input.category_id ? (input.category_id as string) : null,
    project_id: input.project_id ? (input.project_id as string) : null,
    invoice_number: input.invoice_number
      ? sanitizeText((input.invoice_number as string).trim())
      : null,
    invoice_date: input.invoice_date as string,
    due_date: dueDateValue,
    total_amount: input.total_amount as number,
    currency: input.currency as string,
    vat_rate: (input.vat_rate as number) || 0,
    vat_amount: ((input.total_amount as number) * ((input.vat_rate as number) || 0)) / 100,
    description: input.description
      ? sanitizeText((input.description as string).trim())
      : null,
    requires_approval: requiresApproval,
    has_installments: hasInstallments,
    approved_by: requiresApproval && input.approved_by ? (input.approved_by as string) : null,
    status: requiresApproval ? "awaiting_approval" : "pending",
    notes: input.notes
      ? sanitizeText((input.notes as string).trim())
      : null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error: dbError } = await supabase!
    .from("finance_invoices")
    .insert(sanitized as any)
    .select("id")
    .single();

  if (dbError) return { success: false, error: dbError.message };

  // Create installments if enabled
  if (hasInstallments && installments.length > 0) {
    const installmentRows = installments.map((inst, idx) => ({
      invoice_id: data.id,
      installment_number: idx + 1,
      amount: inst.amount,
      due_date: inst.due_date,
      status: "pending",
    }));

    await supabase!
      .from("finance_invoice_installments")
      .insert(installmentRows);
  }

  await logActivity({
    action: "finance_invoice_created",
    entityType: "finance_invoice",
    entityId: data.id,
    details: { amount: sanitized.total_amount, currency: sanitized.currency, installments: installments.length },
  });

  revalidatePath("/payments");
  return { success: true, data: { id: data.id } };
}

export async function updateInvoice(
  id: string,
  input: Record<string, unknown>
): Promise<ActionResult> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const requiresApproval = input.requires_approval as boolean;
  const hasInstallments = input.has_installments as boolean;
  const installments = (input.installments as { amount: number; due_date: string }[] | null) || [];

  // If installments, due_date = last installment date
  const dueDateValue = hasInstallments && installments.length > 0
    ? installments[installments.length - 1].due_date
    : (input.due_date as string);

  const sanitized = {
    supplier_id: input.supplier_id as string,
    category_id: input.category_id ? (input.category_id as string) : null,
    project_id: input.project_id ? (input.project_id as string) : null,
    invoice_number: input.invoice_number
      ? sanitizeText((input.invoice_number as string).trim())
      : null,
    invoice_date: input.invoice_date as string,
    due_date: dueDateValue,
    total_amount: input.total_amount as number,
    currency: input.currency as string,
    vat_rate: (input.vat_rate as number) || 0,
    vat_amount: ((input.total_amount as number) * ((input.vat_rate as number) || 0)) / 100,
    description: input.description
      ? sanitizeText((input.description as string).trim())
      : null,
    requires_approval: requiresApproval,
    has_installments: hasInstallments,
    approved_by: requiresApproval && input.approved_by ? (input.approved_by as string) : null,
    notes: input.notes
      ? sanitizeText((input.notes as string).trim())
      : null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: dbError } = await supabase!
    .from("finance_invoices")
    .update(sanitized as any)
    .eq("id", id);

  if (dbError) return { success: false, error: dbError.message };

  // Sync installments: delete existing, re-insert if enabled
  await supabase!
    .from("finance_invoice_installments")
    .delete()
    .eq("invoice_id", id);

  if (hasInstallments && installments.length > 0) {
    const installmentRows = installments.map((inst, idx) => ({
      invoice_id: id,
      installment_number: idx + 1,
      amount: inst.amount,
      due_date: inst.due_date,
      status: "pending",
    }));

    await supabase!
      .from("finance_invoice_installments")
      .insert(installmentRows);
  }

  await logActivity({
    action: "finance_invoice_updated",
    entityType: "finance_invoice",
    entityId: id,
  });

  revalidatePath("/payments");
  return { success: true };
}

export async function deleteInvoice(id: string): Promise<ActionResult> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const { error: dbError } = await supabase!
    .from("finance_invoices")
    .update({ is_deleted: true })
    .eq("id", id);

  if (dbError) return { success: false, error: dbError.message };

  await logActivity({
    action: "finance_invoice_deleted",
    entityType: "finance_invoice",
    entityId: id,
  });

  revalidatePath("/payments");
  return { success: true };
}

// ============================================================================
// Invoice Approval
// ============================================================================

export async function bulkApproveInvoices(ids: string[]): Promise<ActionResult<{ approved: number }>> {
  const { error, supabase, user } = await requireFinanceAccess(true);
  if (error) return { success: false, error };

  if (ids.length === 0) return { success: true, data: { approved: 0 } };

  const { data, error: dbError } = await supabase!
    .from("finance_invoices")
    .update({
      status: "approved",
      approved_by: user!.id,
      approved_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .in("id", ids)
    .eq("status", "awaiting_approval")
    .select("id");

  if (dbError) return { success: false, error: dbError.message };

  const approvedCount = data?.length || 0;

  if (approvedCount > 0) {
    await logActivity({
      action: "finance_invoices_bulk_approved",
      entityType: "finance_invoice",
      entityId: "bulk",
      details: { ids, approvedCount },
    });
  }

  revalidatePath("/payments");
  return { success: true, data: { approved: approvedCount } };
}

export async function approveInvoice(id: string): Promise<ActionResult> {
  const { error, supabase, user } = await requireFinanceAccess(true);
  if (error) return { success: false, error };

  const { error: dbError } = await supabase!
    .from("finance_invoices")
    .update({
      status: "approved",
      approved_by: user!.id,
      approved_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq("id", id)
    .eq("status", "awaiting_approval");

  if (dbError) return { success: false, error: dbError.message };

  await logActivity({
    action: "finance_invoice_approved",
    entityType: "finance_invoice",
    entityId: id,
  });

  revalidatePath("/payments");
  return { success: true };
}

export async function rejectInvoice(
  id: string,
  reason: string
): Promise<ActionResult> {
  const { error, supabase } = await requireFinanceAccess(true);
  if (error) return { success: false, error };

  if (!reason || reason.trim().length < 3) {
    return { success: false, error: "Rejection reason is required (min 3 characters)" };
  }

  const { error: dbError } = await supabase!
    .from("finance_invoices")
    .update({
      status: "pending",
      rejection_reason: sanitizeText(reason.trim()),
      approved_by: null,
      approved_at: null,
    })
    .eq("id", id)
    .eq("status", "awaiting_approval");

  if (dbError) return { success: false, error: dbError.message };

  await logActivity({
    action: "finance_invoice_rejected",
    entityType: "finance_invoice",
    entityId: id,
    details: { reason },
  });

  revalidatePath("/payments");
  return { success: true };
}

// ============================================================================
// Receivables
// ============================================================================

export async function getReceivables(
  filters?: ReceivableFilters
): Promise<ActionResult<FinanceReceivableWithDetails[]>> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  let query = supabase!
    .from("finance_receivables")
    .select(
      `
      *,
      client:clients!finance_receivables_client_id_fkey(company_name, client_code),
      category:finance_categories!finance_receivables_category_id_fkey(name, color)
    `
    )
    .eq("is_deleted", false);

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.client_id) query = query.eq("client_id", filters.client_id);
  if (filters?.category_id) query = query.eq("category_id", filters.category_id);
  if (filters?.date_from) query = query.gte("due_date", filters.date_from);
  if (filters?.date_to) query = query.lte("due_date", filters.date_to);
  if (filters?.overdue_only) {
    query = query
      .lt("due_date", new Date().toISOString().split("T")[0])
      .not("status", "in", '("received","cancelled")');
  }

  const { data: receivables, error: dbError } = await query.order("due_date");

  if (dbError) return { success: false, error: dbError.message };

  const recIds = receivables?.map((r) => r.id) || [];
  const paymentMap: Record<string, { total_received: number; payment_count: number; last_payment_date: string | null }> = {};

  if (recIds.length > 0) {
    const { data: payments } = await supabase!
      .from("finance_payments")
      .select("receivable_id, amount, payment_date")
      .in("receivable_id", recIds)
      .eq("is_deleted", false);

    payments?.forEach((p) => {
      if (!paymentMap[p.receivable_id!]) {
        paymentMap[p.receivable_id!] = { total_received: 0, payment_count: 0, last_payment_date: null };
      }
      paymentMap[p.receivable_id!].total_received += Number(p.amount);
      paymentMap[p.receivable_id!].payment_count += 1;
      if (!paymentMap[p.receivable_id!].last_payment_date || p.payment_date > paymentMap[p.receivable_id!].last_payment_date!) {
        paymentMap[p.receivable_id!].last_payment_date = p.payment_date;
      }
    });
  }

  // Document counts
  const docCountMap: Record<string, { count: number; first_url: string | null }> = {};
  if (recIds.length > 0) {
    const { data: docs } = await supabase!
      .from("finance_documents")
      .select("receivable_id, file_url")
      .in("receivable_id", recIds);

    (docs || []).forEach((d: { receivable_id: string | null; file_url: string }) => {
      if (d.receivable_id && !docCountMap[d.receivable_id]) {
        docCountMap[d.receivable_id] = { count: 0, first_url: d.file_url };
      }
      if (d.receivable_id) docCountMap[d.receivable_id].count += 1;
    });
  }

  const today = new Date().toISOString().split("T")[0];
  const result = (receivables || []).map((rec) => {
    const pm = paymentMap[rec.id] || { total_received: 0, payment_count: 0, last_payment_date: null };
    const dc = docCountMap[rec.id] || { count: 0, first_url: null };
    const daysOverdue =
      rec.due_date < today && !["received", "cancelled"].includes(rec.status)
        ? Math.floor(
            (new Date(today).getTime() - new Date(rec.due_date).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 0;

    return {
      ...rec,
      total_received: pm.total_received,
      remaining: Number(rec.total_amount) - pm.total_received,
      payment_count: pm.payment_count,
      days_overdue: daysOverdue,
      last_payment_date: pm.last_payment_date,
      document_count: dc.count,
      first_document_url: dc.first_url,
    };
  }) as FinanceReceivableWithDetails[];

  return { success: true, data: result };
}

export async function getReceivable(
  id: string
): Promise<ActionResult<FinanceReceivableWithDetails>> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const { data: receivable, error: dbError } = await supabase!
    .from("finance_receivables")
    .select(
      `
      *,
      client:clients!finance_receivables_client_id_fkey(company_name, client_code),
      category:finance_categories!finance_receivables_category_id_fkey(name, color)
    `
    )
    .eq("id", id)
    .eq("is_deleted", false)
    .single();

  if (dbError) return { success: false, error: dbError.message };

  const [paymentsResult, documentsResult] = await Promise.all([
    supabase!
      .from("finance_payments")
      .select("*")
      .eq("receivable_id", id)
      .eq("is_deleted", false)
      .order("payment_date", { ascending: false }),
    supabase!
      .from("finance_documents")
      .select("*")
      .eq("receivable_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const totalReceived = (paymentsResult.data || []).reduce(
    (sum, p) => sum + Number(p.amount),
    0
  );
  const today = new Date().toISOString().split("T")[0];
  const daysOverdue =
    receivable.due_date < today &&
    !["received", "cancelled"].includes(receivable.status)
      ? Math.floor(
          (new Date(today).getTime() - new Date(receivable.due_date).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 0;

  return {
    success: true,
    data: {
      ...receivable,
      total_received: totalReceived,
      remaining: Number(receivable.total_amount) - totalReceived,
      payment_count: paymentsResult.data?.length || 0,
      days_overdue: daysOverdue,
      payments: paymentsResult.data as FinancePayment[],
      documents: documentsResult.data as FinanceDocument[],
    } as FinanceReceivableWithDetails,
  };
}

export async function createReceivable(
  input: Record<string, unknown>
): Promise<ActionResult<{ id: string }>> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const sanitized = {
    client_id: input.client_id as string,
    category_id: input.category_id ? (input.category_id as string) : null,
    reference_number: input.reference_number
      ? sanitizeText((input.reference_number as string).trim())
      : null,
    issue_date: input.issue_date as string,
    due_date: input.due_date as string,
    total_amount: input.total_amount as number,
    currency: input.currency as string,
    description: input.description
      ? sanitizeText((input.description as string).trim())
      : null,
    notes: input.notes ? sanitizeText((input.notes as string).trim()) : null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error: dbError } = await supabase!
    .from("finance_receivables")
    .insert(sanitized as any)
    .select("id")
    .single();

  if (dbError) return { success: false, error: dbError.message };

  await logActivity({
    action: "finance_receivable_created",
    entityType: "finance_receivable",
    entityId: data.id,
    details: { amount: sanitized.total_amount, currency: sanitized.currency },
  });

  revalidatePath("/payments");
  return { success: true, data: { id: data.id } };
}

export async function updateReceivable(
  id: string,
  input: Record<string, unknown>
): Promise<ActionResult> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const sanitized = {
    client_id: input.client_id as string,
    category_id: input.category_id ? (input.category_id as string) : null,
    reference_number: input.reference_number
      ? sanitizeText((input.reference_number as string).trim())
      : null,
    issue_date: input.issue_date as string,
    due_date: input.due_date as string,
    total_amount: input.total_amount as number,
    currency: input.currency as string,
    description: input.description
      ? sanitizeText((input.description as string).trim())
      : null,
    notes: input.notes ? sanitizeText((input.notes as string).trim()) : null,
  };

  const { error: dbError } = await supabase!
    .from("finance_receivables")
    .update(sanitized)
    .eq("id", id);

  if (dbError) return { success: false, error: dbError.message };

  await logActivity({
    action: "finance_receivable_updated",
    entityType: "finance_receivable",
    entityId: id,
  });

  revalidatePath("/payments");
  return { success: true };
}

export async function deleteReceivable(id: string): Promise<ActionResult> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const { error: dbError } = await supabase!
    .from("finance_receivables")
    .update({ is_deleted: true })
    .eq("id", id);

  if (dbError) return { success: false, error: dbError.message };

  await logActivity({
    action: "finance_receivable_deleted",
    entityType: "finance_receivable",
    entityId: id,
  });

  revalidatePath("/payments");
  return { success: true };
}

// ============================================================================
// Payments
// ============================================================================

export async function recordPayment(input: {
  direction: "outgoing" | "incoming";
  invoice_id?: string;
  receivable_id?: string;
  amount: number;
  currency: string;
  payment_date: string;
  payment_method: string;
  reference_number?: string;
  notes?: string;
}): Promise<ActionResult<{ id: string }>> {
  const { error, supabase, user } = await requireFinanceAccess();
  if (error) return { success: false, error };

  // Validate amount does not exceed remaining
  if (input.direction === "outgoing" && input.invoice_id) {
    const { data: invoice } = await supabase!
      .from("finance_invoices")
      .select("total_amount")
      .eq("id", input.invoice_id)
      .single();

    if (invoice) {
      const { data: existingPayments } = await supabase!
        .from("finance_payments")
        .select("amount")
        .eq("invoice_id", input.invoice_id)
        .eq("is_deleted", false);

      const totalPaid = (existingPayments || []).reduce(
        (sum, p) => sum + Number(p.amount),
        0
      );
      const remaining = Number(invoice.total_amount) - totalPaid;
      if (input.amount > remaining + 0.01) {
        return {
          success: false,
          error: `Amount exceeds remaining balance (${remaining.toFixed(2)})`,
        };
      }
    }
  }

  if (input.direction === "incoming" && input.receivable_id) {
    const { data: receivable } = await supabase!
      .from("finance_receivables")
      .select("total_amount")
      .eq("id", input.receivable_id)
      .single();

    if (receivable) {
      const { data: existingPayments } = await supabase!
        .from("finance_payments")
        .select("amount")
        .eq("receivable_id", input.receivable_id)
        .eq("is_deleted", false);

      const totalReceived = (existingPayments || []).reduce(
        (sum, p) => sum + Number(p.amount),
        0
      );
      const remaining = Number(receivable.total_amount) - totalReceived;
      if (input.amount > remaining + 0.01) {
        return {
          success: false,
          error: `Amount exceeds remaining balance (${remaining.toFixed(2)})`,
        };
      }
    }
  }

  const paymentData = {
    direction: input.direction,
    invoice_id: input.invoice_id || null,
    receivable_id: input.receivable_id || null,
    amount: input.amount,
    currency: input.currency,
    payment_date: input.payment_date,
    payment_method: input.payment_method,
    reference_number: input.reference_number
      ? sanitizeText(input.reference_number.trim())
      : null,
    notes: input.notes ? sanitizeText(input.notes.trim()) : null,
    recorded_by: user!.id,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error: dbError } = await supabase!
    .from("finance_payments")
    .insert(paymentData as any)
    .select("id")
    .single();

  if (dbError) return { success: false, error: dbError.message };

  // Update parent status
  if (input.direction === "outgoing" && input.invoice_id) {
    await updateInvoicePaymentStatus(supabase!, input.invoice_id);
  }
  if (input.direction === "incoming" && input.receivable_id) {
    await updateReceivablePaymentStatus(supabase!, input.receivable_id);
  }

  await logActivity({
    action:
      input.direction === "outgoing"
        ? "finance_payment_recorded"
        : "finance_payment_received",
    entityType: "finance_payment",
    entityId: data.id,
    details: { amount: input.amount, currency: input.currency },
  });

  revalidatePath("/payments");
  return { success: true, data: { id: data.id } };
}

async function updateInvoicePaymentStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  invoiceId: string
) {
  const { data: invoice } = await supabase
    .from("finance_invoices")
    .select("total_amount, status")
    .eq("id", invoiceId)
    .single();
  if (!invoice) return;

  const { data: payments } = await supabase
    .from("finance_payments")
    .select("amount")
    .eq("invoice_id", invoiceId)
    .eq("is_deleted", false);

  const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
  const totalAmount = Number(invoice.total_amount);

  let newStatus: string;
  if (totalPaid >= totalAmount) {
    newStatus = "paid";
  } else if (totalPaid > 0) {
    newStatus = "partially_paid";
  } else {
    return;
  }

  if (newStatus !== invoice.status) {
    await supabase
      .from("finance_invoices")
      .update({ status: newStatus })
      .eq("id", invoiceId);
  }
}

async function updateReceivablePaymentStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  receivableId: string
) {
  const { data: receivable } = await supabase
    .from("finance_receivables")
    .select("total_amount, status")
    .eq("id", receivableId)
    .single();
  if (!receivable) return;

  const { data: payments } = await supabase
    .from("finance_payments")
    .select("amount")
    .eq("receivable_id", receivableId)
    .eq("is_deleted", false);

  const totalReceived = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
  const totalAmount = Number(receivable.total_amount);

  let newStatus: string;
  if (totalReceived >= totalAmount) {
    newStatus = "received";
  } else if (totalReceived > 0) {
    newStatus = "partially_received";
  } else {
    return;
  }

  if (newStatus !== receivable.status) {
    await supabase
      .from("finance_receivables")
      .update({ status: newStatus })
      .eq("id", receivableId);
  }
}

export async function deletePayment(id: string): Promise<ActionResult> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const { data: payment } = await supabase!
    .from("finance_payments")
    .select("invoice_id, receivable_id")
    .eq("id", id)
    .single();

  const { error: dbError } = await supabase!
    .from("finance_payments")
    .update({ is_deleted: true })
    .eq("id", id);

  if (dbError) return { success: false, error: dbError.message };

  if (payment?.invoice_id) {
    await updateInvoicePaymentStatus(supabase!, payment.invoice_id);
  }
  if (payment?.receivable_id) {
    await updateReceivablePaymentStatus(supabase!, payment.receivable_id);
  }

  await logActivity({
    action: "finance_payment_deleted",
    entityType: "finance_payment",
    entityId: id,
  });

  revalidatePath("/payments");
  return { success: true };
}

// ============================================================================
// Recurring Templates
// ============================================================================

export async function getRecurringTemplates(): Promise<
  ActionResult<FinanceRecurringWithSupplier[]>
> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const { data, error: dbError } = await supabase!
    .from("finance_recurring_templates")
    .select(
      `
      *,
      supplier:finance_suppliers!finance_recurring_templates_supplier_id_fkey(name, supplier_code),
      category:finance_categories!finance_recurring_templates_category_id_fkey(name, color)
    `
    )
    .eq("is_deleted", false)
    .order("next_due_date");

  if (dbError) return { success: false, error: dbError.message };
  return { success: true, data: data as FinanceRecurringWithSupplier[] };
}

export async function createRecurringTemplate(
  input: Record<string, unknown>
): Promise<ActionResult<{ id: string }>> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const sanitized = {
    supplier_id: input.supplier_id as string,
    category_id: input.category_id ? (input.category_id as string) : null,
    description: sanitizeText((input.description as string).trim()),
    amount: input.amount as number,
    currency: input.currency as string,
    frequency: input.frequency as string,
    day_of_month: input.day_of_month as number,
    next_due_date: input.next_due_date as string,
    requires_approval: (input.requires_approval as boolean) || false,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error: dbError } = await supabase!
    .from("finance_recurring_templates")
    .insert(sanitized as any)
    .select("id")
    .single();

  if (dbError) return { success: false, error: dbError.message };

  await logActivity({
    action: "finance_recurring_created",
    entityType: "finance_recurring_template",
    entityId: data.id,
    details: { description: sanitized.description },
  });

  revalidatePath("/payments");
  return { success: true, data: { id: data.id } };
}

export async function updateRecurringTemplate(
  id: string,
  input: Record<string, unknown>
): Promise<ActionResult> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const sanitized = {
    supplier_id: input.supplier_id as string,
    category_id: input.category_id ? (input.category_id as string) : null,
    description: sanitizeText((input.description as string).trim()),
    amount: input.amount as number,
    currency: input.currency as string,
    frequency: input.frequency as string,
    day_of_month: input.day_of_month as number,
    next_due_date: input.next_due_date as string,
    requires_approval: (input.requires_approval as boolean) || false,
    is_active: input.is_active !== undefined ? (input.is_active as boolean) : true,
  };

  const { error: dbError } = await supabase!
    .from("finance_recurring_templates")
    .update(sanitized)
    .eq("id", id);

  if (dbError) return { success: false, error: dbError.message };

  revalidatePath("/payments");
  return { success: true };
}

export async function deleteRecurringTemplate(id: string): Promise<ActionResult> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const { error: dbError } = await supabase!
    .from("finance_recurring_templates")
    .update({ is_deleted: true })
    .eq("id", id);

  if (dbError) return { success: false, error: dbError.message };

  revalidatePath("/payments");
  return { success: true };
}

export async function processRecurringTemplates(): Promise<
  ActionResult<{ created: number }>
> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const today = new Date().toISOString().split("T")[0];
  const { data: templates, error: dbError } = await supabase!
    .from("finance_recurring_templates")
    .select("*")
    .eq("is_active", true)
    .eq("is_deleted", false)
    .lte("next_due_date", today);

  if (dbError) return { success: false, error: dbError.message };
  if (!templates || templates.length === 0) {
    return { success: true, data: { created: 0 } };
  }

  let created = 0;
  for (const template of templates) {
    const invoiceData = {
      supplier_id: template.supplier_id,
      category_id: template.category_id,
      invoice_date: template.next_due_date,
      due_date: template.next_due_date,
      total_amount: template.amount,
      currency: template.currency,
      description: template.description,
      requires_approval: template.requires_approval,
      status: template.requires_approval ? "awaiting_approval" : "pending",
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await supabase!
      .from("finance_invoices")
      .insert(invoiceData as any);

    if (!insertError) {
      created++;
      const nextDate = new Date(template.next_due_date);
      if (template.frequency === "monthly") nextDate.setMonth(nextDate.getMonth() + 1);
      else if (template.frequency === "quarterly") nextDate.setMonth(nextDate.getMonth() + 3);
      else if (template.frequency === "yearly") nextDate.setFullYear(nextDate.getFullYear() + 1);
      nextDate.setDate(Math.min(template.day_of_month, 28));

      await supabase!
        .from("finance_recurring_templates")
        .update({ next_due_date: nextDate.toISOString().split("T")[0] })
        .eq("id", template.id);
    }
  }

  await logActivity({
    action: "finance_recurring_processed",
    entityType: "finance_recurring_template",
    entityId: "batch",
    details: { created, templates: templates.length },
  });

  revalidatePath("/payments");
  return { success: true, data: { created } };
}

// ============================================================================
// Documents
// ============================================================================

export async function uploadFinanceDocument(
  entityType: "invoice" | "receivable",
  entityId: string,
  files: { name: string; type: string; data: string }[]
): Promise<ActionResult<string[]>> {
  const { error, supabase, user } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const uploadedUrls: string[] = [];

  for (const file of files) {
    const base64Data = file.data.split(",")[1] || file.data;
    const buffer = Buffer.from(base64Data, "base64");
    const ext = file.name.split(".").pop() || "pdf";
    const fileName = `${entityId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

    const { error: uploadError } = await supabase!.storage
      .from("finance-documents")
      .upload(fileName, buffer, { contentType: file.type, upsert: false });

    if (uploadError) continue;

    const { data: urlData } = supabase!.storage
      .from("finance-documents")
      .getPublicUrl(fileName);

    if (urlData?.publicUrl) {
      await supabase!.from("finance_documents").insert({
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_size: buffer.length,
        uploaded_by: user!.id,
        invoice_id: entityType === "invoice" ? entityId : null,
        receivable_id: entityType === "receivable" ? entityId : null,
      });
      uploadedUrls.push(urlData.publicUrl);
    }
  }

  revalidatePath("/payments");
  return { success: true, data: uploadedUrls };
}

export async function deleteFinanceDocument(id: string): Promise<ActionResult> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const { data: doc } = await supabase!
    .from("finance_documents")
    .select("file_url")
    .eq("id", id)
    .single();

  if (doc?.file_url) {
    const url = new URL(doc.file_url);
    const pathParts = url.pathname.split("/finance-documents/");
    if (pathParts[1]) {
      await supabase!.storage
        .from("finance-documents")
        .remove([decodeURIComponent(pathParts[1])]);
    }
  }

  const { error: dbError } = await supabase!
    .from("finance_documents")
    .delete()
    .eq("id", id);

  if (dbError) return { success: false, error: dbError.message };

  revalidatePath("/payments");
  return { success: true };
}

// ============================================================================
// Dashboard Stats
// ============================================================================

export async function getFinanceDashboardStats(): Promise<
  ActionResult<FinanceDashboardStats>
> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const today = new Date().toISOString().split("T")[0];
  const weekStart = getStartOfWeek();
  const weekEnd = getEndOfWeek();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const [invoicesRes, receivablesRes, suppliersRes, outflowRes, inflowRes] =
    await Promise.all([
      supabase!
        .from("finance_invoices")
        .select("id, total_amount, currency, due_date, status")
        .eq("is_deleted", false)
        .not("status", "in", '("paid","cancelled")'),
      supabase!
        .from("finance_receivables")
        .select("id, total_amount, currency, due_date, status")
        .eq("is_deleted", false)
        .not("status", "in", '("received","cancelled")'),
      supabase!
        .from("finance_suppliers")
        .select("id", { count: "exact" })
        .eq("is_deleted", false),
      supabase!
        .from("finance_payments")
        .select("amount")
        .eq("direction", "outgoing")
        .eq("is_deleted", false)
        .gte("payment_date", monthStart),
      supabase!
        .from("finance_payments")
        .select("amount")
        .eq("direction", "incoming")
        .eq("is_deleted", false)
        .gte("payment_date", monthStart),
    ]);

  // Invoice payment totals
  const invoiceIds = invoicesRes.data?.map((i) => i.id) || [];
  const invPayments: Record<string, number> = {};
  if (invoiceIds.length > 0) {
    const { data: payments } = await supabase!
      .from("finance_payments")
      .select("invoice_id, amount")
      .in("invoice_id", invoiceIds)
      .eq("is_deleted", false);
    payments?.forEach((p) => {
      invPayments[p.invoice_id!] = (invPayments[p.invoice_id!] || 0) + Number(p.amount);
    });
  }

  // Receivable payment totals
  const recIds = receivablesRes.data?.map((r) => r.id) || [];
  const recPayments: Record<string, number> = {};
  if (recIds.length > 0) {
    const { data: payments } = await supabase!
      .from("finance_payments")
      .select("receivable_id, amount")
      .in("receivable_id", recIds)
      .eq("is_deleted", false);
    payments?.forEach((p) => {
      recPayments[p.receivable_id!] = (recPayments[p.receivable_id!] || 0) + Number(p.amount);
    });
  }

  let totalPayable = 0,
    overduePayable = 0,
    thisWeekDue = 0,
    thisWeekDueCount = 0,
    pendingApprovals = 0;

  (invoicesRes.data || []).forEach((inv) => {
    const remaining = Number(inv.total_amount) - (invPayments[inv.id] || 0);
    totalPayable += remaining;
    if (inv.due_date < today) overduePayable += remaining;
    if (inv.due_date >= weekStart && inv.due_date <= weekEnd) {
      thisWeekDue += remaining;
      thisWeekDueCount++;
    }
    if (inv.status === "awaiting_approval") pendingApprovals++;
  });

  let totalReceivable = 0,
    overdueReceivable = 0;

  (receivablesRes.data || []).forEach((rec) => {
    const remaining = Number(rec.total_amount) - (recPayments[rec.id] || 0);
    totalReceivable += remaining;
    if (rec.due_date < today) overdueReceivable += remaining;
  });

  return {
    success: true,
    data: {
      totalPayable,
      totalReceivable,
      overduePayable,
      overdueReceivable,
      payableCurrency: "TRY",
      thisWeekDue,
      thisWeekDueCount,
      supplierCount: suppliersRes.count || 0,
      pendingApprovals,
      monthlyOutflow: (outflowRes.data || []).reduce((s, p) => s + Number(p.amount), 0),
      monthlyInflow: (inflowRes.data || []).reduce((s, p) => s + Number(p.amount), 0),
    },
  };
}

export async function getAgingReport(
  direction: "payable" | "receivable"
): Promise<ActionResult<AgingBucket>> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const today = new Date();
  const table = direction === "payable" ? "finance_invoices" : "finance_receivables";
  const paidStatus = direction === "payable" ? "paid" : "received";

  const { data: items, error: dbError } = await supabase!
    .from(table)
    .select("id, total_amount, due_date")
    .eq("is_deleted", false)
    .not("status", "in", `("${paidStatus}","cancelled")`);

  if (dbError) return { success: false, error: dbError.message };

  const ids = items?.map((i) => i.id) || [];
  const paymentTotals: Record<string, number> = {};
  if (ids.length > 0) {
    const fkCol = direction === "payable" ? "invoice_id" : "receivable_id";
    const { data: payments } = await supabase!
      .from("finance_payments")
      .select(`${fkCol}, amount`)
      .in(fkCol, ids)
      .eq("is_deleted", false);

    payments?.forEach((p) => {
      const key = (p as Record<string, unknown>)[fkCol] as string;
      paymentTotals[key] = (paymentTotals[key] || 0) + Number(p.amount);
    });
  }

  const bucket: AgingBucket = { current: 0, days30: 0, days60: 0, days90: 0, days90plus: 0 };

  (items || []).forEach((item) => {
    const remaining = Number(item.total_amount) - (paymentTotals[item.id] || 0);
    const daysDiff = Math.floor(
      (today.getTime() - new Date(item.due_date).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff <= 0) bucket.current += remaining;
    else if (daysDiff <= 30) bucket.days30 += remaining;
    else if (daysDiff <= 60) bucket.days60 += remaining;
    else if (daysDiff <= 90) bucket.days90 += remaining;
    else bucket.days90plus += remaining;
  });

  return { success: true, data: bucket };
}

export async function getCashFlowData(): Promise<ActionResult<CashFlowMonth[]>> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  const startDate = new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const { data: payments, error: dbError } = await supabase!
    .from("finance_payments")
    .select("direction, amount, payment_date")
    .eq("is_deleted", false)
    .gte("payment_date", startDate)
    .order("payment_date");

  if (dbError) return { success: false, error: dbError.message };

  const monthMap: Record<string, { outgoing: number; incoming: number }> = {};
  for (let i = 0; i < 6; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap[key] = { outgoing: 0, incoming: 0 };
  }

  (payments || []).forEach((p) => {
    const date = new Date(p.payment_date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (monthMap[key]) {
      if (p.direction === "outgoing") monthMap[key].outgoing += Number(p.amount);
      else monthMap[key].incoming += Number(p.amount);
    }
  });

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const result: CashFlowMonth[] = Object.entries(monthMap).map(([key, val]) => ({
    month: months[parseInt(key.split("-")[1]) - 1],
    outgoing: val.outgoing,
    incoming: val.incoming,
  }));

  return { success: true, data: result };
}

// ============================================================================
// Helpers
// ============================================================================

// ============================================================================
// Notification System
// ============================================================================

function getWeekLabel(date: Date = new Date()): string {
  const months = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const day = date.getDate();
  const suffix = day === 1 || day === 21 || day === 31 ? "st"
    : day === 2 || day === 22 ? "nd"
    : day === 3 || day === 23 ? "rd" : "th";
  return `${months[date.getMonth()]} ${day}${suffix} Week`;
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

export async function sendWeeklyDigestEmails(): Promise<ActionResult<{ sent: number }>> {
  const supabase = await createClient();

  // Get all whitelisted users with email
  const { data: accessList } = await supabase
    .from("finance_access")
    .select("user_id, user:users!finance_access_user_id_fkey(name, email)");

  const users = (accessList || [])
    .map((a: { user_id: string; user: { name: string; email: string } | null }) => ({
      id: a.user_id,
      name: a.user?.name || "",
      email: a.user?.email || "",
    }))
    .filter((u: { email: string }) => u.email);

  if (users.length === 0) return { success: true, data: { sent: 0 } };

  // Get invoices due this week + overdue
  const weekStart = getStartOfWeek();
  const weekEnd = getEndOfWeek();
  const today = new Date().toISOString().split("T")[0];

  const { data: allInvoices } = await supabase
    .from("finance_invoices")
    .select("*, supplier:finance_suppliers!finance_invoices_supplier_id_fkey(name, supplier_code, iban, bank_name)")
    .eq("is_deleted", false)
    .not("status", "in", '("paid","cancelled")');

  // Get payments for remaining calculation
  const invoiceIds = (allInvoices || []).map((i: { id: string }) => i.id);
  let paymentMap: Record<string, { total_paid: number; last_date: string | null }> = {};
  if (invoiceIds.length > 0) {
    const { data: payments } = await supabase
      .from("finance_payments")
      .select("invoice_id, amount, payment_date")
      .in("invoice_id", invoiceIds)
      .eq("is_deleted", false);

    (payments || []).forEach((p: { invoice_id: string | null; amount: number; payment_date: string }) => {
      if (!p.invoice_id) return;
      if (!paymentMap[p.invoice_id]) paymentMap[p.invoice_id] = { total_paid: 0, last_date: null };
      paymentMap[p.invoice_id].total_paid += Number(p.amount);
      if (!paymentMap[p.invoice_id].last_date || p.payment_date > paymentMap[p.invoice_id].last_date!) {
        paymentMap[p.invoice_id].last_date = p.payment_date;
      }
    });
  }

  const overdueItems: { supplier_name: string; invoice_code: string; amount_owed: number; currency: string; due_date: string; days_overdue: number }[] = [];
  const dueItems: typeof overdueItems = [];
  const pdfRows: { supplier_name: string; supplier_iban: string | null; supplier_bank: string | null; invoice_code: string; amount_owed: number; total_paid: number; currency: string; due_date: string; last_payment_date: string | null; status: string; description: string | null }[] = [];

  (allInvoices || []).forEach((inv: any) => {
    const pm = paymentMap[inv.id] || { total_paid: 0, last_date: null };
    const remaining = Number(inv.total_amount) - pm.total_paid;
    const supplierName = inv.supplier?.name || "";
    const daysOverdue = inv.due_date < today
      ? Math.floor((new Date(today).getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const row = {
      supplier_name: supplierName,
      invoice_code: inv.invoice_code,
      amount_owed: remaining,
      currency: inv.currency,
      due_date: formatDateShort(inv.due_date),
      days_overdue: daysOverdue,
    };

    if (daysOverdue > 0) {
      overdueItems.push(row);
    } else if (inv.due_date >= weekStart && inv.due_date <= weekEnd) {
      dueItems.push(row);
    }

    pdfRows.push({
      supplier_name: supplierName,
      supplier_iban: inv.supplier?.iban || null,
      supplier_bank: inv.supplier?.bank_name || null,
      invoice_code: inv.invoice_code,
      amount_owed: remaining,
      total_paid: pm.total_paid,
      currency: inv.currency,
      due_date: inv.due_date,
      last_payment_date: pm.last_date,
      status: inv.status,
      description: inv.description,
    });
  });

  // Get receivables due this week
  const { data: receivables } = await supabase
    .from("finance_receivables")
    .select("*, client:clients!finance_receivables_client_id_fkey(company_name)")
    .eq("is_deleted", false)
    .not("status", "in", '("received","cancelled")')
    .gte("due_date", weekStart)
    .lte("due_date", weekEnd);

  const incomingItems = (receivables || []).map((rec: any) => ({
    client_name: rec.client?.company_name || "",
    receivable_code: rec.receivable_code,
    amount: Number(rec.total_amount),
    currency: rec.currency,
    due_date: formatDateShort(rec.due_date),
  }));

  // Calculate totals by currency
  const totalsByurrency: Record<string, number> = {};
  [...overdueItems, ...dueItems].forEach((item) => {
    totalsByurrency[item.currency] = (totalsByurrency[item.currency] || 0) + item.amount_owed;
  });

  // Generate PDF
  const { generatePaymentSchedulePdf } = await import("@/lib/pdf/generate-payment-schedule-pdf");
  const weekLabel = getWeekLabel();
  const pdfBuffer = await generatePaymentSchedulePdf({
    rows: pdfRows,
    title: `${weekLabel} — Payment Schedule`,
    dateRange: `${formatDateShort(weekStart)} — ${formatDateShort(weekEnd)}`,
  });

  // Send emails via Resend
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { success: false, error: "RESEND_API_KEY not configured" };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const { Resend } = await import("resend");
  const { FinanceSummaryEmail } = await import("@/emails/finance-summary-email");
  const resend = new Resend(apiKey);

  const pdfFilename = `Formula_Payment_Schedule_${weekLabel.replace(/\s/g, "_")}.pdf`;

  try {
    // Send individual emails (not batch) to support attachments
    for (const u of users) {
      await resend.emails.send({
        from: "Formula Contract <noreply@formulacontractpm.com>",
        to: u.email,
        subject: `Formula — ${weekLabel} Payments: ${overdueItems.length + dueItems.length} invoices`,
        react: FinanceSummaryEmail({
          weekLabel,
          overdueItems,
          dueItems,
          incomingItems,
          totalsByurrency,
          dashboardUrl: `${siteUrl}/payments`,
        }),
        attachments: [{
          filename: pdfFilename,
          content: pdfBuffer,
          contentType: "application/pdf",
        }],
      });
    }
  } catch (e) {
    console.error("[sendWeeklyDigest] Email error:", e);
    return { success: false, error: "Email sending error" };
  }

  // Create in-app notifications
  const { createNotification } = await import("@/lib/notifications/actions");
  for (const user of users) {
    await createNotification({
      userId: user.id,
      type: "finance_weekly_digest",
      title: `${weekLabel} Payment Summary`,
      message: `${overdueItems.length + dueItems.length} payments due this week`,
    });
  }

  await logActivity({
    action: "finance_weekly_digest_sent",
    entityType: "finance",
    entityId: "digest",
    details: { recipientCount: users.length, invoiceCount: overdueItems.length + dueItems.length },
  });

  return { success: true, data: { sent: users.length } };
}

export async function sendManualSummary(options: {
  dateRange: string;
  customStart?: string;
  customEnd?: string;
  includeOverdue: boolean;
  includeIncoming: boolean;
  note?: string;
}): Promise<ActionResult<{ sent: number }>> {
  const supabase = await createClient();

  // Get whitelisted users
  const { data: accessList } = await supabase
    .from("finance_access")
    .select("user_id, user:users!finance_access_user_id_fkey(name, email)");

  const users = (accessList || [])
    .map((a: { user_id: string; user: { name: string; email: string } | null }) => ({
      id: a.user_id, name: a.user?.name || "", email: a.user?.email || "",
    }))
    .filter((u: { email: string }) => u.email);

  if (users.length === 0) return { success: true, data: { sent: 0 } };

  // Calculate date range based on selection
  const today = new Date();
  let filterStart: string | null = null;
  let filterEnd: string | null = null;
  let pdfTitle = "Payment Schedule";
  let dateRangeLabel = "";

  switch (options.dateRange) {
    case "this_week":
      filterStart = getStartOfWeek();
      filterEnd = getEndOfWeek();
      pdfTitle = `${getWeekLabel()} — Payment Schedule`;
      dateRangeLabel = `${formatDateShort(filterStart)} — ${formatDateShort(filterEnd)}`;
      break;
    case "next_2_weeks": {
      filterStart = today.toISOString().split("T")[0];
      const twoWeeks = new Date(today);
      twoWeeks.setDate(twoWeeks.getDate() + 13);
      filterEnd = twoWeeks.toISOString().split("T")[0];
      pdfTitle = "Next 2 Weeks — Payment Schedule";
      dateRangeLabel = `${formatDateShort(filterStart)} — ${formatDateShort(filterEnd)}`;
      break;
    }
    case "this_month": {
      filterStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
      filterEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0];
      const monthName = today.toLocaleString("en-US", { month: "long", year: "numeric" });
      pdfTitle = `${monthName} — Payment Schedule`;
      dateRangeLabel = `${formatDateShort(filterStart)} — ${formatDateShort(filterEnd)}`;
      break;
    }
    case "all":
      pdfTitle = "All Outstanding Payments";
      dateRangeLabel = `As of ${formatDateShort(today.toISOString())}`;
      break;
    default:
      if (options.customStart && options.customEnd) {
        filterStart = options.customStart;
        filterEnd = options.customEnd;
        pdfTitle = "Payment Schedule";
        dateRangeLabel = `${formatDateShort(filterStart)} — ${formatDateShort(filterEnd)}`;
      }
  }

  // Get all unpaid invoices
  let query = supabase
    .from("finance_invoices")
    .select("*, supplier:finance_suppliers!finance_invoices_supplier_id_fkey(name, supplier_code, iban, bank_name)")
    .eq("is_deleted", false)
    .not("status", "in", '("paid","cancelled")');

  // Apply date filter (except "all")
  if (filterStart) query = query.gte("due_date", filterStart);
  if (filterEnd) query = query.lte("due_date", filterEnd);

  const { data: filteredInvoices } = await query;

  // Also get overdue invoices if requested (even if outside date range)
  let overdueInvoices: typeof filteredInvoices = [];
  if (options.includeOverdue && filterStart) {
    const { data: overdue } = await supabase
      .from("finance_invoices")
      .select("*, supplier:finance_suppliers!finance_invoices_supplier_id_fkey(name, supplier_code, iban, bank_name)")
      .eq("is_deleted", false)
      .not("status", "in", '("paid","cancelled")')
      .lt("due_date", today.toISOString().split("T")[0]);
    overdueInvoices = overdue || [];
  }

  // Merge and deduplicate
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allInvoices: any[] = [...(filteredInvoices || [])];
  const existingIds = new Set(allInvoices.map((i: { id: string }) => i.id));
  (overdueInvoices || []).forEach((inv: { id: string }) => {
    if (!existingIds.has(inv.id)) allInvoices.push(inv);
  });

  // Get payments for remaining calculation
  const invoiceIds = allInvoices.map((i: { id: string }) => i.id);
  let paymentMap: Record<string, { total_paid: number; last_date: string | null }> = {};
  if (invoiceIds.length > 0) {
    const { data: payments } = await supabase
      .from("finance_payments")
      .select("invoice_id, amount, payment_date")
      .in("invoice_id", invoiceIds)
      .eq("is_deleted", false);

    (payments || []).forEach((p: { invoice_id: string | null; amount: number; payment_date: string }) => {
      if (!p.invoice_id) return;
      if (!paymentMap[p.invoice_id]) paymentMap[p.invoice_id] = { total_paid: 0, last_date: null };
      paymentMap[p.invoice_id].total_paid += Number(p.amount);
      if (!paymentMap[p.invoice_id].last_date || p.payment_date > paymentMap[p.invoice_id].last_date!) {
        paymentMap[p.invoice_id].last_date = p.payment_date;
      }
    });
  }

  const todayStr = today.toISOString().split("T")[0];

  // Build email data
  const overdueItems: { supplier_name: string; invoice_code: string; amount_owed: number; currency: string; due_date: string; days_overdue: number }[] = [];
  const dueItems: typeof overdueItems = [];
  const pdfRows: { supplier_name: string; supplier_iban: string | null; supplier_bank: string | null; invoice_code: string; amount_owed: number; total_paid: number; currency: string; due_date: string; last_payment_date: string | null; status: string; description: string | null }[] = [];

  allInvoices.forEach((inv: any) => {
    const pm = paymentMap[inv.id] || { total_paid: 0, last_date: null };
    const remaining = Number(inv.total_amount) - pm.total_paid;
    const supplierName = inv.supplier?.name || "";
    const daysOverdue = inv.due_date < todayStr
      ? Math.floor((new Date(todayStr).getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const row = {
      supplier_name: supplierName,
      invoice_code: inv.invoice_code,
      amount_owed: remaining,
      currency: inv.currency,
      due_date: formatDateShort(inv.due_date),
      days_overdue: daysOverdue,
    };

    if (daysOverdue > 0) overdueItems.push(row);
    else dueItems.push(row);

    pdfRows.push({
      supplier_name: supplierName,
      supplier_iban: inv.supplier?.iban || null,
      supplier_bank: inv.supplier?.bank_name || null,
      invoice_code: inv.invoice_code,
      amount_owed: remaining,
      total_paid: pm.total_paid,
      currency: inv.currency,
      due_date: inv.due_date,
      last_payment_date: pm.last_date,
      status: inv.status,
      description: inv.description,
    });
  });

  // Receivables
  let incomingItems: { client_name: string; receivable_code: string; amount: number; currency: string; due_date: string }[] = [];
  if (options.includeIncoming) {
    let recQuery = supabase
      .from("finance_receivables")
      .select("*, client:clients!finance_receivables_client_id_fkey(company_name)")
      .eq("is_deleted", false)
      .not("status", "in", '("received","cancelled")');

    if (filterStart) recQuery = recQuery.gte("due_date", filterStart);
    if (filterEnd) recQuery = recQuery.lte("due_date", filterEnd);

    const { data: receivables } = await recQuery;
    incomingItems = (receivables || []).map((rec: any) => ({
      client_name: rec.client?.company_name || "",
      receivable_code: rec.receivable_code,
      amount: Number(rec.total_amount),
      currency: rec.currency,
      due_date: formatDateShort(rec.due_date),
    }));
  }

  // Totals
  const totalsByurrency: Record<string, number> = {};
  [...overdueItems, ...dueItems].forEach((item) => {
    totalsByurrency[item.currency] = (totalsByurrency[item.currency] || 0) + item.amount_owed;
  });

  // Generate PDF
  const { generatePaymentSchedulePdf } = await import("@/lib/pdf/generate-payment-schedule-pdf");
  const pdfBuffer = await generatePaymentSchedulePdf({
    rows: pdfRows,
    title: pdfTitle,
    dateRange: dateRangeLabel,
    note: options.note,
  });

  // Send emails
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { success: false, error: "RESEND_API_KEY not configured" };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const { Resend } = await import("resend");
  const { FinanceSummaryEmail } = await import("@/emails/finance-summary-email");
  const resend = new Resend(apiKey);

  const weekLabel = getWeekLabel();
  const emailSubject = options.dateRange === "all"
    ? `Formula — All Outstanding Payments: ${overdueItems.length + dueItems.length} invoices`
    : `Formula — ${weekLabel} Payments: ${overdueItems.length + dueItems.length} invoices`;

  const pdfFilename = pdfTitle.replace(/\s/g, "_").replace(/—/g, "-") + ".pdf";

  try {
    for (const u of users) {
      await resend.emails.send({
        from: "Formula Contract <noreply@formulacontractpm.com>",
        to: u.email,
        subject: emailSubject,
        react: FinanceSummaryEmail({
          weekLabel: options.dateRange === "all" ? "All Outstanding" : weekLabel,
          note: options.note,
          overdueItems,
          dueItems,
          incomingItems,
          totalsByurrency,
          dashboardUrl: `${siteUrl}/payments`,
        }),
        attachments: [{
          filename: pdfFilename,
          content: pdfBuffer,
          contentType: "application/pdf",
        }],
      });
    }
  } catch (e) {
    console.error("[sendManualSummary] Email error:", e);
    return { success: false, error: "Email sending error" };
  }

  // In-app notifications
  const { createNotification } = await import("@/lib/notifications/actions");
  for (const u of users) {
    await createNotification({
      userId: u.id,
      type: "finance_manual_summary",
      title: `Payment Summary Sent`,
      message: `${overdueItems.length + dueItems.length} invoices — ${pdfTitle}`,
    });
  }

  await logActivity({
    action: "finance_manual_summary_sent",
    entityType: "finance",
    entityId: "manual",
    details: { dateRange: options.dateRange, recipientCount: users.length, invoiceCount: allInvoices.length },
  });

  revalidatePath("/payments");
  return { success: true, data: { sent: users.length } };
}

export async function notifyTeamUrgent(
  invoiceIds: string[],
  note?: string
): Promise<ActionResult<{ sent: number }>> {
  const { error, supabase, user } = await requireFinanceAccess();
  if (error) return { success: false, error };

  // Get selected invoices with supplier details
  const { data: invoices } = await supabase
    .from("finance_invoices")
    .select("*, supplier:finance_suppliers!finance_invoices_supplier_id_fkey(name, supplier_code, iban, bank_name)")
    .in("id", invoiceIds)
    .eq("is_deleted", false);

  if (!invoices || invoices.length === 0) return { success: false, error: "No invoices found" };

  // Get payment data
  let paymentMap: Record<string, { total_paid: number; last_date: string | null }> = {};
  const { data: payments } = await supabase
    .from("finance_payments")
    .select("invoice_id, amount, payment_date")
    .in("invoice_id", invoiceIds)
    .eq("is_deleted", false);

  (payments || []).forEach((p: any) => {
    if (!paymentMap[p.invoice_id]) paymentMap[p.invoice_id] = { total_paid: 0, last_date: null };
    paymentMap[p.invoice_id].total_paid += Number(p.amount);
    if (!paymentMap[p.invoice_id].last_date || p.payment_date > paymentMap[p.invoice_id].last_date!) {
      paymentMap[p.invoice_id].last_date = p.payment_date;
    }
  });

  // Get sender name
  const { data: senderData } = await supabase
    .from("users")
    .select("name")
    .eq("id", user!.id)
    .single();
  const senderName = senderData?.name || "Unknown";

  // Build data
  const emailInvoices = invoices.map((inv: any) => {
    const pm = paymentMap[inv.id] || { total_paid: 0, last_date: null };
    return {
      supplier_name: inv.supplier?.name || "",
      invoice_code: inv.invoice_code,
      amount_owed: Number(inv.total_amount) - pm.total_paid,
      currency: inv.currency,
      due_date: formatDateShort(inv.due_date),
    };
  });

  const pdfRows = invoices.map((inv: any) => {
    const pm = paymentMap[inv.id] || { total_paid: 0, last_date: null };
    return {
      supplier_name: inv.supplier?.name || "",
      supplier_iban: inv.supplier?.iban || null,
      supplier_bank: inv.supplier?.bank_name || null,
      invoice_code: inv.invoice_code,
      amount_owed: Number(inv.total_amount) - pm.total_paid,
      total_paid: pm.total_paid,
      currency: inv.currency,
      due_date: inv.due_date,
      last_payment_date: pm.last_date,
      status: inv.status,
      description: inv.description,
    };
  });

  const totalsByurrency: Record<string, number> = {};
  emailInvoices.forEach((inv: { currency: string; amount_owed: number }) => {
    totalsByurrency[inv.currency] = (totalsByurrency[inv.currency] || 0) + inv.amount_owed;
  });

  // Generate PDF
  const { generatePaymentSchedulePdf } = await import("@/lib/pdf/generate-payment-schedule-pdf");
  const pdfBuffer = await generatePaymentSchedulePdf({
    rows: pdfRows,
    title: "Urgent Payment Notice",
    note: note || undefined,
  });

  // Get all whitelisted users
  const { data: accessList } = await supabase
    .from("finance_access")
    .select("user_id, user:users!finance_access_user_id_fkey(name, email)");

  const users = (accessList || [])
    .map((a: any) => ({ id: a.user_id, name: a.user?.name || "", email: a.user?.email || "" }))
    .filter((u: { email: string }) => u.email);

  // Send emails
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { success: false, error: "RESEND_API_KEY not configured" };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const { Resend } = await import("resend");
  const { FinanceUrgentEmail } = await import("@/emails/finance-urgent-email");
  const resend = new Resend(apiKey);

  const totalsText = Object.entries(totalsByurrency)
    .map(([currency, amount]) => {
      const symbols: Record<string, string> = { TRY: "₺", USD: "$", EUR: "€" };
      return `${symbols[currency] || currency}${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
    })
    .join(" + ");

  const urgentSubject = `⚠️ Urgent — ${invoices.length} payment${invoices.length !== 1 ? "s" : ""} need processing (${totalsText})`;
  const urgentFilename = `Formula_Urgent_Payments_${new Date().toISOString().split("T")[0]}.pdf`;

  try {
    for (const u of users) {
      await resend.emails.send({
        from: "Formula Contract <noreply@formulacontractpm.com>",
        to: u.email,
        subject: urgentSubject,
        react: FinanceUrgentEmail({
          senderName,
          note,
          invoices: emailInvoices,
          totalsByurrency,
          dashboardUrl: `${siteUrl}/payments/invoices`,
        }),
        attachments: [{
          filename: urgentFilename,
          content: pdfBuffer,
          contentType: "application/pdf",
        }],
      });
    }
  } catch (e) {
    console.error("[notifyTeamUrgent] Email error:", e);
    return { success: false, error: "Email sending error" };
  }

  // In-app notifications
  const { createNotification } = await import("@/lib/notifications/actions");
  for (const u of users) {
    await createNotification({
      userId: u.id,
      type: "finance_urgent_notify",
      title: `⚠️ Urgent: ${invoices.length} payments need processing`,
      message: note || `${totalsText} — sent by ${senderName}`,
    });
  }

  await logActivity({
    action: "finance_urgent_notify_sent",
    entityType: "finance",
    entityId: "urgent",
    details: { invoiceIds, senderName, recipientCount: users.length },
  });

  revalidatePath("/payments");
  return { success: true, data: { sent: users.length } };
}

// ============================================================================
// Excel Export
// ============================================================================

export async function exportInvoicesToExcel(
  filters?: InvoiceFilters
): Promise<ActionResult<string>> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  // Reuse getInvoices logic
  const result = await getInvoices(filters);
  if (!result.success) return { success: false, error: result.error };

  const rows = (result.data || []).map((inv) => ({
    invoice_code: inv.invoice_code,
    supplier_name: (inv.supplier as { name: string } | null)?.name || "",
    invoice_number: inv.invoice_number,
    project_code: (inv.project as { project_code: string } | null)?.project_code || null,
    category_name: (inv.category as { name: string } | null)?.name || null,
    invoice_date: inv.invoice_date,
    due_date: inv.due_date,
    total_amount: Number(inv.total_amount),
    vat_rate: Number(inv.vat_rate || 0),
    vat_amount: Number(inv.vat_amount || 0),
    currency: inv.currency,
    total_paid: inv.total_paid,
    remaining: inv.remaining,
    status: inv.status,
    description: inv.description,
    days_overdue: inv.days_overdue,
  }));

  const { generateInvoicesExcel } = await import("@/lib/excel/finance-export");
  const buffer = await generateInvoicesExcel(rows);
  return { success: true, data: buffer.toString("base64") };
}

export async function exportReceivablesToExcel(
  filters?: ReceivableFilters
): Promise<ActionResult<string>> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const result = await getReceivables(filters);
  if (!result.success) return { success: false, error: result.error };

  const rows = (result.data || []).map((rec) => ({
    receivable_code: rec.receivable_code,
    client_name: (rec.client as { company_name: string } | null)?.company_name || "",
    reference_number: rec.reference_number,
    category_name: (rec.category as { name: string } | null)?.name || null,
    issue_date: rec.issue_date,
    due_date: rec.due_date,
    total_amount: Number(rec.total_amount),
    currency: rec.currency,
    total_received: rec.total_received,
    remaining: rec.remaining,
    status: rec.status,
    description: rec.description,
    days_overdue: rec.days_overdue,
  }));

  const { generateReceivablesExcel } = await import("@/lib/excel/finance-export");
  const buffer = await generateReceivablesExcel(rows);
  return { success: true, data: buffer.toString("base64") };
}

export async function exportPaymentScheduleToExcel(): Promise<ActionResult<string>> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  // Get all unpaid/partially paid invoices with supplier bank details
  const result = await getInvoices({ status: undefined });
  if (!result.success) return { success: false, error: result.error };

  const activeInvoices = (result.data || []).filter(
    (inv) => !["paid", "cancelled"].includes(inv.status)
  );

  // Get last payment for each invoice
  const invoiceIds = activeInvoices.map((inv) => inv.id);
  let lastPaymentMap: Record<string, { date: string; amount: number }> = {};

  if (invoiceIds.length > 0) {
    const { data: payments } = await supabase
      .from("finance_payments")
      .select("invoice_id, amount, payment_date")
      .in("invoice_id", invoiceIds)
      .eq("is_deleted", false)
      .order("payment_date", { ascending: false });

    // Keep only the most recent payment per invoice
    (payments || []).forEach((p) => {
      if (p.invoice_id && !lastPaymentMap[p.invoice_id]) {
        lastPaymentMap[p.invoice_id] = {
          date: p.payment_date,
          amount: Number(p.amount),
        };
      }
    });
  }

  const rows = activeInvoices
    .map((inv) => {
      const supplier = inv.supplier as { name: string; iban: string | null; bank_name: string | null } | null;
      const lastPayment = lastPaymentMap[inv.id];
      return {
        supplier_name: supplier?.name || "",
        supplier_iban: supplier?.iban || null,
        supplier_bank: supplier?.bank_name || null,
        invoice_code: inv.invoice_code,
        invoice_number: inv.invoice_number,
        amount: Number(inv.total_amount),
        total_paid: inv.total_paid,
        remaining: inv.remaining,
        currency: inv.currency,
        due_date: inv.due_date,
        description: inv.description,
        category_name: (inv.category as { name: string } | null)?.name || null,
        status: inv.status,
        last_payment_date: lastPayment?.date || null,
        last_payment_amount: lastPayment?.amount || null,
      };
    })
    .sort((a, b) => a.supplier_name.localeCompare(b.supplier_name));

  const { generatePaymentScheduleExcel } = await import("@/lib/excel/finance-export");
  const buffer = await generatePaymentScheduleExcel(rows);
  return { success: true, data: buffer.toString("base64") };
}

// ============================================================================
// Helpers
// ============================================================================

// ============================================================================
// Cron Schedule Management
// ============================================================================

export async function getDigestSchedule(): Promise<ActionResult<{ day: number; hour: number } | null>> {
  const { error, supabase } = await requireAdmin();
  if (error) return { success: false, error };

  const { data, error: dbError } = await supabase
    .rpc("get_cron_schedule", { job_name: "finance-weekly-digest" });

  if (dbError) {
    // If the function doesn't exist or cron not set up, return null
    return { success: true, data: null };
  }

  if (!data) return { success: true, data: null };

  // Parse cron expression "0 14 * * 2" → { hour: 14, day: 2 }
  const parts = (data as string).split(" ");
  if (parts.length >= 5) {
    return {
      success: true,
      data: { hour: parseInt(parts[1]) || 8, day: parseInt(parts[4]) || 1 },
    };
  }

  return { success: true, data: null };
}

export async function updateDigestSchedule(
  day: number,
  hourUtc: number
): Promise<ActionResult> {
  const { error, supabase } = await requireAdmin();
  if (error) return { success: false, error };

  const cronExpr = `0 ${hourUtc} * * ${day}`;

  // Try to update existing job, or create new one
  const { error: dbError } = await supabase.rpc("update_cron_schedule", {
    job_name: "finance-weekly-digest",
    new_schedule: cronExpr,
  });

  if (dbError) {
    return { success: false, error: "Failed to update schedule. Make sure pg_cron is enabled." };
  }

  return { success: true };
}

function getStartOfWeek(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff);
  return monday.toISOString().split("T")[0];
}

function getEndOfWeek(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? 0 : 7);
  const sunday = new Date(now);
  sunday.setDate(diff);
  return sunday.toISOString().split("T")[0];
}
