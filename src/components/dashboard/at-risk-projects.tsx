import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GlassCard, GradientIcon } from "@/components/ui/ui-helpers";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  ClockIcon,
  FileX2Icon,
  ShieldAlertIcon,
} from "lucide-react";
import type { AtRiskProject } from "@/lib/actions/dashboard";

interface AtRiskProjectsProps {
  projects: AtRiskProject[];
}

const riskConfig = {
  high: {
    badge: "destructive" as const,
    label: "High Risk",
    bgColor: "bg-red-50 border-red-200",
    textColor: "text-red-700",
  },
  medium: {
    badge: "warning" as const,
    label: "Medium Risk",
    bgColor: "bg-amber-50 border-amber-200",
    textColor: "text-amber-700",
  },
  low: {
    badge: "secondary" as const,
    label: "Low Risk",
    bgColor: "bg-gray-50 border-gray-200",
    textColor: "text-gray-700",
  },
};

export function AtRiskProjects({ projects }: AtRiskProjectsProps) {
  if (projects.length === 0) {
    return (
      <GlassCard>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <GradientIcon icon={<ShieldAlertIcon className="size-4" />} color="coral" size="sm" />
            <CardTitle className="text-base font-semibold">At-Risk Projects</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="py-6 text-center text-muted-foreground">
            <ShieldAlertIcon className="size-8 mx-auto mb-2 text-green-500" />
            <p className="text-sm font-medium text-green-700">All projects on track!</p>
            <p className="text-xs text-muted-foreground mt-1">No risk indicators detected</p>
          </div>
        </CardContent>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GradientIcon icon={<ShieldAlertIcon className="size-4" />} color="coral" size="sm" />
            <CardTitle className="text-base font-semibold">At-Risk Projects</CardTitle>
            <Badge variant="destructive" className="ml-2">
              {projects.length}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/projects?status=active">
              View all
              <ArrowRightIcon className="size-4 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {projects.slice(0, 5).map((project) => {
          const config = riskConfig[project.riskLevel];

          return (
            <Link
              key={project.id}
              href={`/projects/${project.slug || project.id}`}
              className={`group block p-3 rounded-lg border transition-all hover:shadow-md ${config.bgColor}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-sm group-hover:text-violet-700 transition-colors">
                    {project.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {project.project_code} • {project.client_name || "No client"}
                  </p>
                </div>
                <Badge variant={config.badge}>{config.label}</Badge>
              </div>

              <div className="flex items-center gap-4 mt-2">
                {project.overdueCount > 0 && (
                  <div className="flex items-center gap-1 text-xs">
                    <ClockIcon className="size-3 text-orange-500" />
                    <span className="text-orange-700">
                      {project.overdueCount} overdue
                    </span>
                  </div>
                )}
                {project.rejectedDrawingsCount > 0 && (
                  <div className="flex items-center gap-1 text-xs">
                    <FileX2Icon className="size-3 text-red-500" />
                    <span className="text-red-700">
                      {project.rejectedDrawingsCount} rejected
                    </span>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </CardContent>
    </GlassCard>
  );
}
