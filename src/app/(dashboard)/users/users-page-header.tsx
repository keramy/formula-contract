"use client";

import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { PanelLeftIcon, UsersIcon } from "lucide-react";
import { GradientIcon } from "@/components/ui/ui-helpers";

export function UsersPageHeader() {
  const { toggleSidebar } = useSidebar();

  return (
    <div className="flex items-center gap-3 mb-6">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className="size-9 shrink-0"
      >
        <PanelLeftIcon className="size-5" />
      </Button>
      <GradientIcon
        icon={<UsersIcon className="size-5" />}
        color="coral"
      />
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">Manage team members and permissions</p>
      </div>
    </div>
  );
}
