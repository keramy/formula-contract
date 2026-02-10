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
  type WeekendSettings,
  DEFAULT_WEEKEND_SETTINGS,
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
  ChevronDownIcon,
  PlusIcon,
  Maximize2Icon,
  Minimize2Icon,
  XIcon,
  LinkIcon,
  SettingsIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  IndentIncreaseIcon,
  IndentDecreaseIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";

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
  /** Change an item's parent (indent/outdent). Pass null to make top-level. */
  onItemParentChange?: (itemId: string, newParentId: string | null) => void;
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
  className?: string;
  initialViewMode?: GanttViewMode;
  showSidebar?: boolean;
  showAddButton?: boolean;
  /** Show the fullscreen toggle button. Set false when embedded (e.g. project detail tab). */
  showFullscreenToggle?: boolean;
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

const ROW_HEIGHT = 36;

// Sidebar resize constraints

export function GanttChart({
  items,
  dependencies = [],
  onItemClick: _onItemClick, // Kept for API compatibility but single-click now only selects
  onItemEdit,
  onItemDuplicate,
  onItemDelete,
  onItemDatesChange,
  onAddItem,
  onReorderItems,
  onItemParentChange,
  onCreateDependency,
  onUpdateDependency,
  onDeleteDependency,
  className,
  initialViewMode = "week",
  showSidebar = true,
  showAddButton = false,
  showFullscreenToggle = true,
}: GanttChartProps) {
  const [viewMode, setViewMode] = React.useState<GanttViewMode>(initialViewMode);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [zoomIndex, setZoomIndex] = React.useState(DEFAULT_ZOOM_INDEX);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Weekend settings for duration calculation
  const [weekendSettings, setWeekendSettings] = React.useState<WeekendSettings>(DEFAULT_WEEKEND_SETTINGS);

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

  // Handle escape key to clear selection (NOT exit fullscreen - user must use X button)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedIds.size > 0) {
        setSelectedIds(new Set());
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
  const headerHeight = 48; // Fixed height across all views to prevent layout shift

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
  // Single-click = SELECT only, Double-click = EDIT (handled separately)
  const handleItemClick = (item: GanttItem, event?: React.MouseEvent) => {
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
    // NOTE: We do NOT call onItemClick here - single-click only selects
    // Double-click is handled by handleItemDoubleClick
  };

  // Handle double-click to edit (only for editable items)
  const handleItemDoubleClick = (item: GanttItem) => {
    if (item.isEditable) {
      onItemEdit?.(item);
    }
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

  // Helper: Get sibling IDs in current order (same parent)
  const getSiblingIds = React.useCallback((item: GanttItem): string[] => {
    return items
      .filter((i) => i.isEditable && i.type === "task" && i.parentId === item.parentId)
      .map((i) => i.id);
  }, [items]);

  // Move selected item up (swap with previous sibling at same level, move subtree together)
  const handleMoveUp = React.useCallback(() => {
    if (selectedItems.length !== 1 || !onReorderItems) return;
    const item = selectedItems[0];
    if (!item.isEditable || item.type !== "task") return;

    const siblingIds = getSiblingIds(item);
    const index = siblingIds.indexOf(item.id);
    if (index <= 0) return;

    const newOrder = [...siblingIds];
    const swapWith = index - 1;
    [newOrder[index], newOrder[swapWith]] = [newOrder[swapWith], newOrder[index]];

    onReorderItems(newOrder);
  }, [selectedItems, onReorderItems, getSiblingIds]);

  // Move selected item down (swap with next sibling at same level, move subtree together)
  const handleMoveDown = React.useCallback(() => {
    if (selectedItems.length !== 1 || !onReorderItems) return;
    const item = selectedItems[0];
    if (!item.isEditable || item.type !== "task") return;

    const siblingIds = getSiblingIds(item);
    const index = siblingIds.indexOf(item.id);
    if (index < 0 || index >= siblingIds.length - 1) return;

    const newOrder = [...siblingIds];
    const swapWith = index + 1;
    [newOrder[index], newOrder[swapWith]] = [newOrder[swapWith], newOrder[index]];

    onReorderItems(newOrder);
  }, [selectedItems, onReorderItems, getSiblingIds]);

  // Calculate whether move up/down is possible (only for editable items, check siblings)
  const canMoveUp = React.useMemo(() => {
    if (selectedItems.length !== 1 || !selectedItems[0].isEditable || selectedItems[0].type !== "task") return false;
    const item = selectedItems[0];
    const siblingIds = getSiblingIds(item);
    return siblingIds.indexOf(item.id) > 0;
  }, [selectedItems, getSiblingIds]);

  const canMoveDown = React.useMemo(() => {
    if (selectedItems.length !== 1 || !selectedItems[0].isEditable || selectedItems[0].type !== "task") return false;
    const item = selectedItems[0];
    const siblingIds = getSiblingIds(item);
    const index = siblingIds.indexOf(item.id);
    return index >= 0 && index < siblingIds.length - 1;
  }, [selectedItems, getSiblingIds]);

  // Indent: make selected item a child of its previous sibling
  const handleIndent = React.useCallback(() => {
    if (selectedItems.length !== 1 || !onItemParentChange) return;
    const item = selectedItems[0];
    const siblings = items.filter((i) => i.parentId === item.parentId);
    const index = siblings.findIndex((i) => i.id === item.id);
    if (index <= 0) return;
    const newParent = siblings[index - 1];
    if (newParent.type === "milestone") return;
    onItemParentChange(item.timelineId || item.id, newParent.timelineId || newParent.id);
  }, [selectedItems, items, onItemParentChange]);

  // Outdent: move selected item up one hierarchy level
  const handleOutdent = React.useCallback(() => {
    if (selectedItems.length !== 1 || !onItemParentChange) return;
    const item = selectedItems[0];
    if (!item.parentId) return;
    const parent = itemMap.get(item.parentId);
    const newParentId = parent?.parentId
      ? (parent.timelineId || parent.parentId)
      : null;
    onItemParentChange(item.timelineId || item.id, newParentId);
  }, [selectedItems, itemMap, onItemParentChange]);

  const canIndent = React.useMemo(() => {
    if (selectedItems.length !== 1 || !onItemParentChange) return false;
    const item = selectedItems[0];
    const siblings = items.filter((i) => i.parentId === item.parentId);
    const index = siblings.findIndex((i) => i.id === item.id);
    if (index <= 0) return false;
    return siblings[index - 1].type !== "milestone";
  }, [selectedItems, items, onItemParentChange]);

  const canOutdent = React.useMemo(() => {
    if (selectedItems.length !== 1 || !onItemParentChange) return false;
    return !!selectedItems[0].parentId;
  }, [selectedItems, onItemParentChange]);

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
      {/* Toolbar - Compact layout, all buttons h-7 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-base-200 bg-base-50/60 gap-2">
        {/* Left side - Add button and selection actions */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Add Task button */}
          {showAddButton && onAddItem && (
            <Button size="sm" onClick={onAddItem} className="h-7 px-2.5 text-xs">
              <PlusIcon className="h-4 w-4 mr-1.5" />
              Add Task
            </Button>
          )}

          {/* Reorder buttons (shown when 1 item selected and reorder is enabled) */}
          {selectedItems.length === 1 && onReorderItems && (
            <div className="flex items-center border border-base-200 rounded-lg overflow-hidden">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleMoveUp}
                      disabled={!canMoveUp}
                      className="rounded-none h-7 w-7"
                      aria-label="Move up"
                    >
                      <ArrowUpIcon className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Move up</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleMoveDown}
                      disabled={!canMoveDown}
                      className="rounded-none h-7 w-7 border-l border-base-200"
                      aria-label="Move down"
                    >
                      <ArrowDownIcon className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Move down</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

          {/* Indent/Outdent buttons (shown when 1 item selected and parent change is enabled) */}
          {selectedItems.length === 1 && onItemParentChange && (
            <div className="flex items-center border border-base-200 rounded-lg overflow-hidden">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleOutdent}
                      disabled={!canOutdent}
                      className="rounded-none h-7 w-7"
                      aria-label="Outdent"
                    >
                      <IndentDecreaseIcon className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Outdent (move to parent level)</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleIndent}
                      disabled={!canIndent}
                      className="rounded-none h-7 w-7 border-l border-base-200"
                      aria-label="Indent"
                    >
                      <IndentIncreaseIcon className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Indent (make child of item above)</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

          {/* Link button (shown when 2 items selected) */}
          {selectedItems.length === 2 && onCreateDependency && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleLinkItems}
              className="h-7 text-xs"
            >
              <LinkIcon className="h-3.5 w-3.5 mr-1.5" />
              Link
            </Button>
          )}

          {/* Selection indicator */}
          {selectedItems.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{selectedItems.length} selected</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedIds(new Set())}
                className="h-7 w-7"
                aria-label="Clear selection"
              >
                <XIcon className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Right side - Navigation, Settings and View */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Today + Navigation arrows — grouped with border */}
          <div className="flex items-center border border-base-200 rounded-lg overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={scrollToToday}
              className="rounded-none h-7 px-2 text-xs"
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("left")}
              className="rounded-none h-7 w-7 border-l border-base-200"
              aria-label="Navigate left"
            >
              <ChevronLeftIcon className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("right")}
              className="rounded-none h-7 w-7 border-l border-base-200"
              aria-label="Navigate right"
            >
              <ChevronRightIcon className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Settings dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-7 w-7">
                <SettingsIcon className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 z-[10000]">
              <DropdownMenuLabel>Workdays</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={weekendSettings.includeSaturday}
                onCheckedChange={(checked) =>
                  setWeekendSettings((prev) => ({ ...prev, includeSaturday: checked }))
                }
              >
                Include Saturday
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={weekendSettings.includeSunday}
                onCheckedChange={(checked) =>
                  setWeekendSettings((prev) => ({ ...prev, includeSunday: checked }))
                }
              >
                Include Sunday
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Zoom ({Math.round(zoomLevel * 100)}%)</DropdownMenuLabel>
              <div className="flex items-center justify-between px-2 py-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={zoomOut}
                  disabled={!canZoomOut}
                  className="h-7 w-7"
                  aria-label="Zoom out"
                >
                  <ZoomOutIcon className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs font-medium">{Math.round(zoomLevel * 100)}%</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={zoomIn}
                  disabled={!canZoomIn}
                  className="h-7 w-7"
                  aria-label="Zoom in"
                >
                  <ZoomInIcon className="h-3.5 w-3.5" />
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                {viewMode === "day" && <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />}
                {viewMode === "week" && <CalendarDaysIcon className="h-3.5 w-3.5 mr-1.5" />}
                {viewMode === "month" && <CalendarRangeIcon className="h-3.5 w-3.5 mr-1.5" />}
                {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}
                <ChevronDownIcon className="h-3 w-3 ml-1 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[10000]">
              <DropdownMenuRadioGroup value={viewMode} onValueChange={(v) => setViewMode(v as GanttViewMode)}>
                <DropdownMenuRadioItem value="day">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Day
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="week">
                  <CalendarDaysIcon className="h-4 w-4 mr-2" />
                  Week
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="month">
                  <CalendarRangeIcon className="h-4 w-4 mr-2" />
                  Month
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Fullscreen toggle (hidden when embedded, e.g. in project detail tab) */}
          {showFullscreenToggle && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-7 w-7"
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2Icon className="h-3.5 w-3.5" />
              ) : (
                <Maximize2Icon className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Chart area */}
      <div
        className="flex overflow-hidden flex-1 min-h-0"
      >
        {/* Sidebar */}
        {showSidebar && (
          <GanttSidebar
            items={items}
            rowHeight={ROW_HEIGHT}
            headerHeight={headerHeight}
            viewMode={viewMode}
            selectedIds={selectedIds}
            collapsedIds={collapsedIds}
            weekendSettings={weekendSettings}
            onItemClick={handleSidebarItemClick}
            onItemDoubleClick={handleItemDoubleClick}
            onToggleCollapse={handleToggleCollapse}
            onReorderItems={onReorderItems}
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
              headerHeight={headerHeight}
            />

            {/* Rows with dependency overlay */}
            <div className="relative">
              {visibleItems.map((item, index) => (
                <GanttRow
                  key={item.id}
                  item={item}
                  columns={columns}
                  dateRange={dateRange}
                  columnWidth={columnWidth}
                  rowHeight={ROW_HEIGHT}
                  rowIndex={index}
                  isSelected={selectedIds.has(item.id)}
                  onItemClick={(clickedItem) => handleItemClick(clickedItem)}
                  onItemDoubleClick={handleItemDoubleClick}
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
                ESC clears selection
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(false)}
              aria-label="Close fullscreen"
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
      <GlassCard className={cn("overflow-hidden py-0 gap-0", className)}>
        {chartContent}
      </GlassCard>
    </>
  );
}

export default GanttChart;
