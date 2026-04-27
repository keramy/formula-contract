"use client";

import dynamic from "next/dynamic";

export const ProductionProgressChart = dynamic(
  () => import("./production-progress-chart-impl").then((m) => m.ProductionProgressChartImpl),
  {
    ssr: false,
    loading: () => <div className="h-[200px] w-full animate-pulse rounded-xl bg-muted/50" />,
  }
);
