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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MoreHorizontalIcon,
  PencilIcon,
  ArchiveIcon,
  FolderKanbanIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowUpDownIcon,
  AlertCircleIcon,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { format, formatDistanceToNow, isPast, differenceInDays } from "date-fns";
import { GlassCard, StatusBadge, EmptyState } from "@/components/ui/ui-helpers";

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
  hasAttention?: boolean;
  attentionCount?: number;
}

export type SortField = "project_code" | "name" | "client" | "status" | "progress" | "installation_date";
export type SortDirection = "asc" | "desc";

interface ProjectsTableProps {
  projects: Project[];
  sortField?: SortField;
  sortDirection?: SortDirection;
  onSort?: (field: SortField) => void;
  onEdit?: (projectId: string) => void;
}

type StatusVariant = "info" | "success" | "warning" | "default" | "danger";

const statusConfig: Record<string, { variant: StatusVariant; label: string }> = {
  tender: { variant: "info", label: "Tender" },
  active: { variant: "success", label: "Active" },
  on_hold: { variant: "warning", label: "On Hold" },
  completed: { variant: "default", label: "Completed" },
  cancelled: { variant: "danger", label: "Cancelled" },
  not_awarded: { variant: "danger", label: "Not Awarded" },
};

function SortableHeader({
  children,
  field,
  currentField,
  direction,
  onSort,
  className = "",
}: {
  children: React.ReactNode;
  field: SortField;
  currentField?: SortField;
  direction?: SortDirection;
  onSort?: (field: SortField) => void;
  className?: string;
}) {
  const isActive = currentField === field;

  return (
    <button
      onClick={() => onSort?.(field)}
      className={`flex items-center gap-1 hover:text-foreground transition-colors ${className}`}
    >
      {children}
      {isActive ? (
        direction === "asc" ? (
          <ArrowUpIcon className="size-3.5" />
        ) : (
          <ArrowDownIcon className="size-3.5" />
        )
      ) : (
        <ArrowUpDownIcon className="size-3.5 opacity-40" />
      )}
    </button>
  );
}

export function ProjectsTable({ projects, sortField, sortDirection, onSort, onEdit }: ProjectsTableProps) {
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
            <TableHead className="py-4 w-[50px] text-center">#</TableHead>
            <TableHead className="w-[100px]">
              <SortableHeader field="project_code" currentField={sortField} direction={sortDirection} onSort={onSort}>
                Code
              </SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader field="name" currentField={sortField} direction={sortDirection} onSort={onSort}>
                Project Name
              </SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader field="client" currentField={sortField} direction={sortDirection} onSort={onSort}>
                Client
              </SortableHeader>
            </TableHead>
            <TableHead className="w-[110px]">
              <SortableHeader field="status" currentField={sortField} direction={sortDirection} onSort={onSort}>
                Status
              </SortableHeader>
            </TableHead>
            <TableHead className="w-[140px]">
              <SortableHeader field="progress" currentField={sortField} direction={sortDirection} onSort={onSort}>
                Progress
              </SortableHeader>
            </TableHead>
            <TableHead className="w-[140px]">
              <SortableHeader field="installation_date" currentField={sortField} direction={sortDirection} onSort={onSort}>
                Installation
              </SortableHeader>
            </TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project, index) => {
            const config = statusConfig[project.status] || { variant: "default" as StatusVariant, label: project.status };

            // Installation date formatting
            let installationDisplay: React.ReactNode = (
              <span className="text-muted-foreground italic">Not set</span>
            );
            let installationClass = "text-muted-foreground";

            if (project.installation_date) {
              const installDate = new Date(project.installation_date);
              const daysUntil = differenceInDays(installDate, new Date());

              if (isPast(installDate) && project.status !== "completed") {
                installationClass = "text-rose-600 font-medium";
                installationDisplay = (
                  <div>
                    <div>{format(installDate, "MMM d, yyyy")}</div>
                    <div className="text-xs">Overdue</div>
                  </div>
                );
              } else if (daysUntil <= 14 && daysUntil >= 0) {
                installationClass = "text-amber-600 font-medium";
                installationDisplay = (
                  <div>
                    <div>{format(installDate, "MMM d, yyyy")}</div>
                    <div className="text-xs">{daysUntil === 0 ? "Today!" : `${daysUntil} days`}</div>
                  </div>
                );
              } else {
                installationDisplay = (
                  <div>
                    <div>{format(installDate, "MMM d, yyyy")}</div>
                    {daysUntil > 0 && <div className="text-xs text-muted-foreground">{daysUntil} days</div>}
                  </div>
                );
              }
            }

            return (
              <TableRow
                key={project.id}
                className="group hover:bg-gray-50/50 border-b border-gray-50 last:border-0"
              >
                {/* Row Number */}
                <TableCell className="py-4 text-center text-muted-foreground text-sm font-mono">
                  {index + 1}
                </TableCell>

                {/* Project Code */}
                <TableCell className="py-4">
                  <Link
                    href={`/projects/${project.slug || project.id}`}
                    className="font-mono text-sm text-violet-600 hover:text-violet-700 hover:underline"
                  >
                    {project.project_code}
                  </Link>
                </TableCell>

                {/* Project Name with Attention Dot */}
                <TableCell className="py-4">
                  <Link
                    href={`/projects/${project.slug || project.id}`}
                    className="flex items-center gap-2 group/link"
                  >
                    <span className="font-medium group-hover/link:text-violet-600 group-hover/link:underline transition-colors">
                      {project.name}
                    </span>
                    {project.hasAttention && (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center justify-center size-5 rounded-full bg-amber-100">
                              <AlertCircleIcon className="size-3.5 text-amber-600" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <span className="text-xs">
                              {project.attentionCount || 1} item{(project.attentionCount || 1) > 1 ? "s" : ""} need attention
                            </span>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </Link>
                </TableCell>

                {/* Client */}
                <TableCell className="text-muted-foreground">
                  {project.client?.company_name || (
                    <span className="text-gray-400 italic">No client</span>
                  )}
                </TableCell>

                {/* Status */}
                <TableCell>
                  <StatusBadge variant={config.variant} dot>
                    {config.label}
                  </StatusBadge>
                </TableCell>

                {/* Progress - Percentage with bar */}
                <TableCell>
                  {project.totalItems !== undefined && project.totalItems > 0 ? (
                    <div className="flex items-center gap-2">
                      <Progress value={project.progress || 0} className="h-2 flex-1 max-w-[80px]" />
                      <span className="text-sm font-medium w-10 text-right">
                        {project.progress || 0}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">No items</span>
                  )}
                </TableCell>

                {/* Installation Date */}
                <TableCell className={`text-sm ${installationClass}`}>
                  {installationDisplay}
                </TableCell>

                {/* Actions */}
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
                      <DropdownMenuItem
                        onClick={() => onEdit?.(project.id)}
                        className="cursor-pointer"
                      >
                        <PencilIcon className="size-4 mr-2" />
                        Edit Project
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
