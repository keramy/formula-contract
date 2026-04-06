"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  type GanttRow,
  type GanttItem,
  type GanttDependency,
  type GanttViewMode,
  type GanttDateRange,
  type BarPosition,
  ROW_HEIGHT,
  TASK_BAR_HEIGHT,
  HEADER_HEIGHT,
  totalRowsHeight,
  generateColumns,
  calculateBarPosition,
  dateToX,
  getBarHealthColor,
  isToday,
  isWeekend,
  getWeekNumber,
} from "./gantt-types";
import { GanttBar } from "./gantt-bar";
import { GanttDependencyArrows } from "./gantt-dependency-arrows";

// ============================================================================
// GANTT TIMELINE — Right panel with header, grid, bars, today line
// Uses same ganttRows array as sidebar for perfect alignment
// ============================================================================

interface GanttTimelineProps {
  rows: GanttRow[];
  dateRange: GanttDateRange;
  viewMode: GanttViewMode;
  columnWidth: number;
  showGrid: boolean;
  showDependencies: boolean;
  showCriticalPath: boolean;
  selectedIds: Set<string>;
  dependencies: GanttDependency[];
  onItemDoubleClick: (item: GanttItem) => void;
  onItemClick?: (item: GanttItem) => void;
  onDependencyClick?: (dep: GanttDependency) => void;
  linkMode?: boolean;
  linkSourceId?: string | null;
  baselineItems?: { gantt_item_id: string; start_date: string; end_date: string }[];
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onScroll: (e: React.UIEvent) => void;
  className?: string;
}

