"use client";

import { useEffect, useState } from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GlassCard, GradientIcon } from "@/components/ui/ui-helpers";
import { usePageHeader } from "@/components/layout/app-header";
import {
  BanknoteIcon,
  ArrowUpRightIcon,
  ArrowDownLeftIcon,
  AlertTriangleIcon,
  CalendarIcon,
  MailIcon,
  DownloadIcon,
  TrendingUpIcon,
} from "lucide-react";
import {
  useFinanceDashboard,
  useAgingReport,
  useCashFlowData,
  useExportPaymentSchedule,
  useSendManualSummary,
} from "@/lib/react-query/finance";
import type { AgingBucket } from "@/types/finance";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface PaymentsDashboardProps {
  userRole: string;
}

// Timeframe options for Send Summary dialog
function getDateLabel(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const SUMMARY_TIMEFRAMES = [
  { value: "this_week", label: "This week", description: `${getDateLabel(0)} — ${getDateLabel(6)}` },
  { value: "next_2_weeks", label: "Next 2 weeks", description: `${getDateLabel(0)} — ${getDateLabel(13)}` },
  { value: "this_month", label: "This month", description: new Date().toLocaleString("en-US", { month: "long", year: "numeric" }) },
  { value: "all", label: "All outstanding", description: "Every unpaid invoice regardless of due date" },
];

const AGING_BUCKETS: { label: string; key: keyof AgingBucket; color: string }[] = [
  { label: "Current", key: "current", color: "bg-emerald-500" },
  { label: "1-30 days", key: "days30", color: "bg-amber-500" },
  { label: "31-60 days", key: "days60", color: "bg-orange-500" },
  { label: "61-90 days", key: "days90", color: "bg-rose-500" },
  { label: "90+ days", key: "days90plus", color: "bg-red-600" },
];

export function PaymentsDashboard({ userRole }: PaymentsDashboardProps) {
  const { data: stats, isLoading } = useFinanceDashboard();
  const { data: agingPayable, isLoading: isLoadingPayable } =
    useAgingReport("payable");
  const { data: agingReceivable, isLoading: isLoadingReceivable } =
    useAgingReport("receivable");
  const { data: cashFlowData, isLoading: isLoadingCashFlow } =
    useCashFlowData();
  const exportSchedule = useExportPaymentSchedule();
  const sendSummary = useSendManualSummary();
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [summaryNote, setSummaryNote] = useState("");
  const [summaryTimeframe, setSummaryTimeframe] = useState<string>("this_week");

  const { setContent } = usePageHeader();
  useEffect(() => {
    setContent({
      icon: (
        <GradientIcon
          icon={<BanknoteIcon className="size-4" />}
          color="amber"
          size="sm"
        />
      ),
      title: "Payments",
      description: "Accounts payable & receivable",
      actions: (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportSchedule.mutate()}
            disabled={exportSchedule.isPending}
          >
            <DownloadIcon className="size-4 mr-1" />
            {exportSchedule.isPending ? "Exporting..." : "Export Schedule"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSummaryDialogOpen(true)}>
            <MailIcon className="size-4 mr-1" />
            Send Summary
          </Button>
        </div>
      ),
    });
    return () => setContent({});
  }, [setContent]);

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Payable */}
        <GlassCard hover="primary" className="cursor-pointer p-3">
          <div className="flex items-center gap-2 mb-1">
            <GradientIcon
              icon={<ArrowUpRightIcon className="size-3.5" />}
              color="rose"
              size="xs"
            />
            <span className="text-xs font-medium text-muted-foreground">
              Total Payable
            </span>
          </div>
          <div className="text-xl font-bold tabular-nums">
            {isLoading ? (
              <Skeleton className="h-6 w-24 inline-block" />
            ) : (
              formatCurrency(stats?.totalPayable ?? 0)
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Outstanding payables
          </div>
        </GlassCard>

        {/* Total Receivable */}
        <GlassCard hover="primary" className="cursor-pointer p-3">
          <div className="flex items-center gap-2 mb-1">
            <GradientIcon
              icon={<ArrowDownLeftIcon className="size-3.5" />}
              color="teal"
              size="xs"
            />
            <span className="text-xs font-medium text-muted-foreground">
              Total Receivable
            </span>
          </div>
          <div className="text-xl font-bold tabular-nums">
            {isLoading ? (
              <Skeleton className="h-6 w-24 inline-block" />
            ) : (
              formatCurrency(stats?.totalReceivable ?? 0)
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Outstanding receivables
          </div>
        </GlassCard>

        {/* Overdue */}
        <GlassCard hover="primary" className="cursor-pointer p-3">
          <div className="flex items-center gap-2 mb-1">
            <GradientIcon
              icon={<AlertTriangleIcon className="size-3.5" />}
              color="rose"
              size="xs"
            />
            <span className="text-xs font-medium text-muted-foreground">Overdue</span>
          </div>
          <div className="text-xl font-bold tabular-nums">
            {isLoading ? (
              <Skeleton className="h-6 w-24 inline-block" />
            ) : (
              formatCurrency(stats?.overduePayable ?? 0)
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Past due payables
          </div>
        </GlassCard>

        {/* Due This Week */}
        <GlassCard hover="primary" className="cursor-pointer p-3">
          <div className="flex items-center gap-2 mb-1">
            <GradientIcon
              icon={<CalendarIcon className="size-3.5" />}
              color="amber"
              size="xs"
            />
            <span className="text-xs font-medium text-muted-foreground">
              Due This Week
            </span>
          </div>
          <div className="text-xl font-bold tabular-nums">
            {isLoading ? (
              <Skeleton className="h-6 w-24 inline-block" />
            ) : (
              formatCurrency(stats?.thisWeekDue ?? 0)
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {isLoading ? (
              <Skeleton className="h-3 w-16 inline-block" />
            ) : (
              <>{stats?.thisWeekDueCount ?? 0} invoices</>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Cash Flow Chart */}
      <GlassCard>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GradientIcon
                icon={<TrendingUpIcon className="size-4" />}
                color="blue"
                size="sm"
              />
              <CardTitle className="text-sm font-semibold">Cash Flow</CardTitle>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="size-2.5 rounded-full bg-rose-400" />
                <span className="text-muted-foreground">Outgoing</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-2.5 rounded-full bg-emerald-400" />
                <span className="text-muted-foreground">Incoming</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {isLoadingCashFlow ? (
            <Skeleton className="h-56 w-full rounded-lg" />
          ) : !cashFlowData || cashFlowData.every((d) => d.outgoing === 0 && d.incoming === 0) ? (
            <div className="flex flex-col items-center justify-center h-56 text-center">
              <TrendingUpIcon className="size-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No payment data yet</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">
                Record payments to see cash flow trends
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={224}>
              <BarChart data={cashFlowData} barGap={2} barCategoryGap="20%">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  dy={8}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  width={55}
                  tickFormatter={(v: number) => {
                    if (v === 0) return "0";
                    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
                    return String(v);
                  }}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.3, radius: 4 }}
                  content={<CashFlowTooltip />}
                />
                <Bar
                  dataKey="outgoing"
                  name="Outgoing"
                  fill="#f87171"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  dataKey="incoming"
                  name="Incoming"
                  fill="#34d399"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </GlassCard>

      {/* Aging Reports */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Aging - Payable */}
        <GlassCard>
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center gap-2">
              <GradientIcon
                icon={<ArrowUpRightIcon className="size-4" />}
                color="rose"
                size="sm"
              />
              <CardTitle className="text-sm font-semibold">
                Aging - Payable
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {isLoadingPayable ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-4 w-20 shrink-0" />
                    <Skeleton className="h-3 flex-1" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : (
              <AgingBucketList
                data={agingPayable}
                total={stats?.totalPayable ?? 0}
              />
            )}
          </CardContent>
        </GlassCard>

        {/* Aging - Receivable */}
        <GlassCard>
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center gap-2">
              <GradientIcon
                icon={<ArrowDownLeftIcon className="size-4" />}
                color="teal"
                size="sm"
              />
              <CardTitle className="text-sm font-semibold">
                Aging - Receivable
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {isLoadingReceivable ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-4 w-20 shrink-0" />
                    <Skeleton className="h-3 flex-1" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : (
              <AgingBucketList
                data={agingReceivable}
                total={stats?.totalReceivable ?? 0}
              />
            )}
          </CardContent>
        </GlassCard>
      </div>

      {/* Send Summary Dialog */}
      <Dialog open={summaryDialogOpen} onOpenChange={setSummaryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Payment Summary</DialogTitle>
            <DialogDescription>
              Send an email with payment schedule (PDF attached) to all finance team members.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Timeframe</Label>
              <div className="grid gap-1.5">
                {SUMMARY_TIMEFRAMES.map((tf) => (
                  <label
                    key={tf.value}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                      summaryTimeframe === tf.value
                        ? "border-primary bg-primary/5"
                        : "border-base-200 hover:border-base-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="timeframe"
                      value={tf.value}
                      checked={summaryTimeframe === tf.value}
                      onChange={(e) => setSummaryTimeframe(e.target.value)}
                      className="accent-primary"
                    />
                    <div>
                      <div className="text-sm font-medium">{tf.label}</div>
                      <div className="text-xs text-muted-foreground">{tf.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="summary-note" className="text-sm">Note (optional)</Label>
              <Textarea
                id="summary-note"
                value={summaryNote}
                onChange={(e) => setSummaryNote(e.target.value)}
                placeholder="e.g. Updated — 3 new invoices added since Monday"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSummaryDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                sendSummary.mutate(
                  {
                    dateRange: summaryTimeframe as "this_week" | "rest_of_week" | "next_week" | "custom",
                    includeOverdue: true,
                    includeIncoming: true,
                    note: summaryNote || undefined,
                  },
                  {
                    onSuccess: () => {
                      setSummaryDialogOpen(false);
                      setSummaryNote("");
                      setSummaryTimeframe("this_week");
                    },
                  }
                );
              }}
              disabled={sendSummary.isPending}
            >
              <MailIcon className="size-4 mr-1" />
              {sendSummary.isPending ? "Sending..." : "Send Summary + PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Custom tooltip for cash flow chart (React Doctor rule #21 — module scope)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CashFlowTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const outgoing = payload.find((p: { dataKey: string }) => p.dataKey === "outgoing")?.value ?? 0;
  const incoming = payload.find((p: { dataKey: string }) => p.dataKey === "incoming")?.value ?? 0;
  const net = incoming - outgoing;

  return (
    <div className="rounded-lg border border-base-200 bg-card px-3 py-2.5 shadow-lg">
      <p className="text-xs font-semibold mb-1.5">{label}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-1.5">
            <div className="size-2 rounded-full bg-rose-400" />
            <span className="text-xs text-muted-foreground">Outgoing</span>
          </div>
          <span className="text-xs font-medium tabular-nums">{formatCurrency(outgoing)}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-1.5">
            <div className="size-2 rounded-full bg-emerald-400" />
            <span className="text-xs text-muted-foreground">Incoming</span>
          </div>
          <span className="text-xs font-medium tabular-nums">{formatCurrency(incoming)}</span>
        </div>
        <div className="border-t border-base-200 pt-1 mt-1">
          <div className="flex items-center justify-between gap-6">
            <span className="text-xs font-medium">Net</span>
            <span className={`text-xs font-semibold tabular-nums ${net >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {net >= 0 ? "+" : ""}{formatCurrency(net)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Extracted at module scope to avoid nested component definition (React Doctor rule #21)
interface AgingBucketListProps {
  data: AgingBucket | null | undefined;
  total: number;
}

function AgingBucketList({ data, total }: AgingBucketListProps) {
  const safeTotal = total > 0 ? total : 1;

  return (
    <>
      {AGING_BUCKETS.map((bucket) => {
        const amount = data?.[bucket.key] ?? 0;
        const pct = Math.round((amount / safeTotal) * 100);
        return (
          <div key={bucket.key} className="flex items-center gap-3">
            <span className="text-xs w-20 shrink-0 text-muted-foreground">
              {bucket.label}
            </span>
            <div className="h-2.5 flex-1 rounded-full bg-base-200 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${bucket.color}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs font-medium tabular-nums w-20 text-right">
              {formatCurrency(amount)}
            </span>
          </div>
        );
      })}
    </>
  );
}
