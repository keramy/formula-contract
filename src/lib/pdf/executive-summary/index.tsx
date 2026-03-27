/**
 * Executive Summary PDF — React-PDF V2
 *
 * Renders a branded, chart-rich project summary PDF using @react-pdf/renderer.
 * Matches the app's design language: GlassCards, teal accents, clean typography.
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
// Design Tokens (matching app Design Handbook)
// ============================================================================

const C = {
  teal: "#0EA58F",
  tealLight: "#CCFBF1",
  dark: "#1A2B3C",
  black: "#1E293B",
  gray: "#6B7280",
  grayLight: "#9CA3AF",
  border: "#E5E7EB",
  bg: "#F8FAFC",
  bgAlt: "#F1F5F9",
  white: "#FFFFFF",
  green: "#22C55E",
  greenBg: "#F0FDF4",
  red: "#EF4444",
  redBg: "#FEF2F2",
  amber: "#F59E0B",
  amberBg: "#FFFBEB",
  blue: "#3B82F6",
  blueBg: "#EFF6FF",
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
  tender: C.blue, in_design: C.blue, approved: C.blue,
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
  const sym = ({ TRY: "\u20BA", USD: "$", EUR: "\u20AC" } as Record<string, string>)[currency || ""] || "";
  return `${sym}${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ============================================================================
// Styles
// ============================================================================

const s = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 30,
    paddingHorizontal: 28,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: C.black,
  },
  // Top accent bar
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: C.teal,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: C.teal,
  },
  // Header
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    marginBottom: 4,
  },
  companyName: {
    fontSize: 7,
    color: C.gray,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  headerRight: {
    fontSize: 7,
    color: C.gray,
  },
  divider: {
    height: 1,
    backgroundColor: C.teal,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: C.dark,
    marginBottom: 4,
  },
  metaLine: {
    fontSize: 7.5,
    color: C.gray,
    marginBottom: 10,
  },
  // Section header
  sectionHeader: {
    fontSize: 7.5,
    color: C.teal,
    letterSpacing: 1,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  sectionLine: {
    width: 30,
    height: 0.8,
    backgroundColor: C.teal,
    marginBottom: 6,
  },
  // GlassCard
  card: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    backgroundColor: C.white,
    padding: 10,
    marginBottom: 8,
  },
  // KPI Grid
  kpiGrid: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
  },
  kpiCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 5,
    backgroundColor: C.white,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  kpiAccent: {
    position: "absolute",
    top: 0,
    left: 1,
    right: 1,
    height: 2.5,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  kpiLabel: {
    fontSize: 6.5,
    color: C.gray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
    marginTop: 4,
  },
  kpiValue: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },
  // Progress
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  progressPercent: {
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    color: C.dark,
    width: 50,
  },
  progressBarOuter: {
    flex: 1,
    height: 10,
    backgroundColor: C.border,
    borderRadius: 5,
    overflow: "hidden",
  },
  progressBarInner: {
    height: 10,
    backgroundColor: C.teal,
    borderRadius: 5,
  },
  statsLine: {
    fontSize: 7,
    color: C.gray,
    marginBottom: 6,
  },
  // Two column
  twoCol: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  colLeft: {
    flex: 3,
  },
  colRight: {
    flex: 2,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    padding: 8,
  },
  // Status bars
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  statusRowAlt: {
    backgroundColor: C.bgAlt,
    borderRadius: 3,
  },
  statusLabel: {
    width: 70,
    fontSize: 7.5,
    color: C.gray,
  },
  statusBar: {
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusCount: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: C.black,
  },
  // Milestones
  milestoneRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  milestoneIcon: {
    width: 14,
    fontSize: 9,
    textAlign: "center",
  },
  milestoneName: {
    flex: 1,
    fontSize: 8,
    color: C.black,
  },
  milestoneDate: {
    width: 50,
    fontSize: 7,
    color: C.gray,
    textAlign: "center",
  },
  milestoneStatus: {
    width: 45,
    fontSize: 7,
    textAlign: "right",
  },
  // Cost bars
  costRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  costLabel: {
    width: 55,
    fontSize: 7.5,
    color: C.gray,
  },
  costBar: {
    height: 7,
    borderRadius: 3,
    marginRight: 6,
  },
  costAmount: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: C.black,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 8,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingTop: 4,
  },
  footerText: {
    fontSize: 6,
    color: C.grayLight,
  },
  // Bullet
  bullet: {
    fontSize: 8,
    color: C.teal,
    marginRight: 4,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  bulletText: {
    fontSize: 8,
    color: C.black,
  },
  // Scope section header
  scopeHeader: {
    fontSize: 7,
    color: C.teal,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 4,
  },
});

// ============================================================================
// PDF Document Component
// ============================================================================

interface DocProps {
  data: ExecutiveSummaryData;
  options: SummaryOptions;
}

function ExecutiveSummaryDocument({ data, options }: DocProps) {
  const variance = data.budgetAllocated - data.actualSpent;
  const totalCost = data.productionCost + data.procurementCost;
  const maxStatusCount = data.statusBreakdown.length > 0
    ? Math.max(...data.statusBreakdown.map((s) => s.count))
    : 1;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Top accent bar */}
        <View style={s.topBar} fixed />
        <View style={s.bottomBar} fixed />

        {/* Header */}
        <View style={s.headerRow}>
          <Text style={s.companyName}>Formula International</Text>
          <Text style={s.headerRight}>Executive Summary</Text>
        </View>
        <View style={s.divider} />

        <Text style={s.title}>{data.projectCode} {"\u2014"} {data.projectName}</Text>
        <Text style={s.metaLine}>
          Client: {data.clientName}{"   \u00B7   "}
          Status: {STATUS_LABELS[data.status] || data.status}{"   \u00B7   "}
          Generated: {fmtDate(new Date().toISOString())}
          {data.installationDate ? `   \u00B7   Installation: ${fmtDate(data.installationDate)}` : ""}
        </Text>

        {/* KPI Cards */}
        {options.includeMetrics && (
          <View style={s.kpiGrid}>
            <View style={s.kpiCard}>
              <View style={[s.kpiAccent, { backgroundColor: C.teal }]} />
              <Text style={s.kpiLabel}>Contract Value</Text>
              <Text style={[s.kpiValue, { color: C.teal }]}>{fmtAmt(data.contractValue, data.currency)}</Text>
            </View>
            <View style={s.kpiCard}>
              <View style={[s.kpiAccent, { backgroundColor: C.blue }]} />
              <Text style={s.kpiLabel}>Budget Allocated</Text>
              <Text style={[s.kpiValue, { color: C.blue }]}>{fmtAmt(data.budgetAllocated, data.currency)}</Text>
            </View>
            <View style={s.kpiCard}>
              <View style={[s.kpiAccent, { backgroundColor: C.dark }]} />
              <Text style={s.kpiLabel}>Actual Spent</Text>
              <Text style={[s.kpiValue, { color: C.dark }]}>{fmtAmt(data.actualSpent, data.currency)}</Text>
            </View>
            <View style={s.kpiCard}>
              <View style={[s.kpiAccent, { backgroundColor: variance >= 0 ? C.green : C.red }]} />
              <Text style={s.kpiLabel}>Variance</Text>
              <Text style={[s.kpiValue, { color: variance >= 0 ? C.green : C.red }]}>
                {variance >= 0 ? "+" : ""}{fmtAmt(variance, data.currency)}
              </Text>
            </View>
          </View>
        )}

        {/* Progress + Scope (two columns) */}
        {(options.includeProgress || options.includeScope) && (
          <View style={s.twoCol}>
            {/* Left: Progress */}
            {options.includeProgress && (
              <View style={s.colLeft}>
                <Text style={s.sectionHeader}>Progress</Text>
                <View style={s.sectionLine} />
                <View style={s.progressRow}>
                  <Text style={s.progressPercent}>{data.overallProgress}%</Text>
                  <View style={s.progressBarOuter}>
                    <View style={[s.progressBarInner, { width: `${Math.max(2, data.overallProgress)}%` }]} />
                  </View>
                </View>
                <Text style={s.statsLine}>
                  {data.completedItems} completed  {"\u00B7"}  {data.inProgressItems} in progress  {"\u00B7"}  {data.pendingItems} pending  {"\u00B7"}  {data.totalItems} total
                </Text>
                {options.includeSnagging && data.snaggingTotal > 0 && (
                  <Text style={s.statsLine}>Snagging: {data.snaggingResolved}/{data.snaggingTotal} resolved</Text>
                )}
              </View>
            )}

            {/* Right: Scope + Approvals */}
            {options.includeScope && (
              <View style={s.colRight}>
                <Text style={s.scopeHeader}>Scope</Text>
                <View style={s.bulletRow}>
                  <Text style={s.bullet}>{"\u25CF"}</Text>
                  <Text style={s.bulletText}>Production: {data.productionItems} items</Text>
                </View>
                <View style={[s.bulletRow, { marginBottom: 8 }]}>
                  <Text style={s.bullet}>{"\u25CF"}</Text>
                  <Text style={s.bulletText}>Procurement: {data.procurementItems} items</Text>
                </View>

                <Text style={s.scopeHeader}>Approvals</Text>
                <View style={s.bulletRow}>
                  <Text style={s.bulletText}>Drawings: {data.drawingsApproved}/{data.drawingsTotal} approved</Text>
                </View>
                <View style={s.bulletRow}>
                  <Text style={s.bulletText}>Materials: {data.materialsApproved}/{data.materialsTotal} approved</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Items by Status */}
        {options.includeStatus && data.statusBreakdown.length > 0 && (
          <View style={{ marginBottom: 10 }}>
            <Text style={s.sectionHeader}>Items by Status</Text>
            <View style={s.sectionLine} />
            {data.statusBreakdown.map((item, idx) => {
              const barWidth = Math.max(8, (item.count / maxStatusCount) * 200);
              const barColor = STATUS_COLORS[item.status] || C.teal;
              return (
                <View key={item.status} style={[s.statusRow, idx % 2 === 0 ? s.statusRowAlt : {}]}>
                  <Text style={s.statusLabel}>{STATUS_LABELS[item.status] || item.status}</Text>
                  <View style={[s.statusBar, { width: barWidth, backgroundColor: barColor, opacity: 0.8 }]} />
                  <Text style={s.statusCount}>{item.count}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Milestones */}
        {options.includeMilestones && data.milestones.length > 0 && (
          <View style={{ marginBottom: 10 }} wrap={false}>
            <Text style={s.sectionHeader}>Milestones</Text>
            <View style={s.sectionLine} />
            {data.milestones.map((m) => {
              const isPast = new Date(m.dueDate) < new Date();
              const icon = m.isCompleted ? "\u2713" : isPast ? "\u26A0" : "\u25CB";
              const color = m.isCompleted ? C.green : isPast ? C.red : C.gray;
              const label = m.isCompleted ? "Complete" : isPast ? "Overdue" : "Upcoming";
              return (
                <View key={m.name} style={s.milestoneRow}>
                  <Text style={[s.milestoneIcon, { color }]}>{icon}</Text>
                  <Text style={s.milestoneName}>{m.name}</Text>
                  <Text style={s.milestoneDate}>{fmtDate(m.dueDate)}</Text>
                  <Text style={[s.milestoneStatus, { color }]}>{label}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Cost Breakdown */}
        {options.includeCosts && (
          <View style={{ marginBottom: 10 }} wrap={false}>
            <Text style={s.sectionHeader}>Cost Breakdown</Text>
            <View style={s.sectionLine} />

            <View style={s.costRow}>
              <Text style={s.costLabel}>Production</Text>
              <View style={[s.costBar, {
                width: totalCost > 0 ? Math.max(8, (data.productionCost / totalCost) * 200) : 8,
                backgroundColor: C.teal,
              }]} />
              <Text style={s.costAmount}>{fmtAmt(data.productionCost, data.currency)}</Text>
            </View>

            <View style={s.costRow}>
              <Text style={s.costLabel}>Procurement</Text>
              <View style={[s.costBar, {
                width: totalCost > 0 ? Math.max(8, (data.procurementCost / totalCost) * 200) : 8,
                backgroundColor: C.blue,
              }]} />
              <Text style={s.costAmount}>{fmtAmt(data.procurementCost, data.currency)}</Text>
            </View>

            {totalCost > 0 && (
              <>
                <View style={{ borderTopWidth: 0.5, borderTopColor: C.border, marginTop: 2, marginBottom: 4 }} />
                <View style={s.costRow}>
                  <Text style={[s.costLabel, { fontFamily: "Helvetica-Bold" }]}>Total</Text>
                  <Text style={[s.costAmount, { fontSize: 9 }]}>{fmtAmt(totalCost, data.currency)}</Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Formula International</Text>
          <Text style={s.footerText}>Confidential</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

// ============================================================================
// Export Function (called from server action)
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
