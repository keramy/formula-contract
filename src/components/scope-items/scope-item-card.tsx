"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { GlassCard } from "@/components/ui/ui-helpers";
import {
  CheckCircle2Icon,
  FactoryIcon,
  MoreHorizontalIcon,
  PackageIcon,
  PencilIcon,
  ShoppingCartIcon,
  SplitIcon,
  TrashIcon,
  TruckIcon,
  WrenchIcon,
} from "lucide-react";

interface ScopeItemCardData {
  id: string;
  item_code: string;
  name: string;
  item_path: "production" | "procurement";
  status: string;
  quantity: number;
  unit: string;
  total_sales_price: number | null;
  production_percentage: number;
  is_shipped: boolean;
  is_installation_started: boolean;
  is_installed: boolean;
  isChild: boolean;
  displayRowNumber: string;
}

interface ScopeItemCardProps<T extends ScopeItemCardData> {
  item: T;
  isSelected: boolean;
  isClient: boolean;
  formatCurrency: (value: number | null) => string;
  onToggleSelect: (id: string) => void;
  onView: (item: T) => void;
  onEdit: (item: T) => void;
  onSplit: (item: T) => void;
  onDelete: (item: T) => void;
}

const statusLabels: Record<string, string> = {
  pending: "Pending",
  in_design: "In Design",
  awaiting_approval: "Awaiting Approval",
  approved: "Approved",
  in_production: "In Production",
  complete: "Complete",
  on_hold: "On Hold",
  cancelled: "Cancelled",
};

const statusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800",
  in_design: "bg-blue-100 text-blue-800",
  awaiting_approval: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  in_production: "bg-purple-100 text-purple-800",
  complete: "bg-emerald-100 text-emerald-800",
  on_hold: "bg-orange-100 text-orange-800",
  cancelled: "bg-red-100 text-red-800",
};

function getCombinedProgress(item: ScopeItemCardData): number {
  if (item.item_path === "procurement") {
    return item.is_installed ? 100 : 0;
  }
  const installationProgress = item.is_installed ? 10 : item.is_installation_started ? 5 : 0;
  return Math.round((item.production_percentage * 0.9) + installationProgress);
}

export function ScopeItemCard<T extends ScopeItemCardData>({
  item,
  isSelected,
  isClient,
  formatCurrency,
  onToggleSelect,
  onView,
  onEdit,
  onSplit,
  onDelete,
}: ScopeItemCardProps<T>) {
  const progress = getCombinedProgress(item);

  return (
    <GlassCard className="p-2.5 space-y-2">
      <div className="flex items-start gap-2">
        <Checkbox checked={isSelected} onCheckedChange={() => onToggleSelect(item.id)} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="font-mono text-[11px] text-muted-foreground leading-none shrink-0">
              {item.isChild ? `↳ ${item.displayRowNumber}` : item.item_code}
            </p>
            <Badge
              variant="secondary"
              className={`h-4 px-1.5 text-[10px] font-medium ${statusColors[item.status] || "bg-gray-100 text-gray-800"}`}
            >
              {statusLabels[item.status] || item.status}
            </Badge>
            <Badge variant="outline" className="h-4 gap-1 px-1.5 text-[10px]">
              {item.item_path === "production" ? (
                <FactoryIcon className="size-2.5 text-purple-500" />
              ) : (
                <ShoppingCartIcon className="size-2.5 text-blue-500" />
              )}
              <span className="capitalize">{item.item_path}</span>
            </Badge>
          </div>
          <button
            onClick={() => onView(item)}
            className="mt-1 text-left text-[14px] font-semibold leading-5 hover:underline truncate w-full"
          >
            {item.name}
          </button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Open item actions menu" className="size-7">
              <MoreHorizontalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(item)}>View</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(item)}>
              <PencilIcon className="size-4 mr-2" />
              Edit
            </DropdownMenuItem>
            {!item.isChild && (
              <DropdownMenuItem onClick={() => onSplit(item)}>
                <SplitIcon className="size-4 mr-2" />
                Split Item
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(item)} className="text-destructive focus:text-destructive">
              <TrashIcon className="size-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-md border border-base-200/70 bg-base-50/70 px-2 py-1.5">
        <div className="grid grid-cols-2 gap-2 text-[11px] mb-1.5">
          <div className="min-w-0">
            <span className="text-muted-foreground">Qty</span>
            <p className="font-medium text-foreground truncate">
              {item.quantity} {item.unit}
            </p>
          </div>
          {!isClient && (
            <div className="min-w-0 text-right">
              <span className="text-muted-foreground">Sale</span>
              <p className="font-medium text-emerald-700 truncate">{formatCurrency(item.total_sales_price)}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="text-muted-foreground flex items-center gap-1.5">
            Progress
            {item.is_installed ? (
              <CheckCircle2Icon className="size-3.5 text-green-600 shrink-0" />
            ) : item.is_installation_started ? (
              <WrenchIcon className="size-3.5 text-primary shrink-0" />
            ) : item.is_shipped ? (
              <TruckIcon className="size-3.5 text-blue-600 shrink-0" />
            ) : (
              <PackageIcon className="size-3.5 text-muted-foreground shrink-0" />
            )}
          </span>
          <span className="font-medium">{progress}%</span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>
    </GlassCard>
  );
}
