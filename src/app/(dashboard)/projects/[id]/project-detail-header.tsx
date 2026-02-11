"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, FolderKanbanIcon } from "lucide-react";
import { GradientIcon, StatusBadge } from "@/components/ui/ui-helpers";
import { usePageHeader } from "@/components/layout/app-header";

type StatusVariant = "info" | "success" | "warning" | "default" | "danger";

const statusConfig: Record<string, { variant: StatusVariant; label: string }> = {
  tender: { variant: "info", label: "Tender" },
  active: { variant: "success", label: "Active" },
  on_hold: { variant: "warning", label: "On Hold" },
  completed: { variant: "default", label: "Completed" },
  cancelled: { variant: "danger", label: "Cancelled" },
  not_awarded: { variant: "danger", label: "Not Awarded" },
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
  const { setContent } = usePageHeader();
  const config = statusConfig[status] || { variant: "default" as StatusVariant, label: status };

  // Push everything into the app header — no local row rendered
  useEffect(() => {
    setContent({
      backLink: (
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
          <Link href="/projects">
            <ArrowLeftIcon className="size-4 sm:mr-1" />
            <span className="hidden sm:inline">Projects</span>
          </Link>
        </Button>
      ),
      icon: <GradientIcon icon={<FolderKanbanIcon className="size-4" />} color="primary" size="sm" />,
      title: projectName,
      description: projectCode,
      badge: (
        <StatusBadge variant={config.variant} dot>
          {config.label}
        </StatusBadge>
      ),
      actions: undefined,
    });
    return () => setContent({});
  }, [projectName, projectCode, status, canEdit, projectId, setContent, config.variant, config.label]);

  // Nothing to render — everything is in the header
  return null;
}
