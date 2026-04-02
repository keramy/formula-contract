/**
 * Executive Summary PDF — React-PDF V5 (Visual-First)
 *
 * Visual-first infographic with slim one-line section subtitles.
 * No essays. No formulas. Charts and numbers speak for themselves.
 * Zero values hidden. Smart inline labels explain context.
 */

import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

// ============================================================================
// Types
// ============================================================================

export interface ExecutiveSummaryData {
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

export interface SummaryOptions {
  includeMetrics: boolean;
  includeProgress: boolean;
  includeScope: boolean;
  includeStatus: boolean;
  includeMilestones: boolean;
  includeCosts: boolean;
  includeSnagging: boolean;
}

// ============================================================================
// Design Tokens
// ============================================================================

const C = {
  teal: "#0D9488",
  tealDark: "#0F766E",
  dark: "#1A2B3C",
  black: "#1E293B",
  gray600: "#4B5563",
  gray500: "#6B7280",
  gray400: "#9CA3AF",
  gray300: "#D1D5DB",
  gray200: "#E5E7EB",
  gray100: "#F3F4F6",
  gray50: "#F9FAFB",
  white: "#FFFFFF",
  green: "#16A34A",
  red: "#DC2626",
  amber: "#D97706",
  blue: "#2563EB",
};

const STATUS_LABELS: Record<string, string> = {
  tender: "Tender", active: "Active", on_hold: "On Hold", completed: "Completed",
  cancelled: "Cancelled", not_awarded: "Not Awarded", pending: "Pending",
  in_design: "In Design", awaiting_approval: "Awaiting Approval", approved: "Approved",
  in_production: "In Production", complete: "Complete", shipped: "Shipped",
  installing: "Installing", installed: "Installed", pm_approval: "PM Approval",
  not_ordered: "Not Ordered", ordered: "Ordered", received: "Received",
};

const STATUS_COLORS: Record<string, string> = {
  active: C.green, completed: C.green, complete: C.green, installed: C.green, received: C.green,
  tender: C.blue, in_design: C.blue, approved: C.teal,
  on_hold: C.amber, pending: C.amber, awaiting_approval: C.amber, pm_approval: C.amber,
  cancelled: C.red, not_awarded: C.red,
  in_production: C.teal, ordered: C.teal, shipped: C.teal, installing: C.teal,
};

// ============================================================================
// Helpers
// ============================================================================

function fmtDate(d: string): string {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")}.${String(dt.getMonth() + 1).padStart(2, "0")}.${dt.getFullYear()}`;
}

function fmtAmt(n: number, currency?: string): string {
  const sym = ({ TRY: "", USD: "$", EUR: "\u20AC" } as Record<string, string>)[currency || ""] || "";
  const suffix = currency === "TRY" ? " TL" : "";
  return `${sym}${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}${suffix}`;
}

function pct(n: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((n / total) * 100);
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
}

// ============================================================================
// Styles
// ============================================================================

const s = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 36,
    paddingHorizontal: 0,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: C.black,
    backgroundColor: C.white,
  },
  topBar: { height: 8, backgroundColor: C.teal },

  // Header
  headerArea: {
    paddingHorizontal: 28,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: C.teal,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 8,
  },
  companyName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: C.teal,
    letterSpacing: 1,
  },
  docLabel: {
    fontSize: 8,
    color: C.gray500,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: C.dark,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 8,
    color: C.gray500,
  },

  // Content
  content: { paddingHorizontal: 28, paddingTop: 6 },

  // Section bar + subtitle
  sectionBar: {
    backgroundColor: C.tealDark,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 8,
  },
  sectionBarText: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: C.white,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  sectionSub: {
    fontSize: 7,
    color: C.gray500,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: C.gray50,
    borderWidth: 1,
    borderColor: C.gray200,
    borderTopWidth: 0,
  },

  // Info table
  infoTable: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: C.gray200,
    borderTopWidth: 0,
  },
  infoCol: { flex: 1 },
  infoRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: C.gray200,
    minHeight: 18,
  },
  infoLabel: {
    width: 75,
    fontSize: 7.5,
    color: C.gray600,
    fontFamily: "Helvetica-Bold",
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: C.gray50,
    borderRightWidth: 0.5,
    borderRightColor: C.gray200,
  },
  infoValue: {
    flex: 1,
    fontSize: 8,
    color: C.black,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  infoDivider: { width: 0.5, backgroundColor: C.gray200 },

  // KPI row
  kpiRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: C.gray200,
    borderTopWidth: 0,
  },
  kpiCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRightWidth: 0.5,
    borderRightColor: C.gray200,
  },
  kpiCellLast: { borderRightWidth: 0 },
  kpiLabel: {
    fontSize: 6.5,
    color: C.gray500,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  kpiValue: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  kpiSub: { fontSize: 6.5, color: C.gray400, marginTop: 2 },

  // Progress
  progressContainer: {
    borderWidth: 1,
    borderColor: C.gray200,
    borderTopWidth: 0,
    padding: 12,
  },
  progressTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  progressPercent: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: C.dark,
    marginRight: 12,
  },
  progressBarContainer: { flex: 1 },
  progressBarOuter: {
    height: 14,
    backgroundColor: C.gray100,
    borderRadius: 7,
    overflow: "hidden",
  },
  progressBarInner: {
    height: 14,
    backgroundColor: C.teal,
    borderRadius: 7,
  },
  progressLegend: {
    flexDirection: "row",
    gap: 16,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendText: { fontSize: 7, color: C.gray600 },

  // Approval mini-bars
  approvalSection: {
    marginTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: C.gray200,
    paddingTop: 8,
  },
  approvalSectionTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.tealDark,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  approvalRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  approvalLabel: { width: 60, fontSize: 7.5, color: C.gray600 },
  approvalBarOuter: {
    flex: 1,
    height: 6,
    backgroundColor: C.gray200,
    borderRadius: 3,
    overflow: "hidden",
    marginRight: 6,
  },
  approvalBarInner: {
    height: 6,
    backgroundColor: C.teal,
    borderRadius: 3,
  },
  approvalFraction: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: C.dark,
    width: 36,
    textAlign: "right",
  },

  // Table
  table: {
    borderWidth: 1,
    borderColor: C.gray200,
    borderTopWidth: 0,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: C.gray100,
    borderBottomWidth: 1,
    borderBottomColor: C.gray200,
  },
  tableHeaderCell: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.gray600,
    paddingVertical: 4,
    paddingHorizontal: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: C.gray200,
    minHeight: 18,
    alignItems: "center",
  },
  tableRowAlt: { backgroundColor: C.gray50 },
  tableCell: {
    fontSize: 8,
    color: C.black,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },

  // Status bars
  statusBarRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  statusLabel: { width: 85, fontSize: 7.5, color: C.gray600 },
  statusBarOuter: {
    flex: 1,
    height: 8,
    backgroundColor: C.gray100,
    borderRadius: 2,
    overflow: "hidden",
    marginRight: 8,
  },
  statusBarFill: { height: 8, borderRadius: 2 },
  statusCount: {
    width: 24,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.black,
    textAlign: "right",
  },

  // Cost
  costTable: {
    borderWidth: 1,
    borderColor: C.gray200,
    borderTopWidth: 0,
  },
  costRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: C.gray200,
  },
  costLabel: { width: 80, fontSize: 8, color: C.gray600 },
  costBarArea: { flex: 1, marginRight: 10 },
  costBar: { height: 10, borderRadius: 2 },
  costAmount: {
    width: 80,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.black,
    textAlign: "right",
  },
  costPct: {
    width: 35,
    fontSize: 7,
    color: C.gray500,
    textAlign: "right",
    marginRight: 8,
  },
  costTotalRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: C.gray50,
  },
  costTotalLabel: {
    width: 80,
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: C.dark,
  },
  costTotalAmount: {
    flex: 1,
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: C.dark,
    textAlign: "right",
  },

  // Alert inline
  alertLine: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: C.gray200,
    borderTopWidth: 0,
  },
  alertText: {
    fontSize: 7.5,
    color: C.gray600,
    flex: 1,
  },

  // Footer
  footer: { position: "absolute", bottom: 0, left: 0, right: 0 },
  footerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 28,
    paddingVertical: 5,
  },
  footerText: { fontSize: 6.5, color: C.gray400 },
  footerBar: { height: 4, backgroundColor: C.teal },
});

