"use client";

import dynamic from "next/dynamic";

export const CashFlowChart = dynamic(
  () => import("./cash-flow-chart-impl").then((m) => m.CashFlowChartImpl),
  {
    ssr: false,
    loading: () => <div className="h-[224px] w-full animate-pulse rounded-xl bg-muted/50" />,
  }
);
