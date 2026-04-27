"use client";

import dynamic from "next/dynamic";

export const MaterialsStatusChart = dynamic(
  () => import("./materials-status-chart-impl").then((m) => m.MaterialsStatusChartImpl),
  {
    ssr: false,
    loading: () => <div className="h-[200px] w-full animate-pulse rounded-xl bg-muted/50" />,
  }
);
