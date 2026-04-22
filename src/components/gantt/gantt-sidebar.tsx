"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  type GanttRow,
  type GanttItem,
  type Priority,
  type PhaseKey,
  resolveItemColor,
  formatDuration,
  SIDEBAR_WIDTH,
  ROW_HEIGHT,
  CATEGORY_HEIGHT,
  HEADER_HEIGHT,
  totalRowsHeight,
} from "./gantt-types";
import { GanttContextMenu } from "./gantt-context-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { ChevronRightIcon, PlusIcon, FlagIcon } from "lucide-react";

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
  width: number;
  onWidthChange: (width: number) => void;
  linkMode?: boolean;
  linkSourceId?: string | null;
  // Context menu callbacks
  onEditItem?: (item: GanttItem) => void;
  onDeleteItem?: (item: GanttItem) => void;
  onAddSubtask?: (parentId: string) => void;
  onConvertToMilestone?: (item: GanttItem) => void;
  onSetPriority?: (item: GanttItem, priority: Priority) => void;
  onSetPhase?: (item: GanttItem, phase: PhaseKey) => void;
  onSetColor?: (item: GanttItem, color: string | null) => void;
  // Empty-area context menu actions
  onAddItem?: () => void;
  onAddMilestone?: () => void;
  /** Used by formatDuration to render working-day count when enabled */
  skipWeekends?: boolean;
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
  onSetPhase,
  onSetColor,
  onAddItem,
  onAddMilestone,
  skipWeekends,
  width,
  onWidthChange,
  linkMode,
  linkSourceId,
  className,
}: GanttSidebarProps) {
  const contentHeight = totalRowsHeight(rows);

  // Resize handle drag logic
  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = width;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX;
        const newWidth = Math.max(200, Math.min(600, startWidth + delta));
        onWidthChange(newWidth);
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [width, onWidthChange]
  );

  return (
    <div
      className={cn("relative shrink-0 border-r bg-background overflow-hidden", className)}
      style={{ width }}
    >
      {/* Column headers — height MUST match timeline header exactly */}
      <div
        className="flex items-center border-b text-[11px] font-semibold text-muted-foreground bg-muted/30 box-border"
        style={{ height: HEADER_HEIGHT }}
      >
        <span className="flex-1 px-4 truncate">Task Name</span>
        {width >= 300 && (
          <span className="w-[68px] px-2 text-center shrink-0 border-l border-border/40">Start</span>
        )}
        {width >= 300 && (
          <span className="w-[68px] px-2 text-center shrink-0 border-l border-border/40">End</span>
        )}
        <span className="w-[52px] px-2 text-center shrink-0 border-l border-border/40">Days</span>
      </div>

      {/* Scrollable row area — offset by scrollTop to sync with timeline.
          The outer ContextMenu fires when right-clicking empty space (below
          the last row). Row-level menus are nested inside each row and take
          precedence when their trigger captures the event. */}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="overflow-hidden flex-1" style={{ position: "relative", minHeight: "100%" }}>
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
                  onSetPhase={onSetPhase}
                  onSetColor={onSetColor}
                >
                  <SidebarRow
                    row={row}
                    isSelected={selectedIds.has(row.id)}
                    onToggleCollapse={onToggleCollapse}
                    onSelect={onSelectItem}
                    onDoubleClick={onDoubleClickItem}
                    linkMode={linkMode}
                    isLinkSource={linkMode && linkSourceId === row.id}
                    sidebarWidth={width}
                    skipWeekends={!!skipWeekends}
                  />
                </GanttContextMenu>
              ))}
            </div>
          </div>
        </ContextMenuTrigger>
        {(onAddItem || onAddMilestone) && (
          <ContextMenuContent className="w-44">
            {onAddItem && (
              <ContextMenuItem onClick={onAddItem}>
                <PlusIcon className="size-3.5 mr-2" />
                Add Task
              </ContextMenuItem>
            )}
            {onAddMilestone && (
              <ContextMenuItem onClick={onAddMilestone}>
                <FlagIcon className="size-3.5 mr-2" />
                Add Milestone
              </ContextMenuItem>
            )}
          </ContextMenuContent>
        )}
      </ContextMenu>

      {/* Resize handle — drag to change sidebar width */}
      <div
        className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize z-30 hover:bg-primary/20 active:bg-primary/30 transition-colors"
        onMouseDown={handleMouseDown}
      />
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
  linkMode,
  isLinkSource,
  sidebarWidth,
  skipWeekends,
}: {
  row: GanttRow;
  isSelected: boolean;
  onToggleCollapse: (id: string) => void;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onDoubleClick: (item: GanttItem) => void;
  linkMode?: boolean;
  isLinkSource?: boolean;
  sidebarWidth: number;
  skipWeekends: boolean;
}) {
  const { item, depth, hasChildren, isCollapsed, phaseColor, type } = row;
  const isPhase = type === "phase";
  const isMilestone = type === "milestone";
  const indent = depth * 20;
  // User-set item.color takes priority; falls back to inherited phase color.
  const dotColor = item.color || phaseColor;

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
        "flex items-center gap-1.5 pl-4 border-b border-border/50 cursor-pointer select-none group relative",
        isSelected ? "bg-primary/10" : row.rowIndex % 2 === 0 ? "bg-background" : "bg-muted/20",
        isPhase ? "font-semibold" : "text-[11px]",
        linkMode && !isPhase && "cursor-crosshair hover:bg-blue-50 dark:hover:bg-blue-950/30",
        isLinkSource && "bg-blue-100 dark:bg-blue-900/40 ring-1 ring-inset ring-blue-500",
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
            backgroundColor: dotColor,
            opacity: depth === 0 ? 1 : depth === 1 ? 0.45 : 0.3,
          }}
        />
      ) : depth >= 2 && !isPhase ? (
        // Grandchild+ : dashed border ring, no fill
        <span
          className="shrink-0 rounded-full size-2.5 border border-dashed bg-transparent"
          style={{ borderColor: dotColor, opacity: depth > 2 ? 0.5 : 0.7 }}
        />
      ) : (
        <span
          className="shrink-0 rounded-full size-2.5"
          style={{
            backgroundColor: dotColor,
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

      {/* Start date */}
      {sidebarWidth >= 300 && (
        <span className="w-[68px] px-2 text-center text-[10px] tabular-nums shrink-0 text-muted-foreground border-l border-border/30">
          {item.type !== "phase" && item.startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      )}

      {/* End date */}
      {sidebarWidth >= 300 && (
        <span className="w-[68px] px-2 text-center text-[10px] tabular-nums shrink-0 text-muted-foreground border-l border-border/30">
          {item.type !== "phase" && item.endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      )}

      {/* Duration */}
      <span
        className={cn(
          "w-[52px] px-2 text-center text-[11px] tabular-nums shrink-0 border-l border-border/30",
          isPhase ? "font-semibold text-green-600" : "text-muted-foreground"
        )}
      >
        {formatDuration(item, skipWeekends)}
      </span>
    </div>
  );
}
