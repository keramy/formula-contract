"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { CashFlowMonth } from "@/types/finance";
import { formatCurrency } from "@/lib/utils";

export interface CashFlowChartProps {
  data: CashFlowMonth[];
}

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

export function CashFlowChartImpl({ data }: CashFlowChartProps) {
  return (
    <ResponsiveContainer width="100%" height={224}>
      <BarChart data={data} barGap={2} barCategoryGap="20%">
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
  );
}
