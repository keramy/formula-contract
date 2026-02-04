import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GlassCard, GradientIcon, StatusBadge } from "@/components/ui/ui-helpers";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  FolderKanbanIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ClipboardCheckIcon,
} from "lucide-react";
import type { ClientProjectProgress } from "@/lib/actions/dashboard";

interface ClientProjectProgressProps {
  projects: ClientProjectProgress[];
}

const statusConfig: Record<string, { variant: "info" | "success" | "warning" | "default" | "danger"; label: string }> = {
  tender: { variant: "info", label: "Tender" },
  active: { variant: "success", label: "Active" },
  on_hold: { variant: "warning", label: "On Hold" },
  completed: { variant: "default", label: "Completed" },
  cancelled: { variant: "danger", label: "Cancelled" },
  not_awarded: { variant: "danger", label: "Not Awarded" },
};

export function ClientProjectProgressWidget({ projects }: ClientProjectProgressProps) {
  if (projects.length === 0) {
    return (
      <GlassCard className="col-span-full">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <GradientIcon icon={<FolderKanbanIcon className="size-4" />} color="primary" size="sm" />
            <CardTitle className="text-base font-semibold">My Projects</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">
            <FolderKanbanIcon className="size-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">No projects assigned yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Contact your project manager to get started
            </p>
          </div>
        </CardContent>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="col-span-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GradientIcon icon={<FolderKanbanIcon className="size-4" />} color="primary" size="sm" />
            <CardTitle className="text-base font-semibold">My Projects</CardTitle>
            <Badge variant="secondary" className="ml-2">
              {projects.length}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/projects">
              View all
              <ArrowRightIcon className="size-4 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const config = statusConfig[project.status] || { variant: "default" as const, label: project.status };
            const progressColor = project.progress >= 75 ? "bg-green-500" : project.progress >= 50 ? "bg-blue-500" : "bg-primary";

            return (
              <Link
                key={project.id}
                href={`/projects/${project.slug || project.id}`}
                className="group block p-4 rounded-xl bg-card border border-base-200 hover:border-primary-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                      {project.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{project.project_code}</p>
                  </div>
                  <StatusBadge variant={config.variant}>{config.label}</StatusBadge>
                </div>

                {/* Progress Section */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} className="h-2" />
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CheckCircleIcon className="size-3 text-green-500" />
                    {project.completedItems} of {project.totalItems} items complete
                  </div>
                </div>

                {/* Pending Approvals Badge */}
                {project.pendingApprovals > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-amber-50 border border-amber-200">
                    <ClipboardCheckIcon className="size-4 text-amber-600" />
                    <span className="text-xs font-medium text-amber-700">
                      {project.pendingApprovals} item{project.pendingApprovals > 1 ? "s" : ""} awaiting your approval
                    </span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </CardContent>
    </GlassCard>
  );
}
