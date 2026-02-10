"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, GanttChartIcon } from "lucide-react";
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

interface TimelinePageHeaderProps {
  projectName: string;
  projectCode: string;
  clientName: string | null;
  status: string;
  backUrl: string;
}

export function TimelinePageHeader({
  projectName,
  projectCode,
  clientName,
  status,
  backUrl,
}: TimelinePageHeaderProps) {
  const { setContent } = usePageHeader();
  const config = statusConfig[status] || { variant: "default" as StatusVariant, label: status };

  useEffect(() => {
    setContent({
      backLink: (
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
          <Link href={backUrl}>
            <ArrowLeftIcon className="size-4 mr-1" />
            Project
          </Link>
        </Button>
      ),
      icon: <GradientIcon icon={<GanttChartIcon className="size-4" />} color="primary" size="sm" />,
      title: `${projectName} - Timeline`,
      description: `${clientName || "No client"} \u2022 ${projectCode}`,
      badge: (
        <StatusBadge variant={config.variant} dot>
          {config.label}
        </StatusBadge>
      ),
    });
    return () => setContent({});
  }, [projectName, projectCode, clientName, status, backUrl, setContent, config.variant, config.label]);

  return null;
}
