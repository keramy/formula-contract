"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { GlassCard, StatusBadge } from "@/components/ui/ui-helpers";
import { Progress } from "@/components/ui/progress";
import { CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVerticalIcon,
  EyeIcon,
  EditIcon,
  ArchiveIcon,
  Building2Icon,
  CalendarIcon,
  CheckCircleIcon,
} from "lucide-react";

interface Project {
  id: string;
  slug: string | null;
  project_code: string;
  name: string;
  status: string;
  installation_date: string | null;
  created_at: string;
  client: { id: string; company_name: string } | null;
  progress?: number;
  totalItems?: number;
  completedItems?: number;
}

interface ProjectCardProps {
  project: Project;
}

const statusConfig: Record<
  string,
  { variant: "info" | "success" | "warning" | "default" | "danger"; label: string }
> = {
  tender: { variant: "info", label: "Tender" },
  active: { variant: "success", label: "Active" },
  on_hold: { variant: "warning", label: "On Hold" },
  completed: { variant: "default", label: "Completed" },
  cancelled: { variant: "danger", label: "Cancelled" },
  not_awarded: { variant: "danger", label: "Not Awarded" },
};

export function ProjectCard({ project }: ProjectCardProps) {
  const config = statusConfig[project.status] || { variant: "default" as const, label: project.status };
  const progress = project.progress || 0;

  return (
    <GlassCard className="w-full hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        {/* Header with status and menu */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono text-xs">
              {project.project_code}
            </Badge>
            <StatusBadge variant={config.variant}>{config.label}</StatusBadge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="size-8 p-0">
                <MoreVerticalIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/projects/${project.slug || project.id}`}>
                  <EyeIcon className="size-4 mr-2" />
                  View
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/projects/${project.slug || project.id}/edit`}>
                  <EditIcon className="size-4 mr-2" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ArchiveIcon className="size-4 mr-2" />
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Project Name */}
        <Link
          href={`/projects/${project.slug || project.id}`}
          className="block group"
        >
          <h3 className="font-semibold text-base mb-1 group-hover:text-primary transition-colors line-clamp-2">
            {project.name}
          </h3>
        </Link>

        {/* Client */}
        {project.client && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
            <Building2Icon className="size-3.5" />
            <span className="truncate">{project.client.company_name}</span>
          </div>
        )}

        {/* Progress */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <CheckCircleIcon className="size-3 text-green-500" />
            {project.completedItems || 0} of {project.totalItems || 0} items complete
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t">
          <div className="flex items-center gap-1">
            <CalendarIcon className="size-3" />
            {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
          </div>
          {project.installation_date && (
            <span>
              Install: {new Date(project.installation_date).toLocaleDateString()}
            </span>
          )}
        </div>
      </CardContent>
    </GlassCard>
  );
}
