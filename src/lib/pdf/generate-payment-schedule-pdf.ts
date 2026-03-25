/**
 * Payment Schedule PDF Generator
 *
 * Generates a print-ready PDF grouped by supplier with bank details,
 * invoice amounts, payment status, and totals.
 * Used by: weekly digest, manual summary, and urgent notify emails.
 */

interface PaymentSchedulePdfRow {
  supplier_name: string;
  supplier_iban: string | null;
  supplier_bank: string | null;
  invoice_code: string;
  amount_owed: number;
  total_paid: number;
  currency: string;
  due_date: string;
  last_payment_date: string | null;
  status: string;
  description: string | null;
}

interface PaymentSchedulePdfOptions {
  rows: PaymentSchedulePdfRow[];
  title?: string;
  note?: string;
  dateRange?: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

function formatAmount(amount: number, currency?: string): string {
  const symbols: Record<string, string> = { TRY: "₺", USD: "$", EUR: "€" };
  const formatted = amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (currency && symbols[currency]) return `${symbols[currency]}${formatted}`;
  return formatted;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Ready to Pay",
  awaiting_approval: "Needs Approval",
  approved: "Ready to Pay",
  partially_paid: "Partially Paid",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

export async function generatePaymentSchedulePdf(
  options: PaymentSchedulePdfOptions
): Promise<Buffer> {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Colors
  const darkBg: [number, number, number] = [26, 43, 60];
  const lightBg: [number, number, number] = [240, 244, 248];
  const subtotalBg: [number, number, number] = [220, 230, 240];
  const red: [number, number, number] = [220, 38, 38];
  const gray: [number, number, number] = [120, 120, 120];
  const lightGray: [number, number, number] = [170, 170, 170];
  const black: [number, number, number] = [30, 30, 30];

  // ── Helper: check if we need a new page ──
  function checkPage(needed: number) {
    if (y + needed > pageHeight - 20) {
      doc.addPage();
      y = margin;
    }
  }

  // ── Company Header ──
  doc.setFontSize(11);
  doc.setTextColor(...darkBg);
  doc.text("FORMULA INTERNATIONAL", margin, y);
  doc.setFontSize(7);
  doc.setTextColor(...gray);
  doc.text("Furniture Manufacturing & Project Management", margin, y + 4);
  y += 12;

  // ── Divider ──
  doc.setDrawColor(...darkBg);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // ── Title ──
  doc.setFontSize(14);
  doc.setTextColor(...black);
  doc.text(options.title || "Payment Schedule", margin, y);
  y += 6;

  if (options.dateRange) {
    doc.setFontSize(9);
    doc.setTextColor(...gray);
    doc.text(options.dateRange, margin, y);
    y += 4;
  }

  doc.setFontSize(8);
  doc.setTextColor(...gray);
  doc.text(`Generated: ${formatDate(new Date().toISOString())}`, margin, y);
  y += 4;

  if (options.note) {
    y += 2;
    doc.setFontSize(9);
    doc.setTextColor(...black);
    doc.text(`Note: ${options.note}`, margin, y, { maxWidth: contentWidth });
    y += 6;
  }

  y += 4;

  // ── Group by supplier ──
  const supplierMap = new Map<string, PaymentSchedulePdfRow[]>();
  options.rows.forEach((row) => {
    const key = row.supplier_name;
    if (!supplierMap.has(key)) supplierMap.set(key, []);
    supplierMap.get(key)!.push(row);
  });

  // Grand totals
  const grandTotals: Record<string, { paid: number; owed: number }> = {};

  let supplierIndex = 0;
  for (const [supplierName, invoices] of supplierMap) {
    supplierIndex++;
    const supplier = invoices[0];

    // ── Supplier header ──
    checkPage(40);

    // Background bar
    doc.setFillColor(...lightBg);
    doc.rect(margin, y - 4, contentWidth, 14, "F");

    // Supplier number + name
    doc.setFontSize(10);
    doc.setTextColor(...black);
    doc.text(`${supplierIndex}. ${supplierName}`, margin + 2, y + 1);

    // Bank details — always show labels, use "—" for missing values
    doc.setFontSize(7);
    doc.setTextColor(...gray);
    const bankValue = supplier.supplier_bank || "—";
    const ibanValue = supplier.supplier_iban || "—";
    doc.text(`Bank: ${bankValue}`, margin + 2, y + 6);
    doc.text(`IBAN: ${ibanValue}`, margin + 60, y + 6);

    y += 14;

    // ── Column headers ──
    doc.setFontSize(7);
    doc.setTextColor(...gray);
    const colX = {
      invoice: margin + 2,
      owed: margin + 48,
      paid: margin + 73,
      currency: margin + 85,
      dueDate: margin + 102,
      lastPaid: margin + 125,
      status: margin + 150,
    };

    doc.text("Invoice", colX.invoice, y);
    doc.text("Owed", colX.owed, y, { align: "right" });
    doc.text("Paid", colX.paid, y, { align: "right" });
    doc.text("Cur.", colX.currency, y);
    doc.text("Due Date", colX.dueDate, y);
    doc.text("Last Paid", colX.lastPaid, y);
    doc.text("Status", colX.status, y);
    y += 1;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    // ── Invoice rows ──
    let supplierPaid = 0;
    let supplierOwed = 0;

    invoices.forEach((inv) => {
      checkPage(6);

      const isOverdue = new Date(inv.due_date) < new Date() && inv.amount_owed > 0;
      const statusLabel = STATUS_LABELS[inv.status] || inv.status;

      doc.setFontSize(8);

      // Invoice code
      doc.setTextColor(...black);
      doc.text(inv.invoice_code, colX.invoice, y);

      // Amount owed — red if overdue
      doc.setTextColor(isOverdue ? red[0] : black[0], isOverdue ? red[1] : black[1], isOverdue ? red[2] : black[2]);
      doc.text(formatAmount(inv.amount_owed), colX.owed, y, { align: "right" });

      // Paid
      doc.setTextColor(inv.total_paid > 0 ? black[0] : lightGray[0], inv.total_paid > 0 ? black[1] : lightGray[1], inv.total_paid > 0 ? black[2] : lightGray[2]);
      doc.text(inv.total_paid > 0 ? formatAmount(inv.total_paid) : "—", colX.paid, y, { align: "right" });

      // Currency
      doc.setFontSize(7);
      doc.setTextColor(...gray);
      doc.text(inv.currency, colX.currency, y);

      // Due date — red if overdue
      doc.setFontSize(8);
      doc.setTextColor(isOverdue ? red[0] : black[0], isOverdue ? red[1] : black[1], isOverdue ? red[2] : black[2]);
      doc.text(formatDate(inv.due_date), colX.dueDate, y);

      // Last paid
      doc.setTextColor(...gray);
      doc.text(inv.last_payment_date ? formatDate(inv.last_payment_date) : "—", colX.lastPaid, y);

      // Status
      doc.setFontSize(7);
      doc.setTextColor(isOverdue ? red[0] : gray[0], isOverdue ? red[1] : gray[1], isOverdue ? red[2] : gray[2]);
      doc.text(statusLabel, colX.status, y);

      y += 5;

      supplierPaid += inv.total_paid;
      supplierOwed += inv.amount_owed;

      if (!grandTotals[inv.currency]) grandTotals[inv.currency] = { paid: 0, owed: 0 };
      grandTotals[inv.currency].paid += inv.total_paid;
      grandTotals[inv.currency].owed += inv.amount_owed;
    });

    // ── Supplier subtotal ──
    doc.setFillColor(...subtotalBg);
    doc.rect(margin, y - 3, contentWidth, 7, "F");

    doc.setFontSize(8);
    doc.setTextColor(...black);
    doc.text(`Subtotal (${invoices.length} invoice${invoices.length !== 1 ? "s" : ""})`, colX.invoice, y + 1);
    doc.text(formatAmount(supplierOwed), colX.owed, y + 1, { align: "right" });
    doc.setTextColor(...gray);
    doc.text(supplierPaid > 0 ? formatAmount(supplierPaid) : "—", colX.paid, y + 1, { align: "right" });

    y += 12;
  }

  // ── Grand totals ──
  checkPage(25);

  // Dark header bar
  doc.setFillColor(...darkBg);
  doc.rect(margin, y - 4, contentWidth, 9, "F");

  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("GRAND TOTAL", margin + 2, y + 1);
  doc.text("Owed", colXGrand(48), y + 1, { align: "right" });
  doc.text("Paid", colXGrand(73), y + 1, { align: "right" });
  doc.text("Currency", colXGrand(85), y + 1);

  y += 9;

  for (const [currency, totals] of Object.entries(grandTotals)) {
    doc.setFontSize(10);
    doc.setTextColor(...(totals.owed > 0 ? red : black));
    doc.text(formatAmount(totals.owed), colXGrand(48), y, { align: "right" });
    doc.setTextColor(...gray);
    doc.text(totals.paid > 0 ? formatAmount(totals.paid) : "—", colXGrand(73), y, { align: "right" });
    doc.setTextColor(...black);
    doc.text(currency, colXGrand(85), y);
    y += 6;
  }

  // ── Footer on every page ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...gray);
    doc.text(
      `Formula International — Payment Schedule — Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);

  // Helper for grand total column positions
  function colXGrand(offset: number) {
    return margin + offset;
  }
}
