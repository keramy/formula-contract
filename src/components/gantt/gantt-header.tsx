"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { type GanttColumn, type GanttViewMode } from "./types";

// ============================================================================
// GANTT HEADER - Timeline header showing dates/weeks/months
// ============================================================================

// Header row heights (must match GanttSidebar)
const HEADER_TOP_ROW_HEIGHT = 20;    // Month row in day/week view
const HEADER_BOTTOM_ROW_HEIGHT = 28; // Date/week labels row
const HEADER_MONTH_VIEW_HEIGHT = 40; // Single row in month view

export interface GanttHeaderProps {
  columns: GanttColumn[];
  viewMode: GanttViewMode;
  columnWidth: number;
  headerHeight?: number;  // Optional, for month view alignment
  className?: string;
}

export function GanttHeader({
  columns,
  viewMode,
  columnWidth,
  headerHeight,
  className,
}: GanttHeaderProps) {
  // Calculate bottom row height based on view mode
  const bottomRowHeight = viewMode === "month"
    ? (headerHeight ?? HEADER_MONTH_VIEW_HEIGHT)
    : HEADER_BOTTOM_ROW_HEIGHT;
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

  // For month view the header is just the bottom row; for day/week it's top + bottom.
  // We set an explicit height on the wrapper so the border-b is INSIDE the box,
  // matching the sidebar header (which also uses height + border-b = border-box).
  const wrapperHeight = headerHeight ?? (viewMode === "month" ? HEADER_MONTH_VIEW_HEIGHT : HEADER_TOP_ROW_HEIGHT + HEADER_BOTTOM_ROW_HEIGHT);

  return (
    <div
      className={cn("border-b border-base-300 bg-base-50 sticky top-0 z-10 box-border overflow-hidden", className)}
      style={{ height: wrapperHeight }}
    >
      {/* Month row (only for day/week view) - explicit height for alignment */}
      {viewMode !== "month" && (
        <div
          className="flex border-b border-base-300"
          style={{ height: HEADER_TOP_ROW_HEIGHT }}
        >
          {monthGroups.map((group, idx) => (
            <div
              key={idx}
              className="text-xs font-semibold text-muted-foreground px-2 flex items-center border-r border-base-200 last:border-r-0"
              style={{ width: group.columns.length * columnWidth }}
            >
              {group.label}
            </div>
          ))}
        </div>
      )}

      {/* Day/Week/Month row - fills remaining space */}
      <div
        className="flex flex-1"
      >
        {columns.map((col, idx) => (
          <div
            key={idx}
            className={cn(
              "text-xs text-center flex items-center justify-center border-r border-base-200 last:border-r-0 shrink-0",
              col.isToday && "bg-primary/10 text-primary font-medium",
              col.isWeekend && viewMode === "day" && "bg-base-100"
            )}
            style={{ width: columnWidth }}
          >
            {viewMode === "day" && (
              <div className="flex flex-col items-center leading-tight">
                <span className="text-[9px] text-muted-foreground">
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
              <div className="flex flex-col items-center leading-tight">
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

