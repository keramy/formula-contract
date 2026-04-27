"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GlassCard, GradientIcon } from "@/components/ui/ui-helpers";
import { usePageHeader } from "@/components/layout/app-header";
import {
  HandCoinsIcon,
  PlusIcon,
  SearchIcon,
  DownloadIcon,
  PaperclipIcon,
} from "lucide-react";
import { useBreakpoint } from "@/hooks/use-media-query";
import { useReceivables, useCategories, useExportReceivables } from "@/lib/react-query/finance";
import { RECEIVABLE_STATUSES } from "@/types/finance";
import type { ReceivableFilters, FinanceReceivableWithDetails } from "@/types/finance";
import { formatCurrency } from "@/lib/utils";
import { ReceivableSheet } from "./receivable-sheet";
import { ReceivableStatusBadge } from "../receivable-status-badge";
import { cn } from "@/lib/utils";

export function ReceivablesTable() {
  const [filters, setFilters] = useState<ReceivableFilters>({});
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingReceivable, setEditingReceivable] = useState<FinanceReceivableWithDetails | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const { data: receivables, isLoading } = useReceivables(filters);
  const { data: categories } = useCategories();
  const exportReceivables = useExportReceivables();
  const { isMobile } = useBreakpoint();

  const { setContent } = usePageHeader();
  useEffect(() => {
    setContent({
      icon: <GradientIcon icon={<HandCoinsIcon className="size-4" />} color="teal" size="sm" />,
      title: "Receivables",
      description: "Accounts receivable",
      actions: (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportReceivables.mutate(filters)}
            disabled={exportReceivables.isPending}
          >
            <DownloadIcon className="size-4 mr-1" />
            {exportReceivables.isPending ? "Exporting..." : "Export"}
          </Button>
          <Button size="sm" onClick={() => { setEditingReceivable(null); setSheetOpen(true); }}>
            <PlusIcon className="size-4 mr-1" />
            New Receivable
          </Button>
        </div>
      ),
    });
    return () => setContent({});
  }, [setContent]);

  // Filter by search text (client-side on top of server filters)
  const filtered = useMemo(() => {
    if (!receivables) return [];
    if (!search) return receivables;
    const q = search.toLowerCase();
    return receivables.filter(
      (rec) =>
        rec.receivable_code.toLowerCase().includes(q) ||
        rec.reference_number?.toLowerCase().includes(q) ||
        rec.description?.toLowerCase().includes(q) ||
        (rec.client as { company_name: string } | null)?.company_name?.toLowerCase().includes(q)
    );
  }, [receivables, search]);

  const handleFilterChange = (key: keyof ReceivableFilters, value: string | undefined) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (value && value !== "all") {
        (next as Record<string, unknown>)[key] = value;
      } else {
        delete (next as Record<string, unknown>)[key];
      }
      return next;
    });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
  };

  const formatDueInfo = (rec: FinanceReceivableWithDetails) => {
    if (["received", "cancelled"].includes(rec.status)) return null;
    if (rec.days_overdue > 0) {
      return { text: `${rec.days_overdue} day${rec.days_overdue !== 1 ? "s" : ""} overdue`, isOverdue: true };
    }
    const dueDate = new Date(rec.due_date);
    const today = new Date();
    const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil === 0) return { text: "Due today", isOverdue: false, isUrgent: true };
    if (daysUntil === 1) return { text: "Due tomorrow", isOverdue: false, isUrgent: true };
    if (daysUntil <= 7) return { text: `${daysUntil} days left`, isOverdue: false, isUrgent: true };
    return { text: `${daysUntil} days left`, isOverdue: false, isUrgent: false };
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <Skeleton className="h-9 w-full sm:w-40" />
          <Skeleton className="h-9 w-full sm:w-40" />
          <Skeleton className="h-9 flex-1" />
        </div>
        <GlassCard className="overflow-hidden">
          <div className="divide-y divide-base-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={`skel-${i}`} className="flex gap-4 p-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Select
          value={filters.status || "all"}
          onValueChange={(v) => handleFilterChange("status", v)}
        >
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {RECEIVABLE_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.category_id || "all"}
          onValueChange={(v) => handleFilterChange("category_id", v)}
        >
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {(categories || [])
              .filter((c) => c.type === "income")
              .map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="relative flex-1 min-w-0 sm:max-w-44">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>

      {/* Mobile Cards */}
      {isMobile ? (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No receivables found.</p>
          ) : (
            filtered.map((rec) => {
              const client = rec.client as { company_name: string; client_code: string } | null;
              return (
                <Link key={rec.id} href={`/payments/receivables/${rec.id}`}>
                  <GlassCard
                    hover="subtle"
                    className={cn("p-4", rec.days_overdue > 0 && "bg-rose-50/30 border-rose-200")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold truncate">
                            {rec.receivable_code}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {client?.company_name}
                          </span>
                        </div>
                        {rec.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {rec.description}
                          </p>
                        )}
                      </div>
                      <ReceivableStatusBadge receivable={rec} className="shrink-0" />
                    </div>
                    <div className="flex items-center justify-between mt-3 text-xs">
                      <span className="font-medium tabular-nums">
                        {formatCurrency(rec.remaining, rec.currency)} / {formatCurrency(rec.total_amount, rec.currency)}
                      </span>
                      {(() => {
                        const dueInfo = formatDueInfo(rec);
                        return (
                          <span className={cn(
                            "text-muted-foreground",
                            dueInfo?.isOverdue && "text-rose-600 font-semibold",
                            dueInfo?.isUrgent && "text-amber-600 font-medium",
                          )}>
                            {formatDate(rec.due_date)} {dueInfo && `· ${dueInfo.isOverdue ? "⚠ " : ""}${dueInfo.text}`}
                          </span>
                        );
                      })()}
                    </div>
                  </GlassCard>
                </Link>
              );
            })
          )}
        </div>
      ) : (
        /* Desktop Table */
        <GlassCard className="py-0 overflow-hidden">
          <div className="overflow-x-auto">
          <Table
            style={{ tableLayout: "fixed", minWidth: 820 }}
            className="[&_th]:border-r [&_th]:border-base-200 [&_th:last-child]:border-r-0 [&_td]:border-r [&_td]:border-base-200 [&_td:last-child]:border-r-0 [&_td]:align-middle"
          >
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-base-50/60 border-b-2 border-base-200">
                <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground" style={{ width: 80 }}>Code</TableHead>
                <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground" style={{ width: 200 }}>Client</TableHead>
                <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground" style={{ width: 200 }}>Due Date</TableHead>
                <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground text-right" style={{ width: 110 }}>Amount</TableHead>
                <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground" style={{ width: 120 }}>Received</TableHead>
                <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground text-center" style={{ width: 95 }}>Status</TableHead>
                <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground text-right" style={{ width: 110 }}>Remaining</TableHead>
                <TableHead className="py-2.5" style={{ width: 40 }} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No receivables found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((rec, idx) => {
                  const client = rec.client as { company_name: string; client_code: string } | null;
                  const dueInfo = formatDueInfo(rec);
                  const receivedPercent = rec.total_amount > 0
                    ? Math.min(100, Math.round((rec.total_received / rec.total_amount) * 100))
                    : 0;
                  return (
                    <TableRow
                      key={rec.id}
                      className={cn(
                        "cursor-pointer hover:bg-primary/[0.04] border-b border-base-200 transition-colors",
                        idx % 2 === 1 ? "bg-base-50/50" : "bg-white",
                        rec.days_overdue > 0 && "!bg-rose-50/40"
                      )}
                      onClick={() => {
                        window.location.href = `/payments/receivables/${rec.id}`;
                      }}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Link href={`/payments/receivables/${rec.id}`} className="font-mono text-xs hover:underline text-primary">
                          {rec.receivable_code}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm truncate">{client?.company_name || "—"}</div>
                        {rec.reference_number && (
                          <div className="text-[11px] text-muted-foreground truncate">
                            #{rec.reference_number}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <span className="font-medium">{formatDate(rec.due_date)}</span>
                          {dueInfo && (
                            <span className={cn(
                              " ml-1",
                              dueInfo.isOverdue
                                ? "text-rose-600 font-semibold"
                                : dueInfo.isUrgent
                                  ? "text-amber-600"
                                  : "text-muted-foreground"
                            )}>
                              · {dueInfo.isOverdue && "⚠ "}{dueInfo.text}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums text-sm">
                        {formatCurrency(rec.total_amount, rec.currency)}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-medium tabular-nums">
                          {formatCurrency(rec.total_received, rec.currency)}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="h-1 flex-1 rounded-full bg-base-200 overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                receivedPercent >= 100 ? "bg-emerald-500" : receivedPercent > 0 ? "bg-teal-400" : ""
                              )}
                              style={{ width: `${receivedPercent}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {receivedPercent}%
                          </span>
                        </div>
                        {rec.last_payment_date && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            Last: {formatDate(rec.last_payment_date)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <ReceivableStatusBadge receivable={rec} />
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          "text-sm font-semibold tabular-nums",
                          rec.remaining > 0 && rec.days_overdue > 0 ? "text-rose-600" : rec.remaining === 0 ? "text-emerald-600" : ""
                        )}>
                          {formatCurrency(rec.remaining, rec.currency)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        {rec.document_count > 0 && (
                          rec.document_count === 1 && rec.first_document_url ? (
                            <a
                              href={rec.first_document_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-primary transition-colors"
                              title="View document"
                            >
                              <PaperclipIcon className="size-3.5" />
                            </a>
                          ) : (
                            <Link
                              href={`/payments/receivables/${rec.id}`}
                              className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-primary transition-colors"
                              title={`${rec.document_count} documents`}
                            >
                              <PaperclipIcon className="size-3.5" />
                              <span className="text-[10px]">{rec.document_count}</span>
                            </Link>
                          )
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          </div>
        </GlassCard>
      )}

      {/* Receivable Sheet */}
      <ReceivableSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        receivable={editingReceivable}
      />
    </div>
  );
}
