"use client";

import * as React from "react";
import {
  type GanttDependency,
  type DependencyType,
  type BarPosition,
  DEPENDENCY_COLORS,
  ROW_HEIGHT,
  TASK_BAR_HEIGHT,
} from "./gantt-types";

// ============================================================================
// GANTT DEPENDENCY ARROWS — Animated SVG overlay with smooth bezier paths
// Features: draw-in animation, hover glow, rounded corners, click detection
// ============================================================================

interface GanttDependencyArrowsProps {
  dependencies: GanttDependency[];
  barPositions: Map<string, BarPosition>;
  containerWidth: number;
  containerHeight: number;
  onDependencyClick?: (dep: GanttDependency) => void;
}

const ARROW_SIZE = 5;
const RADIUS = 8;
const GAP = 12; // horizontal gap from bar edge before turning
/** Per-index offset for multiple arrows from the same source — keeps vertical
 *  segments from overlapping when one task has several outgoing deps. */
const FAN_OUT_OFFSET = 6;

export function GanttDependencyArrows({
  dependencies,
  barPositions,
  containerWidth,
  containerHeight,
  onDependencyClick,
}: GanttDependencyArrowsProps) {
  // Pre-compute fan-out index per dependency.
  // Arrows from the same source are sorted by target Y (top to bottom) and
  // assigned index 0, 1, 2... Each index translates to a small x-offset on
  // the vertical segment of the arrow, so they don't all overlap.
  const fanOutIndex = React.useMemo(() => {
    const bySource = new Map<string, GanttDependency[]>();
    for (const dep of dependencies) {
      const arr = bySource.get(dep.sourceId) || [];
      arr.push(dep);
      bySource.set(dep.sourceId, arr);
    }
    const index = new Map<string, number>();
    bySource.forEach((deps, sourceId) => {
      const sourcePos = barPositions.get(sourceId);
      // Stable sort: primarily by target Y, tiebreak by target X. Undefined
      // targets go last.
      const sorted = [...deps].sort((a, b) => {
        const ta = barPositions.get(a.targetId);
        const tb = barPositions.get(b.targetId);
        if (!ta && !tb) return 0;
        if (!ta) return 1;
        if (!tb) return -1;
        const dya = sourcePos ? Math.abs(ta.y - sourcePos.y) : ta.y;
        const dyb = sourcePos ? Math.abs(tb.y - sourcePos.y) : tb.y;
        if (dya !== dyb) return dya - dyb;
        return ta.left - tb.left;
      });
      sorted.forEach((d, i) => index.set(d.id, i));
    });
    return index;
  }, [dependencies, barPositions]);

  if (dependencies.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-20"
      width={containerWidth}
      height={containerHeight}
    >
      {/* CSS animations for arrow draw-in and hover effects */}
      <style>{`
        @keyframes gantt-draw-in {
          from { stroke-dashoffset: var(--path-length); }
          to   { stroke-dashoffset: 0; }
        }
        .gantt-arrow-path {
          animation: gantt-draw-in 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          stroke-dasharray: var(--path-length);
          stroke-dashoffset: var(--path-length);
        }
        .gantt-arrow-group:hover .gantt-arrow-visible {
          stroke-width: 2.5;
          filter: drop-shadow(0 0 4px var(--arrow-color));
          transition: stroke-width 0.2s ease, filter 0.2s ease;
        }
        .gantt-arrow-group:hover .gantt-arrow-hit {
          cursor: pointer;
        }
        .gantt-arrow-visible {
          transition: stroke-width 0.2s ease, filter 0.2s ease, opacity 0.3s ease;
        }
      `}</style>

      <defs>
        {/* Single arrowhead marker — refX=0 so line ends at arrow base, not tip */}
        <marker
          id="gantt-arrow"
          markerWidth={ARROW_SIZE}
          markerHeight={ARROW_SIZE}
          refX={1}
          refY={ARROW_SIZE / 2}
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d={`M0,0 L${ARROW_SIZE},${ARROW_SIZE / 2} L0,${ARROW_SIZE} Z`}
            fill={DEPENDENCY_COLORS[0]}
          />
        </marker>
      </defs>

      {dependencies.map((dep) => {
        const source = barPositions.get(dep.sourceId);
        const target = barPositions.get(dep.targetId);
        if (!source || !target) return null;

        const offsetIdx = fanOutIndex.get(dep.id) ?? 0;
        const path = buildPath(dep.type, source, target, offsetIdx, barPositions);
        if (!path) return null;

        const color = DEPENDENCY_COLORS[dep.type];
        const pathLength = estimatePathLength(dep.type, source, target);

        return (
          <g
            key={dep.id}
            className="gantt-arrow-group"
            style={{ "--arrow-color": color } as React.CSSProperties}
          >
            {/* Wide invisible click target */}
            <path
              d={path}
              fill="none"
              stroke="transparent"
              strokeWidth={14}
              className="pointer-events-auto gantt-arrow-hit cursor-pointer"
              onClick={() => onDependencyClick?.(dep)}
            />
            {/* Animated visible arrow */}
            <path
              d={path}
              fill="none"
              stroke={color}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              markerEnd="url(#gantt-arrow)"
              className="pointer-events-none gantt-arrow-path gantt-arrow-visible"
              style={{ "--path-length": pathLength } as React.CSSProperties}
            />
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Path length estimation (for stroke-dasharray animation)
// ---------------------------------------------------------------------------

function estimatePathLength(
  type: DependencyType,
  source: BarPosition,
  target: BarPosition
): number {
  let sx: number, tx: number;
  switch (type) {
    case 0: sx = source.left + source.width; tx = target.left; break;
    case 1: sx = source.left; tx = target.left; break;
    case 2: sx = source.left + source.width; tx = target.left + target.width; break;
    case 3: sx = source.left; tx = target.left + target.width; break;
    default: return 200;
  }
  const dx = Math.abs(tx - sx) + GAP * 2;
  const dy = Math.abs(target.y - source.y);
  // Manhattan distance + some extra for curves
  return Math.round(dx + dy + 40);
}

// ---------------------------------------------------------------------------
// Path building (same routing logic, now with smoother curves)
// ---------------------------------------------------------------------------

function buildPath(
  type: DependencyType,
  source: BarPosition,
  target: BarPosition,
  fanIdx: number,
  barPositions: Map<string, BarPosition>
): string | null {
  const sy = source.y;
  const ty = target.y;
  let sx: number, tx: number;

  switch (type) {
    case 0: // FS: source right → target left
      sx = source.left + source.width;
      tx = target.left - ARROW_SIZE;
      break;
    case 1: // SS: source left → target left
      sx = source.left;
      tx = target.left - ARROW_SIZE;
      break;
    case 2: // FF: source right → target right
      sx = source.left + source.width;
      tx = target.left + target.width + ARROW_SIZE;
      break;
    case 3: // SF: source left → target right
      sx = source.left;
      tx = target.left + target.width + ARROW_SIZE;
      break;
    default:
      return null;
  }

  const dy = ty - sy;
  const fanOffset = fanIdx * FAN_OUT_OFFSET;

  // Same row — straight line (no routing needed, no overlap possible)
  if (Math.abs(dy) < 2) {
    return `M${sx},${sy} L${tx},${ty}`;
  }

  // For each routing type, compute a "clear" base X that avoids bars in
  // intervening rows, then add the fan-out offset.
  switch (type) {
    case 0: {
      const baseMid = findClearX(sx + GAP, source, target, barPositions, "right");
      return buildFSPath(sx, sy, tx, ty, baseMid + fanOffset);
    }
    case 1: {
      const preferredLeft = Math.min(sx, tx) - GAP;
      const baseLeft = findClearX(preferredLeft, source, target, barPositions, "left");
      return buildSSPath(sx, sy, tx, ty, baseLeft - fanOffset);
    }
    case 2: {
      const preferredRight = Math.max(sx, tx) + GAP;
      const baseRight = findClearX(preferredRight, source, target, barPositions, "right");
      return buildFFPath(sx, sy, tx, ty, baseRight + fanOffset);
    }
    default: {
      const baseMid = findClearX((sx + tx) / 2, source, target, barPositions, "right");
      return buildGenericPath(sx, sy, tx, ty, baseMid + fanOffset);
    }
  }
}

/** Find an x coordinate for the arrow's vertical segment that doesn't cross
 *  bars in any intervening row. Shift past obstructing bars by GAP in the
 *  requested direction. Caps iterations to guard against pathological cases. */
function findClearX(
  preferredX: number,
  source: BarPosition,
  target: BarPosition,
  barPositions: Map<string, BarPosition>,
  direction: "right" | "left"
): number {
  const PADDING = 4;
  const minRow = Math.min(source.rowIndex, target.rowIndex);
  const maxRow = Math.max(source.rowIndex, target.rowIndex);

  // Collect padded x-ranges of bars in rows between source and target (exclusive)
  const obstacles: Array<{ left: number; right: number }> = [];
  barPositions.forEach((bar) => {
    if (bar.rowIndex > minRow && bar.rowIndex < maxRow) {
      obstacles.push({
        left: bar.left - PADDING,
        right: bar.left + bar.width + PADDING,
      });
    }
  });

  if (obstacles.length === 0) return preferredX;

  let x = preferredX;
  for (let i = 0; i < 20; i++) {
    let shifted = false;
    for (const ob of obstacles) {
      if (x >= ob.left && x <= ob.right) {
        x = direction === "right" ? ob.right + GAP : ob.left - GAP;
        shifted = true;
      }
    }
    if (!shifted) break;
  }
  return x;
}

/** FS: right of source → left of target, L-shape or S-shape.
 *  `midX` is the precomputed vertical-segment x (already bar-avoiding + fan-staggered). */
function buildFSPath(sx: number, sy: number, tx: number, ty: number, midX: number): string {
  const dy = ty - sy;
  const yDir = dy > 0 ? 1 : -1;
  const r = Math.min(RADIUS, Math.abs(dy) / 2);

  if (tx > midX) {
    return [
      `M${sx},${sy}`,
      `L${midX - r},${sy}`,
      `Q${midX},${sy} ${midX},${sy + r * yDir}`,
      `L${midX},${ty - r * yDir}`,
      `Q${midX},${ty} ${midX + r},${ty}`,
      `L${tx},${ty}`,
    ].join(" ");
  }

  // S-shape when target is to the left
  const halfY = sy + dy / 2;
  const leftX = Math.min(midX, tx - GAP);

  return [
    `M${sx},${sy}`,
    `L${midX - r},${sy}`,
    `Q${midX},${sy} ${midX},${sy + r * yDir}`,
    `L${midX},${halfY - r * yDir}`,
    `Q${midX},${halfY} ${midX - r},${halfY}`,
    `L${leftX + r},${halfY}`,
    `Q${leftX},${halfY} ${leftX},${halfY + r * yDir}`,
    `L${leftX},${ty - r * yDir}`,
    `Q${leftX},${ty} ${leftX + r},${ty}`,
    `L${tx},${ty}`,
  ].join(" ");
}

/** SS: left of source → left of target. `leftX` is precomputed. */
function buildSSPath(sx: number, sy: number, tx: number, ty: number, leftX: number): string {
  const dy = ty - sy;
  const yDir = dy > 0 ? 1 : -1;
  const r = Math.min(RADIUS, Math.abs(dy) / 2);

  return [
    `M${sx},${sy}`,
    `L${leftX + r},${sy}`,
    `Q${leftX},${sy} ${leftX},${sy + r * yDir}`,
    `L${leftX},${ty - r * yDir}`,
    `Q${leftX},${ty} ${leftX + r},${ty}`,
    `L${tx},${ty}`,
  ].join(" ");
}

/** FF: right of source → right of target. `rightX` is precomputed. */
function buildFFPath(sx: number, sy: number, tx: number, ty: number, rightX: number): string {
  const dy = ty - sy;
  const yDir = dy > 0 ? 1 : -1;
  const r = Math.min(RADIUS, Math.abs(dy) / 2);

  return [
    `M${sx},${sy}`,
    `L${rightX - r},${sy}`,
    `Q${rightX},${sy} ${rightX},${sy + r * yDir}`,
    `L${rightX},${ty - r * yDir}`,
    `Q${rightX},${ty} ${rightX - r},${ty}`,
    `L${tx},${ty}`,
  ].join(" ");
}

/** Generic fallback (SF and edge cases). `midX` is precomputed. */
function buildGenericPath(sx: number, sy: number, tx: number, ty: number, midX: number): string {
  const dy = ty - sy;
  const yDir = dy > 0 ? 1 : -1;
  const r = Math.min(RADIUS, Math.abs(dy) / 2, Math.abs(tx - sx) / 4 || RADIUS);

  return [
    `M${sx},${sy}`,
    `L${midX - r},${sy}`,
    `Q${midX},${sy} ${midX},${sy + r * yDir}`,
    `L${midX},${ty - r * yDir}`,
    `Q${midX},${ty} ${midX + r * (tx > sx ? 1 : -1)},${ty}`,
    `L${tx},${ty}`,
  ].join(" ");
}
