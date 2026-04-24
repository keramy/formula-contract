"use client";

import * as React from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useBreakpoint } from "@/hooks/use-media-query";
import { GanttChart, type GanttItem, type GanttDependency } from "@/components/gantt";
import { GlassCard, EmptyState } from "@/components/ui/ui-helpers";
import { Spinner } from "@/components/ui/spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CalendarIcon } from "lucide-react";
import { TimelineFormDialog } from "../timeline-form-dialog";
import {
  useTimelineItems,
  useTimelineDependencies,
  useCreateTimelineItem,
  useUpdateTimelineItem,
  useDeleteTimelineItem,
  useCreateTimelineDependency,
  useUpdateTimelineDependency,
  useDeleteTimelineDependency,
  useSetTaskPhase,
  useSetProjectWorkingDays,
} from "@/lib/react-query/timelines";
import type { GanttItem as TimelineItem, DependencyType, PhaseKey } from "@/lib/actions/timelines";
import { UndoRedoProvider, useUndoRedo } from "@/hooks/use-undo-redo";

// ============================================================================
// CONSTANTS
// ============================================================================

const TIMELINE_COLORS = {
  phase: "#64748b", // Slate
  task: "#3b82f6", // Blue
  milestone: "#f59e0b", // Amber
} as const;

const MILESTONE_COLORS = {
  completed: "#10b981", // emerald-500
  upcoming: "#3b82f6", // blue-500
  overdue: "#ef4444", // red-500
};

// ============================================================================
// TYPES
// ============================================================================

interface ScopeItem {
  id: string;
  item_code: string;
  name: string;
  production_percentage: number | null;
}

