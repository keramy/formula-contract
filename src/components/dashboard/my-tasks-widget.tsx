import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlassCard, GradientIcon } from "@/components/ui/ui-helpers";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2Icon,
  ClipboardCheckIcon,
  FileWarningIcon,
  FileTextIcon,
  AlertTriangleIcon,
  ArrowRightIcon,
} from "lucide-react";
import type { TaskSummary } from "@/lib/actions/dashboard";

interface MyTasksWidgetProps {
  tasks: TaskSummary;
}

const taskItems = [
  {
    key: "pendingMaterialApprovals",
    label: "Material Approvals",
    description: "Pending client response",
    icon: ClipboardCheckIcon,
    href: "/projects?filter=materials",
    color: "text-amber-600 bg-amber-50",
  },
  {
    key: "rejectedDrawings",
    label: "Rejected Drawings",
    description: "Need revision",
    icon: FileWarningIcon,
    href: "/projects?filter=drawings",
    color: "text-red-600 bg-red-50",
  },
  {
    key: "draftReports",
    label: "Draft Reports",
    description: "Unpublished",
    icon: FileTextIcon,
    href: "/reports?status=draft",
    color: "text-blue-600 bg-blue-50",
  },
  {
    key: "overdueMilestones",
    label: "Overdue Items",
    description: "Past target date",
    icon: AlertTriangleIcon,
    href: "/projects?filter=overdue",
    color: "text-orange-600 bg-orange-50",
  },
];

export function MyTasksWidget({ tasks }: MyTasksWidgetProps) {
  const hasNoTasks = tasks.total === 0;

  return (
    <GlassCard>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GradientIcon icon={<CheckCircle2Icon className="size-4" />} color="teal" size="sm" />
            <CardTitle className="text-base font-semibold">My Tasks</CardTitle>
            {tasks.total > 0 && (
              <Badge variant="secondary" className="ml-2">
                {tasks.total}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {hasNoTasks ? (
          <div className="py-6 text-center text-muted-foreground">
            <CheckCircle2Icon className="size-8 mx-auto mb-2 text-green-500" />
            <p className="text-sm font-medium text-green-700">All caught up!</p>
            <p className="text-xs text-muted-foreground mt-1">No pending tasks right now</p>
          </div>
        ) : (
          <div className="space-y-2">
            {taskItems.map((item) => {
              const count = tasks[item.key as keyof TaskSummary] as number;
              if (count === 0) return null;

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className="group flex items-center justify-between p-3 rounded-lg bg-gray-50/50 hover:bg-gray-100/70 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-md ${item.color}`}>
                      <item.icon className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium group-hover:text-violet-700 transition-colors">
                        {item.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-semibold">
                      {count}
                    </Badge>
                    <ArrowRightIcon className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </GlassCard>
  );
}
