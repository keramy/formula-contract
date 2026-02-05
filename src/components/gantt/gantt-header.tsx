"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { type GanttColumn, type GanttViewMode } from "./types";

// ============================================================================
// GANTT HEADER - Timeline header showing dates/weeks/months
// ============================================================================

export interface GanttHeaderProps {
  columns: GanttColumn[];
  viewMode: GanttViewMode;
  columnWidth: number;
  className?: string;
}

export function GanttHeader({
  columns,
  viewMode,
  columnWidth,
  className,
}: GanttHeaderProps) {
  // Group columns by month for the upper header row
  const monthGroups = React.useMemo(() => {
    const groups: { label: string; columns: GanttColumn[] }[] = [];
    let currentMonth = "";

    columns.forEach((col) => {
      const monthLabel = col.date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });

      if (monthLabel !== currentMonth) {
        groups.push({ label: monthLabel, columns: [col] });
        currentMonth = monthLabel;
      } else {
        groups[groups.length - 1].columns.push(col);
      }
    });

    return groups;
  }, [columns]);

  return (
    <div className={cn("border-b border-base-200 bg-base-50 sticky top-0 z-10", className)}>
      {/* Month row (only for day/week view) */}
      {viewMode !== "month" && (
        <div className="flex border-b border-base-200">
          {monthGroups.map((group, idx) => (
            <div
              key={idx}
              className="text-xs font-medium text-muted-foreground px-2 py-1 border-r border-base-200 last:border-r-0"
              style={{ width: group.columns.length * columnWidth }}
            >
              {group.label}
            </div>
          ))}
        </div>
      )}

      {/* Day/Week/Month row */}
      <div className="flex">
        {columns.map((col, idx) => (
          <div
            key={idx}
            className={cn(
              "text-xs text-center py-2 border-r border-base-200 last:border-r-0 shrink-0",
              col.isToday && "bg-primary/10 text-primary font-medium",
              col.isWeekend && viewMode === "day" && "bg-base-100"
            )}
            style={{ width: columnWidth }}
          >
            {viewMode === "day" && (
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] text-muted-foreground">
                  {col.date.toLocaleDateString("en-US", { weekday: "short" })}
                </span>
                <span className={cn(col.isToday && "font-semibold")}>
                  {col.label}
                </span>
              </div>
            )}
            {viewMode === "week" && (
              <span>{col.label}</span>
            )}
            {viewMode === "month" && (
              <div className="flex flex-col items-center gap-0.5">
                <span>{col.label}</span>
                <span className="text-[10px] text-muted-foreground">
                  {col.date.getFullYear()}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default GanttHeader;
