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
// GANTT DEPENDENCY ARROWS — SVG overlay with rounded-corner paths
// Figma: gray for FS, blue for SS, single continuous path, 8px radius corners
// ============================================================================

interface GanttDependencyArrowsProps {
  dependencies: GanttDependency[];
  barPositions: Map<string, BarPosition>;
  containerWidth: number;
  containerHeight: number;
  onDependencyClick?: (dep: GanttDependency) => void;
}

const ARROW_SIZE = 6;
const RADIUS = 8;
const GAP = 12; // horizontal gap from bar edge before turning

export function GanttDependencyArrows({
  dependencies,
  barPositions,
  containerWidth,
  containerHeight,
  onDependencyClick,
}: GanttDependencyArrowsProps) {
  if (dependencies.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-20"
      width={containerWidth}
      height={containerHeight}
    >
      <defs>
        {([0, 1, 2, 3] as DependencyType[]).map((type) => (
          <marker
            key={type}
            id={`gantt-arrow-${type}`}
            markerWidth={ARROW_SIZE}
            markerHeight={ARROW_SIZE}
            refX={ARROW_SIZE}
            refY={ARROW_SIZE / 2}
            orient="auto"
          >
            <path
              d={`M0,0 L${ARROW_SIZE},${ARROW_SIZE / 2} L0,${ARROW_SIZE} Z`}
              fill={DEPENDENCY_COLORS[type]}
            />
          </marker>
        ))}
      </defs>

      {dependencies.map((dep) => {
        const source = barPositions.get(dep.sourceId);
        const target = barPositions.get(dep.targetId);
        if (!source || !target) return null;

        const path = buildPath(dep.type, source, target);
        if (!path) return null;

        const color = DEPENDENCY_COLORS[dep.type];

        return (
          <g key={dep.id}>
            {/* Wide invisible click target */}
            <path
              d={path}
              fill="none"
              stroke="transparent"
              strokeWidth={14}
              className="pointer-events-auto cursor-pointer"
              onClick={() => onDependencyClick?.(dep)}
            />
            {/* Visible arrow */}
            <path
              d={path}
              fill="none"
              stroke={color}
              strokeWidth={1.5}
              markerEnd={`url(#gantt-arrow-${dep.type})`}
              className="pointer-events-none"
            />
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Path building
// ---------------------------------------------------------------------------

function buildPath(
  type: DependencyType,
  source: BarPosition,
  target: BarPosition
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

  // Same row — straight line
  if (Math.abs(dy) < 2) {
    return `M${sx},${sy} L${tx},${ty}`;
  }

  // Route based on type
  switch (type) {
    case 0:
      return buildFSPath(sx, sy, tx, ty);
    case 1:
      return buildSSPath(sx, sy, tx, ty);
    case 2:
      return buildFFPath(sx, sy, tx, ty);
    default:
      return buildGenericPath(sx, sy, tx, ty);
  }
}

/** FS: right of source → left of target, L-shape or S-shape */
function buildFSPath(sx: number, sy: number, tx: number, ty: number): string {
  const midX = sx + GAP;
  const dy = ty - sy;
  const yDir = dy > 0 ? 1 : -1;
  const r = Math.min(RADIUS, Math.abs(dy) / 2);

  if (tx > midX) {
    // Clean L-shape
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

/** SS: left of source → left of target */
function buildSSPath(sx: number, sy: number, tx: number, ty: number): string {
  const dy = ty - sy;
  const yDir = dy > 0 ? 1 : -1;
  const r = Math.min(RADIUS, Math.abs(dy) / 2);
  const leftX = Math.min(sx, tx) - GAP;

  return [
    `M${sx},${sy}`,
    `L${leftX + r},${sy}`,
    `Q${leftX},${sy} ${leftX},${sy + r * yDir}`,
    `L${leftX},${ty - r * yDir}`,
    `Q${leftX},${ty} ${leftX + r},${ty}`,
    `L${tx},${ty}`,
  ].join(" ");
}

/** FF: right of source → right of target */
function buildFFPath(sx: number, sy: number, tx: number, ty: number): string {
  const dy = ty - sy;
  const yDir = dy > 0 ? 1 : -1;
  const r = Math.min(RADIUS, Math.abs(dy) / 2);
  const rightX = Math.max(sx, tx) + GAP;

  return [
    `M${sx},${sy}`,
    `L${rightX - r},${sy}`,
    `Q${rightX},${sy} ${rightX},${sy + r * yDir}`,
    `L${rightX},${ty - r * yDir}`,
    `Q${rightX},${ty} ${rightX - r},${ty}`,
    `L${tx},${ty}`,
  ].join(" ");
}

/** Generic fallback (SF and edge cases) */
function buildGenericPath(sx: number, sy: number, tx: number, ty: number): string {
  const dy = ty - sy;
  const yDir = dy > 0 ? 1 : -1;
  const midX = (sx + tx) / 2;
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
