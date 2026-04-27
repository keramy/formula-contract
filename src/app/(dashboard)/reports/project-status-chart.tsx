"use client";

import dynamic from "next/dynamic";

export const ProjectStatusChart = dynamic(
  () => import("./project-status-chart-impl").then((m) => m.ProjectStatusChartImpl),
  {
    ssr: false,
    loading: () => <div className="h-[200px] w-full animate-pulse rounded-xl bg-muted/50" />,
  }
);
