"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GlassCard, GradientIcon } from "@/components/ui/ui-helpers";
import { usePageHeader } from "@/components/layout/app-header";
import {
  ReceiptTextIcon,
  PlusIcon,
  SearchIcon,
  BellIcon,
  XIcon,
  DownloadIcon,
  CheckCircleIcon,
  PaperclipIcon,
} from "lucide-react";
import { useBreakpoint } from "@/hooks/use-media-query";
import { useInvoices, useSuppliers, useCategories, useProjectsForFinance, useExportInvoices, useNotifyTeamUrgent, useBulkApproveInvoices } from "@/lib/react-query/finance";
import { INVOICE_STATUSES } from "@/types/finance";
import type { InvoiceFilters, FinanceInvoiceWithDetails, InvoiceStatus } from "@/types/finance";
import { formatCurrency } from "@/lib/utils";
import { InvoiceSheet } from "./invoice-sheet";
import { InvoicePreviewSheet } from "./invoice-preview-sheet";
import { InvoiceStatusBadge } from "../invoice-status-badge";
import { cn } from "@/lib/utils";

// Status badge is handled by InvoiceStatusBadge component

export function InvoicesTable() {
  const [filters, setFilters] = useState<InvoiceFilters>({});
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<FinanceInvoiceWithDetails | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);
  const [notifyNote, setNotifyNote] = useState("");
  const notifyTeam = useNotifyTeamUrgent();
  const bulkApprove = useBulkApproveInvoices();

  const { data: invoices, isLoading } = useInvoices(filters);
  const { data: suppliers } = useSuppliers();
  const { data: categories } = useCategories();
  const { data: projects } = useProjectsForFinance();
  const exportInvoices = useExportInvoices();
  const { isMobile } = useBreakpoint();

  const { setContent } = usePageHeader();
  useEffect(() => {
    setContent({
      icon: <GradientIcon icon={<ReceiptTextIcon className="size-4" />} color="amber" size="sm" />,
      title: "Invoices",
      description: "Accounts payable",
      actions: (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportInvoices.mutate(filters)}
            disabled={exportInvoices.isPending}
          >
            <DownloadIcon className="size-4 mr-1" />
            {exportInvoices.isPending ? "Exporting..." : "Export"}
          </Button>
          <Button size="sm" onClick={() => { setEditingInvoice(null); setSheetOpen(true); }}>
            <PlusIcon className="size-4 mr-1" />
            New Invoice
          </Button>
        </div>
      ),
    });
    return () => setContent({});
  }, [setContent]);

  // Filter by search text (client-side on top of server filters)
  const filtered = useMemo(() => {
    if (!invoices) return [];
    if (!search) return invoices;
    const q = search.toLowerCase();
    return invoices.filter(
      (inv) =>
        inv.invoice_code.toLowerCase().includes(q) ||
        inv.invoice_number?.toLowerCase().includes(q) ||
        inv.description?.toLowerCase().includes(q) ||
        (inv.supplier as { name: string } | null)?.name?.toLowerCase().includes(q)
    );
  }, [invoices, search]);

  const handleFilterChange = (key: keyof InvoiceFilters, value: string | undefined) => {
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

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((inv) => inv.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  // Status labels handled by InvoiceStatusBadge component

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
  };

  const formatDueInfo = (inv: FinanceInvoiceWithDetails) => {
    if (["paid", "cancelled"].includes(inv.status)) return null;
    if (inv.days_overdue > 0) {
      return { text: `${inv.days_overdue} day${inv.days_overdue !== 1 ? "s" : ""} overdue`, isOverdue: true };
    }
    const dueDate = new Date(inv.due_date);
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
              <div key={i} className="flex gap-4 p-4">
                <Skeleton className="h-4 w-4" />
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
      {/* Filter Bar + Selection Actions */}
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
            {INVOICE_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.supplier_id || "all"}
          onValueChange={(v) => handleFilterChange("supplier_id", v)}
        >
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Supplier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Suppliers</SelectItem>
            {(suppliers || []).map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
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
              .filter((c) => c.type === "expense")
              .map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.project_id || "all"}
          onValueChange={(v) => handleFilterChange("project_id", v)}
        >
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            <SelectItem value="general">General Expenses</SelectItem>
            {(projects || []).map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.project_code} — {p.name}</SelectItem>
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

        {/* Selection Actions — appears when items selected */}
        {selectedIds.size > 0 && (() => {
          const awaitingApprovalCount = filtered.filter(
            (inv) => selectedIds.has(inv.id) && inv.status === "awaiting_approval"
          ).length;
          return (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-medium text-muted-foreground">
                {selectedIds.size} selected
              </span>
              <Button variant="outline" size="sm" className="h-8" onClick={clearSelection}>
                <XIcon className="size-3.5 mr-1" />
                Clear
              </Button>
              {awaitingApprovalCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                  onClick={() => {
                    const ids = filtered
                      .filter((inv) => selectedIds.has(inv.id) && inv.status === "awaiting_approval")
                      .map((inv) => inv.id);
                    bulkApprove.mutate(ids, { onSuccess: () => clearSelection() });
                  }}
                  disabled={bulkApprove.isPending}
                >
                  <CheckCircleIcon className="size-3.5 mr-1" />
                  {bulkApprove.isPending ? "Approving..." : `Approve (${awaitingApprovalCount})`}
                </Button>
              )}
              <Button size="sm" className="h-8" onClick={() => setNotifyDialogOpen(true)}>
                <BellIcon className="size-3.5 mr-1" />
                Notify ({selectedIds.size})
              </Button>
            </div>
          );
        })()}
      </div>

      {/* Mobile Cards */}
      {isMobile ? (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No invoices found.</p>
          ) : (
            filtered.map((inv) => {
              const supplier = inv.supplier as { name: string; supplier_code: string } | null;
              return (
                <div key={inv.id} onClick={() => setPreviewId(inv.id)}>
                  <GlassCard
                    hover="subtle"
                    className={cn("p-4", inv.days_overdue > 0 && "bg-rose-50/30 border-rose-200")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedIds.has(inv.id)}
                            onCheckedChange={() => toggleSelect(inv.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="text-sm font-semibold truncate">
                            {inv.invoice_code}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {supplier?.name}
                          </span>
                        </div>
                        {inv.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {inv.description}
                          </p>
                        )}
                      </div>
                      <InvoiceStatusBadge invoice={inv} className="shrink-0" />
                    </div>
                    <div className="flex items-center justify-between mt-3 text-xs">
                      <span className="font-medium tabular-nums">
                        {formatCurrency(inv.remaining, inv.currency)} / {formatCurrency(inv.total_amount, inv.currency)}
                      </span>
                      {(() => {
                        const dueInfo = formatDueInfo(inv);
                        return (
                          <span className={cn(
                            "text-muted-foreground",
                            dueInfo?.isOverdue && "text-rose-600 font-semibold",
                            dueInfo?.isUrgent && "text-amber-600 font-medium",
                          )}>
                            {formatDate(inv.due_date)} {dueInfo && `· ${dueInfo.isOverdue ? "⚠ " : ""}${dueInfo.text}`}
                          </span>
                        );
                      })()}
                    </div>
                  </GlassCard>
                </div>
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
                <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground" style={{ width: 40 }}>
                  <Checkbox
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground" style={{ width: 80 }}>Code</TableHead>
                <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground" style={{ width: 160 }}>Supplier</TableHead>
                <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground" style={{ width: 90 }}>Project</TableHead>
                <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground" style={{ width: 120 }}>Due Date</TableHead>
                <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground text-right" style={{ width: 110 }}>Amount</TableHead>
                <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground" style={{ width: 120 }}>Paid</TableHead>
                <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground text-center" style={{ width: 95 }}>Status</TableHead>
                <TableHead className="py-2.5 text-xs font-semibold text-muted-foreground text-right" style={{ width: 100 }}>Remaining</TableHead>
                <TableHead className="py-2.5" style={{ width: 40 }} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No invoices found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((inv, idx) => {
                  const supplier = inv.supplier as { name: string; supplier_code: string } | null;
                  const dueInfo = formatDueInfo(inv);
                  const paidPercent = inv.total_amount > 0
                    ? Math.min(100, Math.round((inv.total_paid / inv.total_amount) * 100))
                    : 0;
                  return (
                    <TableRow
                      key={inv.id}
                      className={cn(
                        "cursor-pointer hover:bg-primary/[0.04] border-b border-base-200 transition-colors",
                        idx % 2 === 1 ? "bg-base-50/50" : "bg-white",
                        inv.days_overdue > 0 && "!bg-rose-50/40"
                      )}
                      onClick={() => setPreviewId(inv.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(inv.id)}
                          onCheckedChange={() => toggleSelect(inv.id)}
                        />
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Link href={`/payments/invoices/${inv.id}`} className="font-mono text-xs hover:underline text-primary">
                          {inv.invoice_code}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm truncate">{supplier?.name || "—"}</div>
                        {inv.invoice_number && (
                          <div className="text-[11px] text-muted-foreground truncate">
                            Inv: {inv.invoice_number}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {(inv.project as { project_code: string; name: string } | null) ? (
                          <div>
                            <div className="text-xs font-medium text-primary">
                              {(inv.project as { project_code: string }).project_code}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {(inv.project as { name: string }).name}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">General</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <span className="font-medium">{formatDate(inv.due_date)}</span>
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
                        {formatCurrency(inv.total_amount, inv.currency)}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-medium tabular-nums">
                          {formatCurrency(inv.total_paid, inv.currency)}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="h-1 flex-1 rounded-full bg-base-200 overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                paidPercent >= 100 ? "bg-emerald-500" : paidPercent > 0 ? "bg-blue-400" : ""
                              )}
                              style={{ width: `${paidPercent}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {paidPercent}%
                          </span>
                        </div>
                        {inv.last_payment_date && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            Last: {formatDate(inv.last_payment_date)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <InvoiceStatusBadge invoice={inv} />
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          "text-sm font-semibold tabular-nums",
                          inv.remaining > 0 && inv.days_overdue > 0 ? "text-rose-600" : inv.remaining === 0 ? "text-emerald-600" : ""
                        )}>
                          {formatCurrency(inv.remaining, inv.currency)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        {inv.document_count > 0 && (
                          inv.document_count === 1 && inv.first_document_url ? (
                            <a
                              href={inv.first_document_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-primary transition-colors"
                              title="View document"
                            >
                              <PaperclipIcon className="size-3.5" />
                            </a>
                          ) : (
                            <button
                              className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-primary transition-colors"
                              onClick={() => setPreviewId(inv.id)}
                              title={`${inv.document_count} documents`}
                            >
                              <PaperclipIcon className="size-3.5" />
                              <span className="text-[10px]">{inv.document_count}</span>
                            </button>
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

      {/* Invoice Create/Edit Sheet */}
      <InvoiceSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        invoice={editingInvoice}
      />

      {/* Invoice Preview Sheet */}
      <InvoicePreviewSheet
        invoiceId={previewId}
        open={!!previewId}
        onOpenChange={(open) => { if (!open) setPreviewId(null); }}
      />

      {/* Notify Team Dialog */}
      <Dialog open={notifyDialogOpen} onOpenChange={setNotifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notify Finance Team</DialogTitle>
            <DialogDescription>
              Send an urgent email with PDF to all finance team members for the selected invoices.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg bg-base-50 border border-base-200 p-3 space-y-1 text-xs">
              {filtered
                .filter((inv) => selectedIds.has(inv.id))
                .map((inv) => {
                  const supplier = inv.supplier as { name: string } | null;
                  return (
                    <div key={inv.id} className="flex justify-between">
                      <span>{supplier?.name} · {inv.invoice_code}</span>
                      <span className="font-medium tabular-nums">{formatCurrency(inv.remaining, inv.currency)}</span>
                    </div>
                  );
                })}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="notify-note" className="text-sm font-medium">Message to team (optional)</label>
              <Textarea
                id="notify-note"
                value={notifyNote}
                onChange={(e) => setNotifyNote(e.target.value)}
                placeholder="e.g. Process today — supplier blocking production"
                rows={2}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Email will include a PDF with full payment details and bank information.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifyDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                notifyTeam.mutate(
                  { invoiceIds: Array.from(selectedIds), note: notifyNote || undefined },
                  {
                    onSuccess: () => {
                      setNotifyDialogOpen(false);
                      setNotifyNote("");
                      clearSelection();
                    },
                  }
                );
              }}
              disabled={notifyTeam.isPending}
            >
              <BellIcon className="size-4 mr-1" />
              {notifyTeam.isPending ? "Sending..." : "Send Urgent Notification"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
