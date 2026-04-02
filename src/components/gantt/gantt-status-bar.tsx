"use client";

import { cn } from "@/lib/utils";
import type { GanttStats } from "./gantt-types";

// ============================================================================
// GANTT STATUS BAR — Bottom 34px summary strip
// Figma: "12 items · 3 completed · 4 milestones · 2 critical · 45% average progress"
// ============================================================================

interface GanttStatusBarProps {
  stats: GanttStats;
  className?: string;
}

export function GanttStatusBar({ stats, className }: GanttStatusBarProps) {
  const { total, completed, milestones, critical, avgProgress } = stats;

  return (
    <div
      className={cn(
        "flex items-center justify-between px-5 h-[34px] border-t text-[11px] font-medium text-muted-foreground bg-muted/30 shrink-0",
        className
      )}
    >
      <div className="flex items-center gap-0">
        <span>{total} items</span>
        <Sep />
        <span>{completed} completed</span>
        <Sep />
        <span>{milestones} milestones</span>
        <Sep />
        <span>{critical} critical</span>
        <Sep />
        <span>{avgProgress}% average progress</span>
      </div>
      <div className="flex items-center gap-0 text-muted-foreground/60">
        <span>Auto-saved</span>
        <span className="mx-1.5">•</span>
        <span>Ready for export</span>
      </div>
    </div>
  );
}

function Sep() {
  return <span className="mx-3" />;
}
