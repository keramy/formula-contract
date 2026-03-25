"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import type { ReceivableStatus, FinanceReceivableWithDetails } from "@/types/finance";

interface ReceivableStatusBadgeProps {
  receivable: FinanceReceivableWithDetails;
  className?: string;
}

interface StatusConfig {
  label: string;
  className: string;
  getTooltip: (rec: FinanceReceivableWithDetails) => string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

const STATUS_CONFIG: Record<ReceivableStatus, StatusConfig> = {
  pending: {
    label: "Awaiting Payment",
    className: "border-amber-300 text-amber-700 bg-amber-50",
    getTooltip: () => "Waiting for client payment",
  },
  partially_received: {
    label: "Partially Received",
    className: "border-blue-300 text-blue-700 bg-blue-50",
    getTooltip: (rec) => {
      const receivedText = formatCurrency(rec.total_received, rec.currency);
      const totalText = formatCurrency(rec.total_amount, rec.currency);
      return `${receivedText} of ${totalText} received`;
    },
  },
  received: {
    label: "Received",
    className: "border-emerald-300 text-emerald-700 bg-emerald-50",
    getTooltip: () => "Fully received",
  },
  overdue: {
    label: "Overdue",
    className: "bg-destructive text-destructive-foreground",
    getTooltip: (rec) => {
      return `${rec.days_overdue} day${rec.days_overdue !== 1 ? "s" : ""} overdue · Due: ${formatDate(rec.due_date)}`;
    },
  },
  cancelled: {
    label: "Cancelled",
    className: "border-base-300 text-base-400 bg-base-50 opacity-60",
    getTooltip: () => "Receivable cancelled",
  },
};

export function ReceivableStatusBadge({ receivable, className }: ReceivableStatusBadgeProps) {
  const config = STATUS_CONFIG[receivable.status as ReceivableStatus] || STATUS_CONFIG.pending;
  const tooltip = config.getTooltip(receivable);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={cn("text-[11px] px-2 py-0.5 cursor-help", config.className, className)}>
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[250px] text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function getReceivableStatusLabel(status: string): string {
  return STATUS_CONFIG[status as ReceivableStatus]?.label || status;
}
