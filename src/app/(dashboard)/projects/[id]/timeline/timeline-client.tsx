"use client";

import * as React from "react";
import { format } from "date-fns";
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
  useUpdateTimelineItemDates,
  useDeleteTimelineItem,
  useReorderTimelineItems,
  useCreateTimelineDependency,
  useUpdateTimelineDependency,
  useDeleteTimelineDependency,
  useBaselines,
  useBaselineItems,
  useSaveBaseline,
  useDeleteBaseline,
} from "@/lib/react-query/timelines";
import type { GanttItem as TimelineItem, DependencyType } from "@/lib/actions/timelines";

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
  /** URL for "Open Full View" button inside the gantt stats bar */
  fullViewUrl?: string;
  /** @deprecated Kept for backwards compat — header is now inside GanttChart */
  showHeader?: boolean;
  /** @deprecated Kept for backwards compat */
  showFullscreenToggle?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TimelineClient({
  projectId,
  scopeItems,
  canEdit = false,
  fullViewUrl,
}: TimelineClientProps) {
  const { isMobile } = useBreakpoint();
  // React Query hooks for timeline data
  const { data: timelineItems = [], isLoading: isLoadingItems } = useTimelineItems(projectId);
  const { data: timelineDependencies = [], isLoading: isLoadingDeps } = useTimelineDependencies(projectId);

  // Mutations
  const createItem = useCreateTimelineItem(projectId);
  const updateItem = useUpdateTimelineItem(projectId);
  const updateDates = useUpdateTimelineItemDates(projectId);
  const deleteItem = useDeleteTimelineItem(projectId);
  const reorderItems = useReorderTimelineItems(projectId);
  const createDependency = useCreateTimelineDependency(projectId);
  const updateDependency = useUpdateTimelineDependency(projectId);
  const deleteDependency = useDeleteTimelineDependency(projectId);

  // Baseline hooks
  const { data: baselines = [] } = useBaselines(projectId);
  const [activeBaselineId, setActiveBaselineId] = React.useState<string | null>(null);
  const { data: baselineItems = [] } = useBaselineItems(activeBaselineId);
  const saveBaselineMutation = useSaveBaseline(projectId);
  const deleteBaselineMutation = useDeleteBaseline(projectId);

  // Form dialog state
  const [formOpen, setFormOpen] = React.useState(false);
  const [editItem, setEditItem] = React.useState<TimelineItem | null>(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteItemId, setDeleteItemId] = React.useState<string | null>(null);

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

    // Convert flat items to GanttItem (without children first)
    const itemById = new Map<string, GanttItem>();
    const allItems: GanttItem[] = timelineItems
      .filter((item) => item.item_type !== "phase" || parentIds.has(item.id))
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
          color: displayColor,
          priority: (item.priority || 2) as 1 | 2 | 3 | 4,
          status,
          isEditable: canEdit && item.item_type !== "phase",
          parentId: item.parent_id && parentIds.has(item.parent_id) ? item.parent_id : null,
          phaseKey: (item.phase_key || undefined) as GanttItem["phaseKey"],
          children: [],
          description: (item as any).description || null,
          isOnCriticalPath: (item as any).is_on_critical_path || false,
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

  // Handle reorder items
  const handleReorder = (itemIds: string[]) => {
    const timelineIds = itemIds;
    if (timelineIds.length === 0) return;
    reorderItems.mutate(timelineIds);
  };

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

  // Handle add new item — creates instantly with defaults, user edits via double-click
  // Guard: ignore if previous create is still pending (prevents rapid-fire DB hits)
  const handleAddItem = () => {
    if (createItem.isPending) return;
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 14);

    createItem.mutate({
      project_id: projectId,
      name: "New Task",
      item_type: "task",
      start_date: format(today, "yyyy-MM-dd"),
      end_date: format(endDate, "yyyy-MM-dd"),
      priority: 2,
    });
  };

  // Handle edit item
  const handleEditItem = (ganttItem: GanttItem) => {
    if (!ganttItem.timelineId) return;

    const timeline = timelineItems.find((t) => t.id === ganttItem.timelineId);
    if (timeline) {
      setEditItem(timeline);
      setFormOpen(true);
    }
  };

  // Handle add subtask — creates a child task under the given parent
  const handleAddSubtask = (parentId: string) => {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 14);

    createItem.mutate({
      project_id: projectId,
      name: "New Subtask",
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

  // Handle set priority
  const handleSetPriority = (ganttItem: GanttItem, priority: number) => {
    if (!ganttItem.timelineId) return;
    updateItem.mutate({
      timelineId: ganttItem.timelineId,
      input: { priority: priority as 1 | 2 | 3 | 4 },
    });
  };

  // Handle toggle critical path
  const handleToggleCriticalPath = (ganttItem: GanttItem) => {
    if (!ganttItem.timelineId) return;
    updateItem.mutate({
      timelineId: ganttItem.timelineId,
      input: { is_on_critical_path: !ganttItem.isOnCriticalPath },
    });
  };

  // Handle delete click
  const handleDeleteClick = (ganttItem: GanttItem) => {
    if (!ganttItem.timelineId) return;
    setDeleteItemId(ganttItem.timelineId);
    setDeleteDialogOpen(true);
  };

  // Handle delete confirm
  const handleDeleteConfirm = async () => {
    if (!deleteItemId) return;
    deleteItem.mutate(deleteItemId);
    setDeleteDialogOpen(false);
    setDeleteItemId(null);
  };

  // Handle dates change (from drag) — also auto-expand parent if child exceeds it
  const handleDatesChange = async (
    ganttItem: GanttItem,
    startDate: Date,
    endDate: Date
  ) => {
    if (!ganttItem.timelineId) return;

    // Update the dragged item
    updateDates.mutate({
      timelineId: ganttItem.timelineId,
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
    });

    // Auto-expand parent if child now exceeds parent's date range
    if (ganttItem.parentId) {
      const parent = timelineItems.find((t) => t.id === ganttItem.parentId);
      if (parent) {
        const parentStart = new Date(parent.start_date);
        const parentEnd = new Date(parent.end_date);
        let needsUpdate = false;
        const newStart = startDate < parentStart ? format(startDate, "yyyy-MM-dd") : parent.start_date;
        const newEnd = endDate > parentEnd ? format(endDate, "yyyy-MM-dd") : parent.end_date;

        if (newStart !== parent.start_date || newEnd !== parent.end_date) {
          updateDates.mutate({
            timelineId: parent.id,
            startDate: newStart,
            endDate: newEnd,
          });
        }
      }
    }
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
          fullViewUrl={fullViewUrl}
          onAddItem={handleAddItem}
          onItemEdit={handleEditItem}
          onItemDelete={handleDeleteClick}
          onItemDatesChange={handleDatesChange}
          onAddSubtask={canEdit ? handleAddSubtask : undefined}
          onConvertToMilestone={canEdit ? handleConvertToMilestone : undefined}
          onSetPriority={canEdit ? handleSetPriority : undefined}
          onToggleCriticalPath={canEdit ? handleToggleCriticalPath : undefined}
          baselines={baselines}
          baselineItems={baselineItems}
          onSaveBaseline={canEdit ? () => {
            const name = `Baseline ${baselines.length + 1} — ${new Date().toLocaleDateString()}`;
            saveBaselineMutation.mutate(name);
          } : undefined}
          onDeleteBaseline={canEdit ? (id: string) => deleteBaselineMutation.mutate(id) : undefined}
          onReorderItems={canEdit ? handleReorder : undefined}
          onItemParentChange={canEdit ? handleParentChange : undefined}
          onCreateDependency={canEdit ? handleCreateDependency : undefined}
          onUpdateDependency={canEdit ? handleUpdateDependency : undefined}
          onDeleteDependency={canEdit ? handleDeleteDependency : undefined}
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
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Timeline Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this item? This action cannot be undone.
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
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
