"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  type GanttRow,
  type GanttItem,
  formatDuration,
  daysBetween,
  PHASE_COLORS,
} from "./gantt-types";
import { ChevronRightIcon } from "lucide-react";

// ============================================================================
// GANTT TABLE — Spreadsheet view matching Figma Table View frame
// Columns: checkbox | Task | Start | End | Duration | Progress | Status | Category | Description
// Phase rows: 3px left accent bar, bold name, task count, date range + progress
// ============================================================================

interface GanttTableProps {
  rows: GanttRow[];
  selectedIds: Set<string>;
  onToggleCollapse: (id: string) => void;
  onSelectItem: (id: string, e: React.MouseEvent) => void;
  onDoubleClickItem: (item: GanttItem) => void;
  className?: string;
}

export function GanttTable({
  rows,
  selectedIds,
  onToggleCollapse,
  onSelectItem,
  onDoubleClickItem,
  className,
}: GanttTableProps) {
  return (
    <div className={cn("flex-1 overflow-auto", className)}>
      <table className="w-full text-[11px] border-collapse min-w-[1100px]">
        <thead className="sticky top-0 z-10 bg-muted/30">
          <tr className="border-b text-[11px] font-semibold text-muted-foreground h-[30px]">
            <th className="w-[30px] px-2 border-r border-border/30" />
            <th className="text-left px-3 min-w-[210px] border-r border-border/30">Task</th>
            <th className="text-left px-3 w-[110px] border-r border-border/30">Start Date</th>
            <th className="text-left px-3 w-[110px] border-r border-border/30">End Date</th>
            <th className="text-left px-3 w-[70px] border-r border-border/30">Duration</th>
            <th className="text-left px-3 w-[80px] border-r border-border/30">Progress</th>
            <th className="text-left px-3 w-[90px] border-r border-border/30">Status</th>
            <th className="text-left px-3 w-[120px] border-r border-border/30">Category</th>
            <th className="text-left px-3 min-w-[200px]">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) =>
            row.type === "phase" ? (
              <PhaseRow
                key={row.id}
                row={row}
                isSelected={selectedIds.has(row.id)}
                onToggleCollapse={onToggleCollapse}
                onSelect={onSelectItem}
                onDoubleClick={onDoubleClickItem}
              />
            ) : (
              <TaskRow
                key={row.id}
                row={row}
                isSelected={selectedIds.has(row.id)}
                onSelect={onSelectItem}
                onDoubleClick={onDoubleClickItem}
              />
            )
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phase Row — full-width with accent bar
// ---------------------------------------------------------------------------

function PhaseRow({
  row,
  isSelected,
  onToggleCollapse,
  onSelect,
  onDoubleClick,
}: {
  row: GanttRow;
  isSelected: boolean;
  onToggleCollapse: (id: string) => void;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onDoubleClick: (item: GanttItem) => void;
}) {
  const { item, phaseColor, hasChildren, isCollapsed } = row;
  const childCount = item.children.length;
  const progress = Math.min(Math.max(item.progress, 0), 100);
  const dateRange = `${fmtDate(item.startDate)} - ${fmtDate(item.endDate)}`;

  return (
    <tr
      className={cn(
        "h-[40px] border-b cursor-pointer hover:bg-muted/30 transition-colors",
        isSelected && "bg-primary/5"
      )}
      onClick={(e) => onSelect(row.id, e)}
      onDoubleClick={() => onDoubleClick(item)}
    >
      {/* Chevron + accent bar */}
      <td className="relative px-2">
        {/* Left accent bar */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px]"
          style={{ backgroundColor: phaseColor }}
        />
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse(row.id);
            }}
            className="text-muted-foreground/60 text-[10px]"
          >
            {isCollapsed ? "▶" : "▼"}
          </button>
        )}
      </td>

      {/* Phase name + count */}
      <td className="px-3" colSpan={4}>
        <div className="flex items-center gap-2">
          <span
            className="size-3 rounded-full shrink-0"
            style={{ backgroundColor: phaseColor }}
          />
          <span className="font-semibold text-[13px] text-foreground">
            {item.name}
          </span>
          {childCount > 0 && (
            <span className="text-[9px] font-medium text-muted-foreground bg-muted border border-border/50 px-1.5 py-0.5 rounded-full">
              {childCount} tasks
            </span>
          )}
        </div>
      </td>

      {/* Date range + progress on right */}
      <td className="px-3 text-right" colSpan={4}>
        <div className="flex items-center justify-end gap-3">
          <span className="text-[10px] text-muted-foreground">{dateRange}</span>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-[60px] rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${progress}%`, backgroundColor: phaseColor }}
              />
            </div>
            <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
              {Math.round(progress)}%
            </span>
          </div>
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Task / Milestone Row
// ---------------------------------------------------------------------------

function TaskRow({
  row,
  isSelected,
  onSelect,
  onDoubleClick,
}: {
  row: GanttRow;
  isSelected: boolean;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onDoubleClick: (item: GanttItem) => void;
}) {
  const { item, phaseColor } = row;
  const progress = Math.min(Math.max(item.progress, 0), 100);

  return (
    <tr
      className={cn(
        "h-[52px] border-b cursor-pointer hover:bg-muted/30 transition-colors",
        isSelected && "bg-primary/5",
        row.rowIndex % 2 === 0 ? "bg-background" : "bg-muted/10"
      )}
      onClick={(e) => onSelect(row.id, e)}
      onDoubleClick={() => onDoubleClick(item)}
    >
      {/* Checkbox */}
      <td className="px-2">
        <div className="size-3.5 rounded-[3px] border border-border bg-background" />
      </td>

      {/* Task name + badges */}
      <td className="px-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            {item.type === "milestone" ? (
              <div
                className="size-2 rotate-45 shrink-0"
                style={{ backgroundColor: phaseColor }}
              />
            ) : (
              <span
                className="size-2 rounded-full shrink-0"
                style={{ backgroundColor: phaseColor }}
              />
            )}
            <span className="font-medium text-xs text-foreground truncate">
              {item.name}
            </span>
          </div>
          {item.isOnCriticalPath && (
            <span className="text-[10px] font-medium text-red-600 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-full w-fit">
              Critical Path
            </span>
          )}
        </div>
      </td>

      {/* Start Date */}
      <td className="px-3 text-muted-foreground tabular-nums">{fmtDate(item.startDate)}</td>

      {/* End Date */}
      <td className="px-3 text-muted-foreground tabular-nums">{fmtDate(item.endDate)}</td>

      {/* Duration */}
      <td className="px-3 text-muted-foreground tabular-nums">{formatDuration(item)}</td>

      {/* Progress */}
      <td className="px-3">
        <div className="flex items-center gap-1.5">
          <span className="font-medium tabular-nums">{Math.round(progress)}%</span>
          <div className="h-1.5 w-[30px] rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${progress}%`, backgroundColor: phaseColor }}
            />
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="px-3">
        <StatusBadge progress={progress} isCompleted={item.isCompleted} />
      </td>

      {/* Category */}
      <td className="px-3">
        {item.phaseKey && (
          <div className="flex items-center gap-1.5">
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: phaseColor }}
            />
            <span className="text-muted-foreground capitalize">{item.phaseKey}</span>
          </div>
        )}
      </td>

      {/* Description */}
      <td className="px-3 text-muted-foreground/60 truncate max-w-[250px]">
        {item.description || ""}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadge({ progress, isCompleted }: { progress: number; isCompleted: boolean }) {
  let label: string;
  let dotColor: string;
  let textColor: string;

  if (isCompleted || progress >= 100) {
    label = "Complete";
    dotColor = "#16a34a";
    textColor = "text-green-600";
  } else if (progress > 0) {
    label = "In Progress";
    dotColor = "#f59e0b";
    textColor = "text-amber-500";
  } else {
    label = "Not Started";
    dotColor = "#9ca3af";
    textColor = "text-muted-foreground";
  }

  return (
    <div className={cn("flex items-center gap-1.5", textColor)}>
      <span className="size-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
      <span className="font-medium text-[10px]">{label}</span>
    </div>
  );
}
