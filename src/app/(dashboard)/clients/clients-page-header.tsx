"use client";

import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { PanelLeftIcon, PlusIcon, BuildingIcon } from "lucide-react";
import Link from "next/link";
import { GradientIcon } from "@/components/ui/ui-helpers";

export function ClientsPageHeader() {
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
          icon={<BuildingIcon className="size-5" />}
          color="teal"
        />
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">Manage your client relationships</p>
        </div>
      </div>
      <Button asChild className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700">
        <Link href="/clients/new">
          <PlusIcon className="size-4" />
          New Client
        </Link>
      </Button>
    </div>
  );
}