interface TimelineClientProps {
  projectId: string;
  scopeItems: ScopeItem[];
  canEdit?: boolean;
  /** Per-project working-days bitmask (bit 0 = Sun..bit 6 = Sat). Defaults to 62 (Mon-Fri). */
  workingDaysMask?: number;
  /** @deprecated Kept for backwards compat — header is now inside GanttChart */
  showHeader?: boolean;
  /** @deprecated Kept for backwards compat */
  showFullscreenToggle?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TimelineClient(props: TimelineClientProps) {
  // UndoRedoProvider wraps the actual logic so handlers inside can call
  // useUndoRedo() to record inverse actions.
  return (
    <UndoRedoProvider>
      <TimelineClientInner {...props} />
    </UndoRedoProvider>
  );
}

function TimelineClientInner({
  projectId,
  scopeItems,
  canEdit = false,
  workingDaysMask: initialMask = 62,
}: TimelineClientProps) {
  // Optimistic local copy so the toolbar toggles feel instant; server reconciles via invalidate.
  const [workingDaysMask, setWorkingDaysMask] = React.useState<number>(initialMask);
  React.useEffect(() => setWorkingDaysMask(initialMask), [initialMask]);
  const { isMobile } = useBreakpoint();
  const { record } = useUndoRedo();
  // React Query hooks for timeline data
  const { data: timelineItems = [], isLoading: isLoadingItems } = useTimelineItems(projectId);
  const { data: timelineDependencies = [], isLoading: isLoadingDeps } = useTimelineDependencies(projectId);

  // Mutations
  const createItem = useCreateTimelineItem(projectId);
  const updateItem = useUpdateTimelineItem(projectId);
  const deleteItem = useDeleteTimelineItem(projectId);
  const createDependency = useCreateTimelineDependency(projectId);
  const updateDependency = useUpdateTimelineDependency(projectId);
  const deleteDependency = useDeleteTimelineDependency(projectId);
  const setPhaseMutation = useSetTaskPhase(projectId);
  const setWorkingDays = useSetProjectWorkingDays(projectId);

  const handleWorkingDaysChange = React.useCallback(
    (mask: number) => {
      if (!canEdit) return;
      setWorkingDaysMask(mask); // optimistic
      setWorkingDays.mutate(mask);
    },
    [canEdit, setWorkingDays]
  );

  // Form dialog state
  const [formOpen, setFormOpen] = React.useState(false);
  const [editItem, setEditItem] = React.useState<TimelineItem | null>(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteItemIds, setDeleteItemIds] = React.useState<string[]>([]);

  // Convert timeline items to Gantt items (tree structure)
  const ganttItems = React.useMemo<GanttItem[]>(() => {
    const today = new Date();

    // Build child count map
    const childrenMap = new Map<string, number>();
    timelineItems.forEach((i) => {
      if (i.parent_id) {
        childrenMap.set(i.parent_id, (childrenMap.get(i.parent_id) || 0) + 1);
      }
    });

    const parentIds = new Set(
      timelineItems.filter((i) => (childrenMap.get(i.id) || 0) > 0).map((i) => i.id)
    );

    // Show a phase item only when at least one task in the project carries
    // its phase_key as a label. Phases are labels now (not parents), so
    // parent_id-based filtering would always exclude them.
    const phaseKeysInUse = new Set<string>();
    timelineItems.forEach((i) => {
      if (i.item_type !== "phase" && i.phase_key) phaseKeysInUse.add(i.phase_key);
    });

    // Convert flat items to GanttItem (without children first)
    const itemById = new Map<string, GanttItem>();
    const allItems: GanttItem[] = timelineItems
      .filter((item) => {
        if (item.item_type !== "phase") return true;
        // Phase: include if any task labels this phase, OR if it still has
        // legacy parent_id children (for projects created before the label refactor).
        return (item.phase_key && phaseKeysInUse.has(item.phase_key)) || parentIds.has(item.id);
      })
      .map((item) => {
        const color = item.color || TIMELINE_COLORS[item.item_type] || "#64748b";
        const isMilestone = item.item_type === "milestone";
        const isOverdue = isMilestone && !item.is_completed && new Date(item.end_date) < today;

        let status: string | undefined;
        if (isMilestone) {
          status = item.is_completed ? "Completed" : isOverdue ? "Overdue" : "Upcoming";
        } else {
          status = item.progress === 100 ? "Complete" : `${item.progress || 0}%`;
        }

        const displayColor = isMilestone
          ? item.is_completed
            ? MILESTONE_COLORS.completed
            : isOverdue
            ? MILESTONE_COLORS.overdue
            : MILESTONE_COLORS.upcoming
          : color;

        const ganttItem: GanttItem = {
          id: item.id,
          timelineId: item.id,
          name: item.name,
          type: item.item_type as "phase" | "task" | "milestone",
          startDate: new Date(item.start_date),
          endDate: new Date(item.end_date),
          progress: item.progress || 0,
          // For milestones, display color is status-based (completed/overdue/upcoming).
          // For tasks & phases, preserve the raw DB color (null if user hasn't set one)
          // so rendering can fall back to the phase-inherited color.
          color: isMilestone ? displayColor : (item.color ?? null),
          priority: (item.priority || 2) as 1 | 2 | 3 | 4,
          status,
          isEditable: canEdit && item.item_type !== "phase",
          parentId: item.parent_id && parentIds.has(item.parent_id) ? item.parent_id : null,
          phaseKey: (item.phase_key || undefined) as GanttItem["phaseKey"],
          children: [],
          description: (item as any).description || null,
          isCompleted: item.is_completed || false,
        };

        itemById.set(item.id, ganttItem);
        return ganttItem;
      });

    // Build tree: assign children to parents
    const roots: GanttItem[] = [];
    for (const gi of allItems) {
      if (gi.parentId && itemById.has(gi.parentId)) {
        itemById.get(gi.parentId)!.children.push(gi);
      } else {
        roots.push(gi);
      }
    }

    return roots;
  }, [timelineItems, canEdit]);

  // Convert dependencies to Gantt format
  const ganttDependencies = React.useMemo<GanttDependency[]>(() => {
    return timelineDependencies.map((dep) => ({
      id: dep.id,
      projectId: dep.project_id,
      sourceId: dep.source_id,
      targetId: dep.target_id,
      type: dep.dependency_type as 0 | 1 | 2 | 3,
      lagDays: dep.lag_days,
    }));
  }, [timelineDependencies]);

  // Handle indent/outdent (change parent)
  const handleParentChange = (timelineId: string, newParentId: string | null) => {
    updateItem.mutate({ timelineId, input: { parent_id: newParentId } });
  };

  // Handle create dependency
  const handleCreateDependency = async (
    sourceId: string,
    targetId: string,
    type: DependencyType,
    lagDays: number
  ) => {
    createDependency.mutate({
      project_id: projectId,
      source_id: sourceId,
      target_id: targetId,
      dependency_type: type,
      lag_days: lagDays,
    });
  };

  // Handle update dependency
  const handleUpdateDependency = async (
    dependencyId: string,
    type: DependencyType,
    lagDays: number
  ) => {
    updateDependency.mutate({
      dependencyId,
      updates: { dependency_type: type, lag_days: lagDays },
    });
  };

  // Handle delete dependency
  const handleDeleteDependency = async (dependencyId: string) => {
    deleteDependency.mutate(dependencyId);
  };

  // Auto-increment "New Task" / "New Subtask" names to avoid collisions
  const nextAutoName = (base: string): string => {
    const existing = new Set(timelineItems.map((t) => t.name));
    if (!existing.has(base)) return base;
    let i = 2;
    while (existing.has(`${base} ${i}`)) i++;
    return `${base} ${i}`;
  };

  // Handle add new item — creates instantly with defaults, user edits via double-click
  // Guard: ignore if previous create is still pending (prevents rapid-fire DB hits)
  const handleAddItem = () => {
    if (createItem.isPending) return;
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 14);

    createItem.mutate({
      project_id: projectId,
      name: nextAutoName("New Task"),
      item_type: "task",
      start_date: format(today, "yyyy-MM-dd"),
      end_date: format(endDate, "yyyy-MM-dd"),
      priority: 2,
    });
  };

