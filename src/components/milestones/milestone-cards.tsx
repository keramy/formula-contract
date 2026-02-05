"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, isPast, differenceInDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GlassCard, GradientIcon, EmptyState } from "@/components/ui/ui-helpers";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { completeMilestone, deleteMilestone } from "@/lib/actions/milestones";
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
  CheckIcon,
  PencilIcon,
  TrashIcon,
  ChevronRightIcon,
  CalendarIcon,
} from "lucide-react";
import Link from "next/link";
import { ExportButton } from "@/components/ui/export-button";
import { formatters } from "@/lib/export/export-utils";
import { MilestoneFormDialog } from "@/app/(dashboard)/projects/[id]/milestone-form-dialog";

interface Milestone {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  due_date: string;
  is_completed: boolean;
  completed_at: string | null;
  alert_days_before: number | null;
  project?: {
    id: string;
    name: string;
    slug: string | null;
  };
}

interface MilestoneCardsProps {
  projectId: string;
  milestones: Milestone[];
  showProjectBadge?: boolean;
}

// Priority color logic based on due date (calculated, not stored)
function getPriorityInfo(dueDate: Date, isCompleted: boolean, alertDays: number | null) {
  if (isCompleted) {
    return {
      color: "bg-gray-400",
      textColor: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      label: "Completed",
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntil = differenceInDays(dueDate, today);

  if (daysUntil < 0) {
    return {
      color: "bg-red-600",
      textColor: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      label: "Overdue",
    };
  }

  const alertThreshold = alertDays || 7;
  if (daysUntil <= alertThreshold) {
    return {
      color: "bg-orange-400",
      textColor: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
      label: "Due Soon",
    };
  }

  return {
    color: "bg-green-500",
    textColor: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    label: "On Track",
  };
}

export function MilestoneCards({
  projectId,
  milestones,
  showProjectBadge = false,
}: MilestoneCardsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
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
    setLoadingId(milestone.id);

    try {
      const isCompleting = !milestone.is_completed;
      const result = await completeMilestone(milestone.id, isCompleting);

      if (!result.success) {
        toast.error(result.error || "Failed to update milestone");
        return;
      }

      toast.success(isCompleting ? "Milestone completed!" : "Milestone reopened");
      router.refresh();
    } catch (error) {
      console.error("Failed to update milestone:", error);
      toast.error("Failed to update milestone");
    } finally {
      setLoadingId(null);
    }
  };

  // Sort milestones: overdue first, then by due date, completed last
  const sortedMilestones = [...milestones].sort((a, b) => {
    if (a.is_completed !== b.is_completed) {
      return a.is_completed ? 1 : -1;
    }
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  return (
    <div className="space-y-4">
      {/* Main Card Container */}
      <Card className="border border-base-200">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-3">
            <GradientIcon icon={<FlagIcon className="size-5" />} color="primary" size="default" />
            <div>
              <CardTitle className="text-lg font-semibold">Milestones</CardTitle>
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
          <CardAction className="flex items-center gap-2">
            <ExportButton
              data={milestones.map((m) => ({
                name: m.name,
                description: m.description || "",
                due_date: m.due_date,
                is_completed: m.is_completed,
                completed_at: m.completed_at || "",
                alert_days_before: m.alert_days_before || 7,
                project_name: m.project?.name || "",
              }))}
              columns={[
                { key: "name", header: "Milestone Name" },
                { key: "description", header: "Description" },
                { key: "due_date", header: "Due Date", format: formatters.date },
                { key: "is_completed", header: "Completed", format: formatters.boolean() },
                { key: "completed_at", header: "Completed At", format: formatters.date },
                { key: "alert_days_before", header: "Alert Days" },
                ...(showProjectBadge ? [{ key: "project_name", header: "Project" }] : []),
              ]}
              filename="milestones"
              sheetName="Milestones"
              iconOnly
            />
            <Button onClick={handleAdd} size="sm">
              <PlusIcon className="size-4 mr-1.5" />
              Add Milestone
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progress Bar */}
          {milestones.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm font-semibold text-primary">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2.5 [&>div]:bg-primary" />
            </div>
          )}

          {/* Milestone Cards Grid - Responsive 1→3 columns */}
          {milestones.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {sortedMilestones.map((milestone) => {
                const dueDate = new Date(milestone.due_date);
                const priorityInfo = getPriorityInfo(
                  dueDate,
                  milestone.is_completed,
                  milestone.alert_days_before
                );
                const daysUntil = differenceInDays(dueDate, new Date());
                const isLoadingThis = loadingId === milestone.id;

                return (
                  <Card
                    key={milestone.id}
                    className={`group relative overflow-hidden transition-all hover:shadow-md ${priorityInfo.bgColor} ${priorityInfo.borderColor} border`}
                  >
                    <CardContent className="p-4">
                      {/* Header Row: Priority dot + Status + Actions */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {/* Priority Dot */}
                          <span className={`size-2 rounded-full ${priorityInfo.color}`} />
                          <span className={`text-xs font-medium ${priorityInfo.textColor}`}>
                            {priorityInfo.label}
                          </span>
                        </div>

                        {/* Completion Toggle */}
                        <button
                          onClick={() => handleToggleComplete(milestone)}
                          disabled={isLoadingThis}
                          className={`size-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            milestone.is_completed
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : "border-gray-300 hover:border-primary hover:bg-primary/10"
                          }`}
                          aria-label={milestone.is_completed ? "Mark incomplete" : "Mark complete"}
                        >
                          {isLoadingThis ? (
                            <Spinner className="size-3" />
                          ) : milestone.is_completed ? (
                            <CheckIcon className="size-3.5" />
                          ) : null}
                        </button>
                      </div>

                      {/* Date */}
                      <div className="flex items-center gap-1.5 mb-2">
                        <CalendarIcon className="size-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {format(dueDate, "MMM d, yyyy")}
                        </span>
                        {!milestone.is_completed && (
                          <span className={`text-xs font-medium ml-1 ${
                            daysUntil < 0 ? "text-red-600" :
                            daysUntil <= 7 ? "text-orange-600" :
                            "text-gray-500"
                          }`}>
                            {daysUntil === 0
                              ? "(Today!)"
                              : daysUntil > 0
                              ? `(${daysUntil}d left)`
                              : `(${Math.abs(daysUntil)}d overdue)`}
                          </span>
                        )}
                      </div>

                      {/* Milestone Name */}
                      <h4 className={`font-semibold text-sm mb-1 ${
                        milestone.is_completed ? "line-through text-muted-foreground" : ""
                      }`}>
                        {milestone.name}
                      </h4>

                      {/* Description */}
                      {milestone.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                          {milestone.description}
                        </p>
                      )}

                      {/* Project Badge (if showing multiple projects) */}
                      {showProjectBadge && milestone.project && (
                        <div className="mt-2">
                          <Badge variant="outline" className="text-xs">
                            {milestone.project.name}
                          </Badge>
                        </div>
                      )}

                      {/* Completed Date */}
                      {milestone.is_completed && milestone.completed_at && (
                        <p className="text-xs text-emerald-600 mt-2">
                          Completed {format(new Date(milestone.completed_at), "MMM d")}
                        </p>
                      )}

                      {/* Action Buttons - Show on Hover */}
                      <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(milestone)}
                          disabled={isLoading}
                          className="size-7 hover:bg-white/50"
                          aria-label="Edit milestone"
                        >
                          <PencilIcon className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteClick(milestone.id)}
                          disabled={isLoading}
                          className="size-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          aria-label="Delete milestone"
                        >
                          <TrashIcon className="size-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<FlagIcon className="size-6" />}
              title="No milestones yet"
              description="Add milestones to track project timeline and important deadlines."
              action={
                <Button onClick={handleAdd}>
                  <PlusIcon className="size-4 mr-1.5" />
                  Add First Milestone
                </Button>
              }
            />
          )}

          {/* View All Link */}
          {milestones.length > 6 && (
            <div className="flex justify-center pt-2">
              <Button variant="link" className="text-primary">
                View all milestones
                <ChevronRightIcon className="size-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

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
