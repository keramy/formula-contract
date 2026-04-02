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
  PRIORITY_LABELS,
} from "./gantt-types";
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  DiamondIcon,
  FlagIcon,
  AlertTriangleIcon,
} from "lucide-react";

// ============================================================================
// GANTT CONTEXT MENU — Right-click menu for task actions
// ============================================================================

export interface GanttContextMenuProps {
  children: React.ReactNode;
  item: GanttItem | null;
  onEdit?: (item: GanttItem) => void;
  onDelete?: (item: GanttItem) => void;
  onAddSubtask?: (parentId: string) => void;
  onConvertToMilestone?: (item: GanttItem) => void;
  onSetPriority?: (item: GanttItem, priority: Priority) => void;
  onToggleCriticalPath?: (item: GanttItem) => void;
}

export function GanttContextMenu({
  children,
  item,
  onEdit,
  onDelete,
  onAddSubtask,
  onConvertToMilestone,
  onSetPriority,
  onToggleCriticalPath,
}: GanttContextMenuProps) {
  if (!item || !item.isEditable) {
    return <>{children}</>;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
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

        {/* Toggle Critical Path */}
        {onToggleCriticalPath && (
          <ContextMenuItem onClick={() => onToggleCriticalPath(item)}>
            <FlagIcon className="size-3.5 mr-2" />
            {item.isOnCriticalPath ? "Remove from Critical Path" : "Mark as Critical Path"}
          </ContextMenuItem>
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
