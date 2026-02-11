"use client";

import * as React from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useBreakpoint } from "@/hooks/use-media-query";
import { GanttChart, type GanttItem, type GanttDependency } from "@/components/gantt";
import { GlassCard, EmptyState } from "@/components/ui/ui-helpers";
import { Button } from "@/components/ui/button";
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
import { CalendarIcon, PlusIcon } from "lucide-react";
import { TimelineFormDialog } from "../timeline-form-dialog";
import {
  useTimelineItems,
  useTimelineDependencies,
  useUpdateTimelineItem,
  useUpdateTimelineItemDates,
  useDeleteTimelineItem,
  useReorderTimelineItems,
  useCreateTimelineDependency,
  useUpdateTimelineDependency,
  useDeleteTimelineDependency,
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
  showHeader?: boolean;
  showFullscreenToggle?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TimelineClient({
  projectId,
  scopeItems,
  canEdit = false,
  showHeader = true,
  showFullscreenToggle = true,
}: TimelineClientProps) {
  const { isMobileOrTablet } = useBreakpoint();
  // React Query hooks for timeline data
  const { data: timelineItems = [], isLoading: isLoadingItems } = useTimelineItems(projectId);
  const { data: timelineDependencies = [], isLoading: isLoadingDeps } = useTimelineDependencies(projectId);

  // Mutations
  const updateItem = useUpdateTimelineItem(projectId);
  const updateDates = useUpdateTimelineItemDates(projectId);
  const deleteItem = useDeleteTimelineItem(projectId);
  const reorderItems = useReorderTimelineItems(projectId);
  const createDependency = useCreateTimelineDependency(projectId);
  const updateDependency = useUpdateTimelineDependency(projectId);
  const deleteDependency = useDeleteTimelineDependency(projectId);

  // Form dialog state
  const [formOpen, setFormOpen] = React.useState(false);
  const [editItem, setEditItem] = React.useState<TimelineItem | null>(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteItemId, setDeleteItemId] = React.useState<string | null>(null);

  // Convert milestones and timeline items to Gantt items
  const ganttItems = React.useMemo<GanttItem[]>(() => {
    const today = new Date();

    const parentMap = new Map(timelineItems.map((i) => [i.id, i.parent_id || null]));
    const childrenMap = new Map<string, number>();
    timelineItems.forEach((i) => {
      if (i.parent_id) {
        childrenMap.set(i.parent_id, (childrenMap.get(i.parent_id) || 0) + 1);
      }
    });

    // Any item that has children should be treated as a parent (not just phases)
    const parentIds = new Set(
      timelineItems.filter((i) => (childrenMap.get(i.id) || 0) > 0).map((i) => i.id)
    );
    const getDepth = (id: string): number => {
      let depth = 0;
      let current = parentMap.get(id);
      while (current) {
        depth += 1;
        current = parentMap.get(current) || null;
      }
      return depth;
    };

    return timelineItems
      .filter((item) => item.item_type !== "phase" || parentIds.has(item.id))
      .map((item) => {
      const color = item.color || TIMELINE_COLORS[item.item_type] || "#64748b";
      const isMilestone = item.item_type === "milestone";
      const isOverdue = isMilestone && !item.is_completed && new Date(item.end_date) < today;

      let status: string | undefined;
      if (item.item_type === "milestone") {
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

      return {
        id: item.id,
        timelineId: item.id,
        name: item.name,
        type: item.item_type as "phase" | "task" | "milestone",
        startDate: new Date(item.start_date),
        endDate: new Date(item.end_date),
        progress: item.progress || 0,
        color: displayColor,
        priority: item.priority,
        status,
        isEditable: canEdit && item.item_type !== "phase",
        parentId: item.parent_id && parentIds.has(item.parent_id) ? item.parent_id : null,
        hierarchyLevel: getDepth(item.id),
        phaseKey: item.phase_key || undefined,
      };
    });
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

  // Handle add new item
  const handleAddItem = () => {
    setEditItem(null);
    setFormOpen(true);
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

  // Handle duplicate item
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

  // Handle dates change (from drag)
  const handleDatesChange = async (
    ganttItem: GanttItem,
    startDate: Date,
    endDate: Date
  ) => {
    if (!ganttItem.timelineId) return;

    updateDates.mutate({
      timelineId: ganttItem.timelineId,
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
    });
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

  // Explicit fallback for touch-first screens where drag/resize interactions are unreliable.
  if (isMobileOrTablet) {
    return (
      <GlassCard className="p-6">
        <EmptyState
          icon={<CalendarIcon className="size-8" />}
          title="Timeline is best viewed on desktop"
          description="For precise drag/resize timeline editing, use a desktop browser. On tablet, landscape mode may improve readability."
        />
      </GlassCard>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", showHeader ? "gap-4" : "gap-0")}>
      {showHeader && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Project Timeline</h3>
              <p className="text-sm text-muted-foreground">
                Visualize milestones, phases, and tasks for this project.
              </p>
            </div>
            {canEdit && (
              <Button size="sm" onClick={handleAddItem}>
                <PlusIcon className="size-4 mr-1.5" />
                Add Item
              </Button>
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full" style={{ backgroundColor: MILESTONE_COLORS.completed }} />
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full" style={{ backgroundColor: MILESTONE_COLORS.upcoming }} />
              <span>Upcoming</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full" style={{ backgroundColor: MILESTONE_COLORS.overdue }} />
              <span>Overdue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-3 rounded" style={{ backgroundColor: TIMELINE_COLORS.phase, opacity: 0.6 }} />
              <span>Phase</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-3 rounded" style={{ backgroundColor: TIMELINE_COLORS.task }} />
              <span>Task</span>
            </div>
          </div>
        </>
      )}

      {/* Gantt Chart - fills remaining space */}
      <div className="flex-1 min-h-0">
        <GanttChart
          items={ganttItems}
          dependencies={ganttDependencies}
          initialViewMode="month"
          showSidebar={true}
          showAddButton={canEdit}
          onAddItem={handleAddItem}
          onItemEdit={handleEditItem}
          onItemDelete={handleDeleteClick}
          onItemDatesChange={handleDatesChange}
          onReorderItems={canEdit ? handleReorder : undefined}
          onItemParentChange={canEdit ? handleParentChange : undefined}
          onCreateDependency={canEdit ? handleCreateDependency : undefined}
          onUpdateDependency={canEdit ? handleUpdateDependency : undefined}
          onDeleteDependency={canEdit ? handleDeleteDependency : undefined}
          showFullscreenToggle={showFullscreenToggle}
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
