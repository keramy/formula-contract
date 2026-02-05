"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { type GanttItem } from "./types";
import {
  FactoryIcon,
  ShoppingCartIcon,
  DiamondIcon,
  FolderIcon,
  GripVerticalIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ListIcon,
} from "lucide-react";

// ============================================================================
// GANTT SIDEBAR - Left panel showing item names with hierarchy and drag support
// ============================================================================

export interface GanttSidebarProps {
  items: GanttItem[];
  rowHeight: number;
  headerHeight: number;
  width?: number;
  selectedIds?: Set<string>;
  collapsedIds?: Set<string>;
  onItemClick?: (item: GanttItem, event: React.MouseEvent) => void;
  onToggleCollapse?: (itemId: string) => void;
  onReorder?: (itemIds: string[]) => void;
  className?: string;
}

export function GanttSidebar({
  items,
  rowHeight,
  headerHeight,
  width = 250,
  selectedIds = new Set(),
  collapsedIds = new Set(),
  onItemClick,
  onToggleCollapse,
  onReorder,
  className,
}: GanttSidebarProps) {
  // Drag state
  const [draggedId, setDraggedId] = React.useState<string | null>(null);
  const [dragOverId, setDragOverId] = React.useState<string | null>(null);
  const [dropPosition, setDropPosition] = React.useState<"before" | "after" | null>(null);

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

    // Build set of all collapsed parent IDs and their descendants
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

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, item: GanttItem) => {
    if (!item.isEditable) {
      e.preventDefault();
      return;
    }
    setDraggedId(item.id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", item.id);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, item: GanttItem) => {
    e.preventDefault();
    if (!draggedId || draggedId === item.id) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const position = y < rect.height / 2 ? "before" : "after";

    setDragOverId(item.id);
    setDropPosition(position);
  };

  // Handle drag leave
  const handleDragLeave = () => {
    setDragOverId(null);
    setDropPosition(null);
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent, targetItem: GanttItem) => {
    e.preventDefault();

    if (!draggedId || !onReorder || draggedId === targetItem.id) {
      resetDragState();
      return;
    }

    // Calculate new order
    const currentOrder = visibleItems.map((i) => i.id);
    const draggedIndex = currentOrder.indexOf(draggedId);
    let targetIndex = currentOrder.indexOf(targetItem.id);

    if (draggedIndex === -1 || targetIndex === -1) {
      resetDragState();
      return;
    }

    // Remove dragged item from current position
    currentOrder.splice(draggedIndex, 1);

    // Adjust target index after removal
    if (draggedIndex < targetIndex) {
      targetIndex--;
    }

    // Insert at new position
    const insertIndex = dropPosition === "after" ? targetIndex + 1 : targetIndex;
    currentOrder.splice(insertIndex, 0, draggedId);

    onReorder(currentOrder);
    resetDragState();
  };

  // Handle drag end
  const handleDragEnd = () => {
    resetDragState();
  };

  const resetDragState = () => {
    setDraggedId(null);
    setDragOverId(null);
    setDropPosition(null);
  };

  // Get icon for item type
  const getItemIcon = (item: GanttItem) => {
    switch (item.type) {
      case "milestone":
        return <DiamondIcon className="h-4 w-4" style={{ color: item.color }} />;
      case "scope_item":
        if (item.path === "production") {
          return <FactoryIcon className="h-4 w-4 text-primary" />;
        }
        return <ShoppingCartIcon className="h-4 w-4 text-secondary" />;
      case "phase":
        return <FolderIcon className="h-4 w-4 text-muted-foreground" />;
      case "task":
        return <ListIcon className="h-4 w-4" style={{ color: item.color || "currentColor" }} />;
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        "border-r border-base-200 bg-white shrink-0 flex flex-col",
        className
      )}
      style={{ width }}
    >
      {/* Header */}
      <div
        className="border-b border-base-200 bg-base-50 px-3 flex items-end pb-2"
        style={{ height: headerHeight }}
      >
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Items
        </span>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-auto">
        {visibleItems.map((item) => {
          const hasChildren = childrenMap.has(item.id);
          const isCollapsed = collapsedIds.has(item.id);
          const isSelected = selectedIds.has(item.id);
          const isDragging = draggedId === item.id;
          const isDragOver = dragOverId === item.id;

          return (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-1 border-b border-base-100 relative",
                "transition-colors",
                isSelected && "bg-primary/10",
                !isSelected && "hover:bg-base-50",
                isDragging && "opacity-50",
                isDragOver && dropPosition === "before" && "border-t-2 border-t-primary",
                isDragOver && dropPosition === "after" && "border-b-2 border-b-primary"
              )}
              style={{ height: rowHeight }}
              draggable={item.isEditable}
              onDragStart={(e) => handleDragStart(e, item)}
              onDragOver={(e) => handleDragOver(e, item)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, item)}
              onDragEnd={handleDragEnd}
            >
              {/* Drag handle - only for editable items */}
              {item.isEditable ? (
                <div className="shrink-0 pl-1 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground">
                  <GripVerticalIcon className="h-4 w-4" />
                </div>
              ) : (
                <div className="shrink-0 w-5" /> // Spacer for non-editable items
              )}

              {/* Hierarchy indentation + collapse toggle */}
              <div
                className="shrink-0 flex items-center"
                style={{ width: Math.max(0, (item.hierarchyLevel || 0) * 16) + 20 }}
              >
                {/* Indentation spacer */}
                <div style={{ width: (item.hierarchyLevel || 0) * 16 }} />

                {/* Collapse/expand toggle */}
                {hasChildren ? (
                  <button
                    className="p-0.5 hover:bg-base-200 rounded text-muted-foreground"
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
                  <div className="w-4" /> // Spacer for items without children
                )}
              </div>

              {/* Icon based on type */}
              <div className="shrink-0">{getItemIcon(item)}</div>

              {/* Name */}
              <button
                className={cn(
                  "text-sm truncate flex-1 text-left cursor-pointer px-1",
                  isSelected && "font-medium"
                )}
                onClick={(e) => onItemClick?.(item, e)}
              >
                {item.name}
              </button>

              {/* Progress (for items with progress > 0) */}
              {item.progress > 0 && (
                <span className="text-xs text-muted-foreground shrink-0 pr-2">
                  {item.progress}%
                </span>
              )}
            </div>
          );
        })}

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

export default GanttSidebar;
