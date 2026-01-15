"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { GlassCard, GradientIcon, StatusBadge, EmptyState } from "@/components/ui/ui-helpers";
import { Progress } from "@/components/ui/progress";
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
} from "lucide-react";
import { format, isPast, differenceInDays } from "date-fns";
import { MilestoneFormDialog } from "./milestone-form-dialog";

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
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from("milestones")
        .delete()
        .eq("id", deleteItemId);

      if (error) throw error;
      router.refresh();
    } catch (error) {
      console.error("Failed to delete milestone:", error);
    } finally {
      setIsLoading(false);
      setDeleteDialogOpen(false);
      setDeleteItemId(null);
    }
  };

  const handleToggleComplete = async (milestone: Milestone) => {
    setIsLoading(true);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from("milestones")
        .update({
          is_completed: !milestone.is_completed,
          completed_at: !milestone.is_completed ? new Date().toISOString() : null,
        })
        .eq("id", milestone.id);

      if (error) throw error;
      router.refresh();
    } catch (error) {
      console.error("Failed to update milestone:", error);
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GradientIcon icon={<FlagIcon className="size-5" />} color="violet" size="default" />
          <div>
            <h3 className="text-lg font-medium">Milestones</h3>
            <p className="text-sm text-muted-foreground">
              Track project timeline and key deliverables
            </p>
          </div>
        </div>
        <Button
          onClick={handleAdd}
          className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
        >
          <PlusIcon className="size-4" />
          Add Milestone
        </Button>
      </div>

      {/* Progress */}
      {milestones.length > 0 && (
        <GlassCard className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm font-semibold text-violet-600">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2.5 [&>div]:bg-gradient-to-r [&>div]:from-violet-500 [&>div]:to-purple-500" />
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <div className="size-2 rounded-full bg-emerald-500" />
              {stats.completed} completed
            </span>
            <span className="flex items-center gap-1">
              <div className="size-2 rounded-full bg-sky-500" />
              {stats.upcoming} upcoming
            </span>
            {stats.overdue > 0 && (
              <span className="flex items-center gap-1 text-rose-600">
                <div className="size-2 rounded-full bg-rose-500" />
                {stats.overdue} overdue
              </span>
            )}
          </div>
        </GlassCard>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <GlassCard hover="lift" className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500/10 to-purple-500/10">
              <FlagIcon className="size-3.5 text-violet-600" />
            </div>
            <span className="text-xs font-medium">Total</span>
          </div>
          <p className="text-2xl font-bold">{stats.total}</p>
        </GlassCard>

        <GlassCard hover="lift" className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/10">
              <CheckCircleIcon className="size-3.5 text-emerald-600" />
            </div>
            <span className="text-xs font-medium">Completed</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
        </GlassCard>

        <GlassCard hover="lift" className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-sky-500/10 to-blue-500/10">
              <ClockIcon className="size-3.5 text-sky-600" />
            </div>
            <span className="text-xs font-medium">Upcoming</span>
          </div>
          <p className="text-2xl font-bold text-sky-600">{stats.upcoming}</p>
        </GlassCard>

        <GlassCard hover="lift" className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-rose-500/10 to-red-500/10">
              <AlertTriangleIcon className="size-3.5 text-rose-600" />
            </div>
            <span className="text-xs font-medium">Overdue</span>
          </div>
          <p className="text-2xl font-bold text-rose-600">{stats.overdue}</p>
        </GlassCard>
      </div>

      {/* Overdue Alert */}
      {stats.overdue > 0 && (
        <GlassCard className="p-4 border-rose-200 bg-rose-50/80 dark:bg-rose-900/10 dark:border-rose-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-rose-500/20 to-red-500/20">
              <AlertTriangleIcon className="size-4 text-rose-600" />
            </div>
            <span className="font-medium text-rose-700 dark:text-rose-400">
              {stats.overdue} milestone{stats.overdue !== 1 ? "s" : ""} overdue!
            </span>
          </div>
        </GlassCard>
      )}

      {/* Milestones List */}
      {milestones.length > 0 ? (
        <div className="space-y-3">
          {sortedMilestones.map((milestone) => {
            const status = getMilestoneStatus(milestone);
            const config = statusConfig[status];
            const daysUntil = differenceInDays(new Date(milestone.due_date), new Date());

            return (
              <GlassCard key={milestone.id} className={`p-4 ${milestone.is_completed ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={() => handleToggleComplete(milestone)}
                      disabled={isLoading}
                      className={`mt-0.5 size-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        milestone.is_completed
                          ? "bg-gradient-to-br from-emerald-500 to-teal-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/30"
                          : "border-muted-foreground/30 hover:border-violet-500 hover:bg-violet-50"
                      }`}
                    >
                      {milestone.is_completed && <CheckIcon className="size-3" />}
                    </button>

                    {/* Content */}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`font-medium ${milestone.is_completed ? "line-through text-muted-foreground" : ""}`}>
                          {milestone.name}
                        </h4>
                        <StatusBadge variant={config.variant}>
                          {config.icon}
                          <span className="ml-1">{config.label}</span>
                        </StatusBadge>
                      </div>

                      {milestone.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {milestone.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="size-3" />
                          {format(new Date(milestone.due_date), "MMM d, yyyy")}
                        </span>
                        {!milestone.is_completed && (
                          <span className={daysUntil < 0 ? "text-rose-600 font-medium" : daysUntil <= 7 ? "text-amber-600" : ""}>
                            {daysUntil === 0
                              ? "Due today"
                              : daysUntil > 0
                              ? `${daysUntil} days left`
                              : `${Math.abs(daysUntil)} days overdue`}
                          </span>
                        )}
                        {milestone.is_completed && milestone.completed_at && (
                          <span className="text-emerald-600">
                            Completed {format(new Date(milestone.completed_at), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(milestone)}
                      disabled={isLoading}
                      className="hover:bg-violet-50 hover:text-violet-600"
                    >
                      <PencilIcon className="size-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteClick(milestone.id)}
                      disabled={isLoading}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    >
                      <TrashIcon className="size-3" />
                    </Button>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<FlagIcon className="size-6" />}
          title="No milestones yet"
          description="No milestones set yet. Add milestones to track project timeline."
          action={
            <Button
              onClick={handleAdd}
              className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
            >
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
              onClick={handleDeleteConfirm}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
