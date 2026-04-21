"use client";

import { useEffect } from "react";
import { GanttChartIcon } from "lucide-react";
import { GradientIcon } from "@/components/ui/ui-helpers";
import { usePageHeader } from "@/components/layout/app-header";

export function TimelinePickerHeader() {
  const { setContent } = usePageHeader();

  useEffect(() => {
    setContent({
      icon: <GradientIcon icon={<GanttChartIcon className="size-4" />} color="primary" size="sm" />,
      title: "Timeline",
      description: "Pick a project to view or edit its schedule",
    });
    return () => setContent({});
  }, [setContent]);

  return null;
}
