"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  type GanttItem,
  type WeekendSettings,
  DEFAULT_WEEKEND_SETTINGS,
} from "./types";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { GanttViewMode } from "./types";
import { SortableRow } from "./sortable-row";

// ============================================================================
// GANTT SIDEBAR - Left panel showing item names with hierarchy and drag support
// ============================================================================

// Default column widths
const DEFAULT_COLUMN_WIDTHS = {
  rowNum: 28,
  name: 200,
  start: 64,
  end: 64,
  days: 56,
};

// Per-column width constraints
const COLUMN_CONSTRAINTS = {
  rowNum: { min: 24, max: 60 },
  name: { min: 140, max: 460 },
  start: { min: 56, max: 140 },
  end: { min: 56, max: 140 },
  days: { min: 40, max: 100 },
};

// Resize handle component (module-scoped to avoid re-creation)
function ResizeHandle({
  column,
  resizingColumn,
  onResizeStart,
}: {
  column: string;
  resizingColumn: string | null;
  onResizeStart: (e: React.MouseEvent, column: string) => void;
}) {
  return (
    <div
      className={cn(
        "absolute -right-[3px] top-0 bottom-0 w-[7px] cursor-col-resize z-10 group/resize",
        "flex items-center justify-center"
      )}
      onMouseDown={(e) => onResizeStart(e, column)}
    >
      <div
        className={cn(
          "w-[3px] h-full transition-colors",
          resizingColumn === column
            ? "bg-primary"
            : "bg-transparent group-hover/resize:bg-primary/50"
        )}
      />
    </div>
  );
}

export interface GanttSidebarProps {
  items: GanttItem[];
  rowHeight: number;
  headerHeight: number;
  viewMode?: GanttViewMode;
  selectedIds?: Set<string>;
  collapsedIds?: Set<string>;
  weekendSettings?: WeekendSettings;
  onItemClick?: (item: GanttItem, event: React.MouseEvent) => void;
  onItemDoubleClick?: (item: GanttItem) => void;
  onToggleCollapse?: (itemId: string) => void;
  onReorderItems?: (itemIds: string[]) => void;
  className?: string;
}

