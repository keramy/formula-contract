"use client";

import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { PanelLeftIcon, PlusIcon, FolderKanbanIcon } from "lucide-react";
import Link from "next/link";
import { GradientIcon } from "@/components/ui/ui-helpers";

interface ProjectsPageHeaderProps {
  title: string;
  subtitle: string;
  canCreateProject: boolean;
}

export function ProjectsPageHeader({ title, subtitle, canCreateProject }: ProjectsPageHeaderProps) {
  const { toggleSidebar } = useSidebar();

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
        <GradientIcon
          icon={<FolderKanbanIcon className="size-5" />}
          color="violet"
        />
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {canCreateProject && (
        <Button asChild className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700">
          <Link href="/projects/new">
            <PlusIcon className="size-4" />
            New Project
          </Link>
        </Button>
      )}
    </div>
  );
}
