"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  type GanttRow,
  type GanttItem,
  type Priority,
  resolveItemColor,
  formatDuration,
  SIDEBAR_WIDTH,
  ROW_HEIGHT,
  CATEGORY_HEIGHT,
  HEADER_HEIGHT,
  totalRowsHeight,
} from "./gantt-types";
import { GanttContextMenu } from "./gantt-context-menu";
import { ChevronRightIcon } from "lucide-react";

// ============================================================================
// GANTT SIDEBAR — Left panel using ganttRows for absolute positioning
// Figma: colored dots, hierarchy, chevrons, Task Name + Duration columns
// ============================================================================

interface GanttSidebarProps {
  rows: GanttRow[];
  selectedIds: Set<string>;
  onToggleCollapse: (id: string) => void;
  onSelectItem: (id: string, e: React.MouseEvent) => void;
  onDoubleClickItem: (item: GanttItem) => void;
  scrollTop: number;
  // Context menu callbacks
  onEditItem?: (item: GanttItem) => void;
  onDeleteItem?: (item: GanttItem) => void;
  onAddSubtask?: (parentId: string) => void;
  onConvertToMilestone?: (item: GanttItem) => void;
  onSetPriority?: (item: GanttItem, priority: Priority) => void;
  onToggleCriticalPath?: (item: GanttItem) => void;
  className?: string;
}

export function GanttSidebar({
  rows,
  selectedIds,
  onToggleCollapse,
  onSelectItem,
  onDoubleClickItem,
  scrollTop,
  onEditItem,
  onDeleteItem,
  onAddSubtask,
  onConvertToMilestone,
  onSetPriority,
  onToggleCriticalPath,
  className,
}: GanttSidebarProps) {
  const contentHeight = totalRowsHeight(rows);

  return (
    <div
      className={cn("relative shrink-0 border-r bg-background overflow-hidden", className)}
      style={{ width: SIDEBAR_WIDTH }}
    >
      {/* Column headers — height MUST match timeline header exactly */}
      <div
        className="flex items-center border-b px-4 text-[11px] font-semibold text-muted-foreground bg-muted/30 box-border"
        style={{ height: HEADER_HEIGHT }}
      >
        <span className="flex-1">Task Name</span>
        <span className="w-16 text-right">Duration</span>
      </div>

      {/* Scrollable row area — offset by scrollTop to sync with timeline */}
      <div className="overflow-hidden" style={{ position: "relative" }}>
        <div
          style={{
            height: contentHeight,
            position: "relative",
            transform: `translateY(-${scrollTop}px)`,
          }}
        >
          {rows.map((row) => (
            <GanttContextMenu
              key={row.id}
              item={row.item}
              onEdit={onEditItem}
              onDelete={onDeleteItem}
              onAddSubtask={onAddSubtask}
              onConvertToMilestone={onConvertToMilestone}
              onSetPriority={onSetPriority}
              onToggleCriticalPath={onToggleCriticalPath}
            >
              <SidebarRow
                row={row}
                isSelected={selectedIds.has(row.id)}
                onToggleCollapse={onToggleCollapse}
                onSelect={onSelectItem}
                onDoubleClick={onDoubleClickItem}
              />
            </GanttContextMenu>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar Row — absolutely positioned via row.y
// ---------------------------------------------------------------------------

function SidebarRow({
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
  const { item, depth, hasChildren, isCollapsed, phaseColor, type } = row;
  const isPhase = type === "phase";
  const isMilestone = type === "milestone";
  const indent = depth * 20;

  const style: React.CSSProperties = {
    position: "absolute",
    top: row.y,
    left: 0,
    right: 0,
    height: row.height,
  };

  return (
    <div
      style={style}
      role="row"
      tabIndex={0}
      className={cn(
        "flex items-center gap-1.5 px-4 border-b border-border/50 cursor-pointer select-none group relative",
        isSelected ? "bg-primary/10" : row.rowIndex % 2 === 0 ? "bg-background" : "bg-muted/20",
        isPhase ? "font-semibold" : "text-[11px]",
      )}
      onClick={(e) => onSelect(row.id, e)}
      onDoubleClick={() => onDoubleClick(item)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onDoubleClick(item);
      }}
    >
      {/* Selected accent bar — 3px left edge */}
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary rounded-r-sm" />
      )}

      {/* Phase: collapse chevron */}
      {isPhase && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse(row.id);
          }}
          className="shrink-0 text-muted-foreground/60 text-[8px] w-4 text-center"
        >
          {isCollapsed ? "▶" : "▼"}
        </button>
      )}

      {/* Task/milestone: fixed-width prefix area (indent + chevron/spacer) */}
      {!isPhase && (
        <>
          {/* Indent spacer */}
          {indent > 0 && <div style={{ width: indent }} className="shrink-0" />}

          {/* Chevron or spacer — SAME fixed width (14px) */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse(row.id);
              }}
              className="shrink-0 w-3.5 flex items-center justify-center rounded hover:bg-muted"
            >
              <ChevronRightIcon
                className={cn(
                  "size-3 transition-transform text-muted-foreground",
                  !isCollapsed && "rotate-90"
                )}
              />
            </button>
          ) : (
            <div className="w-3.5 shrink-0" />
          )}
        </>
      )}

      {/* Color dot / diamond — progressive opacity by depth */}
      {isMilestone ? (
        <div
          className="size-2.5 rotate-45 shrink-0"
          style={{
            backgroundColor: phaseColor,
            opacity: depth === 0 ? 1 : depth === 1 ? 0.45 : 0.3,
          }}
        />
      ) : depth >= 2 && !isPhase ? (
        // Grandchild+ : dashed border ring, no fill
        <span
          className="shrink-0 rounded-full size-2.5 border border-dashed bg-transparent"
          style={{ borderColor: phaseColor, opacity: depth > 2 ? 0.5 : 0.7 }}
        />
      ) : (
        <span
          className="shrink-0 rounded-full size-2.5"
          style={{
            backgroundColor: phaseColor,
            opacity: isPhase ? 1 : depth === 1 ? 0.45 : 1,
          }}
        />
      )}

      {/* Name */}
      <span
        className={cn(
          "flex-1 truncate",
          isPhase ? "text-xs text-foreground" : "text-foreground/80"
        )}
      >
        {item.name}
      </span>

      {/* Duration */}
      <span
        className={cn(
          "w-16 text-right text-[11px] tabular-nums shrink-0",
          isPhase ? "font-semibold text-green-600" : "text-muted-foreground"
        )}
      >
        {formatDuration(item)}
      </span>
    </div>
  );
}
