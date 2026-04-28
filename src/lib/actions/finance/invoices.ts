"use server";

/**
 * Finance Invoices
 *
 * Accounts payable: invoice CRUD, bulk operations, and approval flow.
 * Bulk approve/delete and individual approve/reject all live here so the
 * approval state machine stays in one place.
 */

import { revalidatePath } from "next/cache";
import { sanitizeText } from "@/lib/sanitize";
import { logActivity } from "@/lib/activity-log/actions";
import { requireFinanceAccess, type ActionResult } from "./_shared";
import type {
  FinanceInvoiceWithDetails,
  FinancePayment,
  FinanceInstallment,
  FinanceDocument,
  InvoiceFilters,
} from "@/types/finance";

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

  const pageLimit = filters?.limit || 50;
  const pageOffset = filters?.offset || 0;

  const { data: invoices, error: dbError } = await query
    .order("due_date")
    .range(pageOffset, pageOffset + pageLimit - 1);

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

export async function bulkDeleteInvoices(ids: string[]): Promise<ActionResult<{ deleted: number }>> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  if (ids.length === 0) return { success: true, data: { deleted: 0 } };

  const { data, error: dbError } = await supabase!
    .from("finance_invoices")
    .update({ is_deleted: true })
    .in("id", ids)
    .select("id");

  if (dbError) return { success: false, error: dbError.message };

  for (const row of data || []) {
    await logActivity({
      action: "finance_invoice_deleted",
      entityType: "finance_invoice",
      entityId: row.id,
    });
  }

  revalidatePath("/payments");
  return { success: true, data: { deleted: data?.length || 0 } };
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
