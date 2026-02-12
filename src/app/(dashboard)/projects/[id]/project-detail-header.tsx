"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { StatusBadge } from "@/components/ui/ui-helpers";
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
}

export function ProjectDetailHeader({
  projectId,
  projectName,
  projectCode,
  status,
}: ProjectDetailHeaderProps) {
  const { setContent } = usePageHeader();
  const config = statusConfig[status] || { variant: "default" as StatusVariant, label: status };

  // Push everything into the app header — no local row rendered
  useEffect(() => {
    setContent({
      backLink: (
        <nav className="flex items-center gap-1.5 min-w-0">
          <Link
            href="/projects"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            Projects
          </Link>
          <ChevronRightIcon className="size-3.5 text-muted-foreground/50 shrink-0" />
          <span className="text-sm font-semibold truncate">{projectName}</span>
          <span className="text-sm text-muted-foreground shrink-0">·</span>
          <span className="text-sm font-mono text-muted-foreground shrink-0">{projectCode}</span>
          <StatusBadge variant={config.variant} dot>
            {config.label}
          </StatusBadge>
        </nav>
      ),
    });
    return () => setContent({});
  }, [projectName, projectCode, status, projectId, setContent, config.variant, config.label]);

  // Nothing to render — everything is in the header
  return null;
}
