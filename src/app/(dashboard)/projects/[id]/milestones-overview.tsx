"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { completeMilestone, deleteMilestone } from "@/lib/actions/milestones";
import { GlassCard, GradientIcon, StatusBadge, EmptyState } from "@/components/ui/ui-helpers";
import { Progress } from "@/components/ui/progress";
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
import {
  FlagIcon,
  PlusIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertTriangleIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  CalendarIcon,
  CircleIcon,
  CircleDotIcon,
  LayoutGridIcon,
  ListIcon,
} from "lucide-react";
import { format, isPast, differenceInDays } from "date-fns";
import { MilestoneFormDialog } from "./milestone-form-dialog";
import { MilestoneCards } from "@/components/milestones/milestone-cards";

interface Milestone {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  due_date: string;
  is_completed: boolean;
  completed_at: string | null;
  alert_days_before: number | null;
}

interface MilestonesOverviewProps {
  projectId: string;
  milestones: Milestone[];
}

type ViewMode = "cards" | "timeline";

export function MilestonesOverview({
  projectId,
  milestones,
}: MilestonesOverviewProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Milestone | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("cards"); // Default to cards view

  // Stats
  const stats = {
    total: milestones.length,
    completed: milestones.filter((m) => m.is_completed).length,
    upcoming: milestones.filter((m) => !m.is_completed && !isPast(new Date(m.due_date))).length,
    overdue: milestones.filter((m) => !m.is_completed && isPast(new Date(m.due_date))).length,
  };

  const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const handleAdd = () => {
    setEditItem(null);
    setFormDialogOpen(true);
  };

  const handleEdit = (item: Milestone) => {
    setEditItem(item);
    setFormDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteItemId(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteItemId) return;

    setIsLoading(true);

    try {
      const result = await deleteMilestone(deleteItemId);

      if (!result.success) {
        toast.error(result.error || "Failed to delete milestone");
        return;
      }

      toast.success("Milestone deleted");
      router.refresh();
    } catch (error) {
      console.error("Failed to delete milestone:", error);
      toast.error("Failed to delete milestone");
    } finally {
      setIsLoading(false);
      setDeleteDialogOpen(false);
      setDeleteItemId(null);
    }
  };

  const handleToggleComplete = async (milestone: Milestone) => {
    setIsLoading(true);

    try {
      const isCompleting = !milestone.is_completed;
      const result = await completeMilestone(milestone.id, isCompleting);

      if (!result.success) {
        toast.error(result.error || "Failed to update milestone");
        return;
      }

      toast.success(isCompleting ? "Milestone completed! 🎉" : "Milestone reopened");
      router.refresh();
    } catch (error) {
      console.error("Failed to update milestone:", error);
      toast.error("Failed to update milestone");
    } finally {
      setIsLoading(false);
    }
  };

  const getMilestoneStatus = (milestone: Milestone) => {
    if (milestone.is_completed) return "completed";
    if (isPast(new Date(milestone.due_date))) return "overdue";
    const daysUntil = differenceInDays(new Date(milestone.due_date), new Date());
    if (daysUntil <= (milestone.alert_days_before || 7)) return "warning";
    return "upcoming";
  };

  const statusConfig: Record<string, { variant: "success" | "danger" | "warning" | "info"; icon: React.ReactNode; label: string }> = {
    completed: {
      variant: "success",
      icon: <CheckCircleIcon className="size-3.5" />,
      label: "Completed",
    },
    overdue: {
      variant: "danger",
      icon: <AlertTriangleIcon className="size-3.5" />,
      label: "Overdue",
    },
    warning: {
      variant: "warning",
      icon: <ClockIcon className="size-3.5" />,
      label: "Due Soon",
    },
    upcoming: {
      variant: "info",
      icon: <CalendarIcon className="size-3.5" />,
      label: "Upcoming",
    },
  };

  // Sort milestones: overdue first, then by due date
  const sortedMilestones = [...milestones].sort((a, b) => {
    if (a.is_completed !== b.is_completed) {
      return a.is_completed ? 1 : -1;
    }
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  // If in cards view, render the MilestoneCards component
  if (viewMode === "cards") {
    return (
      <div className="space-y-4">
        {/* View Toggle */}
        <div className="flex justify-end">
          <div className="inline-flex items-center rounded-lg border border-base-200 bg-muted/50 p-1">
            <Button
              variant="default"
              size="sm"
              onClick={() => setViewMode("cards")}
              className="h-7 px-2.5"
            >
              <LayoutGridIcon className="size-4 mr-1.5" />
              Cards
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("timeline")}
              className="h-7 px-2.5"
            >
              <ListIcon className="size-4 mr-1.5" />
              Timeline
            </Button>
          </div>
        </div>

        {/* Card View Component */}
        <MilestoneCards
          projectId={projectId}
          milestones={milestones}
          showProjectBadge={false}
        />
      </div>
    );
  }

  // Timeline View (original view)
  return (
    <div className="space-y-4">
      {/* View Toggle + Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GradientIcon icon={<FlagIcon className="size-5" />} color="primary" size="default" />
          <div>
            <h3 className="text-lg font-medium">Milestones</h3>
            <p className="text-sm text-muted-foreground">
              {stats.total} milestone{stats.total !== 1 ? "s" : ""}
              {stats.total > 0 && (
                <>
                  {" "}({stats.completed > 0 && <span className="text-emerald-600">{stats.completed} completed</span>}
                  {stats.completed > 0 && stats.upcoming > 0 && ", "}
                  {stats.upcoming > 0 && <span className="text-sky-600">{stats.upcoming} upcoming</span>}
                  {(stats.completed > 0 || stats.upcoming > 0) && stats.overdue > 0 && ", "}
                  {stats.overdue > 0 && <span className="text-rose-600">{stats.overdue} overdue</span>})
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="inline-flex items-center rounded-lg border border-base-200 bg-muted/50 p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("cards")}
              className="h-7 px-2.5"
            >
              <LayoutGridIcon className="size-4 mr-1.5" />
              Cards
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setViewMode("timeline")}
              className="h-7 px-2.5"
            >
              <ListIcon className="size-4 mr-1.5" />
              Timeline
            </Button>
          </div>
          <Button onClick={handleAdd}>
            <PlusIcon className="size-4" />
            Add Milestone
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      {milestones.length > 0 && (
        <GlassCard className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm font-semibold text-primary">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2.5 [&>div]:bg-primary" />
        </GlassCard>
      )}

      {/* Timeline View */}
      {milestones.length > 0 ? (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-base-200 via-base-300 to-base-200" />

          <div className="space-y-1">
            {sortedMilestones.map((milestone, index) => {
              const status = getMilestoneStatus(milestone);
              const config = statusConfig[status];
              const daysUntil = differenceInDays(new Date(milestone.due_date), new Date());

              // Timeline node colors
              const nodeColors = {
                completed: "bg-emerald-500 ring-emerald-100",
                overdue: "bg-rose-500 ring-rose-100 animate-pulse",
                warning: "bg-amber-500 ring-amber-100",
                upcoming: "bg-primary ring-primary-100",
              };

              return (
                <div key={milestone.id} className="relative flex gap-4 group">
                  {/* Timeline Node */}
                  <div className="relative z-10 flex flex-col items-center pt-4">
                    <button
                      onClick={() => handleToggleComplete(milestone)}
                      disabled={isLoading}
                      className={`size-10 rounded-full ring-4 flex items-center justify-center transition-all shadow-sm ${
                        milestone.is_completed
                          ? "bg-emerald-500 ring-emerald-100 text-white"
                          : `${nodeColors[status]} text-white hover:scale-110`
                      }`}
                    >
                      {milestone.is_completed ? (
                        <CheckIcon className="size-5" />
                      ) : status === "overdue" ? (
                        <AlertTriangleIcon className="size-4" />
                      ) : status === "warning" ? (
                        <ClockIcon className="size-4" />
                      ) : (
                        <CircleIcon className="size-4" />
                      )}
                    </button>
                  </div>

                  {/* Content Card */}
                  <div className={`flex-1 pb-4 ${index === sortedMilestones.length - 1 ? "pb-0" : ""}`}>
                    <GlassCard
                      className={`p-4 transition-all group-hover:shadow-md ${
                        milestone.is_completed ? "opacity-60" : ""
                      } ${status === "overdue" ? "border-rose-200 bg-rose-50/50" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Date badge */}
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              milestone.is_completed
                                ? "bg-emerald-100 text-emerald-700"
                                : status === "overdue"
                                ? "bg-rose-100 text-rose-700"
                                : status === "warning"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-primary-100 text-primary-700"
                            }`}>
                              {format(new Date(milestone.due_date), "MMM d, yyyy")}
                            </span>
                            {!milestone.is_completed && (
                              <span className={`text-xs ${
                                daysUntil < 0 ? "text-rose-600 font-semibold" :
                                daysUntil <= 7 ? "text-amber-600 font-medium" :
                                "text-muted-foreground"
                              }`}>
                                {daysUntil === 0
                                  ? "Due today!"
                                  : daysUntil > 0
                                  ? `${daysUntil} days left`
                                  : `${Math.abs(daysUntil)} days overdue`}
                              </span>
                            )}
                            {milestone.is_completed && milestone.completed_at && (
                              <span className="text-xs text-emerald-600">
                                ✓ Completed {format(new Date(milestone.completed_at), "MMM d")}
                              </span>
                            )}
                          </div>

                          {/* Title */}
                          <h4 className={`font-semibold text-base ${
                            milestone.is_completed ? "line-through text-muted-foreground" : ""
                          }`}>
                            {milestone.name}
                          </h4>

                          {/* Description */}
                          {milestone.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {milestone.description}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEdit(milestone)}
                            disabled={isLoading}
                            className="size-8 hover:bg-primary/10 hover:text-primary"
                          >
                            <PencilIcon className="size-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteClick(milestone.id)}
                            disabled={isLoading}
                            className="size-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          >
                            <TrashIcon className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    </GlassCard>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={<FlagIcon className="size-6" />}
          title="No milestones yet"
          description="No milestones set yet. Add milestones to track project timeline."
          action={
            <Button onClick={handleAdd}>
              <PlusIcon className="size-4" />
              Add First Milestone
            </Button>
          }
        />
      )}

      {/* Form Dialog */}
      <MilestoneFormDialog
        projectId={projectId}
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        editItem={editItem}
      />

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Milestone</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this milestone? This action cannot be undone.
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
