"use client";

import { Button } from "@/components/ui/button";
import { PanelLeftIcon, WalletIcon, DownloadIcon } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { GradientIcon } from "@/components/ui/ui-helpers";

export function FinancePageHeader() {
  const { toggleSidebar } = useSidebar();

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="size-9 shrink-0"
          aria-label="Toggle sidebar"
        >
          <PanelLeftIcon className="size-5" />
        </Button>
        <GradientIcon
          icon={<WalletIcon className="size-5" />}
          color="emerald"
          size="default"
        />
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Financial Overview</h1>
          <p className="text-sm text-muted-foreground">
            Budget tracking and project costs analysis
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="hidden sm:flex">
          <DownloadIcon className="size-4 mr-1.5" />
          Export Report
        </Button>
      </div>
    </div>
  );
}
