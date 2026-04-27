"use client";

import dynamic from "next/dynamic";

// Recharts is ~90KB; lazy load to keep it out of initial bundles.
export const BudgetBreakdown = dynamic(
  () => import("./budget-breakdown-impl").then((m) => m.BudgetBreakdownImpl),
  {
    ssr: false,
    loading: () => <div className="h-[300px] w-full animate-pulse rounded-xl bg-muted/50" />,
  }
);
