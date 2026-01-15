"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { ArrowLeftIcon, PanelLeftIcon, PencilIcon, FolderKanbanIcon } from "lucide-react";
import { GradientIcon, StatusBadge } from "@/components/ui/ui-helpers";

type StatusVariant = "info" | "success" | "warning" | "default" | "danger";

const statusConfig: Record<string, { variant: StatusVariant; label: string }> = {
  tender: { variant: "info", label: "Tender" },
  active: { variant: "success", label: "Active" },
  on_hold: { variant: "warning", label: "On Hold" },
  completed: { variant: "default", label: "Completed" },
  cancelled: { variant: "danger", label: "Cancelled" },
};

interface ProjectDetailHeaderProps {
  projectId: string;
  projectName: string;
  projectCode: string;
  status: string;
  canEdit: boolean;
}

export function ProjectDetailHeader({
  projectId,
  projectName,
  projectCode,
  status,
  canEdit,
}: ProjectDetailHeaderProps) {
  const { toggleSidebar } = useSidebar();
  const config = statusConfig[status] || { variant: "default" as StatusVariant, label: status };

  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="size-9 shrink-0"
        >
          <PanelLeftIcon className="size-5" />
        </Button>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/projects" className="text-muted-foreground hover:text-foreground">
            <ArrowLeftIcon className="size-4 mr-1" />
            Projects
          </Link>
        </Button>
        <div className="h-6 w-px bg-border mx-1" />
        <GradientIcon
          icon={<FolderKanbanIcon className="size-5" />}
          color="violet"
        />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{projectName}</h1>
            <StatusBadge variant={config.variant} dot>
              {config.label}
            </StatusBadge>
          </div>
          <p className="text-sm text-muted-foreground font-mono">{projectCode}</p>
        </div>
      </div>
      {canEdit && (
        <Button asChild className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700">
          <Link href={`/projects/${projectId}/edit`}>
            <PencilIcon className="size-4" />
            Edit Project
          </Link>
        </Button>
      )}
    </div>
  );
}
