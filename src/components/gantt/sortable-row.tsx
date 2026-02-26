"use client";

import * as React from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  type GanttItem,
  type Priority,
  type WeekendSettings,
  PRIORITY_COLORS,
  calculateWorkDays,
} from "./types";
import {
  DiamondIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ColumnWidths {
  rowNum: number;
  name: number;
  start: number;
  end: number;
  days: number;
}

const INDENT_PER_LEVEL = 20;

export interface SortableRowProps {
  item: GanttItem;
  index: number;
  originalIndex: number;
  rowHeight: number;
  columnWidths: ColumnWidths;
  childrenMap: Map<string, number>;
  collapsedIds: Set<string>;
  selectedIds: Set<string>;
  weekendSettings: WeekendSettings;
  onItemClick?: (item: GanttItem, event: React.MouseEvent) => void;
  onItemDoubleClick?: (item: GanttItem) => void;
  onToggleCollapse?: (itemId: string) => void;
}

export function SortableRow({
  item,
  index,
  originalIndex,
  rowHeight,
  columnWidths,
  childrenMap,
  collapsedIds,
  selectedIds,
  weekendSettings,
  onItemClick,
  onItemDoubleClick,
  onToggleCollapse,
}: SortableRowProps) {
  const sortable = useSortable({
    id: item.id,
    disabled: !item.isEditable || item.type !== "task",
  });

  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.6 : 1,
    zIndex: sortable.isDragging ? 5 : "auto",
  };

  const hasChildren = (childrenMap.get(item.id) || 0) > 0;
  const isCollapsed = collapsedIds.has(item.id);
  const isSelected = selectedIds.has(item.id);
  const hierarchyLevel = item.hierarchyLevel || 0;
  const isChild = hierarchyLevel > 0;

  // Calculate duration based on weekend settings
  const duration = calculateWorkDays(item.startDate, item.endDate, weekendSettings);

  // Priority color for left border accent
  const priorityColor = item.priority ? PRIORITY_COLORS[item.priority as Priority] : undefined;
  const showPriorityBorder = priorityColor && item.priority !== 2;

  return (
    <div
      key={item.id}
      ref={sortable.setNodeRef}
      style={{
        ...style,
        height: rowHeight,
        borderLeftColor: !isSelected && showPriorityBorder ? priorityColor : undefined,
        borderLeftWidth: !isSelected && showPriorityBorder ? 3 : undefined,
      }}
      className={cn(
        "flex items-center border-b border-base-200 relative px-2",
        "transition-colors",
        // Selection
        isSelected && "bg-primary/10 border-l-[3px] border-l-primary",
        // Hover
        !isSelected && "hover:bg-base-50/80",
        // Child depth background
        !isSelected && isChild && "bg-base-50/70",
        !isSelected && hierarchyLevel > 1 && "bg-base-100/50",
      )}
    >
      {/* Row number — also serves as drag handle for reorderable items */}
      <span
        className={cn(
          "shrink-0 text-center text-xs tabular-nums border-r border-base-200 flex items-center justify-center",
          item.isEditable && item.type === "task" ? "cursor-grab active:cursor-grabbing text-muted-foreground/70" : "text-muted-foreground"
        )}
        style={{ width: columnWidths.rowNum }}
        ref={item.isEditable && item.type === "task" ? sortable.setActivatorNodeRef : undefined}
        {...(item.isEditable && item.type === "task" ? { ...sortable.attributes, ...sortable.listeners } : {})}
      >
        {originalIndex}
      </span>

      {/* Name section — clean indentation + optional chevron + name */}
      <div
        className="shrink-0 flex items-center min-w-0 border-r border-base-200"
        style={{ width: columnWidths.name }}
      >
        {/* Indentation spacer */}
        {hierarchyLevel > 0 && (
          <div className="shrink-0" style={{ width: hierarchyLevel * INDENT_PER_LEVEL }} />
        )}

        {/* Collapse/expand chevron for parents, small spacer for leaves */}
        {hasChildren ? (
          <button
            className={cn(
              "w-5 h-5 flex items-center justify-center rounded transition-colors shrink-0",
              "text-muted-foreground hover:text-foreground hover:bg-base-200"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse?.(item.id);
            }}
            aria-label={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? (
              <ChevronRightIcon className="h-3.5 w-3.5" />
            ) : (
              <ChevronDownIcon className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <div className="w-1 shrink-0" />
        )}

        {/* Milestone icon */}
        {item.type === "milestone" && (
          <DiamondIcon className="h-3.5 w-3.5 shrink-0 ml-0.5" style={{ color: item.color }} />
        )}

        {/* Name text */}
        <button
          className={cn(
            "truncate flex-1 text-left cursor-pointer min-w-0 pl-1.5",
            // Parent: bold, full color
            hasChildren && "text-[13px] font-semibold text-foreground",
            // Child: normal weight, muted
            !hasChildren && "text-[13px] text-muted-foreground",
            // Selected override
            isSelected && "font-semibold text-foreground"
          )}
          onClick={(e) => onItemClick?.(item, e)}
          onDoubleClick={() => onItemDoubleClick?.(item)}
          title={item.isEditable ? "Double-click to edit" : item.name}
        >
          {item.name}
        </button>
      </div>

      {/* Start date */}
      <span
        className="shrink-0 text-center text-xs text-muted-foreground tabular-nums border-r border-base-200"
        style={{ width: columnWidths.start }}
      >
        {format(item.startDate, "MMM d")}
      </span>

      {/* End date */}
      <span
        className="shrink-0 text-center text-xs text-muted-foreground tabular-nums border-r border-base-200"
        style={{ width: columnWidths.end }}
      >
        {format(item.endDate, "MMM d")}
      </span>

      {/* Duration */}
      <span
        className="shrink-0 text-center text-xs text-muted-foreground tabular-nums"
        style={{ width: columnWidths.days }}
      >
        {duration}
      </span>
    </div>
  );
}
