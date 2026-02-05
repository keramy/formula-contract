"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { GanttChart, type GanttItem } from "@/components/gantt";
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
import { toast } from "sonner";
import { CalendarIcon, PlusIcon } from "lucide-react";
import { TimelineFormDialog } from "./timeline-form-dialog";
import {
  type TimelineItem,
  updateTimelineItemDates,
  deleteTimelineItem,
  duplicateTimelineItem,
} from "@/lib/actions/timelines";

// ============================================================================
// CONSTANTS
// ============================================================================

const TIMELINE_COLORS = {
  phase: "#64748b", // Slate
  task: "#3b82f6", // Blue
} as const;

// ============================================================================
// TYPES
// ============================================================================

interface Milestone {
  id: string;
  name: string;
  description: string | null;
  due_date: string;
  is_completed: boolean;
  completed_at: string | null;
}

interface ScopeItem {
  id: string;
  item_code: string;
  name: string;
  production_percentage: number | null;
}

interface TimelineOverviewProps {
  projectId: string;
  milestones: Milestone[];
  timelineItems: TimelineItem[];
  scopeItems: ScopeItem[];
  installationDate: string | null;
  canEdit?: boolean;
}

// ============================================================================
// COLORS
// ============================================================================

const MILESTONE_COLORS = {
  completed: "#10b981", // emerald-500
  upcoming: "#3b82f6", // blue-500
  overdue: "#ef4444", // red-500
};

// ============================================================================
// COMPONENT
// ============================================================================

