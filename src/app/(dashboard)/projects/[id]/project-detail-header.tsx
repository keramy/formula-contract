"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, PencilIcon, FolderKanbanIcon } from "lucide-react";
import { GradientIcon, StatusBadge } from "@/components/ui/ui-helpers";
import { usePageHeader } from "@/components/layout/app-header";

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
  showEditButton?: boolean;
}

export function ProjectDetailHeader({
  projectId,
  projectName,
  projectCode,
  status,
  canEdit,
  showEditButton = false,
}: ProjectDetailHeaderProps) {
  const { setContent } = usePageHeader();
  const config = statusConfig[status] || { variant: "default" as StatusVariant, label: status };

  // Set the header content
  useEffect(() => {
    setContent({
      icon: <GradientIcon icon={<FolderKanbanIcon className="size-4" />} color="violet" size="sm" />,
      title: projectName,
      description: projectCode,
    });
    return () => setContent({});
  }, [projectName, projectCode, setContent]);

  // Render navigation and action buttons below the header
  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/projects" className="text-muted-foreground hover:text-foreground">
            <ArrowLeftIcon className="size-4 mr-1" />
            Projects
          </Link>
        </Button>
        <div className="h-5 w-px bg-border" />
        <StatusBadge variant={config.variant} dot>
          {config.label}
        </StatusBadge>
      </div>
      {canEdit && showEditButton && (
        <Button asChild size="sm" className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700">
          <Link href={`/projects/${projectId}/edit`}>
            <PencilIcon className="size-4" />
            Edit Project
          </Link>
        </Button>
      )}
    </div>
  );
}