// ============================================================================
// Sub-Components
// ============================================================================

function SectionBar({ title, subtitle, dark }: { title: string; subtitle?: string; dark?: boolean }) {
  return (
    <>
      <View style={[s.sectionBar, dark ? { backgroundColor: C.dark } : {}]}>
        <Text style={s.sectionBarText}>{title}</Text>
      </View>
      {subtitle && (
        <View style={s.sectionSub}>
          <Text>{subtitle}</Text>
        </View>
      )}
    </>
  );
}

function TRow({ children, index }: { children: React.ReactNode; index: number }) {
  return (
    <View style={[s.tableRow, index % 2 !== 0 ? s.tableRowAlt : {}]}>
      {children}
    </View>
  );
}

// ============================================================================
// PDF Document
// ============================================================================

interface DocProps {
  data: ExecutiveSummaryData;
  options: SummaryOptions;
}

function ExecutiveSummaryDocument({ data, options }: DocProps) {
  const variance = data.budgetAllocated - data.actualSpent;
  const totalCost = data.productionCost + data.procurementCost;
  const hasFinancials = data.contractValue > 0 || data.budgetAllocated > 0 || data.actualSpent > 0;
  const maxStatusCount = data.statusBreakdown.length > 0
    ? Math.max(...data.statusBreakdown.map((sb) => sb.count))
    : 1;

  // Milestone alerts
  const overdueMilestones = data.milestones.filter((m) => !m.isCompleted && new Date(m.dueDate) < new Date());

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.topBar} fixed />

        {/* ======== HEADER ======== */}
        <View style={s.headerArea}>
          <View style={s.headerRow}>
            <Text style={s.companyName}>FORMULA INTERNATIONAL</Text>
            <Text style={s.docLabel}>EXECUTIVE SUMMARY</Text>
          </View>
          <Text style={s.title}>{data.projectCode} {"\u2014"} {data.projectName}</Text>
          <View style={{ flexDirection: "row", gap: 4 }}>
            <Text style={[s.subtitle, { fontFamily: "Helvetica-Bold" }]}>Date:</Text>
            <Text style={s.subtitle}>{fmtDate(new Date().toISOString())}</Text>
          </View>
        </View>

        <View style={s.content}>

          {/* ════════ PROJECT OVERVIEW ════════ */}
          <SectionBar title="Project Overview" />
          {/* No subtitle — table is self-explanatory */}
          <View style={s.infoTable}>
            <View style={s.infoCol}>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Client</Text>
                <Text style={s.infoValue}>{data.clientName}</Text>
              </View>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Status</Text>
                <Text style={[s.infoValue, { color: STATUS_COLORS[data.status] || C.black, fontFamily: "Helvetica-Bold" }]}>
                  {STATUS_LABELS[data.status] || data.status}
                </Text>
              </View>
              <View style={[s.infoRow, { borderBottomWidth: 0 }]}>
                <Text style={s.infoLabel}>Scope</Text>
                <Text style={s.infoValue}>
                  {data.productionItems} prod. + {data.procurementItems} proc. ({data.totalItems} total)
                </Text>
              </View>
            </View>
            <View style={s.infoDivider} />
            <View style={s.infoCol}>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Installation</Text>
                <Text style={s.infoValue}>
                  {data.installationDate
                    ? `${fmtDate(data.installationDate)}${daysUntil(data.installationDate) > 0 ? ` (${daysUntil(data.installationDate)} days)` : ""}`
                    : "Not scheduled"}
                </Text>
              </View>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Currency</Text>
                <Text style={s.infoValue}>{data.currency}</Text>
              </View>
              <View style={[s.infoRow, { borderBottomWidth: 0 }]}>
                <Text style={s.infoLabel}>Sales Price</Text>
                <Text style={[s.infoValue, { fontFamily: "Helvetica-Bold" }]}>
                  {data.totalSalesPrice > 0 ? fmtAmt(data.totalSalesPrice, data.currency) : "Not set"}
                </Text>
              </View>
            </View>
          </View>

          {/* ════════ FINANCIAL SUMMARY ════════ */}
          {options.includeMetrics && (
            <>
              <SectionBar
                title="Financial Summary"
                subtitle={hasFinancials ? "Budget vs actual spending across all scope items" : "No financial data entered yet"}
              />
              {hasFinancials && (
                <View style={s.kpiRow}>
                  {data.contractValue > 0 && (
                    <View style={s.kpiCell}>
                      <Text style={s.kpiLabel}>Contract Value</Text>
                      <Text style={[s.kpiValue, { color: C.teal }]}>{fmtAmt(data.contractValue, data.currency)}</Text>
                      <Text style={s.kpiSub}>Agreed with client</Text>
                    </View>
                  )}
                  {data.budgetAllocated > 0 && (
                    <View style={s.kpiCell}>
                      <Text style={s.kpiLabel}>Budget</Text>
                      <Text style={[s.kpiValue, { color: C.blue }]}>{fmtAmt(data.budgetAllocated, data.currency)}</Text>
                      <Text style={s.kpiSub}>Initial estimates</Text>
                    </View>
                  )}
                  {data.actualSpent > 0 && (
                    <View style={s.kpiCell}>
                      <Text style={s.kpiLabel}>Spent</Text>
                      <Text style={[s.kpiValue, { color: C.dark }]}>{fmtAmt(data.actualSpent, data.currency)}</Text>
                      <Text style={s.kpiSub}>
                        {data.budgetAllocated > 0 ? `${pct(data.actualSpent, data.budgetAllocated)}% of budget` : "Actual to date"}
                      </Text>
                    </View>
                  )}
                  {data.budgetAllocated > 0 && data.actualSpent > 0 && (
                    <View style={[s.kpiCell, s.kpiCellLast]}>
                      <Text style={s.kpiLabel}>Variance</Text>
                      <Text style={[s.kpiValue, { color: variance >= 0 ? C.green : C.red }]}>
                        {variance >= 0 ? "+" : ""}{fmtAmt(variance, data.currency)}
                      </Text>
                      <Text style={[s.kpiSub, { color: variance >= 0 ? C.green : C.red }]}>
                        {variance >= 0 ? "Under budget" : "Over budget"}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </>
          )}

          {/* ════════ PROGRESS & APPROVALS ════════ */}
          {options.includeProgress && (
            <>
              <SectionBar
                title="Progress & Approvals"
                subtitle="Scope item completion and client approval status"
              />
              {data.totalItems > 0 && (
                <View style={s.progressContainer}>
                  <View style={s.progressTopRow}>
                    <Text style={s.progressPercent}>{data.overallProgress}%</Text>
                    <View style={s.progressBarContainer}>
                      <View style={s.progressBarOuter}>
                        <View style={[s.progressBarInner, { width: `${Math.max(2, data.overallProgress)}%` }]} />
                      </View>
                    </View>
                  </View>
                  <View style={s.progressLegend}>
                    <View style={s.legendItem}>
                      <View style={[s.legendDot, { backgroundColor: C.green }]} />
                      <Text style={s.legendText}>{data.completedItems} Completed</Text>
                    </View>
                    <View style={s.legendItem}>
                      <View style={[s.legendDot, { backgroundColor: C.teal }]} />
                      <Text style={s.legendText}>{data.inProgressItems} In Progress</Text>
                    </View>
                    <View style={s.legendItem}>
                      <View style={[s.legendDot, { backgroundColor: C.gray300 }]} />
                      <Text style={s.legendText}>{data.pendingItems} Pending</Text>
                    </View>
                  </View>

                  {/* Approval bars */}
                  {options.includeScope && (data.drawingsTotal > 0 || data.materialsTotal > 0) && (
                    <View style={s.approvalSection}>
                      <Text style={s.approvalSectionTitle}>Client Approvals</Text>
                      {data.drawingsTotal > 0 && (
                        <View style={s.approvalRow}>
                          <Text style={s.approvalLabel}>Drawings</Text>
                          <View style={s.approvalBarOuter}>
                            <View style={[s.approvalBarInner, {
                              width: `${Math.max(2, pct(data.drawingsApproved, data.drawingsTotal))}%`,
                            }]} />
                          </View>
                          <Text style={s.approvalFraction}>{data.drawingsApproved}/{data.drawingsTotal}</Text>
                        </View>
                      )}
                      {data.materialsTotal > 0 && (
                        <View style={s.approvalRow}>
                          <Text style={s.approvalLabel}>Materials</Text>
                          <View style={s.approvalBarOuter}>
                            <View style={[s.approvalBarInner, {
                              width: `${Math.max(2, pct(data.materialsApproved, data.materialsTotal))}%`,
                              backgroundColor: C.blue,
                            }]} />
                          </View>
                          <Text style={s.approvalFraction}>{data.materialsApproved}/{data.materialsTotal}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Snagging */}
                  {options.includeSnagging && data.snaggingTotal > 0 && (
                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, gap: 6 }}>
                      <Text style={{ fontSize: 7.5, color: C.amber, fontFamily: "Helvetica-Bold" }}>SNAGGING</Text>
                      <Text style={{ fontSize: 7.5, color: C.gray600 }}>
                        {data.snaggingResolved}/{data.snaggingTotal} resolved
                        {data.snaggingTotal - data.snaggingResolved > 0
                          ? ` \u2014 ${data.snaggingTotal - data.snaggingResolved} outstanding`
                          : ""}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </>
          )}

          {/* ════════ ITEMS BY STATUS ════════ */}
          {options.includeStatus && data.statusBreakdown.length > 0 && (
            <>
              <SectionBar
                title="Scope Items by Status"
                subtitle="Number of items in each workflow stage"
              />
              <View style={s.table}>
                {data.statusBreakdown.map((item, idx) => {
                  const barColor = STATUS_COLORS[item.status] || C.teal;
                  const itemPct = maxStatusCount > 0 ? (item.count / maxStatusCount) * 100 : 0;
                  return (
                    <View key={item.status} style={[s.statusBarRow, idx % 2 !== 0 ? { backgroundColor: C.gray50 } : {}]}>
                      <Text style={s.statusLabel}>{STATUS_LABELS[item.status] || item.status}</Text>
                      <View style={s.statusBarOuter}>
                        <View style={[s.statusBarFill, {
                          width: `${Math.max(3, itemPct)}%`,
                          backgroundColor: barColor,
                        }]} />
                      </View>
                      <Text style={s.statusCount}>{item.count}</Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {/* ════════ MILESTONES ════════ */}
          {options.includeMilestones && data.milestones.length > 0 && (
            <View wrap={false}>
              <SectionBar
                title="Milestones"
                subtitle="Key dates and deadlines"
              />
              {/* Overdue alert */}
              {overdueMilestones.length > 0 && (
                <View style={[s.alertLine, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
                  <Text style={{ fontSize: 8, color: C.red, fontFamily: "Helvetica-Bold" }}>{overdueMilestones.length} overdue</Text>
                  <Text style={s.alertText}>
                    {overdueMilestones.map((m) => m.name).join(", ")}
                  </Text>
                </View>
              )}
              <View style={s.table}>
                <View style={s.tableHeader}>
                  <Text style={[s.tableHeaderCell, { flex: 3 }]}>Milestone</Text>
                  <Text style={[s.tableHeaderCell, { width: 65, textAlign: "center" }]}>Due Date</Text>
                  <Text style={[s.tableHeaderCell, { width: 65, textAlign: "center" }]}>Status</Text>
                </View>
                {data.milestones.map((m, idx) => {
                  const isPast = new Date(m.dueDate) < new Date();
                  const statusColor = m.isCompleted ? C.green : isPast ? C.red : C.gray500;
                  const statusText = m.isCompleted ? "Complete" : isPast ? "Overdue" : "Upcoming";
                  const icon = m.isCompleted ? "\u2713" : isPast ? "\u2022" : "\u25CB";
                  return (
                    <TRow key={m.name} index={idx}>
                      <View style={{ flex: 3, flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Text style={{ fontSize: 9, color: statusColor, marginRight: 6, fontFamily: "Helvetica-Bold" }}>{icon}</Text>
                        <Text style={{ fontSize: 8, color: C.black }}>{m.name}</Text>
                      </View>
                      <Text style={[s.tableCell, { width: 65, textAlign: "center", color: C.gray600 }]}>{fmtDate(m.dueDate)}</Text>
                      <Text style={[s.tableCell, { width: 65, textAlign: "center", color: statusColor, fontFamily: "Helvetica-Bold" }]}>{statusText}</Text>
                    </TRow>
                  );
                })}
              </View>
            </View>
          )}

          {/* ════════ COST BREAKDOWN ════════ */}
          {options.includeCosts && totalCost > 0 && (
            <View wrap={false}>
              <SectionBar
                title="Cost Breakdown"
                subtitle="Production vs procurement costs"
                dark
              />
              <View style={s.costTable}>
                {data.productionCost > 0 && (
                  <View style={s.costRow}>
                    <Text style={s.costLabel}>Production</Text>
                    <View style={s.costBarArea}>
                      <View style={[s.costBar, {
                        width: `${Math.max(3, pct(data.productionCost, totalCost))}%`,
                        backgroundColor: C.teal,
                      }]} />
                    </View>
                    <Text style={s.costPct}>{pct(data.productionCost, totalCost)}%</Text>
                    <Text style={s.costAmount}>{fmtAmt(data.productionCost, data.currency)}</Text>
                  </View>
                )}
                {data.procurementCost > 0 && (
                  <View style={s.costRow}>
                    <Text style={s.costLabel}>Procurement</Text>
                    <View style={s.costBarArea}>
                      <View style={[s.costBar, {
                        width: `${Math.max(3, pct(data.procurementCost, totalCost))}%`,
                        backgroundColor: C.blue,
                      }]} />
                    </View>
                    <Text style={s.costPct}>{pct(data.procurementCost, totalCost)}%</Text>
                    <Text style={s.costAmount}>{fmtAmt(data.procurementCost, data.currency)}</Text>
                  </View>
                )}
                <View style={s.costTotalRow}>
                  <Text style={s.costTotalLabel}>Total</Text>
                  <Text style={s.costTotalAmount}>{fmtAmt(totalCost, data.currency)}</Text>
                </View>
              </View>
            </View>
          )}

        </View>

        {/* ======== FOOTER ======== */}
        <View style={s.footer} fixed>
          <View style={s.footerContent}>
            <Text style={s.footerText}>Formula International</Text>
            <Text style={s.footerText}>Confidential</Text>
            <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
          </View>
          <View style={s.footerBar} />
        </View>
      </Page>
    </Document>
  );
}

// ============================================================================
// Export
// ============================================================================

const DEFAULT_OPTIONS: SummaryOptions = {
  includeMetrics: true,
  includeProgress: true,
  includeScope: true,
  includeStatus: true,
  includeMilestones: true,
  includeCosts: true,
  includeSnagging: true,
};

export async function generateExecutiveSummaryPdfV2(
  data: ExecutiveSummaryData,
  options?: SummaryOptions
): Promise<Buffer> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const buffer = await renderToBuffer(
    <ExecutiveSummaryDocument data={data} options={opts} />
  );
  return Buffer.from(buffer);
}
