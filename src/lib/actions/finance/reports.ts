"use server";

/**
 * Finance Reports + Documents + Excel Exports
 *
 * Read-side aggregations (dashboard KPIs, aging, cash flow), document
 * uploads, and Excel exports. Excel exports reuse getInvoices /
 * getReceivables for filter parity, so this module imports from the
 * transactional siblings.
 */

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity-log/actions";
import { requireFinanceAccess, type ActionResult } from "./_shared";
import { getStartOfWeek, getEndOfWeek } from "./_dates";
import { getInvoices } from "./invoices";
import { getReceivables } from "./receivables";
import type {
  FinanceDocument,
  FinanceDashboardStats,
  AgingBucket,
  CashFlowMonth,
  InvoiceFilters,
  ReceivableFilters,
} from "@/types/finance";

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
