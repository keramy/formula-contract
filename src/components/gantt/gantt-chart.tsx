"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GlassCard } from "@/components/ui/ui-helpers";
import { GanttHeader } from "./gantt-header";
import { GanttRow } from "./gantt-row";
import { GanttSidebar } from "./gantt-sidebar";
import { GanttDependencies, type BarPosition } from "./gantt-dependencies";
import { DependencyDialog } from "./dependency-dialog";
import {
  type GanttItem,
  type GanttDependency,
  type DependencyType,
  type GanttViewMode,
  type GanttDateRange,
  generateColumns,
  calculateBarPosition,
} from "./types";
import {
  ZoomInIcon,
  ZoomOutIcon,
  CalendarIcon,
  CalendarDaysIcon,
  CalendarRangeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  Maximize2Icon,
  Minimize2Icon,
  XIcon,
  IndentIcon,
  OutdentIcon,
  LinkIcon,
} from "lucide-react";

// ============================================================================
// GANTT CHART - Main timeline visualization component with advanced features
// ============================================================================

export interface GanttChartProps {
  items: GanttItem[];
  dependencies?: GanttDependency[];
  onItemClick?: (item: GanttItem) => void;
  onItemEdit?: (item: GanttItem) => void;
  onItemDuplicate?: (item: GanttItem) => void;
  onItemDelete?: (item: GanttItem) => void;
  onItemDatesChange?: (item: GanttItem, startDate: Date, endDate: Date) => void;
  onAddItem?: () => void;
  onReorderItems?: (itemIds: string[]) => void;
  // Dependency callbacks
  onCreateDependency?: (
    sourceId: string,
    targetId: string,
    type: DependencyType,
    lagDays: number
  ) => Promise<void>;
  onUpdateDependency?: (
    dependencyId: string,
    type: DependencyType,
    lagDays: number
  ) => Promise<void>;
  onDeleteDependency?: (dependencyId: string) => Promise<void>;
  // Hierarchy callbacks
  onIndentItem?: (itemId: string) => Promise<void>;
  onOutdentItem?: (itemId: string) => Promise<void>;
  className?: string;
  initialViewMode?: GanttViewMode;
  showSidebar?: boolean;
  sidebarWidth?: number;
  showAddButton?: boolean;
}

// Base column widths for each view mode
const BASE_COLUMN_WIDTHS: Record<GanttViewMode, number> = {
  day: 40,
  week: 80,
  month: 120,
};

// Zoom levels (multipliers)
const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const DEFAULT_ZOOM_INDEX = 2; // 1x

const ROW_HEIGHT = 44;

