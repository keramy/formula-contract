"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { ExternalLinkIcon } from "lucide-react";
import type { GanttStats } from "./gantt-types";

// ============================================================================
// GANTT STATS BAR — Top 52px bar
// Figma: "Project Timeline" title + stats dots + progress bar + status badge
// ============================================================================

interface GanttStatsBarProps {
  projectTitle?: string;
  projectSubtitle?: string;
  stats: GanttStats;
  onExport?: () => void;
  fullViewUrl?: string;
  className?: string;
}

export function GanttStatsBar({
  projectTitle = "Project Timeline",
  projectSubtitle,
  stats,
  onExport,
  fullViewUrl,
  className,
}: GanttStatsBarProps) {
  const { total, completed, critical, avgProgress } = stats;

  return (
    <div
      className={cn(
        "flex items-center justify-between px-5 h-[52px] border-b bg-background shrink-0",
        className
      )}
    >
      {/* Left — title */}
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-foreground leading-tight">
          {projectTitle}
        </h2>
        {projectSubtitle && (
          <p className="text-[11px] text-muted-foreground leading-tight truncate">
            {projectSubtitle}
          </p>
        )}
      </div>

      {/* Center — stats */}
      <div className="flex items-center gap-5">
        <StatDot color="bg-muted-foreground" label={`${total} items`} />
        <StatDot color="bg-emerald-500" label={`${completed} completed`} />
        <StatDot color="bg-red-500" label={`${critical} critical`} />

        {/* Progress */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tabular-nums text-foreground">
            {avgProgress}%
          </span>
          <div className="h-2 w-[100px] rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-teal-600 transition-all duration-300"
              style={{ width: `${Math.min(avgProgress, 100)}%` }}
            />
          </div>
        </div>

        {/* Status badge */}
        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {avgProgress >= 100 ? "Complete" : avgProgress > 0 ? "In Progress" : "Not Started"}
        </span>
      </div>

      {/* Right — Full View + Export */}
      <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground shrink-0">
        {fullViewUrl && (
          <Link
            href={fullViewUrl}
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <ExternalLinkIcon className="size-3" />
            Open Full View
          </Link>
        )}
        {onExport && (
          <button onClick={onExport} className="hover:text-foreground transition-colors">
            Export
          </button>
        )}
      </div>
    </div>
  );
}

function StatDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("size-2 rounded-full", color)} />
      <span className="text-xs font-medium text-foreground/80 whitespace-nowrap">
        {label}
      </span>
    </div>
  );
}
