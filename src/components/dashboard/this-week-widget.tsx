"use client";

import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlassCard, GradientIcon } from "@/components/ui/ui-helpers";
import {
  CalendarDaysIcon,
  CheckCircle2Icon,
  FileTextIcon,
  AlertTriangleIcon,
  TrendingUpIcon,
} from "lucide-react";
import type { ThisWeekSummary } from "@/lib/actions/dashboard";

interface ThisWeekWidgetProps {
  summary: ThisWeekSummary;
}

export function ThisWeekWidget({ summary }: ThisWeekWidgetProps) {
  const hasActivity =
    summary.itemsCompletedThisWeek > 0 ||
    summary.reportsPublishedThisWeek > 0 ||
    summary.upcomingMilestones > 0;

  return (
    <GlassCard>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center gap-2">
          <GradientIcon icon={<CalendarDaysIcon className="size-4" />} color="primary" size="sm" />
          <CardTitle className="text-sm font-semibold">This Week</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {!hasActivity && summary.milestonesOverdue === 0 ? (
          <div className="py-4 text-center text-muted-foreground">
            <TrendingUpIcon className="size-6 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Activity will show here</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {/* Items Completed */}
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2Icon className="size-4 text-emerald-600" />
                <span className="text-xs text-emerald-700 font-medium">Completed</span>
              </div>
              <p className="text-2xl font-bold text-emerald-700">
                {summary.itemsCompletedThisWeek}
              </p>
              <p className="text-xs text-emerald-600/70">items this week</p>
            </div>

            {/* Reports Published */}
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
              <div className="flex items-center gap-2 mb-1">
                <FileTextIcon className="size-4 text-blue-600" />
                <span className="text-xs text-blue-700 font-medium">Reports</span>
              </div>
              <p className="text-2xl font-bold text-blue-700">
                {summary.reportsPublishedThisWeek}
              </p>
              <p className="text-xs text-blue-600/70">published this week</p>
            </div>

            {/* Upcoming Milestones */}
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
              <div className="flex items-center gap-2 mb-1">
                <CalendarDaysIcon className="size-4 text-amber-600" />
                <span className="text-xs text-amber-700 font-medium">Upcoming</span>
              </div>
              <p className="text-2xl font-bold text-amber-700">
                {summary.upcomingMilestones}
              </p>
              <p className="text-xs text-amber-600/70">milestones in 7 days</p>
            </div>

            {/* Overdue Milestones */}
            <div className={`p-3 rounded-lg ${
              summary.milestonesOverdue > 0
                ? "bg-red-50 border border-red-100"
                : "bg-gray-50 border border-gray-100"
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangleIcon className={`size-4 ${
                  summary.milestonesOverdue > 0 ? "text-red-600" : "text-gray-400"
                }`} />
                <span className={`text-xs font-medium ${
                  summary.milestonesOverdue > 0 ? "text-red-700" : "text-gray-500"
                }`}>Overdue</span>
              </div>
              <p className={`text-2xl font-bold ${
                summary.milestonesOverdue > 0 ? "text-red-700" : "text-gray-400"
              }`}>
                {summary.milestonesOverdue}
              </p>
              <p className={`text-xs ${
                summary.milestonesOverdue > 0 ? "text-red-600/70" : "text-gray-400"
              }`}>milestones overdue</p>
            </div>
          </div>
        )}
      </CardContent>
    </GlassCard>
  );
}