export function GanttSidebar({
  items,
  rowHeight,
  headerHeight,
  viewMode = "week",
  selectedIds = new Set(),
  collapsedIds = new Set(),
  weekendSettings = DEFAULT_WEEKEND_SETTINGS,
  onItemClick,
  onItemDoubleClick,
  onToggleCollapse,
  onReorderItems,
  className,
}: GanttSidebarProps) {
  // DnD sensors
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // Column resize state
  const [columnWidths, setColumnWidths] = React.useState({
    rowNum: DEFAULT_COLUMN_WIDTHS.rowNum,
    name: DEFAULT_COLUMN_WIDTHS.name,
    start: DEFAULT_COLUMN_WIDTHS.start,
    end: DEFAULT_COLUMN_WIDTHS.end,
    days: DEFAULT_COLUMN_WIDTHS.days,
  });

  // Auto-calculate sidebar width from column widths
  const sidebarWidth = columnWidths.rowNum + columnWidths.name + columnWidths.start + columnWidths.end + columnWidths.days;

  const [resizingColumn, setResizingColumn] = React.useState<string | null>(null);
  const resizeStartX = React.useRef<number>(0);
  const resizeStartWidth = React.useRef<number>(0);

  // Ref for safe closure access during resize
  const columnWidthsRef = React.useRef(columnWidths);
  React.useEffect(() => {
    columnWidthsRef.current = columnWidths;
  }, [columnWidths]);

  // Column resize handlers
  const handleColumnResizeStart = React.useCallback((e: React.MouseEvent, column: string) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(column);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = columnWidthsRef.current[column as keyof typeof columnWidthsRef.current];
  }, []);

  React.useEffect(() => {
    if (!resizingColumn) return;

    const handleMouseMove = (e: MouseEvent) => {
      const constraints = COLUMN_CONSTRAINTS[resizingColumn as keyof typeof COLUMN_CONSTRAINTS];
      const deltaX = e.clientX - resizeStartX.current;
      const newWidth = Math.min(
        constraints.max,
        Math.max(constraints.min, resizeStartWidth.current + deltaX)
      );
      setColumnWidths(prev => ({
        ...prev,
        [resizingColumn]: newWidth,
      }));
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizingColumn]);

  // Build a map of item ID to children count for collapse indicator
  const childrenMap = React.useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((item) => {
      if (item.parentId) {
        map.set(item.parentId, (map.get(item.parentId) || 0) + 1);
      }
    });
    return map;
  }, [items]);

  // Filter visible items (hide children of collapsed parents)
  const visibleItems = React.useMemo(() => {
    if (collapsedIds.size === 0) return items;

    const hiddenParentIds = new Set<string>();

    const collectHiddenIds = (parentId: string) => {
      items.forEach((item) => {
        if (item.parentId === parentId) {
          hiddenParentIds.add(item.id);
          collectHiddenIds(item.id);
        }
      });
    };

    collapsedIds.forEach((id) => collectHiddenIds(id));

    return items.filter((item) => !hiddenParentIds.has(item.id));
  }, [items, collapsedIds]);

  // Stable row number map: item ID → original 1-based index in full list
  const originalIndexMap = React.useMemo(() => {
    return new Map(items.map((item, i) => [item.id, i + 1]));
  }, [items]);

  // Reorder within the same parent (tasks only)
  const reorderSubtree = React.useCallback((activeId: string, overId: string) => {
    if (activeId === overId) return;

    const activeParent = items.find((i) => i.id === activeId)?.parentId || null;
    const overItem = items.find((i) => i.id === overId);
    const overParent = overItem?.parentId || null;
    if (activeParent !== overParent && overId !== activeParent) return;

    const siblings = items.filter(
      (i) => i.isEditable && i.type === "task" && i.parentId === activeParent
    );
    const siblingIds = siblings.map((i) => i.id);
    if (!siblingIds.includes(activeId) || !siblingIds.includes(overId)) return;

    const nextOrder = siblingIds.filter((id) => id !== activeId);
    const insertIndex = overId === activeParent ? 0 : Math.max(0, nextOrder.indexOf(overId));
    nextOrder.splice(insertIndex, 0, activeId);

    onReorderItems?.(nextOrder);
  }, [items, onReorderItems]);

  return (
    <div
      className={cn(
        "border-r border-base-200 bg-white shrink-0 flex flex-col overflow-hidden",
        resizingColumn && "select-none",
        className
      )}
      style={{ width: sidebarWidth }}
    >
      {/* Header with column titles */}
      <div
        className="border-b border-base-300 bg-base-50 shrink-0"
        style={{ height: headerHeight }}
      >
        <div
          className="flex items-center px-2 text-[11px] font-semibold text-foreground/70 uppercase tracking-wider h-full"
        >
          <div
            className="shrink-0 text-center relative border-r border-base-300"
            style={{ width: columnWidths.rowNum }}
          >
            #
            <ResizeHandle column="rowNum" resizingColumn={resizingColumn} onResizeStart={handleColumnResizeStart} />
          </div>

          <div
            className="shrink-0 pl-1 min-w-0 relative border-r border-base-300"
            style={{ width: columnWidths.name }}
          >
            Name
            <ResizeHandle column="name" resizingColumn={resizingColumn} onResizeStart={handleColumnResizeStart} />
          </div>

          <div
            className="shrink-0 text-center relative border-r border-base-300"
            style={{ width: columnWidths.start }}
          >
            Begin
            <ResizeHandle column="start" resizingColumn={resizingColumn} onResizeStart={handleColumnResizeStart} />
          </div>

          <div
            className="shrink-0 text-center relative border-r border-base-300"
            style={{ width: columnWidths.end }}
          >
            End
            <ResizeHandle column="end" resizingColumn={resizingColumn} onResizeStart={handleColumnResizeStart} />
          </div>

          <div
            className="shrink-0 text-center relative"
            style={{ width: columnWidths.days }}
          >
            Days
            <ResizeHandle column="days" resizingColumn={resizingColumn} onResizeStart={handleColumnResizeStart} />
          </div>
        </div>
      </div>

      {/* Items list — vertical scroll only */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={({ active, over }) => {
            if (!active?.id || !over?.id) return;
            reorderSubtree(String(active.id), String(over.id));
          }}
        >
          <SortableContext items={visibleItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
            {visibleItems.map((item, index) => (
              <SortableRow
                key={item.id}
                item={item}
                index={index}
                originalIndex={originalIndexMap.get(item.id) ?? index + 1}
                rowHeight={rowHeight}
                columnWidths={columnWidths}
                childrenMap={childrenMap}
                collapsedIds={collapsedIds}
                selectedIds={selectedIds}
                weekendSettings={weekendSettings}
                onItemClick={onItemClick}
                onItemDoubleClick={onItemDoubleClick}
                onToggleCollapse={onToggleCollapse}
              />
            ))}
          </SortableContext>
        </DndContext>

        {/* Empty state */}
        {visibleItems.length === 0 && (
          <div className="flex items-center justify-center h-20 text-sm text-muted-foreground">
            No timeline items
          </div>
        )}
      </div>
    </div>
  );
}

