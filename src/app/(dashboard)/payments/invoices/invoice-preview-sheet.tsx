"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CopyIcon,
  CheckIcon,
  ExternalLinkIcon,
  CreditCardIcon,
  CalendarIcon,
  AlertTriangleIcon,
  FileIcon,
  PaperclipIcon,
  PencilIcon,
} from "lucide-react";
import { paymentSchema } from "@/lib/validations/finance";
import type { PaymentFormData } from "@/lib/validations/finance";
import { useInvoice, useRecordPayment } from "@/lib/react-query/finance";
import { PAYMENT_METHODS, INVOICE_STATUSES } from "@/types/finance";
import type { InvoiceStatus } from "@/types/finance";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface InvoicePreviewSheetProps {
  invoiceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
}

export function InvoicePreviewSheet({ invoiceId, open, onOpenChange, onEdit }: InvoicePreviewSheetProps) {
  const { data: invoice, isLoading } = useInvoice(invoiceId || "");
  const recordPayment = useRecordPayment();

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [copiedIban, setCopiedIban] = useState(false);

  const paymentForm = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
  });

  const handleRecordPayment = (data: PaymentFormData) => {
    if (!invoice) return;
    recordPayment.mutate(
      {
        direction: "outgoing",
        invoice_id: invoice.id,
        amount: data.amount,
        currency: invoice.currency,
        payment_date: data.payment_date,
        payment_method: data.payment_method,
        reference_number: data.reference_number || undefined,
        notes: data.notes || undefined,
      },
      {
        onSuccess: () => {
          setPaymentDialogOpen(false);
          paymentForm.reset();
        },
      }
    );
  };

  const openPaymentDialog = () => {
    if (invoice) {
      paymentForm.reset({
        amount: invoice.remaining,
        payment_date: new Date().toISOString().split("T")[0],
        payment_method: "bank_transfer",
        reference_number: null,
        notes: null,
      });
    }
    setPaymentDialogOpen(true);
  };

  const handleCopyIban = (iban: string) => {
    navigator.clipboard.writeText(iban);
    setCopiedIban(true);
    setTimeout(() => setCopiedIban(false), 2000);
  };

  const supplier = invoice?.supplier as {
    name: string;
    supplier_code: string;
    iban: string | null;
    bank_name: string | null;
  } | null;

  const statusLabel = invoice
    ? INVOICE_STATUSES.find((s) => s.value === invoice.status)?.label || invoice.status
    : "";

  const paidPercent = invoice && invoice.total_amount > 0
    ? Math.min(100, Math.round((invoice.total_paid / invoice.total_amount) * 100))
    : 0;

  const statusClassName = getStatusClassName(invoice?.status as InvoiceStatus, invoice?.days_overdue);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
          {isLoading || !invoice ? (
            <div className="p-4 space-y-3 flex-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          ) : (
            <>
              {/* Header — colored top bar based on status */}
              <div className={cn(
                "px-4 pt-4 pb-3",
                invoice.days_overdue > 0 ? "bg-rose-50" : invoice.status === "paid" ? "bg-emerald-50/50" : "bg-base-50/50"
              )}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold">{invoice.invoice_code}</span>
                    <Badge className={cn("text-[11px]", statusClassName)}>
                      {statusLabel}
                    </Badge>
                  </div>
                </div>
                <div className="text-sm font-medium">{supplier?.name || "—"}</div>
                {invoice.description && (
                  <div className="text-xs text-muted-foreground mt-0.5">{invoice.description}</div>
                )}
                {invoice.days_overdue > 0 && (
                  <div className="flex items-center gap-1 mt-1.5 text-xs text-rose-600 font-semibold">
                    <AlertTriangleIcon className="size-3" />
                    {invoice.days_overdue} day{invoice.days_overdue !== 1 ? "s" : ""} overdue
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="px-4 flex-1 flex flex-col overflow-y-auto">
                <div className="space-y-3 flex-1 py-3">

                  {/* Amount Summary — compact grid */}
                  <div className="grid grid-cols-3 gap-px bg-base-200 rounded-lg overflow-hidden border border-base-200">
                    <div className="bg-card p-2.5 text-center">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Total</div>
                      <div className="text-sm font-bold tabular-nums">{formatCurrency(invoice.total_amount, invoice.currency)}</div>
                    </div>
                    <div className="bg-card p-2.5 text-center">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Paid</div>
                      <div className="text-sm font-bold tabular-nums text-emerald-600">{formatCurrency(invoice.total_paid, invoice.currency)}</div>
                    </div>
                    <div className="bg-card p-2.5 text-center">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Remaining</div>
                      <div className={cn("text-sm font-bold tabular-nums", invoice.remaining > 0 ? "text-rose-600" : "text-emerald-600")}>
                        {formatCurrency(invoice.remaining, invoice.currency)}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-1.5 rounded-full bg-base-200 overflow-hidden -mt-1">
                    <div
                      className={cn("h-full rounded-full transition-all", paidPercent >= 100 ? "bg-emerald-500" : "bg-primary")}
                      style={{ width: `${paidPercent}%` }}
                    />
                  </div>

                  {/* VAT Breakdown (if applicable) */}
                  {invoice.vat_rate > 0 && (
                    <div className="flex items-center justify-between text-[11px] px-1 -mt-1">
                      <span className="text-muted-foreground">
                        Subtotal: {formatCurrency(invoice.total_amount - invoice.vat_amount, invoice.currency)}
                      </span>
                      <span className="text-muted-foreground">
                        VAT ({invoice.vat_rate}%): {formatCurrency(invoice.vat_amount, invoice.currency)}
                      </span>
                    </div>
                  )}

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 py-2 border-y border-base-100">
                    <DetailRow label="Invoice #" value={invoice.invoice_number || "—"} />
                    <DetailRow label="Due Date" value={formatDate(invoice.due_date)} />
                    <DetailRow label="Invoice Date" value={formatDate(invoice.invoice_date)} />
                    <DetailRow
                      label="Project"
                      value={(invoice.project as { project_code: string; name: string } | null)
                        ? `${(invoice.project as { project_code: string }).project_code} — ${(invoice.project as { name: string }).name}`
                        : "General expense"}
                    />
                  </div>

                  {/* Installments */}
                  {invoice.has_installments && invoice.installments && invoice.installments.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon className="size-3 text-muted-foreground" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Installments</span>
                      </div>
                      <div className="rounded-lg border border-base-200 overflow-hidden divide-y divide-base-100">
                        {invoice.installments.map((inst, idx) => (
                          <div key={inst.id} className="flex items-center justify-between px-3 py-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground font-medium w-5">#{idx + 1}</span>
                              <span>{formatDate(inst.due_date)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold tabular-nums">
                                {formatCurrency(inst.amount, invoice.currency)}
                              </span>
                              <span className={cn(
                                "text-[10px] font-medium px-1.5 py-0.5 rounded",
                                inst.status === "paid" ? "bg-emerald-100 text-emerald-700"
                                  : inst.status === "overdue" ? "bg-rose-100 text-rose-700"
                                  : "bg-base-100 text-muted-foreground"
                              )}>
                                {inst.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bank Details */}
                  {supplier?.bank_name && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Payment Info</span>
                      <div className="rounded-lg border border-base-200 p-2.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Bank</span>
                          <span className="text-xs font-medium">{supplier.bank_name}</span>
                        </div>
                        {supplier.iban && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">IBAN</span>
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-mono font-medium">{supplier.iban}</span>
                              <button
                                className="text-muted-foreground hover:text-primary transition-colors"
                                onClick={() => handleCopyIban(supplier.iban!)}
                              >
                                {copiedIban ? (
                                  <CheckIcon className="size-3 text-emerald-600" />
                                ) : (
                                  <CopyIcon className="size-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Recent Payments */}
                  {invoice.payments && invoice.payments.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Payments ({invoice.payments.length})
                      </span>
                      <div className="rounded-lg border border-base-200 overflow-hidden divide-y divide-base-100">
                        {invoice.payments.slice(0, 3).map((p) => (
                          <div key={p.id} className="px-3 py-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">{formatDate(p.payment_date)}</span>
                              <span className="font-semibold tabular-nums text-emerald-600">
                                {formatCurrency(p.amount, p.currency)}
                              </span>
                            </div>
                            {p.notes && (
                              <div className="text-[11px] text-muted-foreground italic mt-0.5 truncate">
                                {p.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      {invoice.payments.length > 3 && (
                        <p className="text-[11px] text-muted-foreground text-center">
                          +{invoice.payments.length - 3} more in full view
                        </p>
                      )}
                    </div>
                  )}

                  {/* Documents */}
                  {invoice.documents && invoice.documents.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <PaperclipIcon className="size-3 text-muted-foreground" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Documents ({invoice.documents.length})
                        </span>
                      </div>
                      <div className="rounded-lg border border-base-200 overflow-hidden divide-y divide-base-100">
                        {invoice.documents.map((doc) => (
                          <a
                            key={doc.id}
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-base-50 transition-colors"
                          >
                            <FileIcon className="size-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate flex-1">{doc.file_name}</span>
                            {doc.file_size && (
                              <span className="text-muted-foreground shrink-0">
                                {(doc.file_size / 1024).toFixed(0)} KB
                              </span>
                            )}
                            <ExternalLinkIcon className="size-3 text-muted-foreground shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="flex gap-2 py-3 border-t border-base-200">
                  <Button variant="outline" className="flex-1" size="sm" asChild>
                    <Link href={`/payments/invoices/${invoice.id}`}>
                      <ExternalLinkIcon className="size-3.5 mr-1" />
                      Full Details
                    </Link>
                  </Button>
                  {onEdit && (
                    <Button variant="outline" className="flex-1" size="sm" onClick={onEdit}>
                      <PencilIcon className="size-3.5 mr-1" />
                      Edit
                    </Button>
                  )}
                  {invoice.remaining > 0 && (
                    <Button className="flex-1" size="sm" onClick={openPaymentDialog}>
                      <CreditCardIcon className="size-3.5 mr-1" />
                      Record Payment
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Record Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Remaining: {invoice ? formatCurrency(invoice.remaining, invoice.currency) : "—"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={paymentForm.handleSubmit(handleRecordPayment)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="preview-amount">Amount *</Label>
                <Input
                  id="preview-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  {...paymentForm.register("amount", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="preview-date">Payment Date *</Label>
                <Input id="preview-date" type="date" {...paymentForm.register("payment_date")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="preview-method">Payment Method *</Label>
              <select
                id="preview-method"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                {...paymentForm.register("payment_method")}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="preview-ref">Reference Number</Label>
              <Input id="preview-ref" {...paymentForm.register("reference_number")} placeholder="Bank ref, check #" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="preview-notes">Notes</Label>
              <Textarea id="preview-notes" {...paymentForm.register("notes")} rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={recordPayment.isPending}>
                {recordPayment.isPending ? "Recording..." : "Record Payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Module scope helpers (React Doctor rule #21)
function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-xs font-medium mt-0.5">{value}</div>
    </div>
  );
}

function getStatusClassName(status: InvoiceStatus | undefined, daysOverdue?: number): string {
  if (!status) return "";
  // Overdue takes priority for unpaid statuses
  if (daysOverdue && daysOverdue > 0 && !["paid", "cancelled"].includes(status)) {
    return "bg-destructive text-destructive-foreground";
  }
  const map: Record<InvoiceStatus, string> = {
    pending: "border-orange-300 text-orange-700 bg-orange-50",
    awaiting_approval: "border-amber-300 text-amber-700 bg-amber-50",
    approved: "border-orange-300 text-orange-700 bg-orange-50",
    partially_paid: "border-blue-300 text-blue-700 bg-blue-50",
    paid: "border-emerald-300 text-emerald-700 bg-emerald-50",
    overdue: "bg-destructive text-destructive-foreground",
    cancelled: "opacity-60",
  };
  return map[status] || "";
}
