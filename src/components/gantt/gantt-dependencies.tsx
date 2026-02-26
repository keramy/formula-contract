"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  type GanttItem,
  type GanttDependency,
  type DependencyType,
  DEPENDENCY_SHORT_LABELS,
} from "./types";

// ============================================================================
// GANTT DEPENDENCIES - SVG arrows connecting linked items
// ============================================================================

export interface BarPosition {
  left: number;
  width: number;
  top: number;
}

export interface GanttDependenciesProps {
  dependencies: GanttDependency[];
  items: GanttItem[];
  getBarPosition: (itemId: string) => BarPosition | null;
  rowHeight: number;
  totalHeight: number;
  totalWidth: number;
  selectedDependencyId?: string | null;
  onDependencyClick?: (dependency: GanttDependency) => void;
  className?: string;
}

// Colors for different dependency types
const DEPENDENCY_COLORS: Record<DependencyType, string> = {
  0: "#6b7280", // FS - gray
  1: "#2563eb", // SS - blue
  2: "#16a34a", // FF - green
  3: "#dc2626", // SF - red
};

/**
 * Calculate SVG path for a dependency arrow
 *
 * For each dependency type:
 * - FS (Finish-to-Start): Source right edge → Target left edge
 * - SS (Start-to-Start): Source left edge → Target left edge
 * - FF (Finish-to-Finish): Source right edge → Target right edge
 * - SF (Start-to-Finish): Source left edge → Target right edge
 */
function calculateDependencyPath(
  source: BarPosition,
  target: BarPosition,
  type: DependencyType,
  rowHeight: number
): { path: string; startX: number; startY: number; endX: number; endY: number } {
  // Calculate vertical centers
  const sourceY = source.top + rowHeight / 2;
  const targetY = target.top + rowHeight / 2;

  // Calculate horizontal connection points based on type
  let startX: number;
  let endX: number;

  switch (type) {
    case 0: // FS: right to left
      startX = source.left + source.width;
      endX = target.left;
      break;
    case 1: // SS: left to left
      startX = source.left;
      endX = target.left;
      break;
    case 2: // FF: right to right
      startX = source.left + source.width;
      endX = target.left + target.width;
      break;
    case 3: // SF: left to right
      startX = source.left;
      endX = target.left + target.width;
      break;
    default:
      startX = source.left + source.width;
      endX = target.left;
  }

  // Create path with rounded corners
  const horizontalGap = 15; // Minimum horizontal distance from bar
  const verticalGap = 5; // Minimum vertical distance from bar

  // Direction detection
  const goingRight = endX >= startX;
  const goingDown = targetY >= sourceY;

  // Adjusted start/end points with gap
  const adjustedStartX =
    type === 1 || type === 3 ? startX - horizontalGap : startX + horizontalGap;
  const adjustedEndX =
    type === 0 || type === 1 ? endX - horizontalGap : endX + horizontalGap;

  // Calculate path based on direction
  let path: string;

  if (Math.abs(sourceY - targetY) < rowHeight / 2) {
    // Same row or close - simple horizontal connection
    path = `M ${startX} ${sourceY}
            L ${adjustedStartX} ${sourceY}
            L ${adjustedEndX} ${targetY}
            L ${endX} ${targetY}`;
  } else {
    // Different rows - create step path
    const midX = (adjustedStartX + adjustedEndX) / 2;

    if ((goingRight && (type === 0 || type === 2)) || (!goingRight && (type === 1 || type === 3))) {
      // Natural flow - simple step
      path = `M ${startX} ${sourceY}
              L ${adjustedStartX} ${sourceY}
              Q ${adjustedStartX + 5} ${sourceY} ${adjustedStartX + 5} ${sourceY + (goingDown ? 5 : -5)}
              L ${adjustedStartX + 5} ${targetY + (goingDown ? -5 : 5)}
              Q ${adjustedStartX + 5} ${targetY} ${adjustedStartX + 10} ${targetY}
              L ${endX} ${targetY}`;
    } else {
      // Overlapping - need extra routing
      const routeY = goingDown ? sourceY + rowHeight / 2 + verticalGap : sourceY - rowHeight / 2 - verticalGap;

      path = `M ${startX} ${sourceY}
              L ${adjustedStartX} ${sourceY}
              Q ${adjustedStartX + 5} ${sourceY} ${adjustedStartX + 5} ${routeY > sourceY ? sourceY + 5 : sourceY - 5}
              L ${adjustedStartX + 5} ${routeY}
              L ${midX} ${routeY}
              L ${adjustedEndX - 5} ${routeY}
              L ${adjustedEndX - 5} ${targetY + (routeY > targetY ? 5 : -5)}
              Q ${adjustedEndX - 5} ${targetY} ${adjustedEndX} ${targetY}
              L ${endX} ${targetY}`;
    }
  }

  return { path, startX, startY: sourceY, endX, endY: targetY };
}

