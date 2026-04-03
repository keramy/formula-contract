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
  onContextMenu?: (e: React.MouseEvent, item: GanttItem) => void;
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
  onContextMenu,
}: GanttBarProps) {
  const barTop = y + (ROW_HEIGHT - TASK_BAR_HEIGHT) / 2;

  // Critical path mode: dim non-critical, force red for critical
  const isCritical = item.isOnCriticalPath;
  const dimmed = showCriticalPath && !isCritical;
  const effectiveColor = showCriticalPath && isCritical ? "#dc2626" : color;

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
              dimmed && "opacity-25"
            )}
            style={{
              left: left - 7,
              top: barTop,
              height: TASK_BAR_HEIGHT,
            }}
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
      onContextMenu={onContextMenu}
    />;
  }

  // ── Regular task bar ──
  const progress = Math.min(Math.max(item.progress, 0), 100);
  const isDeep = depth >= 2;
  // Background alpha by depth
  const bgAlpha = depth === 0 ? "80" : depth === 1 ? "40" : "20";
  // Fill alpha by depth
  const fillAlpha = depth === 0 ? "ff" : depth === 1 ? "8c" : "4d";
  // Bar label: inside for wide bars, right-side for narrow
  const showNameInside = width > 120;
  const showNameOutside = !showNameInside && width > 20;
  const showProgress = width > 50 && progress > 0;

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
              "absolute rounded-[2px] select-none z-10",
              "transition-shadow duration-150",
              isSelected && "ring-1 ring-primary/70",
              "cursor-pointer",
              isDeep ? "border border-dashed bg-transparent" : "overflow-hidden",
              dimmed && "opacity-25"
            )}
            style={{
              left,
              top: barTop,
              width,
              height: TASK_BAR_HEIGHT,
              ...(isDeep
                ? { borderColor: `${effectiveColor}b3` }
                : { backgroundColor: `${effectiveColor}${bgAlpha}` }),
            }}
            onDoubleClick={() => onDoubleClick?.(item)}
            onKeyDown={(e) => { if (e.key === "Enter") onDoubleClick?.(item); }}
            onContextMenu={(e) => onContextMenu?.(e, item)}
            onMouseMove={handleMouseMove}
          >
            {/* Progress fill */}
            <div
              className="h-full rounded-[2px] transition-all duration-300"
              style={{
                width: `${progress}%`,
                backgroundColor: `${effectiveColor}${fillAlpha}`,
              }}
            />

            {/* Name label INSIDE bar (for wide bars) */}
            {showNameInside && (
              <span className="absolute inset-0 flex items-center px-2 text-[9px] font-medium text-white truncate mix-blend-difference pointer-events-none">
                {item.name}
                {showProgress && ` · ${Math.round(progress)}%`}
              </span>
            )}

            {/* Progress-only label (medium bars without name) */}
            {!showNameInside && showProgress && (
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-white mix-blend-difference pointer-events-none">
                {Math.round(progress)}%
              </span>
            )}

          </div>
        </TooltipTrigger>
        <TooltipContent side="top" align="start" alignOffset={mouseX - 40} sideOffset={8} className="text-xs">
          <p className="font-medium">{item.name}</p>
          <p className="text-muted-foreground">
            {item.startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            {" — "}
            {item.endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
          <p className="text-muted-foreground">{formatDuration(item)} · {Math.round(progress)}%</p>
        </TooltipContent>
      </Tooltip>

      {/* Name label OUTSIDE bar (for narrow bars) */}
      {showNameOutside && (
        <span
          className={cn(
            "absolute text-[9px] font-medium whitespace-nowrap pointer-events-none z-10 truncate",
            dimmed && "opacity-25"
          )}
          style={{
            left: left + width + 6,
            top: barTop,
            height: TASK_BAR_HEIGHT,
            lineHeight: `${TASK_BAR_HEIGHT}px`,
            color: effectiveColor,
            maxWidth: 150,
          }}
        >
          {item.name}
        </span>
      )}
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
  onContextMenu,
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
  onContextMenu?: (e: React.MouseEvent, item: GanttItem) => void;
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
          isSelected && "ring-1 ring-primary/70 rounded-sm"
        )}
        style={{
          left,
          top: barY,
          width,
          height: TASK_BAR_HEIGHT,
        }}
        onDoubleClick={() => onDoubleClick?.(item)}
        onKeyDown={(e) => { if (e.key === "Enter") onDoubleClick?.(item); }}
        onContextMenu={(e) => onContextMenu?.(e, item)}
      />

      {/* Name label to the right */}
      {width > 20 && (
        <span
          className={cn(
            "absolute text-[9px] font-semibold whitespace-nowrap pointer-events-none z-10",
            dimmed && "opacity-25"
          )}
          style={{
            left: left + width + 6,
            top: barY,
            height: TASK_BAR_HEIGHT,
            lineHeight: `${TASK_BAR_HEIGHT}px`,
            color,
            maxWidth: 150,
          }}
        >
          {item.name}
        </span>
      )}
    </>
  );
}
