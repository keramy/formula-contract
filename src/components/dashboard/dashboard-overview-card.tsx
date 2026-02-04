"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CalendarDaysIcon,
  CheckCircle2Icon,
  FileTextIcon,
  AlertTriangleIcon,
  LayoutDashboardIcon,
  FolderKanbanIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ThisWeekSummary, ProjectsByStatus } from "@/lib/actions/dashboard";

interface DashboardOverviewCardProps {
  thisWeek: ThisWeekSummary;
  projectsStatus: ProjectsByStatus;
}

const STATUS_CONFIG = [
  { key: "active", label: "Active", color: "bg-emerald-500", textColor: "text-emerald-600" },
  { key: "tender", label: "Tender", color: "bg-sky-500", textColor: "text-sky-600" },
  { key: "on_hold", label: "On Hold", color: "bg-amber-500", textColor: "text-amber-600" },
  { key: "completed", label: "Done", color: "bg-gray-400", textColor: "text-gray-500" },
  { key: "cancelled", label: "Cancelled", color: "bg-red-500", textColor: "text-red-600" },
  { key: "not_awarded", label: "Not Awarded", color: "bg-pink-500", textColor: "text-pink-600" },
];

export function DashboardOverviewCard({ thisWeek, projectsStatus }: DashboardOverviewCardProps) {
  // Calculate project percentages for stacked bar
  const total = projectsStatus.total || 1; // Avoid division by zero
  const projectData = STATUS_CONFIG
    .map(status => ({
      ...status,
      value: projectsStatus[status.key as keyof Omit<ProjectsByStatus, 'total'>] || 0,
      percentage: ((projectsStatus[status.key as keyof Omit<ProjectsByStatus, 'total'>] || 0) / total) * 100,
    }))
    .filter(item => item.value > 0);

  return (
    <TooltipProvider delayDuration={200}>
      <Card className="border border-base-200">
        <CardContent className="py-4 space-y-4">
          {/* This Week Row */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 pr-4 border-r border-base-200">
              <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <CalendarDaysIcon className="size-4 text-primary" />
              </div>
              <span className="text-sm font-semibold text-muted-foreground">This Week</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Completed Items */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 cursor-default">
                    <CheckCircle2Icon className="size-3.5" />
                    <span>{thisWeek.itemsCompletedThisWeek}</span>
                    <span className="text-emerald-600/70">completed</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{thisWeek.itemsCompletedThisWeek} scope items completed this week</p>
                </TooltipContent>
              </Tooltip>

              {/* Reports Published */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 cursor-default">
                    <FileTextIcon className="size-3.5" />
                    <span>{thisWeek.reportsPublishedThisWeek}</span>
                    <span className="text-blue-600/70">reports</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{thisWeek.reportsPublishedThisWeek} reports published this week</p>
                </TooltipContent>
              </Tooltip>

              {/* Upcoming Milestones */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 cursor-default">
                    <CalendarDaysIcon className="size-3.5" />
                    <span>{thisWeek.upcomingMilestones}</span>
                    <span className="text-amber-600/70">upcoming</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{thisWeek.upcomingMilestones} milestones due in next 7 days</p>
                </TooltipContent>
              </Tooltip>

              {/* Overdue Milestones */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-default",
                    thisWeek.milestonesOverdue > 0
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-500"
                  )}>
                    <AlertTriangleIcon className="size-3.5" />
                    <span>{thisWeek.milestonesOverdue}</span>
                    <span className={thisWeek.milestonesOverdue > 0 ? "text-red-600/70" : "text-gray-400"}>
                      overdue
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{thisWeek.milestonesOverdue} milestones past due date</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-base-200" />

          {/* Projects Status Row */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FolderKanbanIcon className="size-4 text-primary" />
                </div>
                <span className="text-sm font-semibold text-muted-foreground">Projects</span>
              </div>
              <span className="text-sm font-bold">{projectsStatus.total} total</span>
            </div>

            {/* Stacked Progress Bar */}
            {projectsStatus.total > 0 ? (
              <>
                <div className="flex h-3 overflow-hidden rounded-full bg-base-100">
                  {projectData.map((item, index) => (
                    <Tooltip key={item.key}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn("h-full transition-all cursor-default", item.color)}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{item.value} {item.label} project{item.value !== 1 ? "s" : ""}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-3">
                  {projectData.map((item) => (
                    <div key={item.key} className="flex items-center gap-1.5">
                      <span className={cn("size-2.5 rounded-full", item.color)} />
                      <span className="text-xs text-muted-foreground">
                        {item.label} ({item.value})
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">No projects yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
