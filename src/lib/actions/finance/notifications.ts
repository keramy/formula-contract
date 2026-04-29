"use server";

/**
 * Finance Notifications + Cron Schedule
 *
 * Weekly digest, manual summary, and urgent-team notification email
 * flows, plus admin controls for the digest cron schedule. PDF and
 * Excel attachments are built inline; the Resend client comes from
 * the shared platform helper.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-log/actions";
import { getSiteUrl } from "@/lib/platform/env";
import { getResendClient } from "@/lib/platform/mail";
import { requireFinanceAccess, requireAdmin, type ActionResult } from "./_shared";
import { getStartOfWeek, getEndOfWeek } from "./_dates";

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
  const resend = getResendClient();
  if (!resend) return { success: false, error: "RESEND_API_KEY not configured" };

  const siteUrl = getSiteUrl();
  const { FinanceSummaryEmail } = await import("@/emails/finance-summary-email");

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
  const resend = getResendClient();
  if (!resend) return { success: false, error: "RESEND_API_KEY not configured" };

  const siteUrl = getSiteUrl();
  const { FinanceSummaryEmail } = await import("@/emails/finance-summary-email");

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
  const resend = getResendClient();
  if (!resend) return { success: false, error: "RESEND_API_KEY not configured" };

  const siteUrl = getSiteUrl();
  const { FinanceUrgentEmail } = await import("@/emails/finance-urgent-email");

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
