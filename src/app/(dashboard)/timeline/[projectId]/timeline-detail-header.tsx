"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, GanttChartIcon, ChevronDownIcon } from "lucide-react";
import { GradientIcon, StatusBadge } from "@/components/ui/ui-helpers";
import { usePageHeader } from "@/components/layout/app-header";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type StatusVariant = "info" | "success" | "warning" | "default" | "danger";

const statusConfig: Record<string, { variant: StatusVariant; label: string }> = {
  tender: { variant: "info", label: "Tender" },
  active: { variant: "success", label: "Active" },
  on_hold: { variant: "warning", label: "On Hold" },
  completed: { variant: "default", label: "Completed" },
  cancelled: { variant: "danger", label: "Cancelled" },
  not_awarded: { variant: "danger", label: "Not Awarded" },
};

interface SwitcherProject {
  id: string;
  slug: string | null;
  project_code: string;
  name: string;
  status: string;
}

interface TimelineDetailHeaderProps {
  projectId: string;
  projectName: string;
  projectCode: string;
  clientName: string | null;
  status: string;
  switcherProjects: SwitcherProject[];
}

export function TimelineDetailHeader({
  projectId,
  projectName,
  projectCode,
  clientName,
  status,
  switcherProjects,
}: TimelineDetailHeaderProps) {
  const { setContent } = usePageHeader();
  const router = useRouter();
  const config = statusConfig[status] || { variant: "default" as StatusVariant, label: status };

  useEffect(() => {
    const others = switcherProjects.filter((p) => p.id !== projectId);

    const switcher =
      others.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              Switch project
              <ChevronDownIcon className="size-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 max-h-[60vh] overflow-y-auto">
            {others.map((p) => (
              <DropdownMenuItem
                key={p.id}
                onClick={() => router.push(`/timeline/${p.slug || p.id}`)}
                className="flex flex-col items-start gap-0.5 py-2 cursor-pointer"
              >
                <div className="flex items-center gap-2 w-full">
                  <span className="text-[10px] font-mono text-muted-foreground">{p.project_code}</span>
                  <StatusBadge
                    variant={statusConfig[p.status]?.variant ?? "default"}
                    dot
                  >
                    {statusConfig[p.status]?.label ?? p.status}
                  </StatusBadge>
                </div>
                <span className="text-sm truncate w-full">{p.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null;

    setContent({
      backLink: (
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
          <Link href="/timeline" prefetch={false}>
            <ArrowLeftIcon className="size-4 mr-1" />
            Timelines
          </Link>
        </Button>
      ),
      icon: <GradientIcon icon={<GanttChartIcon className="size-4" />} color="primary" size="sm" />,
      title: projectName,
      description: `${clientName || "No client"} \u2022 ${projectCode}`,
      badge: (
        <StatusBadge variant={config.variant} dot>
          {config.label}
        </StatusBadge>
      ),
      actions: switcher,
    });
    return () => setContent({});
  }, [projectId, projectName, projectCode, clientName, status, switcherProjects, setContent, router, config.variant, config.label]);

  return null;
}
