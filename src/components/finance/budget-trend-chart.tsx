"use client";

import dynamic from "next/dynamic";

// Recharts is ~90KB; lazy load to keep it out of initial bundles.
export const BudgetTrendChart = dynamic(
  () => import("./budget-trend-chart-impl").then((m) => m.BudgetTrendChartImpl),
  {
    ssr: false,
    loading: () => <div className="h-[220px] lg:h-[280px] w-full animate-pulse rounded-xl bg-muted/50" />,
  }
);
