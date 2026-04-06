"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GlassCard } from "@/components/ui/ui-helpers";
import {
  type GanttItem,
  type GanttDependency,
  type DependencyType,
  type GanttDateRange,
  buildGanttRows,
  computeStats,
  computeDateRange,
  BASE_COLUMN_WIDTHS,
} from "./gantt-types";
import { useGanttState } from "./use-gantt-state";
import { GanttToolbar } from "./gantt-toolbar";
import { GanttSidebar } from "./gantt-sidebar";
import { GanttTimeline } from "./gantt-timeline";
import { GanttTable } from "./gantt-table";
import { GanttStatusBar } from "./gantt-status-bar";
import { GanttDependencyDialog } from "./gantt-dependency-dialog";
import { GanttContextMenu } from "./gantt-context-menu";
import { XIcon, PlusIcon } from "lucide-react";

// ============================================================================
// GANTT CHART — Main orchestrator
// Owns: ganttRows computation, dependency dialog, scroll sync
// ============================================================================

const EMPTY_DEPS: GanttDependency[] = [];

export interface GanttChartProps {
  items: GanttItem[];
  dependencies?: GanttDependency[];
  projectTitle?: string;
  projectSubtitle?: string;
  // Callbacks
  onItemEdit?: (item: GanttItem) => void;
  onItemDelete?: (item: GanttItem) => void;
  onAddItem?: () => void;
  onItemParentChange?: (itemId: string, newParentId: string | null) => void;
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
  onAddSubtask?: (parentId: string) => void;
  onConvertToMilestone?: (item: GanttItem) => void;
  onSetPriority?: (item: GanttItem, priority: number) => void;
  onToggleCriticalPath?: (item: GanttItem) => void;
  onExport?: () => void;
  // Baseline
  baselines?: { id: string; name: string; created_at: string }[];
  baselineItems?: { gantt_item_id: string; start_date: string; end_date: string }[];
  onSaveBaseline?: () => void;
  onDeleteBaseline?: (id: string) => void;
  /** URL for "Open Full View" link in the stats bar */
  fullViewUrl?: string;
  className?: string;
  showAddButton?: boolean;
}

