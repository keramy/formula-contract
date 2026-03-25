/**
 * Finance Excel Export
 *
 * Server-side Excel generation for invoices, receivables, and payment schedules.
 * Uses exceljs for proper formatting, auto-filters, and styling.
 */

import ExcelJS from "exceljs";

interface InvoiceExportRow {
  invoice_code: string;
  supplier_name: string;
  invoice_number: string | null;
  project_code: string | null;
  category_name: string | null;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  vat_rate: number;
  vat_amount: number;
  currency: string;
  total_paid: number;
  remaining: number;
  status: string;
  description: string | null;
  days_overdue: number;
}

interface ReceivableExportRow {
  receivable_code: string;
  client_name: string;
  reference_number: string | null;
  category_name: string | null;
  issue_date: string;
  due_date: string;
  total_amount: number;
  currency: string;
  total_received: number;
  remaining: number;
  status: string;
  description: string | null;
  days_overdue: number;
}

interface PaymentScheduleRow {
  supplier_name: string;
  supplier_iban: string | null;
  supplier_bank: string | null;
  invoice_code: string;
  invoice_number: string | null;
  amount: number;
  total_paid: number;
  remaining: number;
  currency: string;
  due_date: string;
  description: string | null;
  category_name: string | null;
  status: string;
  last_payment_date: string | null;
  last_payment_amount: number | null;
}

// Shared styles
const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1A2B3C" },
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: "FFFFFFFF" },
  size: 10,
};

const OVERDUE_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFFF0F0" },
};

const BORDER_STYLE: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFE5E7EB" } },
  bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
  left: { style: "thin", color: { argb: "FFE5E7EB" } },
  right: { style: "thin", color: { argb: "FFE5E7EB" } },
};

function applyHeaderStyle(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.border = BORDER_STYLE;
    cell.alignment = { vertical: "middle" };
  });
  row.height = 28;
}

function applyCellBorders(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.border = BORDER_STYLE;
    cell.alignment = { vertical: "middle" };
  });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

// ============================================================================
// Export Invoices
// ============================================================================

export async function generateInvoicesExcel(
  invoices: InvoiceExportRow[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Formula Contract";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Invoices", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = [
    { header: "Code", key: "invoice_code", width: 12 },
    { header: "Supplier", key: "supplier_name", width: 25 },
    { header: "Invoice #", key: "invoice_number", width: 15 },
    { header: "Project", key: "project_code", width: 12 },
    { header: "Category", key: "category_name", width: 15 },
    { header: "Invoice Date", key: "invoice_date", width: 13 },
    { header: "Due Date", key: "due_date", width: 13 },
    { header: "Amount", key: "total_amount", width: 15 },
    { header: "VAT %", key: "vat_rate", width: 8 },
    { header: "VAT Amount", key: "vat_amount", width: 13 },
    { header: "Currency", key: "currency", width: 10 },
    { header: "Paid", key: "total_paid", width: 15 },
    { header: "Remaining", key: "remaining", width: 15 },
    { header: "Status", key: "status", width: 15 },
    { header: "Description", key: "description", width: 30 },
  ];

  applyHeaderStyle(sheet.getRow(1));

  invoices.forEach((inv, idx) => {
    const row = sheet.addRow({
      ...inv,
      invoice_date: formatDate(inv.invoice_date),
      due_date: formatDate(inv.due_date),
      invoice_number: inv.invoice_number || "",
      project_code: inv.project_code || "",
      category_name: inv.category_name || "",
      description: inv.description || "",
    });

    applyCellBorders(row);

    // Zebra striping
    if (idx % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF9FAFB" },
        };
      });
    }

    // Overdue row tint
    if (inv.days_overdue > 0) {
      row.eachCell((cell) => {
        cell.fill = OVERDUE_FILL;
      });
    }

    // Number formats
    row.getCell("total_amount").numFmt = "#,##0.00";
    row.getCell("vat_amount").numFmt = "#,##0.00";
    row.getCell("total_paid").numFmt = "#,##0.00";
    row.getCell("remaining").numFmt = "#,##0.00";
  });

  // Auto-filter
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: invoices.length + 1, column: 15 },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ============================================================================
// Export Receivables
// ============================================================================

export async function generateReceivablesExcel(
  receivables: ReceivableExportRow[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Formula Contract";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Receivables", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = [
    { header: "Code", key: "receivable_code", width: 12 },
    { header: "Client", key: "client_name", width: 25 },
    { header: "Reference #", key: "reference_number", width: 15 },
    { header: "Category", key: "category_name", width: 15 },
    { header: "Issue Date", key: "issue_date", width: 13 },
    { header: "Due Date", key: "due_date", width: 13 },
    { header: "Amount", key: "total_amount", width: 15 },
    { header: "Currency", key: "currency", width: 10 },
    { header: "Received", key: "total_received", width: 15 },
    { header: "Remaining", key: "remaining", width: 15 },
    { header: "Status", key: "status", width: 15 },
    { header: "Description", key: "description", width: 30 },
  ];

  applyHeaderStyle(sheet.getRow(1));

  receivables.forEach((rec, idx) => {
    const row = sheet.addRow({
      ...rec,
      issue_date: formatDate(rec.issue_date),
      due_date: formatDate(rec.due_date),
      reference_number: rec.reference_number || "",
      category_name: rec.category_name || "",
      description: rec.description || "",
    });

    applyCellBorders(row);

    if (idx % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF9FAFB" },
        };
      });
    }

    if (rec.days_overdue > 0) {
      row.eachCell((cell) => {
        cell.fill = OVERDUE_FILL;
      });
    }

    row.getCell("total_amount").numFmt = "#,##0.00";
    row.getCell("total_received").numFmt = "#,##0.00";
    row.getCell("remaining").numFmt = "#,##0.00";
  });

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: receivables.length + 1, column: 12 },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ============================================================================
// Export Payment Schedule (grouped by supplier)
// ============================================================================

