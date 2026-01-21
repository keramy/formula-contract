"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GradientIcon, StatusBadge } from "@/components/ui/ui-helpers";
import { usePageHeader } from "@/components/layout/app-header";
import {
  ArrowLeftIcon,
  PencilIcon,
  FactoryIcon,
  ShoppingCartIcon,
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
  statusLabel,
  statusVariant,
  canEdit,
}: ScopeItemHeaderProps) {
  const { setContent } = usePageHeader();

  // Set the header content
  useEffect(() => {
    setContent({
      icon: (
        <GradientIcon
          icon={itemPath === "production" ? <FactoryIcon className="size-4" /> : <ShoppingCartIcon className="size-4" />}
          color={itemPath === "production" ? "violet" : "sky"}
          size="sm"
        />
      ),
      title: itemName,
      description: `${itemCode} • ${itemPath.charAt(0).toUpperCase() + itemPath.slice(1)}`,
    });
    return () => setContent({});
  }, [itemName, itemCode, itemPath, setContent]);

  // Render navigation and action buttons below the header
  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/projects/${projectId}`} className="text-muted-foreground hover:text-foreground">
            <ArrowLeftIcon className="size-4 mr-1" />
            {projectName}
          </Link>
        </Button>
        <div className="h-5 w-px bg-border" />
        <StatusBadge variant={statusVariant} dot>
          {statusLabel}
        </StatusBadge>
      </div>
      {canEdit && (
        <Button
          asChild
          size="sm"
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