export function TimelineOverview({
  projectId,
  milestones,
  timelineItems,
  scopeItems,
  installationDate,
  canEdit = false,
}: TimelineOverviewProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  // Form dialog state
  const [formOpen, setFormOpen] = React.useState(false);
  const [editItem, setEditItem] = React.useState<TimelineItem | null>(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteItemId, setDeleteItemId] = React.useState<string | null>(null);

  // Convert milestones and timeline items to Gantt items
  const ganttItems = React.useMemo<GanttItem[]>(() => {
    const items: GanttItem[] = [];
    const today = new Date();

    // Add milestones
    milestones.forEach((milestone) => {
      const dueDate = new Date(milestone.due_date);
      const isOverdue = !milestone.is_completed && dueDate < today;

      let color: string;
      if (milestone.is_completed) {
        color = MILESTONE_COLORS.completed;
      } else if (isOverdue) {
        color = MILESTONE_COLORS.overdue;
      } else {
        color = MILESTONE_COLORS.upcoming;
      }

      items.push({
        id: `milestone-${milestone.id}`,
        name: milestone.name,
        type: "milestone",
        startDate: dueDate,
        endDate: dueDate, // Milestones are single-day events
        progress: milestone.is_completed ? 100 : 0,
        color,
        status: milestone.is_completed
          ? "Completed"
          : isOverdue
          ? "Overdue"
          : "Upcoming",
        isEditable: false, // Milestones are edited via the milestone UI
        hierarchyLevel: 0,
      });
    });

    // Add timeline items (phases and tasks)
    timelineItems.forEach((item) => {
      const color = item.color || TIMELINE_COLORS[item.item_type];

      items.push({
        id: `timeline-${item.id}`,
        timelineId: item.id, // For CRUD operations
        name: item.name,
        type: item.item_type, // "phase" or "task"
        startDate: new Date(item.start_date),
        endDate: new Date(item.end_date),
        progress: item.progress || 0,
        color,
        status: item.progress === 100 ? "Complete" : `${item.progress || 0}%`,
        isEditable: canEdit,
        parentId: item.parent_id,
        hierarchyLevel: item.hierarchy_level,
      });
    });

    // Add installation date as a special milestone if it exists
    if (installationDate) {
      const instDate = new Date(installationDate);
      items.push({
        id: "installation-date",
        name: "Installation Target",
        type: "milestone",
        startDate: instDate,
        endDate: instDate,
        progress: instDate <= today ? 100 : 0,
        color: "#8b5cf6", // violet-500
        status: instDate <= today ? "Past" : "Target",
        isEditable: false,
        hierarchyLevel: 0,
      });
    }

    // Sort by start date
    items.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    return items;
  }, [milestones, timelineItems, installationDate, canEdit]);

  // Handle add new item
  const handleAddItem = () => {
    setEditItem(null);
    setFormOpen(true);
  };

  // Handle edit item (from context menu or click)
  const handleEditItem = (ganttItem: GanttItem) => {
    if (!ganttItem.timelineId) return;

    const timeline = timelineItems.find((t) => t.id === ganttItem.timelineId);
    if (timeline) {
      setEditItem(timeline);
      setFormOpen(true);
    }
  };

  // Handle duplicate item
  const handleDuplicateItem = async (ganttItem: GanttItem) => {
    if (!ganttItem.timelineId) return;

    setIsLoading(true);
    try {
      const result = await duplicateTimelineItem(ganttItem.timelineId);
      if (result.success) {
        toast.success("Item duplicated");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to duplicate");
      }
    } catch (error) {
      console.error("Failed to duplicate:", error);
      toast.error("Failed to duplicate item");
    } finally {
      setIsLoading(false);
    }
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

    setIsLoading(true);
    try {
      const result = await deleteTimelineItem(deleteItemId);
      if (result.success) {
        toast.success("Item deleted");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete");
      }
    } catch (error) {
      console.error("Failed to delete:", error);
      toast.error("Failed to delete item");
    } finally {
      setIsLoading(false);
      setDeleteDialogOpen(false);
      setDeleteItemId(null);
    }
  };

  // Handle dates change (from drag)
  const handleDatesChange = async (
    ganttItem: GanttItem,
    startDate: Date,
    endDate: Date
  ) => {
    if (!ganttItem.timelineId) return;

    try {
      const result = await updateTimelineItemDates(
        ganttItem.timelineId,
        format(startDate, "yyyy-MM-dd"),
        format(endDate, "yyyy-MM-dd")
      );

      if (result.success) {
        toast.success("Dates updated");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update dates");
      }
    } catch (error) {
      console.error("Failed to update dates:", error);
      toast.error("Failed to update dates");
    }
  };

  // Handle item click (for non-editable items like milestones)
  const handleItemClick = (ganttItem: GanttItem) => {
    // If it's an editable timeline item, edit it
    if (ganttItem.isEditable && ganttItem.timelineId) {
      handleEditItem(ganttItem);
    }
    // For milestones, we could navigate to milestones tab or show details
  };

  // Empty state when no items at all
  if (ganttItems.length === 0 && !canEdit) {
    return (
      <GlassCard>
        <EmptyState
          icon={<CalendarIcon className="size-8" />}
          title="No timeline data"
          description="Add milestones to visualize your project timeline."
        />
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Project Timeline</h3>
          <p className="text-sm text-muted-foreground">
            Visualize milestones, phases, and tasks for this project.
          </p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={handleAddItem} disabled={isLoading}>
            <PlusIcon className="size-4 mr-1.5" />
            Add Timeline
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
        {installationDate && (
          <div className="flex items-center gap-2">
            <div className="size-3 rounded-full bg-violet-500" />
            <span>Installation Target</span>
          </div>
        )}
      </div>

      {/* Gantt Chart */}
      <GanttChart
        items={ganttItems}
        initialViewMode="month"
        showSidebar={true}
        sidebarWidth={220}
        showAddButton={canEdit}
        onAddItem={handleAddItem}
        onItemClick={handleItemClick}
        onItemEdit={handleEditItem}
        onItemDuplicate={handleDuplicateItem}
        onItemDelete={handleDeleteClick}
        onItemDatesChange={handleDatesChange}
      />

      {/* Form Dialog */}
      <TimelineFormDialog
        projectId={projectId}
        open={formOpen}
        onOpenChange={setFormOpen}
        editItem={editItem}
        scopeItems={scopeItems}
        milestones={milestones}
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
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? (
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

export default TimelineOverview;