export function GanttChart({
  items,
  dependencies = [],
  onItemClick,
  onItemEdit,
  onItemDuplicate,
  onItemDelete,
  onItemDatesChange,
  onAddItem,
  onReorderItems,
  onCreateDependency,
  onUpdateDependency,
  onDeleteDependency,
  onIndentItem,
  onOutdentItem,
  className,
  initialViewMode = "week",
  showSidebar = true,
  sidebarWidth = 250,
  showAddButton = false,
}: GanttChartProps) {
  const [viewMode, setViewMode] = React.useState<GanttViewMode>(initialViewMode);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [zoomIndex, setZoomIndex] = React.useState(DEFAULT_ZOOM_INDEX);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Selection state (for linking items)
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [collapsedIds, setCollapsedIds] = React.useState<Set<string>>(new Set());

  // Dependency dialog state
  const [dependencyDialogOpen, setDependencyDialogOpen] = React.useState(false);
  const [selectedDependency, setSelectedDependency] = React.useState<GanttDependency | null>(null);
  const [linkSourceItem, setLinkSourceItem] = React.useState<GanttItem | null>(null);
  const [linkTargetItem, setLinkTargetItem] = React.useState<GanttItem | null>(null);

  // Zoom functions
  const zoomIn = () => setZoomIndex((prev) => Math.min(prev + 1, ZOOM_LEVELS.length - 1));
  const zoomOut = () => setZoomIndex((prev) => Math.max(prev - 1, 0));
  const canZoomIn = zoomIndex < ZOOM_LEVELS.length - 1;
  const canZoomOut = zoomIndex > 0;
  const zoomLevel = ZOOM_LEVELS[zoomIndex];

  // Build item map for quick lookup
  const itemMap = React.useMemo(() => {
    const map = new Map<string, GanttItem>();
    items.forEach((item) => {
      map.set(item.id, item);
      if (item.timelineId) {
        map.set(item.timelineId, item);
      }
    });
    return map;
  }, [items]);

  // Get editable items from selection
  const selectedItems = React.useMemo(() => {
    return Array.from(selectedIds)
      .map((id) => itemMap.get(id))
      .filter((item): item is GanttItem => !!item && item.isEditable === true);
  }, [selectedIds, itemMap]);

  // Filter visible items (hide children of collapsed parents)
  const visibleItems = React.useMemo(() => {
    if (collapsedIds.size === 0) return items;

    const hiddenIds = new Set<string>();

    const collectHiddenIds = (parentId: string) => {
      items.forEach((item) => {
        if (item.parentId === parentId) {
          hiddenIds.add(item.id);
          collectHiddenIds(item.id);
        }
      });
    };

    collapsedIds.forEach((id) => collectHiddenIds(id));

    return items.filter((item) => !hiddenIds.has(item.id));
  }, [items, collapsedIds]);

  // Handle escape key to exit fullscreen or clear selection
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else if (selectedIds.size > 0) {
          setSelectedIds(new Set());
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    if (isFullscreen) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isFullscreen, selectedIds.size]);

  // Calculate date range from items
  const dateRange = React.useMemo<GanttDateRange>(() => {
    const today = new Date();

    if (items.length === 0) {
      const start = new Date(today);
      start.setDate(start.getDate() - 14);
      const end = new Date(today);
      end.setMonth(end.getMonth() + 3);
      return { start, end };
    }

    let minDate = new Date(items[0].startDate);
    let maxDate = new Date(items[0].endDate);

    items.forEach((item) => {
      if (item.startDate < minDate) minDate = new Date(item.startDate);
      if (item.endDate > maxDate) maxDate = new Date(item.endDate);
    });

    const startPadding = viewMode === "day" ? 14 : viewMode === "week" ? 21 : 30;
    const endPadding = viewMode === "day" ? 30 : viewMode === "week" ? 60 : 90;

    minDate.setDate(minDate.getDate() - startPadding);

    const threeMonthsFromNow = new Date(today);
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

    maxDate.setDate(maxDate.getDate() + endPadding);
    if (threeMonthsFromNow > maxDate) {
      maxDate = threeMonthsFromNow;
    }

    return { start: minDate, end: maxDate };
  }, [items, viewMode]);

  // Generate columns
  const columns = React.useMemo(
    () => generateColumns(dateRange, viewMode),
    [dateRange, viewMode]
  );

  const columnWidth = Math.round(BASE_COLUMN_WIDTHS[viewMode] * zoomLevel);
  const totalWidth = columns.length * columnWidth;

  // Calculate header height (2 rows for day/week, 1 for month)
  const headerHeight = viewMode === "month" ? 50 : 60;

  // Build a map of bar positions for dependency arrows
  const barPositionMap = React.useMemo(() => {
    const map = new Map<string, BarPosition>();
    visibleItems.forEach((item, index) => {
      const { left, width } = calculateBarPosition(item, dateRange, totalWidth);
      const top = index * ROW_HEIGHT;
      map.set(item.id, { left, width, top });
      if (item.timelineId) {
        map.set(item.timelineId, { left, width, top });
      }
    });
    return map;
  }, [visibleItems, dateRange, totalWidth]);

  // Get bar position for dependency arrows
  const getBarPosition = React.useCallback(
    (itemId: string): BarPosition | null => {
      return barPositionMap.get(itemId) || null;
    },
    [barPositionMap]
  );

  // Scroll to today
  const scrollToToday = React.useCallback(() => {
    if (!scrollRef.current) return;

    const today = new Date();
    const todayIndex = columns.findIndex(
      (col) =>
        col.date.getDate() === today.getDate() &&
        col.date.getMonth() === today.getMonth() &&
        col.date.getFullYear() === today.getFullYear()
    );

    if (todayIndex >= 0) {
      const scrollPosition = todayIndex * columnWidth - 200;
      scrollRef.current.scrollLeft = Math.max(0, scrollPosition);
    }
  }, [columns, columnWidth]);

  // Scroll to today on initial render
  React.useEffect(() => {
    scrollToToday();
  }, [scrollToToday]);

  // Navigation (scroll left/right)
  const navigate = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = columnWidth * 5;
    scrollRef.current.scrollLeft += direction === "right" ? scrollAmount : -scrollAmount;
  };

  // Handle item click with multi-select support
  const handleItemClick = (item: GanttItem, event?: React.MouseEvent) => {
    // Only allow selection for editable items
    if (!item.isEditable) {
      onItemClick?.(item);
      return;
    }

    // Multi-select with Ctrl/Cmd or Shift
    if (event?.ctrlKey || event?.metaKey) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(item.id)) {
          next.delete(item.id);
        } else {
          next.add(item.id);
        }
        return next;
      });
    } else if (event?.shiftKey && selectedIds.size > 0) {
      // Range select
      const lastSelected = Array.from(selectedIds).pop();
      const lastIndex = visibleItems.findIndex((i) => i.id === lastSelected);
      const currentIndex = visibleItems.findIndex((i) => i.id === item.id);

      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const rangeIds = visibleItems.slice(start, end + 1).map((i) => i.id);
        setSelectedIds(new Set([...selectedIds, ...rangeIds]));
      }
    } else {
      // Single select (toggle)
      if (selectedIds.has(item.id) && selectedIds.size === 1) {
        setSelectedIds(new Set());
      } else {
        setSelectedIds(new Set([item.id]));
      }
    }

    onItemClick?.(item);
  };

  // Handle sidebar item click (pass through to main handler)
  const handleSidebarItemClick = (item: GanttItem, event: React.MouseEvent) => {
    handleItemClick(item, event);
  };

  // Toggle collapse
  const handleToggleCollapse = (itemId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  // Handle reorder from sidebar
  const handleReorder = (itemIds: string[]) => {
    onReorderItems?.(itemIds);
  };

  // Link selected items
  const handleLinkItems = () => {
    if (selectedItems.length !== 2) return;

    setLinkSourceItem(selectedItems[0]);
    setLinkTargetItem(selectedItems[1]);
    setSelectedDependency(null);
    setDependencyDialogOpen(true);
  };

  // Click on existing dependency
  const handleDependencyClick = (dependency: GanttDependency) => {
    setSelectedDependency(dependency);
    setLinkSourceItem(null);
    setLinkTargetItem(null);
    setDependencyDialogOpen(true);
  };

  // Save dependency (create or update)
  const handleSaveDependency = async (data: { type: DependencyType; lagDays: number }) => {
    if (selectedDependency) {
      // Update existing
      await onUpdateDependency?.(selectedDependency.id, data.type, data.lagDays);
    } else if (linkSourceItem && linkTargetItem) {
      // Create new
      const sourceId = linkSourceItem.timelineId || linkSourceItem.id;
      const targetId = linkTargetItem.timelineId || linkTargetItem.id;
      await onCreateDependency?.(sourceId, targetId, data.type, data.lagDays);
    }

    setDependencyDialogOpen(false);
    setSelectedDependency(null);
    setLinkSourceItem(null);
    setLinkTargetItem(null);
    setSelectedIds(new Set());
  };

  // Delete dependency
  const handleDeleteDependency = async () => {
    if (selectedDependency) {
      await onDeleteDependency?.(selectedDependency.id);
    }
    setDependencyDialogOpen(false);
    setSelectedDependency(null);
  };

  // Indent selected item
  const handleIndent = async () => {
    if (selectedItems.length !== 1) return;
    const item = selectedItems[0];
    await onIndentItem?.(item.timelineId || item.id);
  };

  // Outdent selected item
  const handleOutdent = async () => {
    if (selectedItems.length !== 1) return;
    const item = selectedItems[0];
    await onOutdentItem?.(item.timelineId || item.id);
  };

  // Clear selection on background click
  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedIds(new Set());
    }
  };

  // Get item name by ID
  const getItemName = (id: string): string => {
    const item = itemMap.get(id);
    return item?.name || "Unknown Item";
  };

  // Chart content (shared between normal and fullscreen modes)
  const chartContent = (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-base-200 bg-base-50/50 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">View:</span>
          <div className="flex items-center border border-base-200 rounded-lg overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("day")}
              className={cn(
                "rounded-none h-8 px-3",
                viewMode === "day" && "bg-primary/10 text-primary"
              )}
            >
              <CalendarIcon className="h-4 w-4 mr-1.5" />
              Day
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("week")}
              className={cn(
                "rounded-none h-8 px-3 border-x border-base-200",
                viewMode === "week" && "bg-primary/10 text-primary"
              )}
            >
              <CalendarDaysIcon className="h-4 w-4 mr-1.5" />
              Week
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("month")}
              className={cn(
                "rounded-none h-8 px-3",
                viewMode === "month" && "bg-primary/10 text-primary"
              )}
            >
              <CalendarRangeIcon className="h-4 w-4 mr-1.5" />
              Month
            </Button>
          </div>

          {/* Hierarchy buttons (shown when 1 item selected) */}
          {selectedItems.length === 1 && (onIndentItem || onOutdentItem) && (
            <div className="flex items-center border border-base-200 rounded-lg overflow-hidden ml-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleIndent}
                      disabled={!onIndentItem}
                      className="rounded-none h-8 w-8"
                      aria-label="Indent item"
                    >
                      <IndentIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Indent (make child of above item)</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleOutdent}
                      disabled={!onOutdentItem || (selectedItems[0]?.hierarchyLevel || 0) === 0}
                      className="rounded-none h-8 w-8 border-l border-base-200"
                      aria-label="Outdent item"
                    >
                      <OutdentIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Outdent (move up one level)</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

          {/* Link button (shown when 2 items selected) */}
          {selectedItems.length === 2 && onCreateDependency && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLinkItems}
                    className="h-8 ml-2"
                  >
                    <LinkIcon className="h-4 w-4 mr-1.5" />
                    Link Items
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Create dependency between selected items</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Selection indicator */}
          {selectedItems.length > 0 && (
            <div className="flex items-center gap-2 ml-2 text-sm text-muted-foreground">
              <span>{selectedItems.length} selected</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
                className="h-6 px-2 text-xs"
              >
                Clear
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Add Timeline button */}
          {showAddButton && onAddItem && (
            <Button size="sm" onClick={onAddItem} className="h-8">
              <PlusIcon className="h-4 w-4 mr-1.5" />
              Add Timeline
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={scrollToToday}
            className="h-8"
          >
            Today
          </Button>

          {/* Zoom controls */}
          <div className="flex items-center border border-base-200 rounded-lg overflow-hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={zoomOut}
              disabled={!canZoomOut}
              className="rounded-none h-8 w-8"
              aria-label="Zoom out"
            >
              <ZoomOutIcon className="h-4 w-4" />
            </Button>
            <span className="px-2 text-xs font-medium min-w-[3rem] text-center border-x border-base-200">
              {Math.round(zoomLevel * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={zoomIn}
              disabled={!canZoomIn}
              className="rounded-none h-8 w-8"
              aria-label="Zoom in"
            >
              <ZoomInIcon className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <div className="flex items-center border border-base-200 rounded-lg overflow-hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("left")}
              className="rounded-none h-8 w-8"
              aria-label="Navigate left"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("right")}
              className="rounded-none h-8 w-8 border-l border-base-200"
              aria-label="Navigate right"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>

          {/* Fullscreen toggle */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-8 w-8"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2Icon className="h-4 w-4" />
            ) : (
              <Maximize2Icon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Chart area */}
      <div
        className={cn("flex overflow-hidden", isFullscreen && "flex-1")}
        style={{ height: isFullscreen ? "100%" : 400 }}
      >
        {/* Sidebar */}
        {showSidebar && (
          <GanttSidebar
            items={visibleItems}
            rowHeight={ROW_HEIGHT}
            headerHeight={headerHeight}
            width={sidebarWidth}
            selectedIds={selectedIds}
            collapsedIds={collapsedIds}
            onItemClick={handleSidebarItemClick}
            onToggleCollapse={handleToggleCollapse}
            onReorder={onReorderItems ? handleReorder : undefined}
          />
        )}

        {/* Timeline */}
        <div
          className="flex-1 overflow-auto"
          ref={scrollRef}
          onClick={handleBackgroundClick}
        >
          <div style={{ width: totalWidth, minWidth: "100%" }}>
            {/* Header */}
            <GanttHeader
              columns={columns}
              viewMode={viewMode}
              columnWidth={columnWidth}
            />

            {/* Rows with dependency overlay */}
            <div className="relative">
              {visibleItems.map((item) => (
                <GanttRow
                  key={item.id}
                  item={item}
                  columns={columns}
                  dateRange={dateRange}
                  columnWidth={columnWidth}
                  rowHeight={ROW_HEIGHT}
                  isSelected={selectedIds.has(item.id)}
                  onItemClick={(clickedItem) => handleItemClick(clickedItem)}
                  onItemEdit={onItemEdit}
                  onItemDuplicate={onItemDuplicate}
                  onItemDelete={onItemDelete}
                  onItemDatesChange={onItemDatesChange}
                />
              ))}

              {/* Dependency arrows overlay */}
              {dependencies.length > 0 && (
                <GanttDependencies
                  dependencies={dependencies}
                  items={visibleItems}
                  getBarPosition={getBarPosition}
                  rowHeight={ROW_HEIGHT}
                  totalHeight={visibleItems.length * ROW_HEIGHT}
                  totalWidth={totalWidth}
                  selectedDependencyId={selectedDependency?.id}
                  onDependencyClick={onUpdateDependency ? handleDependencyClick : undefined}
                />
              )}

              {/* Empty state */}
              {items.length === 0 && (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
                  <p>No timeline items yet</p>
                  {showAddButton && onAddItem && (
                    <Button variant="outline" size="sm" onClick={onAddItem}>
                      <PlusIcon className="h-4 w-4 mr-1.5" />
                      Add your first timeline
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dependency dialog */}
      <DependencyDialog
        open={dependencyDialogOpen}
        onOpenChange={setDependencyDialogOpen}
        sourceItem={linkSourceItem}
        targetItem={linkTargetItem}
        existingDependency={selectedDependency}
        getItemName={getItemName}
        onSave={handleSaveDependency}
        onDelete={selectedDependency ? handleDeleteDependency : undefined}
      />
    </>
  );

  // Fullscreen overlay (rendered via portal to escape parent constraints)
  const fullscreenOverlay = isFullscreen
    ? createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-background flex flex-col"
          style={{ top: 0, left: 0, right: 0, bottom: 0, position: "fixed" }}
        >
          {/* Fullscreen header with close button */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-background shrink-0">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">Project Timeline</h2>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                ESC to exit
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(false)}
              aria-label="Close fullscreen (Escape)"
            >
              <XIcon className="h-5 w-5" />
            </Button>
          </div>
          {/* Chart content fills remaining space */}
          <div className="flex-1 min-h-0 overflow-hidden bg-background">
            {chartContent}
          </div>
        </div>,
        document.body
      )
    : null;

  // Normal mode
  return (
    <>
      {fullscreenOverlay}
      <GlassCard className={cn("overflow-hidden", className)}>
        {chartContent}
      </GlassCard>
    </>
  );
}

export default GanttChart;
