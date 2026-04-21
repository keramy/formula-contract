"use client";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  type GanttItem,
  type Priority,
  type PhaseKey,
  PRIORITY_LABELS,
  PHASE_LABELS,
  PHASE_COLORS,
  PHASE_ORDER,
} from "./gantt-types";
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  DiamondIcon,
  AlertTriangleIcon,
  LayersIcon,
  PaletteIcon,
} from "lucide-react";

// ============================================================================
// GANTT CONTEXT MENU — Right-click menu for task actions
// ============================================================================

// Curated task-color palette. First entry ("none") resets to phase color.
const COLOR_PALETTE: Array<{ value: string | null; name: string; swatch: string }> = [
  { value: null, name: "None (phase color)", swatch: "transparent" },
  { value: "#0d9488", name: "Teal", swatch: "#0d9488" },
  { value: "#3b82f6", name: "Blue", swatch: "#3b82f6" },
  { value: "#6366f1", name: "Indigo", swatch: "#6366f1" },
  { value: "#a855f7", name: "Purple", swatch: "#a855f7" },
  { value: "#ec4899", name: "Pink", swatch: "#ec4899" },
  { value: "#ef4444", name: "Red", swatch: "#ef4444" },
  { value: "#f97316", name: "Orange", swatch: "#f97316" },
  { value: "#f59e0b", name: "Amber", swatch: "#f59e0b" },
  { value: "#16a34a", name: "Green", swatch: "#16a34a" },
  { value: "#64748b", name: "Slate", swatch: "#64748b" },
];

export interface GanttContextMenuProps {
  children: React.ReactNode;
  item: GanttItem | null;
  onEdit?: (item: GanttItem) => void;
  onDelete?: (item: GanttItem) => void;
  onAddSubtask?: (parentId: string) => void;
  onConvertToMilestone?: (item: GanttItem) => void;
  onSetPriority?: (item: GanttItem, priority: Priority) => void;
  onSetPhase?: (item: GanttItem, phase: PhaseKey) => void;
  onSetColor?: (item: GanttItem, color: string | null) => void;
}

export function GanttContextMenu({
  children,
  item,
  onEdit,
  onDelete,
  onAddSubtask,
  onConvertToMilestone,
  onSetPriority,
  onSetPhase,
  onSetColor,
}: GanttContextMenuProps) {
  if (!item || !item.isEditable) {
    return <>{children}</>;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div>{children}</div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        {/* Edit */}
        {onEdit && (
          <ContextMenuItem onClick={() => onEdit(item)}>
            <PencilIcon className="size-3.5 mr-2" />
            Edit Task
          </ContextMenuItem>
        )}

        {/* Add Subtask */}
        {onAddSubtask && item.type !== "milestone" && (
          <ContextMenuItem onClick={() => onAddSubtask(item.timelineId || item.id)}>
            <PlusIcon className="size-3.5 mr-2" />
            Add Subtask
          </ContextMenuItem>
        )}

        <ContextMenuSeparator />

        {/* Convert to Milestone */}
        {onConvertToMilestone && item.type === "task" && (
          <ContextMenuItem onClick={() => onConvertToMilestone(item)}>
            <DiamondIcon className="size-3.5 mr-2" />
            Convert to Milestone
          </ContextMenuItem>
        )}

        {/* Set Phase submenu */}
        {onSetPhase && item.type !== "milestone" && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <LayersIcon className="size-3.5 mr-2" />
              Set Phase
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-52">
              {PHASE_ORDER.map((key) => (
                <ContextMenuItem
                  key={key}
                  onClick={() => onSetPhase(item, key)}
                  className={item.phaseKey === key ? "bg-muted" : ""}
                >
                  <span
                    className="size-2.5 rounded-full mr-2 shrink-0"
                    style={{ backgroundColor: PHASE_COLORS[key] }}
                  />
                  {PHASE_LABELS[key]}
                  {item.phaseKey === key && (
                    <span className="ml-auto text-xs text-muted-foreground">current</span>
                  )}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}

        {/* Set Color submenu */}
        {onSetColor && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <PaletteIcon className="size-3.5 mr-2" />
              Set Color
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-48">
              {COLOR_PALETTE.map((c) => (
                <ContextMenuItem
                  key={c.name}
                  onClick={() => onSetColor(item, c.value)}
                  className={item.color === c.value ? "bg-muted" : ""}
                >
                  <span
                    className="size-3 rounded-full mr-2 shrink-0 border"
                    style={{
                      backgroundColor: c.swatch,
                      borderColor: c.value === null ? "#9ca3af" : c.swatch,
                    }}
                  />
                  {c.name}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}

        {/* Priority submenu */}
        {onSetPriority && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <AlertTriangleIcon className="size-3.5 mr-2" />
              Set Priority
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-40">
              {([1, 2, 3, 4] as Priority[]).map((p) => (
                <ContextMenuItem
                  key={p}
                  onClick={() => onSetPriority(item, p)}
                  className={item.priority === p ? "bg-muted" : ""}
                >
                  {PRIORITY_LABELS[p]}
                  {item.priority === p && (
                    <span className="ml-auto text-xs text-muted-foreground">current</span>
                  )}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}

        <ContextMenuSeparator />

        {/* Delete */}
        {onDelete && (
          <ContextMenuItem
            onClick={() => onDelete(item)}
            className="text-destructive focus:text-destructive"
          >
            <TrashIcon className="size-3.5 mr-2" />
            Delete Task
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
