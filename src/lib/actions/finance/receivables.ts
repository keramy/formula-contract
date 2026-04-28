"use server";

/**
 * Finance Receivables + Payments
 *
 * Accounts receivable CRUD plus payment recording. recordPayment lives
 * here because most payments are recorded against invoices/receivables
 * — keeping it adjacent to receivables avoids a circular import with
 * the invoices module that calls into the same payment shape.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sanitizeText } from "@/lib/sanitize";
import { logActivity } from "@/lib/activity-log/actions";
import { requireFinanceAccess, type ActionResult } from "./_shared";
import type {
  FinanceReceivableWithDetails,
  FinancePayment,
  FinanceInstallment,
  FinanceDocument,
  ReceivableFilters,
} from "@/types/finance";

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

