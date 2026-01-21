"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontalIcon, EyeIcon, PencilIcon, ArchiveIcon, FolderKanbanIcon, ArrowRightIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from "date-fns";
import { GlassCard, StatusBadge, EmptyState, GradientAvatar } from "@/components/ui/ui-helpers";

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

interface ProjectsTableProps {
  projects: Project[];
}

type StatusVariant = "info" | "success" | "warning" | "default" | "danger";

const statusConfig: Record<string, { variant: StatusVariant; label: string }> = {
  tender: { variant: "info", label: "Tender" },
  active: { variant: "success", label: "Active" },
  on_hold: { variant: "warning", label: "On Hold" },
  completed: { variant: "default", label: "Completed" },
  cancelled: { variant: "danger", label: "Cancelled" },
};

export function ProjectsTable({ projects }: ProjectsTableProps) {
  if (projects.length === 0) {
    return (
      <GlassCard>
        <EmptyState
          icon={<FolderKanbanIcon className="size-8" />}
          title="No projects found"
          description="Get started by creating your first project to manage furniture manufacturing."
          action={
            <Button asChild className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700">
              <Link href="/projects/new">Create Project</Link>
            </Button>
          }
        />
      </GlassCard>
    );
  }

  return (
    <GlassCard className="py-0">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b border-gray-100">
            <TableHead className="py-4">Project</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project, index) => {
            const config = statusConfig[project.status] || { variant: "default" as StatusVariant, label: project.status };

            return (
              <TableRow
                key={project.id}
                className="group hover:bg-gray-50/50 border-b border-gray-50 last:border-0"
              >
                <TableCell className="py-4">
                  <Link
                    href={`/projects/${project.slug || project.id}`}
                    className="flex items-center gap-3 group/link"
                  >
                    <GradientAvatar name={project.name} size="sm" colorIndex={index % 8} />
                    <div>
                      <div className="font-medium group-hover/link:text-violet-600 transition-colors flex items-center gap-1">
                        {project.name}
                        <ArrowRightIcon className="size-3 opacity-0 -translate-x-1 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all" />
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {project.project_code}
                      </div>
                    </div>
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {project.client?.company_name || (
                    <span className="text-gray-400 italic">No client</span>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge variant={config.variant} dot>
                    {config.label}
                  </StatusBadge>
                </TableCell>
                <TableCell>
                  {project.totalItems !== undefined && project.totalItems > 0 ? (
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <Progress value={project.progress || 0} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {project.completedItems}/{project.totalItems}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">No items</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontalIcon className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem asChild>
                        <Link href={`/projects/${project.slug || project.id}`} className="cursor-pointer">
                          <EyeIcon className="size-4 mr-2" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/projects/${project.slug || project.id}/edit`} className="cursor-pointer">
                          <PencilIcon className="size-4 mr-2" />
                          Edit Project
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer">
                        <ArchiveIcon className="size-4 mr-2" />
                        Archive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </GlassCard>
  );
}