const SUPPLIER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFE8EEF4" },
};

const SUBTOTAL_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFDCE6F0" },
};

export async function generatePaymentScheduleExcel(
  rows: PaymentScheduleRow[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Formula Contract";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Payment Schedule", {
    views: [{ state: "frozen", ySplit: 0 }],
  });

  sheet.columns = [
    { key: "c1", width: 14 },  // Invoice
    { key: "c2", width: 15 },  // Amount Owed
    { key: "c3", width: 15 },  // Paid
    { key: "c4", width: 10 },  // Currency
    { key: "c5", width: 14 },  // Due Date
    { key: "c6", width: 14 },  // Last Paid
    { key: "c7", width: 13 },  // Status
    { key: "c8", width: 28 },  // Description
  ];

  // Group by supplier
  const supplierMap = new Map<string, PaymentScheduleRow[]>();
  rows.forEach((row) => {
    const key = row.supplier_name;
    if (!supplierMap.has(key)) supplierMap.set(key, []);
    supplierMap.get(key)!.push(row);
  });

  // Grand totals by currency
  const grandTotals: Record<string, { paid: number; owed: number }> = {};

  for (const [supplierName, invoices] of supplierMap) {
    const supplier = invoices[0];

    // Supplier header row: Name | Bank | IBAN
    const supplierRow = sheet.addRow([
      supplierName,
      "",
      "",
      "",
      supplier.supplier_bank || "",
      "",
      "",
      supplier.supplier_iban || "",
    ]);
    supplierRow.height = 24;
    supplierRow.getCell(1).font = { bold: true, size: 11 };
    supplierRow.getCell(5).font = { size: 9, color: { argb: "FF666666" } };
    supplierRow.getCell(8).font = { size: 9, color: { argb: "FF666666" }, name: "Consolas" };
    supplierRow.eachCell((cell) => {
      cell.fill = SUPPLIER_FILL;
      cell.border = BORDER_STYLE;
    });

    // Column headers
    const headerRow = sheet.addRow([
      "Invoice", "Amount Owed", "Paid", "Currency", "Due Date", "Last Paid", "Status", "Description",
    ]);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 9, color: { argb: "FF555555" } };
      cell.border = BORDER_STYLE;
    });

    // Invoice rows
    let totalPaid = 0;
    let totalOwed = 0;

    invoices.forEach((inv, idx) => {
      const row = sheet.addRow([
        inv.invoice_code,
        inv.remaining,
        inv.total_paid,
        inv.currency,
        formatDate(inv.due_date),
        inv.last_payment_date ? formatDate(inv.last_payment_date) : "—",
        inv.status,
        inv.description || "",
      ]);

      applyCellBorders(row);

      if (idx % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
        });
      }

      const dueDate = new Date(inv.due_date);
      if (dueDate < new Date() && inv.remaining > 0) {
        row.eachCell((cell) => { cell.fill = OVERDUE_FILL; });
        row.getCell(2).font = { color: { argb: "FFDC2626" }, bold: true };
      }

      row.getCell(2).numFmt = "#,##0.00";
      row.getCell(3).numFmt = "#,##0.00";

      totalPaid += inv.total_paid;
      totalOwed += inv.remaining;

      if (!grandTotals[inv.currency]) grandTotals[inv.currency] = { paid: 0, owed: 0 };
      grandTotals[inv.currency].paid += inv.total_paid;
      grandTotals[inv.currency].owed += inv.remaining;
    });

    // Supplier subtotal
    const subRow = sheet.addRow([
      `Total (${invoices.length})`,
      totalOwed,
      totalPaid,
    ]);
    subRow.eachCell((cell) => {
      cell.fill = SUBTOTAL_FILL;
      cell.border = BORDER_STYLE;
      cell.font = { bold: true, size: 10 };
    });
    subRow.getCell(2).numFmt = "#,##0.00";
    subRow.getCell(3).numFmt = "#,##0.00";

    sheet.addRow([]); // gap between suppliers
  }

  // Grand totals
  const gtHeaderRow = sheet.addRow([
    "GRAND TOTAL", "Owed", "Paid", "Currency",
  ]);
  gtHeaderRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.border = BORDER_STYLE;
  });
  gtHeaderRow.height = 24;

  for (const [currency, totals] of Object.entries(grandTotals)) {
    const row = sheet.addRow(["", totals.owed, totals.paid, currency]);
    row.font = { bold: true, size: 11 };
    row.getCell(2).numFmt = "#,##0.00";
    row.getCell(3).numFmt = "#,##0.00";
    if (totals.owed > 0) {
      row.getCell(2).font = { bold: true, size: 11, color: { argb: "FFDC2626" } };
    }
    applyCellBorders(row);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