export function GanttChart({
  items,
  dependencies = EMPTY_DEPS,
  projectTitle,
  projectSubtitle,
  onItemEdit,
  onItemDelete,
  onAddItem,
  onItemParentChange,
  onCreateDependency,
  onUpdateDependency,
  onDeleteDependency,
  onAddSubtask,
  onConvertToMilestone,
  onSetPriority,
  onToggleCriticalPath,
  onExport,
  baselines,
  baselineItems,
  onSaveBaseline,
  onDeleteBaseline,
  fullViewUrl,
  className,
  showAddButton = false,
}: GanttChartProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const ganttState = useGanttState(items); // items used for range-select indexing
  const {
    panel,
    viewMode,
    zoomLevel,
    showGrid,
    showDependencies,
    linkMode,
    linkSourceId,
    selectedIds,
    collapsedIds,
    scrollTop,
    setPanel,
    setViewMode,
    toggleGrid,
    toggleDependencies,
    toggleLinkMode,
    setLinkSourceId,
    exitLinkMode,
    selectItem,
    clearSelection,
    toggleCollapse,
    expandAll,
    collapseAll,
    setScrollTop,
  } = ganttState;

  // ---------------------------------------------------------------------------
  // Computed data (memoized)
  // ---------------------------------------------------------------------------

  /** THE single source of truth for row positioning */
  const allGanttRows = React.useMemo(
    () => buildGanttRows(items, collapsedIds),
    [items, collapsedIds]
  );

  /** Filtered by search query (rebuild Y positions after filtering) */
  const ganttRows = React.useMemo(() => {
    const q = ganttState.searchQuery.trim().toLowerCase();
    if (!q) return allGanttRows;

    // Find matching item IDs + their ancestor IDs for context
    const matchIds = new Set<string>();
    const ancestorIds = new Set<string>();

    for (const row of allGanttRows) {
      if (row.item.name.toLowerCase().includes(q)) {
        matchIds.add(row.id);
        // Walk up parents to keep ancestors visible
        let parentId = row.item.parentId;
        while (parentId) {
          ancestorIds.add(parentId);
          const parentRow = allGanttRows.find((r) => r.id === parentId);
          parentId = parentRow?.item.parentId ?? null;
        }
      }
    }

    // Filter and rebuild Y positions
    const filtered = allGanttRows.filter(
      (r) => matchIds.has(r.id) || ancestorIds.has(r.id)
    );
    let currentY = 0;
    return filtered.map((r, i) => {
      const row = { ...r, y: currentY, rowIndex: i };
      currentY += r.height;
      return row;
    });
  }, [allGanttRows, ganttState.searchQuery]);

  const stats = React.useMemo(() => computeStats(allGanttRows), [allGanttRows]);

  const dateRange = React.useMemo(
    () => computeDateRange(items, viewMode),
    [items, viewMode]
  );

  const columnWidth = Math.round(BASE_COLUMN_WIDTHS[viewMode] * zoomLevel);

  /** IDs of all items that have children (phases + parent tasks) */
  const collapsibleIds = React.useMemo(() => {
    const ids: string[] = [];
    const walk = (list: GanttItem[]) => {
      for (const item of list) {
        if (item.children.length > 0) {
          ids.push(item.id);
          walk(item.children);
        }
      }
    };
    walk(items);
    return ids;
  }, [items]);

  // Item lookup map
  const itemMap = React.useMemo(() => {
    const map = new Map<string, GanttItem>();
    const walk = (list: GanttItem[]) => {
      for (const item of list) {
        map.set(item.id, item);
        if (item.timelineId) map.set(item.timelineId, item);
        if (item.children.length > 0) walk(item.children);
      }
    };
    walk(items);
    return map;
  }, [items]);

  // ---------------------------------------------------------------------------
  // Selected item helpers (for indent/outdent)
  // ---------------------------------------------------------------------------
  /** Selected items in visible order (for indent/outdent) */
  const selectedItemsOrdered = React.useMemo(() => {
    if (selectedIds.size === 0 || !onItemParentChange) return [];
    return ganttRows
      .filter((r) => selectedIds.has(r.id) && r.item.isEditable && r.type !== "phase")
      .map((r) => r.item);
  }, [selectedIds, ganttRows, onItemParentChange]);

  /**
   * Find the correct indent target for the first selected item.
   *
   * Rule: indent should first make the item a SIBLING of the item above
   * (same parent as that item), not a child of it. Only if already at
   * the same level should it go one level deeper.
   *
   * Example:
   *   Task A (parent)
   *     Task B (child of A)
   *   Task C              ← selected
   *
   * First indent:  Task C → child of Task A (sibling of Task B)
   * Second indent: Task C → child of Task B (one level deeper)
   */
  const getIndentTarget = React.useCallback((): GanttItem | null => {
    if (selectedItemsOrdered.length === 0) return null;
    const firstSelected = selectedItemsOrdered[0];
    const selectedSet = new Set(selectedItemsOrdered.map((i) => i.id));

    // Find the row just above the first selected item (not in selection)
    const firstIdx = ganttRows.findIndex((r) => r.id === firstSelected.id);
    let aboveRow: typeof ganttRows[number] | null = null;
    for (let i = firstIdx - 1; i >= 0; i--) {
      if (!selectedSet.has(ganttRows[i].id)) {
        aboveRow = ganttRows[i];
        break;
      }
    }
    if (!aboveRow || aboveRow.type === "milestone") return null;

    const selectedDepth = ganttRows[firstIdx]?.depth ?? 0;
    const aboveDepth = aboveRow.depth;
    const sameParent = firstSelected.parentId === aboveRow.item.parentId;

    if (selectedDepth < aboveDepth) {
      // Shallower than above → become sibling of above (adopt its parent)
      if (aboveRow.item.parentId) {
        return itemMap.get(aboveRow.item.parentId) ?? null;
      }
      return aboveRow.item;
    }

    if (selectedDepth === aboveDepth && sameParent) {
      // Same level, same parent → go deeper (become child of item above)
      return aboveRow.item;
    }

    if (selectedDepth === aboveDepth && !sameParent) {
      // Same level, different parent → become sibling of above first
      if (aboveRow.item.parentId) {
        return itemMap.get(aboveRow.item.parentId) ?? null;
      }
      return aboveRow.item;
    }

    // Deeper than above → become child of the item above
    return aboveRow.item;
  }, [selectedItemsOrdered, ganttRows, itemMap]);

  const canIndent = React.useMemo(() => {
    if (selectedItemsOrdered.length === 0) return false;
    return getIndentTarget() !== null;
  }, [selectedItemsOrdered, getIndentTarget]);

  const canOutdent = React.useMemo(() => {
    if (selectedItemsOrdered.length === 0) return false;
    // At least one selected item must have a parent
    return selectedItemsOrdered.some((item) => !!item.parentId);
  }, [selectedItemsOrdered]);

  const handleIndent = React.useCallback(() => {
    if (!onItemParentChange) return;
    const target = getIndentTarget();
    if (!target) return;
    const newParentId = target.timelineId || target.id;

    for (const item of selectedItemsOrdered) {
      const itemId = item.timelineId || item.id;
      onItemParentChange(itemId, newParentId);
    }
  }, [selectedItemsOrdered, getIndentTarget, onItemParentChange]);

  const handleOutdent = React.useCallback(() => {
    if (!onItemParentChange) return;

    // Process deepest items first so children move before their parents.
    // This prevents stale hierarchy lookups when parent and child are both selected.
    const sorted = [...selectedItemsOrdered].sort((a, b) => {
      const aRow = ganttRows.find((r) => r.id === a.id);
      const bRow = ganttRows.find((r) => r.id === b.id);
      return (bRow?.depth ?? 0) - (aRow?.depth ?? 0); // deepest first
    });

    for (const item of sorted) {
      if (!item.parentId) continue;
      const parent = itemMap.get(item.parentId);
      // Grandparent = parent's parent. If parent is root, grandparent is null (→ item becomes root).
      const grandparentId = parent?.parentId ?? null;
      const itemId = item.timelineId || item.id;
      onItemParentChange(itemId, grandparentId);
    }
  }, [selectedItemsOrdered, ganttRows, itemMap, onItemParentChange]);

  // ---------------------------------------------------------------------------
  // Dependency dialog state
  // ---------------------------------------------------------------------------
  const [depDialogOpen, setDepDialogOpen] = React.useState(false);
  const [selectedDep, setSelectedDep] = React.useState<GanttDependency | null>(null);
  const [linkSource, setLinkSource] = React.useState<GanttItem | null>(null);
  const [linkTarget, setLinkTarget] = React.useState<GanttItem | null>(null);

  // ---------------------------------------------------------------------------
  // Link mode: click bar or sidebar row → set source, click second → open dialog
  // ---------------------------------------------------------------------------
  const handleLinkModeClick = React.useCallback(
    (item: GanttItem) => {
      if (!linkMode) return;
      // Don't allow phases as dependency endpoints
      if (item.type === "phase") return;

      const itemId = item.id;

      if (!linkSourceId) {
        // First click → set source
        setLinkSourceId(itemId);
      } else if (itemId === linkSourceId) {
        // Clicked same item → deselect source
        setLinkSourceId(null);
      } else {
        // Second click → open dependency dialog
        const source = itemMap.get(linkSourceId) ?? null;
        const target = itemMap.get(itemId) ?? null;
        if (source && target) {
          setLinkSource(source);
          setLinkTarget(target);
          setSelectedDep(null);
          setDepDialogOpen(true);
        }
        exitLinkMode();
      }
    },
    [linkMode, linkSourceId, itemMap, setLinkSourceId, exitLinkMode]
  );

  // Intercept sidebar clicks in link mode
  const handleSelectItem = React.useCallback(
    (id: string, e: React.MouseEvent) => {
      if (linkMode) {
        const item = itemMap.get(id);
        if (item) {
          handleLinkModeClick(item);
          return;
        }
      }
      selectItem(id, e);
    },
    [linkMode, itemMap, handleLinkModeClick, selectItem]
  );

  const handleDependencyClick = React.useCallback((dep: GanttDependency) => {
    setSelectedDep(dep);
    setLinkSource(null);
    setLinkTarget(null);
    setDepDialogOpen(true);
  }, []);

  const handleSaveDependency = React.useCallback(
    async (data: { type: DependencyType; lagDays: number }) => {
      if (selectedDep) {
        await onUpdateDependency?.(selectedDep.id, data.type, data.lagDays);
      } else if (linkSource && linkTarget) {
        const sourceId = linkSource.timelineId || linkSource.id;
        const targetId = linkTarget.timelineId || linkTarget.id;
        await onCreateDependency?.(sourceId, targetId, data.type, data.lagDays);
      }
      setDepDialogOpen(false);
      setSelectedDep(null);
      setLinkSource(null);
      setLinkTarget(null);
      clearSelection();
    },
    [selectedDep, linkSource, linkTarget, onUpdateDependency, onCreateDependency, clearSelection]
  );

  const handleDeleteDependency = React.useCallback(async () => {
    if (selectedDep) await onDeleteDependency?.(selectedDep.id);
    setDepDialogOpen(false);
    setSelectedDep(null);
  }, [selectedDep, onDeleteDependency]);

  const getItemName = React.useCallback(
    (id: string) => itemMap.get(id)?.name || "Unknown",
    [itemMap]
  );

  // ---------------------------------------------------------------------------
  // Scroll sync: timeline scrollTop → sidebar offset
  // ---------------------------------------------------------------------------
  const handleTimelineScroll = React.useCallback((e: React.UIEvent) => {
    setScrollTop((e.currentTarget as HTMLDivElement).scrollTop);
  }, [setScrollTop]);

  // Scroll to today on mount
  const scrollToToday = React.useCallback(() => {
    if (!scrollRef.current) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const totalMs = dateRange.end.getTime() - dateRange.start.getTime();
    const offsetMs = today.getTime() - dateRange.start.getTime();
    if (offsetMs < 0 || offsetMs > totalMs) return;
    const columns = Math.ceil(totalMs / (viewMode === "day" ? 86400000 : viewMode === "week" ? 604800000 : 2592000000));
    const totalWidth = columns * columnWidth;
    const todayX = (offsetMs / totalMs) * totalWidth;
    scrollRef.current.scrollLeft = Math.max(0, todayX - 200);
  }, [dateRange, viewMode, columnWidth]);

  React.useEffect(() => {
    scrollToToday();
  }, [scrollToToday]);

  // Double-click handler
  const handleDoubleClick = React.useCallback(
    (item: GanttItem) => {
      if (item.isEditable) onItemEdit?.(item);
    },
    [onItemEdit]
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <TooltipProvider>
    <GlassCard className={cn("overflow-hidden py-0 gap-0 flex flex-col h-full", className)}>
        {/* Toolbar (stats bar removed — bottom status bar has the same info) */}
        <GanttToolbar
          panel={panel}
          onPanelChange={setPanel}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          showGrid={showGrid}
          onGridToggle={toggleGrid}
          showDependencies={showDependencies}
          onDependenciesToggle={toggleDependencies}
          linkMode={linkMode}
          onLinkModeToggle={onCreateDependency ? toggleLinkMode : undefined}
          linkSourceId={linkSourceId}
          onAddItem={showAddButton ? onAddItem : undefined}
          onIndent={canIndent ? handleIndent : undefined}
          onOutdent={canOutdent ? handleOutdent : undefined}
          hasSelection={selectedItemsOrdered.length > 0}
          showCriticalPath={ganttState.showCriticalPath}
          onCriticalPathToggle={ganttState.toggleCriticalPath}
          searchQuery={ganttState.searchQuery}
          onSearchChange={ganttState.setSearchQuery}
          baselines={baselines}
          activeBaselineId={ganttState.activeBaselineId}
          onBaselineSelect={ganttState.setActiveBaselineId}
          onBaselineSave={onSaveBaseline}
          onBaselineDelete={onDeleteBaseline}
          onExpandAll={expandAll}
          onCollapseAll={() => collapseAll(collapsibleIds)}
          onScrollToToday={scrollToToday}
          fullViewUrl={fullViewUrl}
          onZoomIn={ganttState.zoomIn}
          onZoomOut={ganttState.zoomOut}
          canZoomIn={ganttState.zoomIndex < 5}
          canZoomOut={ganttState.zoomIndex > 0}
          zoomPercent={Math.round(ganttState.zoomLevel * 100)}
          rowCount={ganttRows.length}
        />

        {/* Main content */}
        {panel === "timeline" ? (
          <div className="flex flex-1 min-h-0 overflow-hidden">
            <GanttSidebar
              rows={ganttRows}
              selectedIds={selectedIds}
              onToggleCollapse={toggleCollapse}
              onSelectItem={handleSelectItem}
              onDoubleClickItem={handleDoubleClick}
              scrollTop={scrollTop}
              linkMode={linkMode}
              linkSourceId={linkSourceId}
              onEditItem={onItemEdit ? handleDoubleClick : undefined}
              onDeleteItem={onItemDelete}
              onAddSubtask={onAddSubtask}
              onConvertToMilestone={onConvertToMilestone}
              onSetPriority={onSetPriority}
              onToggleCriticalPath={onToggleCriticalPath}
            />
            <GanttTimeline
              rows={ganttRows}
              dateRange={dateRange}
              viewMode={viewMode}
              columnWidth={columnWidth}
              showGrid={showGrid}
              showDependencies={showDependencies}
              showCriticalPath={ganttState.showCriticalPath}
              selectedIds={selectedIds}
              dependencies={dependencies}
              onItemDoubleClick={handleDoubleClick}
              onItemClick={linkMode ? handleLinkModeClick : undefined}
              onDependencyClick={onUpdateDependency ? handleDependencyClick : undefined}
              linkMode={linkMode}
              linkSourceId={linkSourceId}
              baselineItems={ganttState.activeBaselineId ? baselineItems : undefined}
              scrollRef={scrollRef}
              onScroll={handleTimelineScroll}
            />
          </div>
        ) : (
          <GanttTable
            rows={ganttRows}
            selectedIds={selectedIds}
            onToggleCollapse={toggleCollapse}
            onSelectItem={handleSelectItem}
            onDoubleClickItem={handleDoubleClick}
          />
        )}

        {/* Empty state */}
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground gap-2 py-16">
            <p>No timeline items yet</p>
            {showAddButton && onAddItem && (
              <Button variant="outline" size="sm" onClick={onAddItem}>
                <PlusIcon className="h-4 w-4 mr-1.5" />
                Add your first task
              </Button>
            )}
          </div>
        )}

        {/* Status bar */}
        <GanttStatusBar stats={stats} />

        {/* Dependency dialog */}
        <GanttDependencyDialog
          open={depDialogOpen}
          onOpenChange={setDepDialogOpen}
          sourceItem={linkSource}
          targetItem={linkTarget}
          existingDependency={selectedDep}
          getItemName={getItemName}
          onSave={handleSaveDependency}
          onDelete={selectedDep ? handleDeleteDependency : undefined}
        />
    </GlassCard>
    </TooltipProvider>
  );
}
