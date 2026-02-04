"use client";

import { useEffect } from "react";
import { FolderKanbanIcon } from "lucide-react";
import { GradientIcon } from "@/components/ui/ui-helpers";
import { usePageHeader } from "@/components/layout/app-header";

interface ProjectsPageHeaderProps {
  title: string;
  subtitle: string;
  canCreateProject: boolean;
}

/**
 * Sets the page header content for the Projects page.
 * The actual header is rendered by AppHeader in the layout.
 */
export function ProjectsPageHeader({ title, subtitle }: ProjectsPageHeaderProps) {
  const { setContent } = usePageHeader();

  useEffect(() => {
    setContent({
      icon: <GradientIcon icon={<FolderKanbanIcon className="size-4" />} color="teal" size="sm" />,
      title,
      description: subtitle,
    });
    return () => setContent({});
  }, [title, subtitle, setContent]);

  // This component only sets context, renders nothing
  return null;
}
