/**
 * Executive Summary PDF Generator — V2 Design
 *
 * Professional consulting-firm style one-pager for management.
 * Tight layout, thick progress bar, two-column scope section,
 * horizontal status bars, milestone timeline, cost breakdown.
 */

interface ExecutiveSummaryData {
  projectCode: string;
  projectName: string;
  clientName: string;
  status: string;
  currency: string;
  installationDate: string | null;
  description: string | null;
  contractValue: number;
  budgetAllocated: number;
  actualSpent: number;
  totalSalesPrice: number;
  totalItems: number;
  productionItems: number;
  procurementItems: number;
  completedItems: number;
  inProgressItems: number;
  pendingItems: number;
  overallProgress: number;
  statusBreakdown: { status: string; count: number }[];
  milestones: { name: string; dueDate: string; isCompleted: boolean }[];
  productionCost: number;
  procurementCost: number;
  drawingsApproved: number;
  drawingsTotal: number;
  materialsApproved: number;
  materialsTotal: number;
  snaggingTotal: number;
  snaggingResolved: number;
}

function fmtDate(d: string): string {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")}.${String(dt.getMonth() + 1).padStart(2, "0")}.${dt.getFullYear()}`;
}

function fmtAmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function cs(currency: string): string {
  return ({ TRY: "\u20BA", USD: "$", EUR: "\u20AC" })[currency] || currency;
}

const SL: Record<string, string> = {
  tender: "Tender", active: "Active", on_hold: "On Hold", completed: "Completed",
  cancelled: "Cancelled", not_awarded: "Not Awarded", pending: "Pending",
  in_design: "In Design", awaiting_approval: "Awaiting Approval", approved: "Approved",
  in_production: "In Production", complete: "Complete", shipped: "Shipped",
  installing: "Installing", installed: "Installed", pm_approval: "PM Approval",
  not_ordered: "Not Ordered", ordered: "Ordered", received: "Received",
};

interface SummaryOptions {
  includeMetrics: boolean;
  includeProgress: boolean;
  includeScope: boolean;
  includeStatus: boolean;
  includeMilestones: boolean;
  includeCosts: boolean;
  includeSnagging: boolean;
}

const DEFAULT_OPTIONS: SummaryOptions = {
  includeMetrics: true,
  includeProgress: true,
  includeScope: true,
  includeStatus: true,
  includeMilestones: true,
  includeCosts: true,
  includeSnagging: true,
};