export function GanttTimeline({
  rows,
  dateRange,
  viewMode,
  columnWidth,
  showGrid,
  showDependencies,
  showCriticalPath,
  selectedIds,
  dependencies,
  onItemDoubleClick,
  onItemClick,
  onDependencyClick,
  linkMode,
  linkSourceId,
  baselineItems,
  scrollRef,
  onScroll,
  className,
}: GanttTimelineProps) {
  const columns = React.useMemo(
    () => generateColumns(dateRange, viewMode),
    [dateRange, viewMode]
  );

  const totalWidth = columns.length * columnWidth;
  const contentHeight = totalRowsHeight(rows);

  // Bar positions for all task/milestone rows
  const barPositions = React.useMemo(() => {
    const map = new Map<string, BarPosition>();
    for (const row of rows) {
      if (row.type === "phase") continue;
      const pos = calculateBarPosition(row.item, dateRange, totalWidth);
      map.set(row.id, {
        id: row.id,
        left: pos.left,
        width: pos.width,
        y: row.y + ROW_HEIGHT / 2, // center Y for arrows
        rowIndex: row.rowIndex,
      });
    }
    return map;
  }, [rows, dateRange, totalWidth]);

  // Baseline bar positions (ghost bars)
  const baselineMap = React.useMemo(() => {
    if (!baselineItems || baselineItems.length === 0) return null;
    const map = new Map<string, { left: number; width: number }>();
    for (const bi of baselineItems) {
      const fakeItem = {
        startDate: new Date(bi.start_date),
        endDate: new Date(bi.end_date),
      } as any;
      const pos = calculateBarPosition(fakeItem, dateRange, totalWidth);
      map.set(bi.gantt_item_id, pos);
    }
    return map;
  }, [baselineItems, dateRange, totalWidth]);

  // Today line X position — centered in the day column
  const todayX = React.useMemo(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0); // noon = center of the day
    if (today < dateRange.start || today > dateRange.end) return null;
    return dateToX(today, dateRange, totalWidth);
  }, [dateRange, totalWidth]);

  return (
    <div
      ref={scrollRef}
      className={cn("flex-1 overflow-auto", className)}
      onScroll={onScroll}
    >
      <div style={{ width: totalWidth, minHeight: "100%" }}>
        {/* Header */}
        <TimelineHeader
          columns={columns}
          viewMode={viewMode}
          columnWidth={columnWidth}
          todayX={todayX}
        />

        {/* Body */}
        <div className="relative" style={{ height: contentHeight }}>
          {/* Column backgrounds + grid lines */}
          {columns.map((col, i) => (
            <div
              key={i}
              className={cn(
                "absolute top-0",
                col.isWeekend && viewMode === "day" && "bg-muted/30",
                // Today column: no background tint — the today LINE is the indicator
                showGrid && "border-r border-border/60"
              )}
              style={{
                left: i * columnWidth,
                width: columnWidth,
                height: contentHeight,
              }}
            />
          ))}

          {/* Horizontal row lines — rendered as border-bottom on row-sized divs, matching sidebar */}
          {rows.map((row) => (
            <div
              key={`hline-${row.id}`}
              className="absolute left-0 right-0 border-b border-border/50 pointer-events-none"
              style={{ top: row.y, height: row.height }}
            />
          ))}

          {/* Row backgrounds (alternating) */}
          {rows.map((row) => (
            <div
              key={`bg-${row.id}`}
              className={cn(
                "absolute left-0 right-0",
                selectedIds.has(row.id)
                  ? "bg-primary/10"
                  : row.rowIndex % 2 === 0
                  ? "bg-transparent"
                  : "bg-muted/10"
              )}
              style={{ top: row.y, height: row.height }}
            />
          ))}

          {/* Task bars */}
          {rows.map((row) => {
            if (row.type === "phase") return null;
            const pos = barPositions.get(row.id);
            if (!pos) return null;

            return (
              <GanttBar
                key={row.id}
                item={row.item}
                left={pos.left}
                width={pos.width}
                y={row.y}
                color={getBarHealthColor(row.item) ?? row.phaseColor}
                depth={row.depth}
                hasChildren={row.hasChildren}
                isSelected={selectedIds.has(row.id)}
                isEditable={row.item.isEditable}
                showCriticalPath={showCriticalPath}
                baselineLeft={baselineMap?.get(row.id)?.left}
                baselineWidth={baselineMap?.get(row.id)?.width}
                onDoubleClick={onItemDoubleClick}
                onClick={onItemClick}
                linkMode={linkMode}
                isLinkSource={linkMode && linkSourceId === row.id}
              />
            );
          })}

          {/* Dependency arrows */}
          {showDependencies && (
            <GanttDependencyArrows
              dependencies={dependencies}
              barPositions={barPositions}
              containerWidth={totalWidth}
              containerHeight={contentHeight}
              onDependencyClick={onDependencyClick}
            />
          )}

          {/* Today line */}
          {todayX !== null && (
            <div
              className="absolute top-0 w-[2px] bg-teal-500 z-30 pointer-events-none"
              style={{ left: todayX, height: contentHeight }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timeline Header — varies by view mode
// ---------------------------------------------------------------------------

function TimelineHeader({
  columns,
  viewMode,
  columnWidth,
  todayX,
}: {
  columns: ReturnType<typeof generateColumns>;
  viewMode: GanttViewMode;
  columnWidth: number;
  todayX: number | null;
}) {
  if (viewMode === "day") {
    return <DayHeader columns={columns} columnWidth={columnWidth} todayX={todayX} />;
  }
  if (viewMode === "week") {
    return <WeekHeader columns={columns} columnWidth={columnWidth} todayX={todayX} />;
  }
  return <MonthHeader columns={columns} columnWidth={columnWidth} todayX={todayX} />;
}

/** Day view: week groups (top) + day initials with numbers (bottom) */
function DayHeader({
  columns,
  columnWidth,
  todayX,
}: {
  columns: ReturnType<typeof generateColumns>;
  columnWidth: number;
  todayX: number | null;
}) {
  const dayInitials = ["S", "M", "T", "W", "T", "F", "S"];

  // Group by week
  const weekGroups = React.useMemo(() => {
    const groups: { week: number; label: string; startIdx: number; count: number }[] = [];
    let currentWeek = -1;

    columns.forEach((col, i) => {
      const wn = getWeekNumber(col.date);
      if (wn !== currentWeek) {
        const monthDay = col.date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const endDate = new Date(col.date);
        endDate.setDate(endDate.getDate() + 6);
        groups.push({
          week: wn,
          label: `Week ${wn} · ${monthDay} - ${endDate.getDate()}`,
          startIdx: i,
          count: 1,
        });
        currentWeek = wn;
      } else {
        groups[groups.length - 1].count++;
      }
    });
    return groups;
  }, [columns]);

  const halfH = HEADER_HEIGHT / 2;

  return (
    <div className="sticky top-0 z-20 bg-muted/30 border-b relative box-border" style={{ height: HEADER_HEIGHT }}>
      {/* Top row — week groups */}
      <div className="flex border-b border-border/30" style={{ height: halfH }}>
        {weekGroups.map((g) => (
          <div
            key={g.startIdx}
            className="flex items-center px-2 text-[10px] font-medium text-muted-foreground border-r border-border/20 truncate"
            style={{ width: g.count * columnWidth }}
          >
            {g.label}
          </div>
        ))}
      </div>
      {/* Bottom row — day initials + numbers */}
      <div className="flex" style={{ height: halfH }}>
        {columns.map((col, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center justify-center gap-0.5 text-[10px] border-r border-border/20",
              col.isToday && "text-teal-600 font-bold",
              col.isWeekend && !col.isToday && "text-muted-foreground/40"
            )}
            style={{ width: columnWidth }}
          >
            <span>{dayInitials[col.date.getDay()]}</span>
            <span className="tabular-nums">{col.date.getDate()}</span>
          </div>
        ))}
      </div>
      {/* Today badge */}
      {/* Today badge removed — the teal vertical line is sufficient */}
    </div>
  );
}

/** Week view: month groups (top) + week numbers (bottom) */
function WeekHeader({
  columns,
  columnWidth,
  todayX,
}: {
  columns: ReturnType<typeof generateColumns>;
  columnWidth: number;
  todayX: number | null;
}) {
  const monthGroups = React.useMemo(() => {
    const groups: { label: string; startIdx: number; count: number }[] = [];
    let currentMonth = -1;

    columns.forEach((col, i) => {
      const m = col.date.getMonth();
      if (m !== currentMonth) {
        groups.push({
          label: col.date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
          startIdx: i,
          count: 1,
        });
        currentMonth = m;
      } else {
        groups[groups.length - 1].count++;
      }
    });
    return groups;
  }, [columns]);

  const halfH = HEADER_HEIGHT / 2;

  return (
    <div className="sticky top-0 z-20 bg-muted/30 border-b relative box-border" style={{ height: HEADER_HEIGHT }}>
      <div className="flex border-b border-border/30" style={{ height: halfH }}>
        {monthGroups.map((g) => (
          <div
            key={g.startIdx}
            className="flex items-center px-2 text-[10px] font-medium text-muted-foreground border-r border-border/20 truncate"
            style={{ width: g.count * columnWidth }}
          >
            {g.label}
          </div>
        ))}
      </div>
      <div className="flex" style={{ height: halfH }}>
        {columns.map((col, i) => {
          const today = new Date();
          const weekStart = new Date(col.date);
          const weekEnd = new Date(col.date);
          weekEnd.setDate(weekEnd.getDate() + 6);
          const isTodayWeek = today >= weekStart && today <= weekEnd;

          return (
            <div
              key={i}
              className={cn(
                "flex items-center justify-center text-[10px] font-medium border-r border-border/20",
                isTodayWeek ? "bg-foreground text-background rounded-sm" : "text-muted-foreground"
              )}
              style={{ width: columnWidth }}
            >
              {col.label}
            </div>
          );
        })}
      </div>
      {/* Today badge removed — the teal vertical line is sufficient */}
    </div>
  );
}

/** Month view: month names only (single row for simplicity, matches Figma) */
function MonthHeader({
  columns,
  columnWidth,
  todayX,
}: {
  columns: ReturnType<typeof generateColumns>;
  columnWidth: number;
  todayX: number | null;
}) {
  return (
    <div className="sticky top-0 z-20 bg-muted/30 border-b relative box-border" style={{ height: HEADER_HEIGHT }}>
      <div className="flex h-full">
        {columns.map((col, i) => {
          const isTodayMonth =
            col.date.getMonth() === new Date().getMonth() &&
            col.date.getFullYear() === new Date().getFullYear();

          return (
            <div
              key={i}
              className={cn(
                "flex items-center px-2 text-[10px] font-medium border-r border-border/20",
                isTodayMonth ? "text-foreground" : "text-muted-foreground"
              )}
              style={{ width: columnWidth }}
            >
              {col.date.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
            </div>
          );
        })}
      </div>
      {/* Today badge removed — the teal vertical line is sufficient */}
    </div>
  );
}
