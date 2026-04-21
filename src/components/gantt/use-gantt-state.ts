"use client";

import * as React from "react";
import type { GanttViewMode, GanttPanel, GanttItem } from "./gantt-types";
import { ZOOM_LEVELS, DEFAULT_ZOOM_INDEX, SIDEBAR_WIDTH } from "./gantt-types";

// ============================================================================
// useGanttState — Owns ALL chart UI state
// ============================================================================

export interface GanttState {
  // View
  panel: GanttPanel;
  viewMode: GanttViewMode;
  zoomIndex: number;
  zoomLevel: number;
  showGrid: boolean;
  showDependencies: boolean;
  showPhases: boolean;
  searchQuery: string;

  // Link mode (dependency creation)
  linkMode: boolean;
  linkSourceId: string | null;

  // Selection & collapse
  selectedIds: Set<string>;
  collapsedIds: Set<string>;

  // Layout
  sidebarWidth: number;

  // Scroll sync
  scrollTop: number;
}

export interface GanttActions {
  setPanel: (panel: GanttPanel) => void;
  setViewMode: (mode: GanttViewMode) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  toggleGrid: () => void;
  toggleDependencies: () => void;
  togglePhases: () => void;
  setSearchQuery: (query: string) => void;

  // Link mode
  toggleLinkMode: () => void;
  setLinkSourceId: (id: string | null) => void;
  exitLinkMode: () => void;

  selectItem: (id: string, e: React.MouseEvent) => void;
  clearSelection: () => void;

  toggleCollapse: (id: string) => void;
  expandAll: () => void;
  collapseAll: (phaseIds: string[]) => void;

  setSidebarWidth: (width: number) => void;
  setScrollTop: (top: number) => void;
}

export function useGanttState(
  flatItemsForRangeSelect: { id: string }[]
): GanttState & GanttActions {
  const [panel, setPanel] = React.useState<GanttPanel>("timeline");
  const [viewMode, setViewMode] = React.useState<GanttViewMode>("month");
  const [zoomIndex, setZoomIndex] = React.useState(DEFAULT_ZOOM_INDEX);
  const [showGrid, setShowGrid] = React.useState(true);
  const [showDependencies, setShowDependencies] = React.useState(true);
  const [showPhases, setShowPhases] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [linkMode, setLinkMode] = React.useState(false);
  const [linkSourceId, setLinkSourceId] = React.useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = React.useState(440);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [collapsedIds, setCollapsedIds] = React.useState<Set<string>>(new Set());
  const [scrollTop, setScrollTop] = React.useState(0);

  const zoomLevel = ZOOM_LEVELS[zoomIndex];

  // Escape key clears selection and exits link mode
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (linkMode) {
          setLinkMode(false);
          setLinkSourceId(null);
        }
        if (selectedIds.size > 0) {
          setSelectedIds(new Set());
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedIds.size, linkMode]);

  const selectItem = React.useCallback(
    (id: string, e: React.MouseEvent) => {
      if (e.ctrlKey || e.metaKey) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      } else if (e.shiftKey && selectedIds.size > 0) {
        const lastSelected = Array.from(selectedIds).pop()!;
        const items = flatItemsForRangeSelect;
        const lastIdx = items.findIndex((i) => i.id === lastSelected);
        const curIdx = items.findIndex((i) => i.id === id);
        if (lastIdx !== -1 && curIdx !== -1) {
          const start = Math.min(lastIdx, curIdx);
          const end = Math.max(lastIdx, curIdx);
          const rangeIds = items.slice(start, end + 1).map((i) => i.id);
          setSelectedIds(new Set([...selectedIds, ...rangeIds]));
        }
      } else {
        if (selectedIds.has(id) && selectedIds.size === 1) {
          setSelectedIds(new Set());
        } else {
          setSelectedIds(new Set([id]));
        }
      }
    },
    [selectedIds, flatItemsForRangeSelect]
  );

  const toggleCollapse = React.useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = React.useCallback(() => setCollapsedIds(new Set()), []);

  const collapseAll = React.useCallback((phaseIds: string[]) => {
    setCollapsedIds(new Set(phaseIds));
  }, []);

  return {
    // State
    panel,
    viewMode,
    zoomIndex,
    zoomLevel,
    showGrid,
    showDependencies,
    showPhases,
    searchQuery,
    linkMode,
    linkSourceId,
    sidebarWidth,
    selectedIds,
    collapsedIds,
    scrollTop,

    // Actions
    setPanel,
    setViewMode,
    zoomIn: React.useCallback(
      () => setZoomIndex((i) => Math.min(i + 1, ZOOM_LEVELS.length - 1)),
      []
    ),
    zoomOut: React.useCallback(
      () => setZoomIndex((i) => Math.max(i - 1, 0)),
      []
    ),
    toggleGrid: React.useCallback(() => setShowGrid((v) => !v), []),
    toggleDependencies: React.useCallback(() => setShowDependencies((v) => !v), []),
    togglePhases: React.useCallback(() => setShowPhases((v) => !v), []),
    setSearchQuery,
    toggleLinkMode: React.useCallback(() => {
      setLinkMode((v) => {
        if (v) setLinkSourceId(null); // exiting → clear source
        return !v;
      });
    }, []),
    setLinkSourceId,
    exitLinkMode: React.useCallback(() => {
      setLinkMode(false);
      setLinkSourceId(null);
    }, []),
    setSidebarWidth,
    selectItem,
    clearSelection: React.useCallback(() => setSelectedIds(new Set()), []),
    toggleCollapse,
    expandAll,
    collapseAll,
    setScrollTop,
  };
}
