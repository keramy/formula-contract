"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { GradientIcon, StatusBadge } from "@/components/ui/ui-helpers";
import {
  ArrowLeftIcon,
  PanelLeftIcon,
  PencilIcon,
  FactoryIcon,
  ShoppingCartIcon,
  PackageIcon,
} from "lucide-react";

type StatusVariant = "info" | "success" | "warning" | "default" | "danger";

interface ScopeItemHeaderProps {
  projectId: string;
  projectName: string;
  itemId: string;
  itemName: string;
  itemCode: string;
  itemPath: "production" | "procurement";
  status: string;
  statusLabel: string;
  statusVariant: StatusVariant;
  canEdit: boolean;
}

export function ScopeItemHeader({
  projectId,
  projectName,
  itemId,
  itemName,
  itemCode,
  itemPath,
  status,
  statusLabel,
  statusVariant,
  canEdit,
}: ScopeItemHeaderProps) {
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
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href={`/projects/${projectId}`} className="text-muted-foreground hover:text-foreground">
            <ArrowLeftIcon className="size-4 mr-1" />
            {projectName}
          </Link>
        </Button>
        <div className="h-6 w-px bg-border mx-1" />
        <GradientIcon
          icon={itemPath === "production" ? <FactoryIcon className="size-5" /> : <ShoppingCartIcon className="size-5" />}
          color={itemPath === "production" ? "violet" : "sky"}
        />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{itemName}</h1>
            <StatusBadge variant={statusVariant} dot>
              {statusLabel}
            </StatusBadge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono">{itemCode}</span>
            <span>•</span>
            <span className="capitalize">{itemPath}</span>
          </div>
        </div>
      </div>
      {canEdit && (
        <Button
          asChild
          className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
        >
          <Link href={`/projects/${projectId}/scope/${itemId}/edit`}>
            <PencilIcon className="size-4" />
            Edit Item
          </Link>
        </Button>
      )}
    </div>
  );
}
