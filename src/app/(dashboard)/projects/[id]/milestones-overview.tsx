"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  const statusConfig = {
    completed: {
      color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      icon: <CheckCircleIcon className="size-4" />,
      label: "Completed",
    },
    overdue: {
      color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      icon: <AlertTriangleIcon className="size-4" />,
      label: "Overdue",
    },
    warning: {
      color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      icon: <ClockIcon className="size-4" />,
      label: "Due Soon",
    },
    upcoming: {
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      icon: <CalendarIcon className="size-4" />,
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
        <div>
          <h3 className="text-lg font-medium">Milestones</h3>
          <p className="text-sm text-muted-foreground">
            Track project timeline and key deliverables
          </p>
        </div>
        <Button onClick={handleAdd}>
          <PlusIcon className="size-4" />
          Add Milestone
        </Button>
      </div>

      {/* Progress */}
      {milestones.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span>{stats.completed} completed</span>
            <span>{stats.upcoming} upcoming</span>
            {stats.overdue > 0 && (
              <span className="text-red-600">{stats.overdue} overdue</span>
            )}
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <FlagIcon className="size-4" />
            <span className="text-xs font-medium">Total</span>
          </div>
          <p className="text-2xl font-bold">{stats.total}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <CheckCircleIcon className="size-4 text-green-500" />
            <span className="text-xs font-medium">Completed</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <ClockIcon className="size-4 text-blue-500" />
            <span className="text-xs font-medium">Upcoming</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{stats.upcoming}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <AlertTriangleIcon className="size-4 text-red-500" />
            <span className="text-xs font-medium">Overdue</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
        </Card>
      </div>

      {/* Overdue Alert */}
      {stats.overdue > 0 && (
        <Card className="p-4 border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800">
          <div className="flex items-center gap-2">
            <AlertTriangleIcon className="size-5 text-red-500" />
            <span className="font-medium text-red-700 dark:text-red-400">
              {stats.overdue} milestone{stats.overdue !== 1 ? "s" : ""} overdue!
            </span>
          </div>
        </Card>
      )}

      {/* Milestones List */}
      {milestones.length > 0 ? (
        <div className="space-y-3">
          {sortedMilestones.map((milestone) => {
            const status = getMilestoneStatus(milestone);
            const config = statusConfig[status];
            const daysUntil = differenceInDays(new Date(milestone.due_date), new Date());

            return (
              <Card key={milestone.id} className={`p-4 ${milestone.is_completed ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={() => handleToggleComplete(milestone)}
                      disabled={isLoading}
                      className={`mt-0.5 size-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        milestone.is_completed
                          ? "bg-green-500 border-green-500 text-white"
                          : "border-muted-foreground/30 hover:border-primary"
                      }`}
                    >
                      {milestone.is_completed && <CheckIcon className="size-3" />}
                    </button>

                    {/* Content */}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`font-medium ${milestone.is_completed ? "line-through" : ""}`}>
                          {milestone.name}
                        </h4>
                        <Badge variant="secondary" className={config.color}>
                          {config.icon}
                          <span className="ml-1">{config.label}</span>
                        </Badge>
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
                          <span className={daysUntil < 0 ? "text-red-600" : ""}>
                            {daysUntil === 0
                              ? "Due today"
                              : daysUntil > 0
                              ? `${daysUntil} days left`
                              : `${Math.abs(daysUntil)} days overdue`}
                          </span>
                        )}
                        {milestone.is_completed && milestone.completed_at && (
                          <span className="text-green-600">
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
                    >
                      <PencilIcon className="size-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteClick(milestone.id)}
                      disabled={isLoading}
                      className="text-destructive hover:text-destructive"
                    >
                      <TrashIcon className="size-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-muted p-3 mb-4">
              <FlagIcon className="size-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">
              No milestones set yet. Add milestones to track project timeline.
            </p>
            <Button onClick={handleAdd}>
              <PlusIcon className="size-4" />
              Add First Milestone
            </Button>
          </div>
        </Card>
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
