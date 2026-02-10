"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { type GanttItem } from "./types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DiamondIcon,
  PencilIcon,
  CopyIcon,
  TrashIcon,
} from "lucide-react";

// ============================================================================
// GANTT BAR - Visual representation of an item on the timeline
// ============================================================================

export interface GanttBarProps {
  item: GanttItem;
  left: number;
  width: number;
  onClick?: (item: GanttItem) => void;
  onDoubleClick?: (item: GanttItem) => void;
  onEdit?: (item: GanttItem) => void;
  onDuplicate?: (item: GanttItem) => void;
  onDelete?: (item: GanttItem) => void;
  onDragStart?: (item: GanttItem, edge: "left" | "right" | "middle") => void;
  onDrag?: (deltaX: number) => void;
  onDragEnd?: () => void;
  className?: string;
}

export function GanttBar({
  item,
  left,
  width,
  onClick,
  onDoubleClick,
  onEdit,
  onDuplicate,
  onDelete,
  onDragStart,
  onDrag,
  onDragEnd,
  className,
}: GanttBarProps) {
  const isMilestone = item.type === "milestone";
  const isPhase = item.type === "phase";
  const isTask = item.type === "task";
  const isEditable = item.isEditable && (isPhase || isTask);
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartX = React.useRef(0);

  // Format date range for tooltip
  const dateRange = React.useMemo(() => {
    const formatDate = (date: Date) =>
      date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

    if (isMilestone) {
      return formatDate(item.startDate);
    }
    return `${formatDate(item.startDate)} - ${formatDate(item.endDate)}`;
  }, [item.startDate, item.endDate, isMilestone]);

  // Handle drag start
  const handleMouseDown = (
    e: React.MouseEvent,
    edge: "left" | "right" | "middle"
  ) => {
    if (!isEditable) return;
    if (e.detail > 1) return; // allow double-click to edit without starting drag
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartX.current = e.clientX;
    onDragStart?.(item, edge);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - dragStartX.current;
      onDrag?.(deltaX);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onDragEnd?.();
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Milestone rendering (diamond shape)
  if (isMilestone) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "absolute top-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-110",
                className
              )}
              style={{ left: left + width / 2 - 12 }}
              onClick={() => onClick?.(item)}
              onDoubleClick={() => onDoubleClick?.(item)}
            >
              <DiamondIcon
                className="h-6 w-6"
                style={{ color: item.color, fill: item.color }}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[200px]">
            <div className="space-y-1">
              <p className="font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">{dateRange}</p>
              {item.status && (
                <p className="text-xs">
                  Status: <span className="font-medium">{item.status}</span>
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Bar content
  const barContent = (
    <div
      className={cn(
        "absolute top-1/2 -translate-y-1/2 rounded-md cursor-pointer",
        "transition-colors",
        isDragging && "opacity-70 shadow-lg ring-2 ring-primary",
        // Phase styling: taller, more muted
        isPhase && "h-7",
        // Task styling: standard height
        isTask && "h-6",
        // Default (scope_item): standard height
        !isPhase && !isTask && "h-6",
        className
      )}
      style={{
        left,
        width,
        backgroundColor: `${item.color}${isPhase ? "18" : "26"}`, // Phases more transparent
        border: `1px solid ${item.color}`,
        borderStyle: isPhase ? "dashed" : "solid", // Dashed border for phases
      }}
      onClick={() => onClick?.(item)}
      onDoubleClick={() => onDoubleClick?.(item)}
    >
      {/* Progress fill */}
      {item.progress > 0 && (
        <div
          className="absolute inset-0 rounded-sm"
          style={{
            width: `${item.progress}%`,
            backgroundColor: item.color,
            opacity: isPhase ? 0.4 : 0.6,
          }}
        />
      )}

      {/* Label - positioned to avoid overlap */}
      {width > 60 && (
        <div className="absolute inset-0 px-2 flex items-center overflow-hidden pointer-events-none z-[5]">
          <span
            className="text-[11px] font-medium truncate"
            style={{ color: item.color, textShadow: "0 0 2px white, 0 0 2px white" }}
          >
            {item.name}
          </span>
          {/* Progress percentage inline */}
          {item.progress > 0 && width > 100 && (
            <span className="ml-auto text-[10px] font-medium opacity-70 shrink-0">
              {item.progress}%
            </span>
          )}
        </div>
      )}

      {/* Drag handles for editable items - on top of everything */}
      {isEditable && (
        <>
          {/* Left resize handle */}
          <div
            className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-primary/40 rounded-l-md z-30"
            onMouseDown={(e) => handleMouseDown(e, "left")}
          />
          {/* Right resize handle */}
          <div
            className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-primary/40 rounded-r-md z-30"
            onMouseDown={(e) => handleMouseDown(e, "right")}
          />
          {/* Move handle (center) - lower z-index so resize handles take precedence */}
          <div
            className="absolute left-3 right-3 top-0 bottom-0 cursor-move z-20"
            onMouseDown={(e) => handleMouseDown(e, "middle")}
          />
        </>
      )}
    </div>
  );

  // Wrap with context menu for editable items
  if (isEditable) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>{barContent}</TooltipTrigger>
              <TooltipContent side="top" className="max-w-[250px]">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2 rounded"
                      style={{ backgroundColor: item.color }}
                    />
                    <p className="font-medium">{item.name}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{dateRange}</span>
                    <span className="text-muted-foreground/50">•</span>
                    <span className="capitalize">{item.type}</span>
                  </div>
                  {item.progress > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-base-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${item.progress}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium">{item.progress}%</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground italic">
                    Right-click for options • Drag edges to resize
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={() => onEdit?.(item)}>
            <PencilIcon className="size-4 mr-2" />
            Edit
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onDuplicate?.(item)}>
            <CopyIcon className="size-4 mr-2" />
            Duplicate
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => onDelete?.(item)}
            className="text-destructive focus:text-destructive"
          >
            <TrashIcon className="size-4 mr-2" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  // Non-editable items just get tooltip
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{barContent}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[250px]">
          <div className="space-y-1.5">
            <p className="font-medium">{item.name}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{dateRange}</span>
            </div>
            {item.progress > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-base-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${item.progress}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
                <span className="text-xs font-medium">{item.progress}%</span>
              </div>
            )}
            {item.status && (
              <p className="text-xs">
                Status: <span className="font-medium">{item.status}</span>
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default GanttBar;