export async function generateExecutiveSummaryPdf(data: ExecutiveSummaryData, options?: SummaryOptions): Promise<Buffer> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, H = 297, M = 14, CW = W - M * 2;
  let y = 0;

  // Colors
  const teal: [number, number, number] = [14, 165, 143];
  const dark: [number, number, number] = [26, 43, 60];
  const blk: [number, number, number] = [30, 30, 30];
  const gry: [number, number, number] = [130, 130, 130];
  const lgry: [number, number, number] = [220, 220, 220];
  const grn: [number, number, number] = [34, 197, 94];
  const red: [number, number, number] = [220, 38, 38];
  const blu: [number, number, number] = [59, 130, 246];
  const bgCard: [number, number, number] = [248, 250, 252];
  const bgAlt: [number, number, number] = [245, 247, 250];
  const sym = cs(data.currency);
  const variance = data.budgetAllocated - data.actualSpent;

  function ck(n: number) { if (y + n > H - 18) { doc.addPage(); y = M; } }

  // ═══════════ TOP BAR ═══════════
  doc.setFillColor(...teal);
  doc.rect(0, 0, W, 2, "F");
  y = 10;

  // Header row
  doc.setFontSize(8);
  doc.setTextColor(...gry);
  doc.text("FORMULA INTERNATIONAL", M, y);
  doc.text("Executive Summary", W - M, y, { align: "right" });

  y += 3;
  doc.setDrawColor(...teal);
  doc.setLineWidth(0.4);
  doc.line(M, y, W - M, y);
  y += 7;

  // Project title
  doc.setFontSize(16);
  doc.setTextColor(...dark);
  doc.text(`${data.projectCode} \u2014 ${data.projectName}`, M, y);
  y += 5;

  // Meta line
  doc.setFontSize(8);
  doc.setTextColor(...gry);
  const meta = [`Client: ${data.clientName}`, `Status: ${SL[data.status] || data.status}`, `Generated: ${fmtDate(new Date().toISOString())}`];
  if (data.installationDate) meta.push(`Installation: ${fmtDate(data.installationDate)}`);
  doc.text(meta.join("   \u00B7   "), M, y);
  y += 8;

  // ═══════════ METRIC CARDS ═══════════
  if (opts.includeMetrics) {
  const cw = (CW - 9) / 4;
  const ch = 18;
  const metrics = [
    { label: "Contract Value", val: `${sym}${fmtAmt(data.contractValue)}`, col: teal },
    { label: "Budget Allocated", val: `${sym}${fmtAmt(data.budgetAllocated)}`, col: blu },
    { label: "Actual Spent", val: `${sym}${fmtAmt(data.actualSpent)}`, col: dark },
    { label: "Variance", val: `${variance >= 0 ? "+" : ""}${sym}${fmtAmt(variance)}`, col: variance >= 0 ? grn : red },
  ];

  metrics.forEach((m, i) => {
    const x = M + i * (cw + 3);
    // Card border
    doc.setDrawColor(...lgry);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, cw, ch, 1.5, 1.5, "S");
    // Top accent
    doc.setFillColor(...m.col);
    doc.rect(x + 0.5, y, cw - 1, 2, "F");
    // Label
    doc.setFontSize(6.5);
    doc.setTextColor(...gry);
    doc.text(m.label, x + cw / 2, y + 7, { align: "center" });
    // Value
    doc.setFontSize(12);
    doc.setTextColor(...m.col);
    doc.text(m.val, x + cw / 2, y + 14, { align: "center" });
  });
  y += ch + 7;

  } // end includeMetrics

  // ═══════════ PROGRESS + SCOPE (two columns) ═══════════
  if (opts.includeProgress || opts.includeScope) {
  ck(40);

  const leftW = CW * 0.58;
  const rightW = CW * 0.38;
  const rightX = M + leftW + CW * 0.04;
  const sectionTop = y;

  // -- LEFT: Progress --
  doc.setFontSize(8);
  doc.setTextColor(...teal);
  doc.text("PROGRESS", M, y);
  doc.setLineWidth(0.3);
  doc.line(M, y + 1, M + 22, y + 1);
  y += 6;

  // Big percentage
  doc.setFontSize(26);
  doc.setTextColor(...dark);
  doc.text(`${data.overallProgress}%`, M, y + 7);

  // Thick progress bar
  const barX = M + 22;
  const barW = leftW - 22;
  const barH = 7;
  const barY = y + 1;
  doc.setFillColor(...lgry);
  doc.roundedRect(barX, barY, barW, barH, 3, 3, "F");
  if (data.overallProgress > 0) {
    doc.setFillColor(...teal);
    const pw = Math.max(6, (data.overallProgress / 100) * barW);
    doc.roundedRect(barX, barY, pw, barH, 3, 3, "F");
    // Percentage inside bar
    if (pw > 15) {
      doc.setFontSize(6);
      doc.setTextColor(255, 255, 255);
      doc.text(`${data.overallProgress}%`, barX + pw - 3, barY + 4.5, { align: "right" });
    }
  }
  y += 13;

  // Stats line
  doc.setFontSize(7);
  doc.setTextColor(...gry);
  doc.text(`${data.completedItems} completed  \u00B7  ${data.inProgressItems} in progress  \u00B7  ${data.pendingItems} pending  \u00B7  ${data.totalItems} total`, M, y);
  y += 4;

  // Snagging if exists
  if (data.snaggingTotal > 0) {
    doc.text(`Snagging: ${data.snaggingResolved}/${data.snaggingTotal} resolved`, M, y);
    y += 4;
  }

  // -- RIGHT: Scope + Approvals --
  let ry = sectionTop;
  doc.setFontSize(8);
  doc.setTextColor(...teal);
  doc.text("SCOPE", rightX, ry);
  doc.line(rightX, ry + 1, rightX + 15, ry + 1);
  ry += 5;

  doc.setFontSize(8);
  doc.setTextColor(...blk);
  doc.text(`\u25CF  Production: ${data.productionItems} items`, rightX + 1, ry);
  ry += 4;
  doc.text(`\u25CF  Procurement: ${data.procurementItems} items`, rightX + 1, ry);
  ry += 7;

  doc.setTextColor(...teal);
  doc.text("APPROVALS", rightX, ry);
  doc.line(rightX, ry + 1, rightX + 22, ry + 1);
  ry += 5;

  doc.setTextColor(...blk);
  doc.setFontSize(8);
  doc.text(`Drawings: ${data.drawingsApproved}/${data.drawingsTotal} approved`, rightX + 1, ry);
  ry += 4;
  doc.text(`Materials: ${data.materialsApproved}/${data.materialsTotal} approved`, rightX + 1, ry);

  y = Math.max(y, ry) + 6;

  } // end includeProgress/includeScope

  // ═══════════ STATUS BREAKDOWN ═══════════
  if (opts.includeStatus && data.statusBreakdown.length > 0) {
    ck(8 + data.statusBreakdown.length * 6);

    doc.setFontSize(8);
    doc.setTextColor(...teal);
    doc.text("ITEMS BY STATUS", M, y);
    doc.line(M, y + 1, M + 30, y + 1);
    y += 5;

    const maxC = Math.max(...data.statusBreakdown.map((s) => s.count));
    const bMaxW = CW - 55;

    data.statusBreakdown.forEach((item, idx) => {
      // Alternating background
      if (idx % 2 === 0) {
        doc.setFillColor(...bgAlt);
        doc.rect(M, y - 3, CW, 5.5, "F");
      }

      doc.setFontSize(7.5);
      doc.setTextColor(...gry);
      doc.text(SL[item.status] || item.status, M + 1, y);

      // Bar with varying opacity
      const bw = maxC > 0 ? Math.max(4, (item.count / maxC) * bMaxW) : 4;
      const opacity = 0.5 + (0.5 * (idx % 3)) / 3;
      doc.setFillColor(Math.round(teal[0] * opacity + 255 * (1 - opacity)), Math.round(teal[1] * opacity + 255 * (1 - opacity)), Math.round(teal[2] * opacity + 255 * (1 - opacity)));
      doc.roundedRect(M + 38, y - 2.5, bw, 3.5, 1, 1, "F");

      doc.setTextColor(...blk);
      doc.text(String(item.count), M + 40 + bw, y);

      y += 5.5;
    });
    y += 2;
  }

  // ═══════════ MILESTONES ═══════════
  if (opts.includeMilestones && data.milestones.length > 0) {
    ck(8 + data.milestones.length * 5.5);

    doc.setFontSize(8);
    doc.setTextColor(...teal);
    doc.text("MILESTONES", M, y);
    doc.line(M, y + 1, M + 24, y + 1);
    y += 5;

    data.milestones.forEach((m, idx) => {
      const isPast = new Date(m.dueDate) < new Date();
      const icon = m.isCompleted ? "\u2713" : isPast ? "\u26A0" : "\u25CB";
      const tc = m.isCompleted ? grn : isPast ? red : gry;
      const statusText = m.isCompleted ? "Complete" : isPast ? "Overdue" : "Upcoming";

      // Divider
      if (idx > 0) {
        doc.setDrawColor(...lgry);
        doc.setLineWidth(0.15);
        doc.line(M, y - 1.5, W - M, y - 1.5);
      }

      doc.setFontSize(8);
      doc.setTextColor(...tc);
      doc.text(icon, M + 1, y + 0.5);

      doc.setTextColor(...blk);
      doc.text(m.name, M + 7, y + 0.5);

      doc.setTextColor(...gry);
      doc.setFontSize(7);
      doc.text(fmtDate(m.dueDate), M + 95, y + 0.5);

      doc.setFontSize(7);
      doc.setTextColor(...tc);
      doc.text(statusText, M + 125, y + 0.5);

      y += 5.5;
    });
    y += 2;
  }

  // ═══════════ COST BREAKDOWN ═══════════
  if (opts.includeCosts) {
  ck(22);

  doc.setFontSize(8);
  doc.setTextColor(...teal);
  doc.text("COST BREAKDOWN", M, y);
  doc.line(M, y + 1, M + 30, y + 1);
  y += 5;

  const totalCost = data.productionCost + data.procurementCost;
  const costBarMax = CW - 50;

  // Production bar
  const prodW = totalCost > 0 ? Math.max(4, (data.productionCost / totalCost) * costBarMax) : 0;
  doc.setFontSize(7.5);
  doc.setTextColor(...gry);
  doc.text("Production", M + 1, y + 1);
  if (prodW > 0) {
    doc.setFillColor(...teal);
    doc.roundedRect(M + 28, y - 2, prodW, 4, 1, 1, "F");
  }
  doc.setTextColor(...blk);
  doc.setFontSize(7.5);
  doc.text(`${sym}${fmtAmt(data.productionCost)}`, M + 30 + Math.max(prodW, 4), y + 1);
  y += 7;

  // Procurement bar
  const procW = totalCost > 0 ? Math.max(4, (data.procurementCost / totalCost) * costBarMax) : 0;
  doc.setTextColor(...gry);
  doc.text("Procurement", M + 1, y + 1);
  if (procW > 0) {
    doc.setFillColor(...blu);
    doc.roundedRect(M + 28, y - 2, procW, 4, 1, 1, "F");
  }
  doc.setTextColor(...blk);
  doc.text(`${sym}${fmtAmt(data.procurementCost)}`, M + 30 + Math.max(procW, 4), y + 1);
  y += 5;

  // Total line
  if (totalCost > 0) {
    doc.setDrawColor(...lgry);
    doc.setLineWidth(0.2);
    doc.line(M + 28, y, M + 28 + costBarMax, y);
    y += 3;
    doc.setFontSize(8);
    doc.setTextColor(...dark);
    doc.text(`Total: ${sym}${fmtAmt(totalCost)}`, M + 28, y);
  }

  } // end includeCosts

  // ═══════════ FOOTER ═══════════
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFillColor(...teal);
    doc.rect(0, H - 2, W, 2, "F");
    doc.setFontSize(6.5);
    doc.setTextColor(...gry);
    doc.text("Formula International", M, H - 5);
    doc.text("Confidential", W / 2, H - 5, { align: "center" });
    doc.text(`Page ${i} of ${pages}`, W - M, H - 5, { align: "right" });
  }

  return Buffer.from(doc.output("arraybuffer"));
}

export type { ExecutiveSummaryData };
