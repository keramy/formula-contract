"use client";

import { useEffect } from "react";
import { LayoutDashboardIcon } from "lucide-react";
import { GradientIcon } from "@/components/ui/ui-helpers";
import { usePageHeader } from "@/components/layout/app-header";

interface DashboardHeaderProps {
  userName: string;
}

/**
 * Sets the page header content for the Dashboard page.
 * The actual header is rendered by AppHeader in the layout.
 */
export function DashboardHeader({ userName }: DashboardHeaderProps) {
  const { setContent } = usePageHeader();

  useEffect(() => {
    setContent({
      icon: <GradientIcon icon={<LayoutDashboardIcon className="size-4" />} color="violet" size="sm" />,
      title: "Dashboard",
      description: `Welcome back, ${userName}`,
    });
    return () => setContent({});
  }, [userName, setContent]);

  // This component only sets context, renders nothing
  return null;
}