  // Handle add new milestone — single-day item
  const handleAddMilestone = () => {
    if (createItem.isPending) return;
    const today = new Date();
    createItem.mutate({
      project_id: projectId,
      name: nextAutoName("New Milestone"),
      item_type: "milestone",
      start_date: format(today, "yyyy-MM-dd"),
      end_date: format(today, "yyyy-MM-dd"),
      priority: 2,
    });
  };

  // Optimistic temp IDs aren't valid UUIDs — reject server-bound operations
  // until the create has resolved and the real UUID is in cache.
  const isPending = (id?: string | null) => !id || id.startsWith("temp-");
  const PENDING_MSG = "Still saving this task — give it a second and try again";

  const priorityLabel = (p: 1 | 2 | 3 | 4): string => {
    return ["", "Low", "Normal", "High", "Critical"][p];
  };

  // Handle edit item
  const handleEditItem = (ganttItem: GanttItem) => {
    if (!ganttItem.timelineId) return;
    if (isPending(ganttItem.timelineId)) {
      toast.info(PENDING_MSG);
      return;
    }

    const timeline = timelineItems.find((t) => t.id === ganttItem.timelineId);
    if (timeline) {
      setEditItem(timeline);
      setFormOpen(true);
    }
  };

  // Handle add subtask — creates a child task under the given parent
  const handleAddSubtask = (parentId: string) => {
    if (isPending(parentId)) {
      toast.info(PENDING_MSG);
      return;
    }
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 14);

