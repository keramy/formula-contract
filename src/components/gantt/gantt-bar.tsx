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
// GANTT BAR — Three shapes: bracket (parent), rectangle (task), diamond (milestone)
// ============================================================================

/** Half-height bar for bracket/summary shape */
const BRACKET_BAR_HEIGHT = Math.round(TASK_BAR_HEIGHT * 0.45);
/** Triangle cap width for bracket shape */
const TRIANGLE_WIDTH = 8;

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
  showCriticalPath?: boolean;
  baselineLeft?: number;
  baselineWidth?: number;
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
  showCriticalPath,
  baselineLeft,
  baselineWidth,
  onDoubleClick,
  onClick,
  onContextMenu,
  linkMode,
  isLinkSource,
}: GanttBarProps) {
  const barTop = y + (ROW_HEIGHT - TASK_BAR_HEIGHT) / 2;

  // Critical path mode: dim non-critical, force red for critical
  const isCritical = item.isOnCriticalPath;
  const dimmed = showCriticalPath && !isCritical;
  const effectiveColor = showCriticalPath && isCritical ? "#dc2626" : color;

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
              style={{ backgroundColor: effectiveColor }}
            />
            <span
              className="text-[9px] font-medium italic whitespace-nowrap"
              style={{ color: effectiveColor }}
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

  // ── Phase: no bar ──
  if (item.type === "phase") return null;

  // ── Summary/Bracket bar: parent tasks with children ──
  if (hasChildren) {
    return <BracketBar
      item={item}
      left={left}
      width={width}
      y={y}
      color={effectiveColor}
      dimmed={dimmed}
      isSelected={isSelected}
      baselineLeft={baselineLeft}
      baselineWidth={baselineWidth}
      onDoubleClick={onDoubleClick}
      onClick={handleClick}
      onContextMenu={onContextMenu}
      linkMode={linkMode}
      isLinkSource={isLinkSource}
    />;
  }

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
      {/* Baseline ghost bar */}
      {baselineLeft !== undefined && baselineWidth !== undefined && (
        <div
          className="absolute rounded-[2px] pointer-events-none z-[9]"
          style={{
            left: baselineLeft,
            top: barTop + TASK_BAR_HEIGHT - 3,
            width: baselineWidth,
            height: 3,
            backgroundColor: "#9ca3af60",
          }}
        />
      )}

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
              backgroundColor: `${effectiveColor}${bgAlpha}`,
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
                backgroundColor: `${effectiveColor}${fillAlpha}`,
              }}
            />

            {/* Date range inside bar (wide bars only) */}
            {showDateInside && (
              <span
                className="absolute inset-0 flex items-center justify-center text-[9px] font-medium pointer-events-none"
                style={{
                  color: "rgba(255,255,255,0.85)",
                  textShadow: `0 0 3px ${effectiveColor}, 0 1px 2px rgba(0,0,0,0.4)`,
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
                  textShadow: `0 0 3px ${effectiveColor}, 0 1px 2px rgba(0,0,0,0.4)`,
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

// ---------------------------------------------------------------------------
// BracketBar — Summary/parent task: thin bar + triangle caps at each end
// ---------------------------------------------------------------------------

function BracketBar({
  item,
  left,
  width,
  y,
  color,
  dimmed,
  isSelected,
  baselineLeft,
  baselineWidth,
  onDoubleClick,
  onClick,
  onContextMenu,
  linkMode,
  isLinkSource,
}: {
  item: GanttItem;
  left: number;
  width: number;
  y: number;
  color: string;
  dimmed?: boolean;
  isSelected: boolean;
  baselineLeft?: number;
  baselineWidth?: number;
  onDoubleClick?: (item: GanttItem) => void;
  onClick?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent, item: GanttItem) => void;
  linkMode?: boolean;
  isLinkSource?: boolean;
}) {
  const bracketTop = y + (ROW_HEIGHT - TASK_BAR_HEIGHT) / 2;
  const barY = bracketTop;
  const progress = Math.min(Math.max(item.progress, 0), 100);

  // Triangle points: downward-pointing from bottom of thin bar
  const leftTriangle = `${left},${barY + BRACKET_BAR_HEIGHT} ${left},${barY + TASK_BAR_HEIGHT} ${left + TRIANGLE_WIDTH},${barY + BRACKET_BAR_HEIGHT}`;
  const rightTriangle = `${left + width},${barY + BRACKET_BAR_HEIGHT} ${left + width},${barY + TASK_BAR_HEIGHT} ${left + width - TRIANGLE_WIDTH},${barY + BRACKET_BAR_HEIGHT}`;

  return (
    <>
      {/* Baseline ghost bar */}
      {baselineLeft !== undefined && baselineWidth !== undefined && (
        <div
          className="absolute rounded-[1px] pointer-events-none z-[9]"
          style={{
            left: baselineLeft,
            top: barY + TASK_BAR_HEIGHT - 3,
            width: baselineWidth,
            height: 3,
            backgroundColor: "#9ca3af60",
          }}
        />
      )}

      {/* SVG bracket shape */}
      <svg
        className={cn(
          "absolute pointer-events-none z-10",
          dimmed && "opacity-25"
        )}
        style={{ left: 0, top: 0, width: "100%", height: "100%", overflow: "visible" }}
      >
        {/* Thin bar */}
        <rect
          x={left}
          y={barY}
          width={width}
          height={BRACKET_BAR_HEIGHT}
          fill={`${color}90`}
          rx={1}
        />
        {/* Progress fill */}
        {progress > 0 && (
          <rect
            x={left}
            y={barY}
            width={width * (progress / 100)}
            height={BRACKET_BAR_HEIGHT}
            fill={color}
            rx={1}
          />
        )}
        {/* Left triangle cap */}
        <polygon points={leftTriangle} fill={color} />
        {/* Right triangle cap */}
        <polygon points={rightTriangle} fill={color} />
      </svg>

      {/* Clickable overlay for interactions */}
      <div
        role="button"
        tabIndex={0}
        className={cn(
          "absolute select-none z-11 cursor-pointer",
          isSelected && "ring-1 ring-primary/70 rounded-sm",
          linkMode && "cursor-crosshair hover:ring-2 hover:ring-blue-400/60",
          isLinkSource && "ring-2 ring-blue-500 ring-offset-1"
        )}
        style={{
          left,
          top: barY,
          width,
          height: TASK_BAR_HEIGHT,
        }}
        onClick={onClick}
        onDoubleClick={() => onDoubleClick?.(item)}
        onKeyDown={(e) => { if (e.key === "Enter") onDoubleClick?.(item); }}
        onContextMenu={(e) => onContextMenu?.(e, item)}
      />

      {/* No outside labels — names are in the sidebar */}
    </>
  );
}