export function GanttDependencies({
  dependencies,
  items,
  getBarPosition,
  rowHeight,
  totalHeight,
  totalWidth,
  selectedDependencyId,
  onDependencyClick,
  className,
}: GanttDependenciesProps) {
  // Build item map for quick lookup
  const itemMap = React.useMemo(() => {
    const map = new Map<string, GanttItem>();
    items.forEach((item) => map.set(item.id, item));
    return map;
  }, [items]);

  // Calculate paths for all dependencies
  const dependencyPaths = React.useMemo(() => {
    return dependencies
      .map((dep) => {
        // Get bar positions using timelineId if available
        const sourceItem = itemMap.get(dep.sourceId);
        const targetItem = itemMap.get(dep.targetId);

        if (!sourceItem || !targetItem) return null;

        const sourcePos = getBarPosition(sourceItem.timelineId || sourceItem.id);
        const targetPos = getBarPosition(targetItem.timelineId || targetItem.id);

        if (!sourcePos || !targetPos) return null;

        const { path, startX, startY, endX, endY } = calculateDependencyPath(
          sourcePos,
          targetPos,
          dep.type,
          rowHeight
        );

        return {
          dependency: dep,
          path,
          startX,
          startY,
          endX,
          endY,
          color: DEPENDENCY_COLORS[dep.type],
        };
      })
      .filter(Boolean);
  }, [dependencies, itemMap, getBarPosition, rowHeight]);

  if (dependencies.length === 0) return null;

  return (
    <svg
      className={cn(
        "absolute inset-0 pointer-events-none overflow-visible",
        className
      )}
      style={{ width: totalWidth, height: totalHeight }}
    >
      {/* Arrow marker definitions */}
      <defs>
        {Object.entries(DEPENDENCY_COLORS).map(([type, color]) => (
          <marker
            key={`arrow-${type}`}
            id={`arrow-${type}`}
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="5"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
          </marker>
        ))}
        {/* Selected/hover variant */}
        <marker
          id="arrow-selected"
          markerWidth="10"
          markerHeight="10"
          refX="8"
          refY="5"
          orient="auto"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb" />
        </marker>
      </defs>

      {/* Dependency paths */}
      {dependencyPaths.map((item) => {
        if (!item) return null;

        const { dependency, path, endX, endY, color } = item;
        const isSelected = selectedDependencyId === dependency.id;

        return (
          <g key={dependency.id} className="group">
            {/* Invisible wider path for easier clicking */}
            <path
              d={path}
              fill="none"
              stroke="transparent"
              strokeWidth={12}
              className="pointer-events-auto cursor-pointer"
              onClick={() => onDependencyClick?.(dependency)}
            />

            {/* Visible path */}
            <path
              d={path}
              fill="none"
              stroke={isSelected ? "#2563eb" : color}
              strokeWidth={isSelected ? 2.5 : 1.5}
              strokeDasharray={dependency.lagDays !== 0 ? "4 2" : undefined}
              markerEnd={`url(#arrow-${isSelected ? "selected" : dependency.type})`}
              className={cn(
                "transition-all pointer-events-none",
                !isSelected && "group-hover:stroke-[#2563eb] group-hover:stroke-[2.5px]"
              )}
            />

            {/* Lag label (if non-zero) */}
            {dependency.lagDays !== 0 && (
              <text
                x={(item.startX + endX) / 2}
                y={endY - 8}
                fontSize={10}
                fill={isSelected ? "#2563eb" : color}
                textAnchor="middle"
                className="pointer-events-none font-medium"
              >
                {dependency.lagDays > 0 ? `+${dependency.lagDays}d` : `${dependency.lagDays}d`}
              </text>
            )}

            {/* Type label on hover */}
            <text
              x={endX - 20}
              y={endY - 8}
              fontSize={9}
              fill={isSelected ? "#2563eb" : color}
              textAnchor="middle"
              className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {DEPENDENCY_SHORT_LABELS[dependency.type]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

