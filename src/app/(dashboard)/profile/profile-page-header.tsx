"use client";

import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { GradientIcon } from "@/components/ui/ui-helpers";
import { PanelLeftIcon, UserIcon } from "lucide-react";

export function ProfilePageHeader() {
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
      <GradientIcon icon={<UserIcon className="size-5" />} color="coral" />
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Profile Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account settings and preferences</p>
      </div>
    </div>
  );
}
