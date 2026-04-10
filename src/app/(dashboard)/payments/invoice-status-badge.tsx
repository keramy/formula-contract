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
import type { InvoiceStatus, FinanceInvoiceWithDetails } from "@/types/finance";

interface InvoiceStatusBadgeProps {
  invoice: FinanceInvoiceWithDetails;
  className?: string;
}

interface StatusConfig {
  label: string;
  className: string;
  getTooltip: (inv: FinanceInvoiceWithDetails) => string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

const STATUS_CONFIG: Record<InvoiceStatus, StatusConfig> = {
  pending: {
    label: "Ready to Pay",
    className: "border-orange-300 text-orange-700 bg-orange-50",
    getTooltip: () => "No approval required — ready for payment",
  },
  approved: {
    label: "Ready to Pay",
    className: "border-orange-300 text-orange-700 bg-orange-50",
    getTooltip: (inv) => {
      const approverName = (inv.approver as { name: string } | null)?.name;
      const date = inv.approved_at ? formatDate(inv.approved_at.split("T")[0]) : "";
      if (approverName && date) return `Approved by ${approverName} on ${date}`;
      if (approverName) return `Approved by ${approverName}`;
      return "Approved — ready for payment";
    },
  },
  awaiting_approval: {
    label: "Needs Approval",
    className: "border-amber-300 text-amber-700 bg-amber-50",
    getTooltip: (inv) => {
      const approverName = (inv.approver as { name: string } | null)?.name;
      if (approverName) return `Waiting for ${approverName} to approve`;
      return "Waiting for approval before payment";
    },
  },
  partially_paid: {
    label: "Partially Paid",
    className: "border-blue-300 text-blue-700 bg-blue-50",
    getTooltip: (inv) => {
      const paidText = formatCurrency(inv.total_paid, inv.currency);
      const totalText = formatCurrency(inv.total_amount, inv.currency);
      const lastPaid = inv.last_payment_date ? ` · Last: ${formatDate(inv.last_payment_date)}` : "";
      return `${paidText} of ${totalText} paid${lastPaid}`;
    },
  },
  paid: {
    label: "Paid",
    className: "border-emerald-300 text-emerald-700 bg-emerald-50",
    getTooltip: (inv) => {
      const lastPaid = inv.last_payment_date ? formatDate(inv.last_payment_date) : "";
      return lastPaid ? `Fully paid on ${lastPaid}` : "Fully paid";
    },
  },
  overdue: {
    label: "Overdue",
    className: "bg-destructive text-destructive-foreground",
    getTooltip: (inv) => {
      return `${inv.days_overdue} day${inv.days_overdue !== 1 ? "s" : ""} overdue · Due: ${formatDate(inv.due_date)}`;
    },
  },
  cancelled: {
    label: "Cancelled",
    className: "border-base-300 text-base-400 bg-base-50 opacity-60",
    getTooltip: () => "Invoice cancelled",
  },
};

export function InvoiceStatusBadge({ invoice, className }: InvoiceStatusBadgeProps) {
  // Show overdue badge when past due, regardless of DB status
  const effectiveStatus = invoice.days_overdue > 0 && !["paid", "cancelled"].includes(invoice.status)
    ? "overdue"
    : invoice.status as InvoiceStatus;
  const config = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.pending;
  const tooltip = config.getTooltip(invoice);

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

// For PDF/Email — no hover, just the label
export function getStatusLabel(status: string): string {
  return STATUS_CONFIG[status as InvoiceStatus]?.label || status;
}
