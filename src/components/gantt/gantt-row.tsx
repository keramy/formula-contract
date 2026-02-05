"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { type GanttItem, type GanttColumn, type GanttDateRange, calculateBarPosition } from "./types";
import { GanttBar } from "./gantt-bar";

// ============================================================================
// GANTT ROW - Single row in the timeline containing bars
// ============================================================================

export interface GanttRowProps {
  item: GanttItem;
  columns: GanttColumn[];
  dateRange: GanttDateRange;
  columnWidth: number;
  rowHeight: number;
  isSelected?: boolean;
  onItemClick?: (item: GanttItem) => void;
  onItemEdit?: (item: GanttItem) => void;
  onItemDuplicate?: (item: GanttItem) => void;
  onItemDelete?: (item: GanttItem) => void;
  onItemDatesChange?: (item: GanttItem, startDate: Date, endDate: Date) => void;
  className?: string;
}

export function GanttRow({
  item,
  columns,
  dateRange,
  columnWidth,
  rowHeight,
  isSelected = false,
  onItemClick,
  onItemEdit,
  onItemDuplicate,
  onItemDelete,
  onItemDatesChange,
  className,
}: GanttRowProps) {
  const totalWidth = columns.length * columnWidth;

  // Track dragging state for date updates
  const [dragState, setDragState] = React.useState<{
    edge: "left" | "right" | "middle";
    originalStart: Date;
    originalEnd: Date;
  } | null>(null);

  const [tempDates, setTempDates] = React.useState<{ start: Date; end: Date } | null>(null);

  // Calculate bar position using temp dates during drag, otherwise use item dates
  const displayItem = React.useMemo(() => {
    if (tempDates) {
      return {
        ...item,
        startDate: tempDates.start,
        endDate: tempDates.end,
      };
    }
    return item;
  }, [item, tempDates]);

  const { left, width } = React.useMemo(
    () => calculateBarPosition(displayItem, dateRange, totalWidth),
    [displayItem, dateRange, totalWidth]
  );

  // Calculate days per pixel for drag operations
  const daysPerPixel = React.useMemo(() => {
    const totalDays = Math.ceil(
      (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
    );
    return totalDays / totalWidth;
  }, [dateRange, totalWidth]);

  // Handle drag start
  const handleDragStart = (dragItem: GanttItem, edge: "left" | "right" | "middle") => {
    setDragState({
      edge,
      originalStart: new Date(dragItem.startDate),
      originalEnd: new Date(dragItem.endDate),
    });
  };

  // Handle drag movement
  const handleDrag = (deltaX: number) => {
    if (!dragState) return;

    const daysDelta = Math.round(deltaX * daysPerPixel);
    let newStart = new Date(dragState.originalStart);
    let newEnd = new Date(dragState.originalEnd);

    if (dragState.edge === "left") {
      // Resize from left: change start date
      newStart.setDate(newStart.getDate() + daysDelta);
      // Don't let start go past end
      if (newStart > newEnd) newStart = new Date(newEnd);
    } else if (dragState.edge === "right") {
      // Resize from right: change end date
      newEnd.setDate(newEnd.getDate() + daysDelta);
      // Don't let end go before start
      if (newEnd < newStart) newEnd = new Date(newStart);
    } else {
      // Move: shift both dates
      newStart.setDate(newStart.getDate() + daysDelta);
      newEnd.setDate(newEnd.getDate() + daysDelta);
    }

    setTempDates({ start: newStart, end: newEnd });
  };

  // Handle drag end
  const handleDragEnd = () => {
    if (tempDates && onItemDatesChange) {
      onItemDatesChange(item, tempDates.start, tempDates.end);
    }
    setDragState(null);
    setTempDates(null);
  };

  return (
    <div
      className={cn(
        "relative border-b border-base-100 flex shrink-0",
        isSelected && "bg-primary/5",
        className
      )}
      style={{ height: rowHeight }}
    >
      {/* Grid columns (background) */}
      {columns.map((col, idx) => (
        <div
          key={idx}
          className={cn(
            "border-r border-base-100 last:border-r-0 shrink-0",
            col.isToday && "bg-primary/5",
            col.isWeekend && "bg-base-50"
          )}
          style={{ width: columnWidth, height: "100%" }}
        />
      ))}

      {/* Gantt bar */}
      <GanttBar
        item={displayItem}
        left={left}
        width={width}
        onClick={onItemClick}
        onEdit={onItemEdit}
        onDuplicate={onItemDuplicate}
        onDelete={onItemDelete}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
      />
    </div>
  );
}

export default GanttRow;
