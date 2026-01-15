"use client";

import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { GradientIcon } from "@/components/ui/ui-helpers";
import { PanelLeftIcon, LayoutDashboardIcon } from "lucide-react";

interface DashboardHeaderProps {
  userName: string;
}

export function DashboardHeader({ userName }: DashboardHeaderProps) {
  const { toggleSidebar } = useSidebar();

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className="size-9 shrink-0"
      >
        <PanelLeftIcon className="size-5" />
      </Button>
      <GradientIcon icon={<LayoutDashboardIcon className="size-5" />} color="violet" />
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Welcome back, {userName}</p>
      </div>
    </div>
  );
}
