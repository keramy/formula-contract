"use client";

import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlassCard, GradientIcon, EmptyState } from "@/components/ui/ui-helpers";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, AlertTriangleIcon, ClockIcon } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow, differenceInDays, parseISO } from "date-fns";

interface Milestone {
  id: string;
  project_id: string;
  name: string;
  due_date: string;
  is_completed: boolean;
  project?: {
    name: string;
    project_code: string;
    slug?: string | null;
  };
}

interface UpcomingMilestonesWidgetProps {
  milestones: Milestone[];
}

export function UpcomingMilestonesWidget({ milestones }: UpcomingMilestonesWidgetProps) {
  // Separate overdue and upcoming
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdue = milestones.filter(m => {
    const dueDate = parseISO(m.due_date);
    return dueDate < today && !m.is_completed;
  });

  const upcoming = milestones.filter(m => {
    const dueDate = parseISO(m.due_date);
    return dueDate >= today && !m.is_completed;
  });

  const allMilestones = [...overdue, ...upcoming].slice(0, 5);

  const getMilestoneStatus = (dueDate: string) => {
    const due = parseISO(dueDate);
    const daysUntil = differenceInDays(due, today);

    if (daysUntil < 0) {
      return { label: "Overdue", variant: "destructive" as const, icon: AlertTriangleIcon };
    } else if (daysUntil === 0) {
      return { label: "Due Today", variant: "warning" as const, icon: ClockIcon };
    } else if (daysUntil <= 7) {
      return { label: "Due Soon", variant: "warning" as const, icon: ClockIcon };
    } else {
      return { label: "Upcoming", variant: "secondary" as const, icon: CalendarIcon };
    }
  };

  return (
    <GlassCard>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GradientIcon icon={<CalendarIcon className="size-4" />} color="amber" size="sm" />
            <CardTitle className="text-sm font-semibold">Upcoming Milestones</CardTitle>
            {overdue.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {overdue.length} overdue
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {allMilestones.length === 0 ? (
          <EmptyState
            icon={<CalendarIcon className="size-6" />}
            title="No upcoming milestones"
            description="Deadlines will appear here when added to projects"
          />
        ) : (
          <ScrollArea className="h-[200px]">
          <div className="space-y-2 pr-2">
            {allMilestones.map((milestone) => {
              const status = getMilestoneStatus(milestone.due_date);
              const StatusIcon = status.icon;
              const projectUrl = milestone.project?.slug || milestone.project_id;

              return (
                <Link
                  key={milestone.id}
                  href={`/projects/${projectUrl}?tab=milestones`}
                  className="group block p-2.5 rounded-lg bg-gray-50/50 hover:bg-gray-100/70 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <StatusIcon className={`size-3.5 shrink-0 ${
                          status.variant === "destructive" ? "text-red-500" :
                          status.variant === "warning" ? "text-amber-500" :
                          "text-gray-400"
                        }`} />
                        <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                          {milestone.name}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5 ml-5">
                        {milestone.project?.name || "Unknown project"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge
                        variant={status.variant === "destructive" ? "destructive" : "outline"}
                        className={`text-xs ${
                          status.variant === "warning" ? "border-amber-300 text-amber-700 bg-amber-50" : ""
                        }`}
                      >
                        {status.label}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(parseISO(milestone.due_date), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          </ScrollArea>
        )}
      </CardContent>
    </GlassCard>
  );
}
