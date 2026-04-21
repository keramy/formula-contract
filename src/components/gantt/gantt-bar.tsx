"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  type GanttItem,
  TASK_BAR_HEIGHT,
  ROW_HEIGHT,
  formatDuration,
} from "./gantt-types";

// ============================================================================
// GANTT BAR — Three shapes: phase (thick rounded), rectangle (task), diamond (milestone)
// ============================================================================

/** Phase bar — taller than task bars so phases pop visually when toggled on */
const PHASE_BAR_HEIGHT = TASK_BAR_HEIGHT + 6;

export interface GanttBarProps {
  item: GanttItem;
  left: number;
  width: number;
  y: number;
  color: string;
  depth: number;
  hasChildren: boolean;
  isSelected: boolean;
  isEditable: boolean;
  showPhases?: boolean;
  onDoubleClick?: (item: GanttItem) => void;
  onClick?: (item: GanttItem) => void;
  onContextMenu?: (e: React.MouseEvent, item: GanttItem) => void;
  linkMode?: boolean;
  isLinkSource?: boolean;
}

export function GanttBar({
  item,
  left,
  width,
  y,
  color,
  depth,
  hasChildren,
  isSelected,
  isEditable,
  showPhases,
  onDoubleClick,
  onClick,
  onContextMenu,
  linkMode,
  isLinkSource,
}: GanttBarProps) {
  const barTop = y + (ROW_HEIGHT - TASK_BAR_HEIGHT) / 2;

  // Phase-focus mode: dim everything that isn't a phase
  const dimmed = showPhases && item.type !== "phase";

  // Link mode: handle single-click to select source/target
  const handleClick = React.useCallback(
    (e: React.MouseEvent) => {
      if (linkMode && onClick) {
        e.stopPropagation();
        onClick(item);
      }
    },
    [linkMode, onClick, item]
  );

  // Track mouse X for tooltip positioning
  const [mouseX, setMouseX] = React.useState(0);
  const barRef = React.useRef<HTMLDivElement>(null);
  const handleMouseMove = React.useCallback((e: React.MouseEvent) => {
    if (barRef.current) {
      setMouseX(e.clientX - barRef.current.getBoundingClientRect().left);
    }
  }, []);

  // ── Milestone: diamond + label ──
  if (item.type === "milestone") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "absolute flex items-center gap-1.5 select-none z-10 cursor-pointer",
              isSelected && "ring-1 ring-primary/50 rounded-sm",
              dimmed && "opacity-25",
              linkMode && "cursor-crosshair",
              isLinkSource && "ring-2 ring-blue-500 ring-offset-1 rounded-sm"
            )}
            style={{
              left: left - 7,
              top: barTop,
              height: TASK_BAR_HEIGHT,
            }}
            onClick={handleClick}
            onDoubleClick={() => onDoubleClick?.(item)}
            onContextMenu={(e) => onContextMenu?.(e, item)}
          >
            <div
              className="size-2.5 rotate-45"
              style={{ backgroundColor: color }}
            />
            <span
              className="text-[9px] font-medium italic whitespace-nowrap"
              style={{ color: color }}
            >
              {item.name}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p className="font-medium">{item.name}</p>
          <p className="text-muted-foreground">
            {item.startDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // ── Phase: only render when phase-focus mode is on. Distinctive thick bar. ──
  if (item.type === "phase") {
    if (!showPhases) return null;
    const phaseBarTop = y + (ROW_HEIGHT - PHASE_BAR_HEIGHT) / 2;
    const showLabelInside = width > 120;
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            role="button"
            tabIndex={0}
            className={cn(
              "absolute rounded-md select-none z-10 cursor-pointer shadow-sm overflow-hidden",
              "transition-shadow duration-150",
              isSelected && "ring-2 ring-primary/70",
              linkMode && "cursor-crosshair",
              isLinkSource && "ring-2 ring-blue-500 ring-offset-1"
            )}
            style={{
              left,
              top: phaseBarTop,
              width,
              height: PHASE_BAR_HEIGHT,
              backgroundColor: color,
              opacity: 0.9,
            }}
            onClick={handleClick}
            onDoubleClick={() => onDoubleClick?.(item)}
            onKeyDown={(e) => { if (e.key === "Enter") onDoubleClick?.(item); }}
            onContextMenu={(e) => onContextMenu?.(e, item)}
          >
            {showLabelInside && (
              <span
                className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold uppercase tracking-wide pointer-events-none"
                style={{
                  color: "rgba(255,255,255,0.95)",
                  textShadow: "0 1px 2px rgba(0,0,0,0.35)",
                }}
              >
                {item.name}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p className="font-medium">{item.name}</p>
          <p className="text-muted-foreground">
            {item.startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            {" → "}
            {item.endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            {" · "}
            {formatDuration(item)}
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Non-phase items (tasks + parent tasks with children) all fall through to the
  // regular bar rendering below. Bracket/triangle shape removed — parent tasks
  // now render as standard bars spanning their children's aggregate range.

  // ── Regular task bar ──
  const progress = Math.min(Math.max(item.progress, 0), 100);
  // Fix 6: All depths use solid fill — deeper = lower opacity (no dashed borders)
  const bgAlpha = depth === 0 ? "70" : depth === 1 ? "50" : "35";
  const fillAlpha = depth === 0 ? "cc" : depth === 1 ? "90" : "70";
  // Bar labels — names removed (shown in sidebar), only dates + progress on bar
  const showDateInside = width > 120;
  const showProgress = width > 50 && progress > 0;

  // Date formatting for inline display
  const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const dateLabel = `${fmtDate(item.startDate)} — ${fmtDate(item.endDate)}`;

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            ref={barRef}
            role="button"
            tabIndex={0}
            className={cn(
              "absolute rounded-[3px] select-none z-10 overflow-hidden",
              "transition-shadow duration-150",
              isSelected && "ring-1 ring-primary/70",
              "cursor-pointer",
              dimmed && "opacity-25",
              linkMode && "cursor-crosshair hover:ring-2 hover:ring-blue-400/60",
              isLinkSource && "ring-2 ring-blue-500 ring-offset-1"
            )}
            style={{
              left,
              top: barTop,
              width,
              height: TASK_BAR_HEIGHT,
              backgroundColor: `${color}${bgAlpha}`,
            }}
            onClick={handleClick}
            onDoubleClick={() => onDoubleClick?.(item)}
            onKeyDown={(e) => { if (e.key === "Enter") onDoubleClick?.(item); }}
            onContextMenu={(e) => onContextMenu?.(e, item)}
            onMouseMove={handleMouseMove}
          >
            {/* Progress fill */}
            <div
              className="h-full rounded-[3px] transition-all duration-300"
              style={{
                width: `${progress}%`,
                backgroundColor: `${color}${fillAlpha}`,
              }}
            />

            {/* Date range inside bar (wide bars only) */}
            {showDateInside && (
              <span
                className="absolute inset-0 flex items-center justify-center text-[9px] font-medium pointer-events-none"
                style={{
                  color: "rgba(255,255,255,0.85)",
                  textShadow: `0 0 3px ${color}, 0 1px 2px rgba(0,0,0,0.4)`,
                }}
              >
                {dateLabel}
                {showProgress && ` · ${Math.round(progress)}%`}
              </span>
            )}

            {/* Progress-only label (medium bars without date) */}
            {!showDateInside && showProgress && (
              <span
                className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold pointer-events-none"
                style={{
                  color: "rgba(255,255,255,0.85)",
                  textShadow: `0 0 3px ${color}, 0 1px 2px rgba(0,0,0,0.4)`,
                }}
              >
                {Math.round(progress)}%
              </span>
            )}

            {/* Link mode connection dots on bar edges */}
            {linkMode && (
              <>
                <div className="absolute -left-[4px] top-1/2 -translate-y-1/2 size-[8px] rounded-full bg-blue-500 border-2 border-white shadow-sm pointer-events-none z-20" />
                <div className="absolute -right-[4px] top-1/2 -translate-y-1/2 size-[8px] rounded-full bg-blue-500 border-2 border-white shadow-sm pointer-events-none z-20" />
              </>
            )}

          </div>
        </TooltipTrigger>
        <TooltipContent side="top" align="start" alignOffset={mouseX - 40} sideOffset={8} className="text-xs">
          <p className="font-medium">{item.name}</p>
          <p className="text-muted-foreground">{dateLabel}</p>
          <p className="text-muted-foreground">{formatDuration(item)} · {Math.round(progress)}%</p>
        </TooltipContent>
      </Tooltip>

      {/* No outside labels — names are in the sidebar */}
    </>
  );
}

