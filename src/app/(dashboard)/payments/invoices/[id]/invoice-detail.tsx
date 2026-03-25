"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GlassCard, GradientIcon } from "@/components/ui/ui-helpers";
import { usePageHeader } from "@/components/layout/app-header";
import {
  ArrowLeftIcon,
  FileTextIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  FileIcon,
  PlusIcon,
  TrashIcon,
  CopyIcon,
  CheckIcon,
  UploadIcon,
  AlertTriangleIcon,
  ExternalLinkIcon,
} from "lucide-react";
import { paymentSchema } from "@/lib/validations/finance";
import type { PaymentFormData } from "@/lib/validations/finance";
import {
  useInvoice,
  useRecordPayment,
  useDeletePayment,
  useApproveInvoice,
  useRejectInvoice,
  useUploadFinanceDocument,
  useDeleteFinanceDocument,
} from "@/lib/react-query/finance";
import { PAYMENT_METHODS, INVOICE_STATUSES } from "@/types/finance";
import type { InvoiceStatus } from "@/types/finance";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface InvoiceDetailProps {
  id: string;
}

export function InvoiceDetail({ id }: InvoiceDetailProps) {
  const { data: invoice, isLoading } = useInvoice(id);
  const recordPayment = useRecordPayment();
  const deletePaymentMutation = useDeletePayment();
  const approveInvoice = useApproveInvoice();
  const rejectInvoice = useRejectInvoice();
  const uploadDocument = useUploadFinanceDocument();
  const deleteDocument = useDeleteFinanceDocument();

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [copiedIban, setCopiedIban] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { setContent } = usePageHeader();
  useEffect(() => {
    if (invoice) {
      const supplier = invoice.supplier as { name: string } | null;
      setContent({
        icon: (
          <Link href="/payments/invoices" className="hover:opacity-70">
            <ArrowLeftIcon className="size-5" />
          </Link>
        ),
        title: `${invoice.invoice_code}`,
        description: supplier?.name || "",
      });
    }
    return () => setContent({});
  }, [setContent, invoice]);

  // Payment form
  const paymentForm = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: 0,
      payment_date: new Date().toISOString().split("T")[0],
      payment_method: "bank_transfer",
    },
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

  const handleApprove = () => {
    approveInvoice.mutate(id);
  };

  const handleReject = () => {
    rejectInvoice.mutate(
      { id, reason: rejectionReason },
      {
        onSuccess: () => {
          setRejectDialogOpen(false);
          setRejectionReason("");
        },
      }
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileData = await Promise.all(
      Array.from(files).map(async (file) => {
        const buffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
        );
        return {
          name: file.name,
          type: file.type,
          data: `data:${file.type};base64,${base64}`,
        };
      })
    );

    uploadDocument.mutate({
      entityType: "invoice",
      entityId: id,
      files: fileData,
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCopyIban = (iban: string) => {
    navigator.clipboard.writeText(iban);
    setCopiedIban(true);
    setTimeout(() => setCopiedIban(false), 2000);
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

  if (isLoading || !invoice) {
    return (
      <div className="p-4 md:p-6 space-y-5">
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-5">
            <GlassCard><CardContent className="p-6"><Skeleton className="h-40" /></CardContent></GlassCard>
            <GlassCard><CardContent className="p-6"><Skeleton className="h-32" /></CardContent></GlassCard>
          </div>
          <GlassCard><CardContent className="p-6"><Skeleton className="h-60" /></CardContent></GlassCard>
        </div>
      </div>
    );
  }

  const supplier = invoice.supplier as {
    name: string;
    supplier_code: string;
    iban: string | null;
    bank_name: string | null;
  } | null;
  const category = invoice.category as { name: string; color: string | null } | null;
  const payments = invoice.payments || [];
  const documents = invoice.documents || [];
  const paidPercent = invoice.total_amount > 0
    ? Math.min(100, Math.round((invoice.total_paid / invoice.total_amount) * 100))
    : 0;
  const statusLabel = INVOICE_STATUSES.find((s) => s.value === invoice.status)?.label || invoice.status;

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Overdue Banner */}
      {invoice.days_overdue > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3">
          <AlertTriangleIcon className="size-4 text-rose-600 shrink-0" />
          <span className="text-sm text-rose-700">
            This invoice is {invoice.days_overdue} day{invoice.days_overdue !== 1 ? "s" : ""} overdue
          </span>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-5">
          {/* Details Card */}
          <GlassCard>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <GradientIcon icon={<FileTextIcon className="size-3.5" />} color="blue" size="xs" />
                Invoice Details
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <DetailRow label="Supplier" value={supplier?.name || "—"} />
                <DetailRow label="Supplier Code" value={supplier?.supplier_code || "—"} />
                <DetailRow label="Invoice #" value={invoice.invoice_number || "—"} />
                <DetailRow label="Category" value={category?.name || "—"} />
                <DetailRow label="Invoice Date" value={invoice.invoice_date} />
                <DetailRow label="Due Date" value={invoice.due_date} />
                <DetailRow label="Currency" value={invoice.currency} />
                {invoice.description && (
                  <div className="col-span-2">
                    <DetailRow label="Description" value={invoice.description} />
                  </div>
                )}
                {invoice.notes && (
                  <div className="col-span-2">
                    <DetailRow label="Notes" value={invoice.notes} />
                  </div>
                )}
              </div>
            </CardContent>
          </GlassCard>

          {/* Approval Card (if requires_approval) */}
          {invoice.requires_approval && (
            <GlassCard>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <GradientIcon icon={<ShieldCheckIcon className="size-3.5" />} color="amber" size="xs" />
                  Approval
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {invoice.status === "awaiting_approval" && (
                  <div className="flex items-center justify-between">
                    <div>
                      <Badge className="border-amber-300 text-amber-700 bg-amber-50">
                        Awaiting Approval
                      </Badge>
                      {invoice.rejection_reason && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Previously rejected: {invoice.rejection_reason}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-rose-600 hover:text-rose-700"
                        onClick={() => setRejectDialogOpen(true)}
                        disabled={rejectInvoice.isPending}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleApprove}
                        disabled={approveInvoice.isPending}
                      >
                        {approveInvoice.isPending ? "Approving..." : "Approve"}
                      </Button>
                    </div>
                  </div>
                )}
                {invoice.status !== "awaiting_approval" && invoice.approved_by && (
                  <div className="flex items-center gap-2">
                    <Badge className="border-emerald-300 text-emerald-700 bg-emerald-50">
                      Approved
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      on {invoice.approved_at?.split("T")[0]}
                    </span>
                  </div>
                )}
                {invoice.status === "pending" && invoice.rejection_reason && (
                  <div>
                    <Badge className="border-rose-300 text-rose-700 bg-rose-50">Rejected</Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      Reason: {invoice.rejection_reason}
                    </p>
                  </div>
                )}
              </CardContent>
            </GlassCard>
          )}

          {/* Payment History Card */}
          <GlassCard>
            <CardHeader className="pb-2 pt-4 px-4 flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <GradientIcon icon={<CreditCardIcon className="size-3.5" />} color="emerald" size="xs" />
                Payment History
                {payments.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{payments.length}</Badge>
                )}
              </CardTitle>
              <Button size="sm" variant="outline" onClick={openPaymentDialog}>
                <PlusIcon className="size-4 mr-1" />
                Record Payment
              </Button>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No payments recorded yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-base-50/50 border border-transparent hover:border-base-200 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="text-xs font-mono text-muted-foreground">
                            {p.payment_code}
                          </span>
                          <p className="text-sm font-medium">
                            {formatCurrency(p.amount, p.currency)}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <p>{p.payment_date}</p>
                          <p>
                            {PAYMENT_METHODS.find((m) => m.value === p.payment_method)?.label ||
                              p.payment_method}
                          </p>
                        </div>
                        {p.reference_number && (
                          <span className="text-xs text-muted-foreground font-mono">
                            Ref: {p.reference_number}
                          </span>
                        )}
                        {p.notes && (
                          <span className="text-xs text-muted-foreground italic">
                            {p.notes}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeletePaymentId(p.id)}
                      >
                        <TrashIcon className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </GlassCard>

          {/* Documents Card */}
          <GlassCard>
            <CardHeader className="pb-2 pt-4 px-4 flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <GradientIcon icon={<FileIcon className="size-3.5" />} color="violet" size="xs" />
                Documents
                {documents.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{documents.length}</Badge>
                )}
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadDocument.isPending}
              >
                <UploadIcon className="size-4 mr-1" />
                {uploadDocument.isPending ? "Uploading..." : "Upload"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="hidden"
                onChange={handleFileUpload}
              />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No documents uploaded.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-base-50/50 border border-transparent hover:border-base-200"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileIcon className="size-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm truncate">{doc.file_name}</p>
                          {doc.file_size && (
                            <p className="text-xs text-muted-foreground">
                              {(doc.file_size / 1024).toFixed(0)} KB
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLinkIcon className="size-3.5" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteDocId(doc.id)}
                        >
                          <TrashIcon className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </GlassCard>
        </div>

        {/* RIGHT COLUMN — Summary */}
        <div>
          <GlassCard className="lg:sticky lg:top-20">
            <CardContent className="p-5 space-y-4">
              {/* Amounts */}
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="text-2xl font-bold tabular-nums">
                    {formatCurrency(invoice.total_amount, invoice.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-muted-foreground">Paid</span>
                  <span className="text-sm font-medium tabular-nums text-emerald-600">
                    {formatCurrency(invoice.total_paid, invoice.currency)}
                  </span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-medium">Remaining</span>
                    <span className={cn(
                      "text-lg font-bold tabular-nums",
                      invoice.remaining > 0 ? "text-rose-600" : "text-emerald-600"
                    )}>
                      {formatCurrency(invoice.remaining, invoice.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{paidPercent}% paid</span>
                </div>
                <div className="h-2 rounded-full bg-base-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${paidPercent}%` }}
                  />
                </div>
              </div>

              {/* Status */}
              <div className="flex justify-center">
                <Badge className={cn("text-xs", getStatusClassName(invoice.status as InvoiceStatus))}>
                  {statusLabel}
                </Badge>
              </div>

              {/* Bank Details */}
              {supplier?.bank_name && (
                <div className="border-t pt-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Supplier Bank Details
                  </p>
                  <div className="space-y-1">
                    <DetailRow label="Bank" value={supplier.bank_name} />
                    {supplier.iban && (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">IBAN</p>
                          <p className="text-sm font-mono">{supplier.iban}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleCopyIban(supplier.iban!)}
                        >
                          {copiedIban ? (
                            <CheckIcon className="size-3.5 text-emerald-600" />
                          ) : (
                            <CopyIcon className="size-3.5" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Record Payment Button */}
              {invoice.remaining > 0 && (
                <Button className="w-full" onClick={openPaymentDialog}>
                  Record Payment
                </Button>
              )}
            </CardContent>
          </GlassCard>
        </div>
      </div>

      {/* Record Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Remaining: {formatCurrency(invoice.remaining, invoice.currency)}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={paymentForm.handleSubmit(handleRecordPayment)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pay-amount">Amount *</Label>
                <Input
                  id="pay-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  {...paymentForm.register("amount", { valueAsNumber: true })}
                />
                {paymentForm.formState.errors.amount && (
                  <p className="text-xs text-destructive">{paymentForm.formState.errors.amount.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pay-date">Payment Date *</Label>
                <Input id="pay-date" type="date" {...paymentForm.register("payment_date")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="detail-method">Payment Method *</Label>
              <select
                id="detail-method"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                {...paymentForm.register("payment_method")}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-ref">Reference Number</Label>
              <Input id="pay-ref" {...paymentForm.register("reference_number")} placeholder="Bank ref, check #" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-notes">Notes</Label>
              <Textarea id="pay-notes" {...paymentForm.register("notes")} rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={recordPayment.isPending}>
                {recordPayment.isPending ? "Recording..." : "Record Payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Invoice</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this invoice.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Reason for rejection (min 3 characters)..."
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectionReason.trim().length < 3 || rejectInvoice.isPending}
            >
              {rejectInvoice.isPending ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Payment Confirmation */}
      <AlertDialog open={!!deletePaymentId} onOpenChange={() => setDeletePaymentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This will recalculate the invoice balance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletePaymentId) {
                  deletePaymentMutation.mutate(deletePaymentId, {
                    onSuccess: () => setDeletePaymentId(null),
                  });
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Document Confirmation */}
      <AlertDialog open={!!deleteDocId} onOpenChange={() => setDeleteDocId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the file from storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteDocId) {
                  deleteDocument.mutate(deleteDocId, {
                    onSuccess: () => setDeleteDocId(null),
                  });
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Extracted at module scope (React Doctor rule #21)
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function getStatusClassName(status: InvoiceStatus): string {
  const map: Record<InvoiceStatus, string> = {
    pending: "",
    awaiting_approval: "border-amber-300 text-amber-700 bg-amber-50",
    approved: "border-blue-300 text-blue-700 bg-blue-50",
    partially_paid: "border-orange-300 text-orange-700 bg-orange-50",
    paid: "border-emerald-300 text-emerald-700 bg-emerald-50",
    overdue: "bg-destructive text-destructive-foreground",
    cancelled: "opacity-60",
  };
  return map[status] || "";
}
