"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { GanttViewMode, GanttPanel } from "./gantt-types";
import { Input } from "@/components/ui/input";
import {
  PlusIcon,
  LayoutGridIcon,
  LinkIcon,
  Link2Icon,
  CalendarIcon,
  ZoomInIcon,
  ZoomOutIcon,
  ExternalLinkIcon,
  IndentIncreaseIcon,
  IndentDecreaseIcon,
  FlagIcon,
  SearchIcon,
  BookmarkIcon,
  SaveIcon,
  TrashIcon,
  CheckIcon,
  ChevronDownIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ============================================================================
// GANTT TOOLBAR — 44px row
// Figma: Timeline|Table toggle, +Add Task, Scale dropdown, icon buttons, Expand/Collapse
// ============================================================================

interface GanttToolbarProps {
  panel: GanttPanel;
  onPanelChange: (panel: GanttPanel) => void;
  viewMode: GanttViewMode;
  onViewModeChange: (mode: GanttViewMode) => void;
  showGrid: boolean;
  onGridToggle: () => void;
  showDependencies: boolean;
  onDependenciesToggle: () => void;
  linkMode?: boolean;
  onLinkModeToggle?: () => void;
  linkSourceId?: string | null;
  onAddItem?: () => void;
  onIndent?: () => void;
  onOutdent?: () => void;
  hasSelection?: boolean;
  showCriticalPath?: boolean;
  onCriticalPathToggle?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  // Baseline
  baselines?: { id: string; name: string; created_at: string }[];
  activeBaselineId?: string | null;
  onBaselineSelect?: (id: string | null) => void;
  onBaselineSave?: () => void;
  onBaselineDelete?: (id: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onScrollToToday?: () => void;
  fullViewUrl?: string;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  canZoomIn?: boolean;
  canZoomOut?: boolean;
  zoomPercent?: number;
  rowCount?: number;
  className?: string;
}

export function GanttToolbar({
  panel,
  onPanelChange,
  viewMode,
  onViewModeChange,
  showGrid,
  onGridToggle,
  showDependencies,
  onDependenciesToggle,
  linkMode,
  onLinkModeToggle,
  linkSourceId,
  onAddItem,
  onIndent,
  onOutdent,
  hasSelection,
  showCriticalPath,
  onCriticalPathToggle,
  searchQuery,
  onSearchChange,
  baselines,
  activeBaselineId,
  onBaselineSelect,
  onBaselineSave,
  onBaselineDelete,
  onExpandAll,
  onCollapseAll,
  onScrollToToday,
  fullViewUrl,
  onZoomIn,
  onZoomOut,
  canZoomIn = true,
  canZoomOut = true,
  zoomPercent,
  rowCount,
  className,
}: GanttToolbarProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 h-[44px] border-b bg-muted/30 shrink-0",
        className
      )}
    >
      {/* Panel toggle — pill shape with strong contrast */}
      <div className="inline-flex items-center rounded-md border border-border bg-muted p-0.5 gap-0.5">
        <PillButton
          active={panel === "timeline"}
          onClick={() => onPanelChange("timeline")}
        >
          Timeline
        </PillButton>
        <PillButton
          active={panel === "table"}
          onClick={() => onPanelChange("table")}
        >
          Table
        </PillButton>
      </div>

      {/* Add Task */}
      {onAddItem && (
        <Button size="sm" onClick={onAddItem} className="h-7 gap-1.5 text-xs">
          <PlusIcon className="size-3.5" />
          Add Task
        </Button>
      )}

      {/* Link Mode — create dependency by clicking two bars */}
      {onLinkModeToggle && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={linkMode ? "default" : "outline"}
              size="sm"
              onClick={onLinkModeToggle}
              className={cn(
                "h-7 gap-1.5 text-xs",
                linkMode && "animate-pulse"
              )}
            >
              <Link2Icon className="size-3.5" />
              {linkMode
                ? linkSourceId
                  ? "Select target..."
                  : "Select source..."
                : "Link Tasks"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {linkMode
              ? "Click two tasks to create a dependency (ESC to cancel)"
              : "Enter link mode to create dependencies between tasks"}
          </TooltipContent>
        </Tooltip>
      )}

      {/* Indent / Outdent — shown when 1 task is selected */}
      {hasSelection && (onIndent || onOutdent) && (
        <div className="flex items-center border border-border rounded-md overflow-hidden">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onOutdent}
                disabled={!onOutdent}
                className="flex items-center justify-center size-7 hover:bg-muted disabled:opacity-30 transition-colors"
              >
                <IndentDecreaseIcon className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Outdent (move to parent level)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onIndent}
                disabled={!onIndent}
                className="flex items-center justify-center size-7 hover:bg-muted disabled:opacity-30 transition-colors border-l border-border"
              >
                <IndentIncreaseIcon className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Indent (make child of task above)</TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Table view: Add Category */}
      {panel === "table" && onAddItem && (
        <Button variant="outline" size="sm" className="h-7 text-xs">
          Add Category
        </Button>
      )}

      {/* Scale dropdown — only in timeline view */}
      {panel === "timeline" && (
        <>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>Scale:</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs gap-1 capitalize">
                  {viewMode}
                  <ChevronDownIcon className="size-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-32">
                <DropdownMenuRadioGroup
                  value={viewMode}
                  onValueChange={(v) => onViewModeChange(v as GanttViewMode)}
                >
                  <DropdownMenuRadioItem value="day">Day</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="week">Week</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="month">Month</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Icon buttons */}
          <div className="flex items-center gap-1">
            <ToolbarIcon
              active={showGrid}
              onClick={onGridToggle}
              tooltip="Toggle grid lines"
            >
              <LayoutGridIcon className="size-3.5" />
            </ToolbarIcon>

            <ToolbarIcon
              active={showDependencies}
              onClick={onDependenciesToggle}
              tooltip="Toggle dependencies"
            >
              <LinkIcon className="size-3.5" />
            </ToolbarIcon>

            <ToolbarIcon onClick={onScrollToToday} tooltip="Scroll to today">
              <CalendarIcon className="size-3.5" />
            </ToolbarIcon>
          </div>

          {/* Critical path toggle */}
          {onCriticalPathToggle && (
            <ToolbarIcon
              active={showCriticalPath}
              onClick={onCriticalPathToggle}
              tooltip="Toggle critical path"
            >
              <FlagIcon className="size-3.5" />
            </ToolbarIcon>
          )}

          {/* Zoom controls */}
          {onZoomIn && onZoomOut && (
            <div className="flex items-center border border-border rounded-md overflow-hidden">
              <button
                onClick={onZoomOut}
                disabled={!canZoomOut}
                className="flex items-center justify-center size-7 hover:bg-muted disabled:opacity-30 transition-colors"
              >
                <ZoomOutIcon className="size-3.5" />
              </button>
              {zoomPercent !== undefined && (
                <span className="text-[10px] font-medium text-muted-foreground tabular-nums w-9 text-center border-x border-border">
                  {zoomPercent}%
                </span>
              )}
              <button
                onClick={onZoomIn}
                disabled={!canZoomIn}
                className="flex items-center justify-center size-7 hover:bg-muted disabled:opacity-30 transition-colors"
              >
                <ZoomInIcon className="size-3.5" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Search */}
      {onSearchChange && (
        <div className="relative">
          <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-7 w-36 pl-7 text-xs"
          />
        </div>
      )}

      {/* Baseline dropdown */}
      {onBaselineSave && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={activeBaselineId ? "secondary" : "outline"}
              size="sm"
              className="h-7 text-xs gap-1.5"
            >
              <BookmarkIcon className="size-3" />
              Baseline
              <ChevronDownIcon className="size-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuRadioGroup
              value={activeBaselineId ?? "none"}
              onValueChange={(v) => onBaselineSelect?.(v === "none" ? null : v)}
            >
              <DropdownMenuRadioItem value="none">
                No baseline
              </DropdownMenuRadioItem>
              {baselines?.map((b) => (
                <DropdownMenuRadioItem key={b.id} value={b.id} className="flex items-center justify-between">
                  <span className="truncate">{b.name}</span>
                  {onBaselineDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onBaselineDelete(b.id);
                      }}
                      className="ml-2 text-muted-foreground hover:text-destructive"
                    >
                      <TrashIcon className="size-3" />
                    </button>
                  )}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onBaselineSave}>
              <SaveIcon className="size-3.5 mr-2" />
              Save Current as Baseline
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Open Full View — only when embedded in project tab */}
      {fullViewUrl && (
        <Link
          href={fullViewUrl}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLinkIcon className="size-3" />
          Full View
        </Link>
      )}

      {/* Expand / Collapse */}
      <button
        onClick={onExpandAll}
        className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        Expand All
      </button>
      <button
        onClick={onCollapseAll}
        className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        Collapse All
      </button>

      {/* Row count badge */}
      {rowCount !== undefined && (
        <span className="text-[11px] text-muted-foreground/50 tabular-nums">
          {rowCount}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PillButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-1 text-[11px] font-semibold rounded-[5px] transition-colors",
        active
          ? "bg-foreground text-background shadow-sm"
          : "text-foreground/60 hover:text-foreground hover:bg-background/60"
      )}
    >
      {children}
    </button>
  );
}

function ToolbarIcon({
  active,
  onClick,
  tooltip,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  tooltip: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "inline-flex items-center justify-center size-7 rounded-md border transition-colors",
            active
              ? "bg-muted border-border text-foreground"
              : "bg-background border-border text-muted-foreground hover:text-foreground"
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