    createItem.mutate({
      project_id: projectId,
      name: nextAutoName("New Subtask"),
      item_type: "task",
      parent_id: parentId,
      start_date: format(today, "yyyy-MM-dd"),
      end_date: format(endDate, "yyyy-MM-dd"),
      priority: 2,
    });
  };

  // Handle convert to milestone
  const handleConvertToMilestone = (ganttItem: GanttItem) => {
    if (!ganttItem.timelineId) return;
    if (isPending(ganttItem.timelineId)) {
      toast.info(PENDING_MSG);
      return;
    }
    const startDate = format(ganttItem.startDate, "yyyy-MM-dd");
    updateItem.mutate({
      timelineId: ganttItem.timelineId,
      input: {
        item_type: "milestone",
        end_date: startDate,
        is_completed: false,
      },
    });
  };

  // Handle set priority — recorded for undo
  const handleSetPriority = (ganttItem: GanttItem, priority: number) => {
    if (!ganttItem.timelineId) return;
    if (isPending(ganttItem.timelineId)) {
      toast.info(PENDING_MSG);
      return;
    }
    const timelineId = ganttItem.timelineId;
    const oldPriority = ganttItem.priority;
    const newPriority = priority as 1 | 2 | 3 | 4;
    updateItem.mutate({ timelineId, input: { priority: newPriority } });
    record({
      description: `Set priority to ${priorityLabel(newPriority)}`,
      forward: async () => {
        await updateItem.mutateAsync({ timelineId, input: { priority: newPriority } });
      },
      inverse: async () => {
        await updateItem.mutateAsync({ timelineId, input: { priority: oldPriority } });
      },
    });
  };

  // Handle set phase — records undo WITHOUT cascading restoration (descendants stay)
  const handleSetPhase = (ganttItem: GanttItem, phase: PhaseKey) => {
    if (!ganttItem.timelineId) return;
    if (isPending(ganttItem.timelineId)) {
      toast.info(PENDING_MSG);
      return;
    }
    const taskId = ganttItem.timelineId;
    const oldPhase = (ganttItem.phaseKey as PhaseKey | undefined) ?? null;
    setPhaseMutation.mutate({ taskId, phaseKey: phase });
    record({
      description: `Changed phase`,
      forward: async () => {
        await setPhaseMutation.mutateAsync({ taskId, phaseKey: phase });
      },
      inverse: async () => {
        if (oldPhase) {
          await setPhaseMutation.mutateAsync({ taskId, phaseKey: oldPhase });
        } else {
          // Clear phase_key entirely via updateItem
          await updateItem.mutateAsync({ timelineId: taskId, input: { phase_key: null } });
        }
      },
    });
  };

  // Handle set color — recorded for undo
  const handleSetColor = (ganttItem: GanttItem, color: string | null) => {
    if (!ganttItem.timelineId) return;
    if (isPending(ganttItem.timelineId)) {
      toast.info(PENDING_MSG);
      return;
    }
    const timelineId = ganttItem.timelineId;
    const oldColor = ganttItem.color;
    updateItem.mutate({ timelineId, input: { color } });
    record({
      description: color ? `Changed color` : `Reset color`,
      forward: async () => {
        await updateItem.mutateAsync({ timelineId, input: { color } });
      },
      inverse: async () => {
        await updateItem.mutateAsync({ timelineId, input: { color: oldColor } });
      },
    });
  };

  // Single-item delete (from context menu or double-click → delete)
  const handleDeleteClick = (ganttItem: GanttItem) => {
    if (!ganttItem.timelineId) return;
    if (isPending(ganttItem.timelineId)) {
      toast.info(PENDING_MSG);
      return;
    }
    setDeleteItemIds([ganttItem.timelineId]);
    setDeleteDialogOpen(true);
  };

  // Bulk delete (from toolbar "Delete selected" or Delete key with multi-select)
  const handleDeleteMany = (items: GanttItem[]) => {
    const ids = items
      .map((i) => i.timelineId)
      .filter((id): id is string => !!id && !isPending(id));
    if (ids.length === 0) {
      if (items.some((i) => i.timelineId && isPending(i.timelineId))) {
        toast.info(PENDING_MSG);
      }
      return;
    }
    setDeleteItemIds(ids);
    setDeleteDialogOpen(true);
  };

  // Confirm — deletes every queued ID. Mutation hook handles optimistic removal + toast.
  const handleDeleteConfirm = async () => {
    if (deleteItemIds.length === 0) return;
    for (const id of deleteItemIds) {
      deleteItem.mutate(id);
    }
    setDeleteDialogOpen(false);
    setDeleteItemIds([]);
  };

  // Loading state
  if (isLoadingItems || isLoadingDeps) {
    return (
      <GlassCard className="flex items-center justify-center h-96">
        <div className="text-center">
          <Spinner className="size-8 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading timeline...</p>
        </div>
      </GlassCard>
    );
  }

  // Empty state
  if (ganttItems.length === 0 && !canEdit) {
    return (
      <GlassCard>
        <EmptyState
          icon={<CalendarIcon className="size-8" />}
          title="No timeline data"
          description="Add tasks or milestones to visualize your project timeline."
        />
      </GlassCard>
    );
  }

  // Block Gantt on phones where drag/resize interactions are unreliable.
  // Tablets (768-1023px) can handle the chart in landscape mode.
  if (isMobile) {
    return (
      <GlassCard className="p-6">
        <EmptyState
          icon={<CalendarIcon className="size-8" />}
          title="Timeline is best viewed on a larger screen"
          description="For precise drag/resize timeline editing, use a tablet in landscape or a desktop browser."
        />
      </GlassCard>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Gantt Chart - fills entire space */}
      <div className="flex-1 min-h-0">
        <GanttChart
          items={ganttItems}
          dependencies={ganttDependencies}
          showAddButton={canEdit}
          onAddItem={canEdit ? handleAddItem : undefined}
          onAddMilestone={canEdit ? handleAddMilestone : undefined}
          onItemEdit={handleEditItem}
          onItemDelete={handleDeleteClick}
          onDeleteMany={canEdit ? handleDeleteMany : undefined}
          onAddSubtask={canEdit ? handleAddSubtask : undefined}
          onConvertToMilestone={canEdit ? handleConvertToMilestone : undefined}
          onSetPriority={canEdit ? handleSetPriority : undefined}
          onSetPhase={canEdit ? handleSetPhase : undefined}
          onSetColor={canEdit ? handleSetColor : undefined}
          onItemParentChange={canEdit ? handleParentChange : undefined}
          onCreateDependency={canEdit ? handleCreateDependency : undefined}
          onUpdateDependency={canEdit ? handleUpdateDependency : undefined}
          onDeleteDependency={canEdit ? handleDeleteDependency : undefined}
          workingDaysMask={workingDaysMask}
          onWorkingDaysChange={canEdit ? handleWorkingDaysChange : undefined}
          className="h-full"
        />
      </div>

      {/* Form Dialog */}
      <TimelineFormDialog
        projectId={projectId}
        open={formOpen}
        onOpenChange={setFormOpen}
        editItem={editItem}
        scopeItems={scopeItems}
        timelineItems={timelineItems}
        dependencies={timelineDependencies}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteItemIds.length === 1
                ? "Delete Timeline Item"
                : `Delete ${deleteItemIds.length} Timeline Items`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteItemIds.length === 1
                ? "Are you sure you want to delete this item? This action cannot be undone."
                : `Are you sure you want to delete all ${deleteItemIds.length} selected items? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteItem.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }}
              disabled={deleteItem.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteItem.isPending ? (
                <>
                  <Spinner className="size-4 mr-2" />
                  Deleting...
                </>
              ) : deleteItemIds.length === 1 ? (
                "Delete"
              ) : (
                `Delete ${deleteItemIds.length}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
