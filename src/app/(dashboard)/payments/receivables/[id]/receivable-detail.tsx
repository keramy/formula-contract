"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { GlassCard, GradientIcon } from "@/components/ui/ui-helpers";
import { usePageHeader } from "@/components/layout/app-header";
import {
  HandCoinsIcon,
  ArrowLeftIcon,
  CalendarIcon,
  CreditCardIcon,
  FileTextIcon,
  PlusIcon,
  Trash2Icon,
  UploadIcon,
  AlertTriangleIcon,
  BanknoteIcon,
} from "lucide-react";
import {
  useReceivable,
  useRecordPayment,
  useDeletePayment,
  useUploadFinanceDocument,
  useDeleteFinanceDocument,
} from "@/lib/react-query/finance";
import { paymentSchema } from "@/lib/validations/finance";
import type { PaymentFormData } from "@/lib/validations/finance";
import { PAYMENT_METHODS, RECEIVABLE_STATUSES } from "@/types/finance";
import type { ReceivableStatus, FinancePayment, FinanceDocument } from "@/types/finance";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STATUS_BADGE_MAP: Record<ReceivableStatus, { className: string }> = {
  pending: { className: "" },
  partially_received: { className: "border-orange-300 text-orange-700 bg-orange-50" },
  received: { className: "border-teal-300 text-teal-700 bg-teal-50" },
  overdue: { className: "bg-destructive text-destructive-foreground" },
  cancelled: { className: "opacity-60" },
};

interface ReceivableDetailProps {
  id: string;
}

export function ReceivableDetail({ id }: ReceivableDetailProps) {
  const { data: receivable, isLoading } = useReceivable(id);
  const recordPayment = useRecordPayment();
  const deletePayment = useDeletePayment();
  const uploadDocument = useUploadFinanceDocument();
  const deleteDocument = useDeleteFinanceDocument();

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { setContent } = usePageHeader();
  useEffect(() => {
    if (receivable) {
      const client = receivable.client as { company_name: string; client_code: string } | null;
      setContent({
        icon: <GradientIcon icon={<HandCoinsIcon className="size-4" />} color="teal" size="sm" />,
        title: receivable.receivable_code,
        description: client?.company_name || "Receivable",
        actions: (
          <Link href="/payments/receivables">
            <Button variant="outline" size="sm">
              <ArrowLeftIcon className="size-4 mr-1" />
              Back
            </Button>
          </Link>
        ),
      });
    }
    return () => setContent({});
  }, [setContent, receivable]);

  const {
    register,
    handleSubmit,
    reset: resetPaymentForm,
    setValue: setPaymentValue,
    watch: watchPayment,
    formState: { errors: paymentErrors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      payment_date: new Date().toISOString().split("T")[0],
      payment_method: "bank_transfer",
    },
  });

  const watchedPaymentMethod = watchPayment("payment_method");

  const onSubmitPayment = (data: PaymentFormData) => {
    if (!receivable) return;
    recordPayment.mutate(
      {
        direction: "incoming",
        receivable_id: receivable.id,
        amount: data.amount,
        currency: receivable.currency,
        payment_date: data.payment_date,
        payment_method: data.payment_method,
        reference_number: data.reference_number || undefined,
        notes: data.notes || undefined,
      },
      {
        onSuccess: () => {
          setPaymentDialogOpen(false);
          resetPaymentForm({
            payment_date: new Date().toISOString().split("T")[0],
            payment_method: "bank_transfer",
          });
        },
      }
    );
  };

  const handleDeletePayment = (paymentId: string) => {
    if (!confirm("Delete this payment record?")) return;
    deletePayment.mutate(paymentId);
  };

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !receivable) return;

    const filePayloads: { name: string; type: string; data: string }[] = [];
    for (const file of Array.from(files)) {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );
      filePayloads.push({ name: file.name, type: file.type, data: base64 });
    }

    uploadDocument.mutate({
      entityType: "receivable",
      entityId: receivable.id,
      files: filePayloads,
    });

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [receivable, uploadDocument]);

  const handleDeleteDocument = (docId: string) => {
    if (!confirm("Delete this document?")) return;
    deleteDocument.mutate(docId);
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-5">
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-5">
            <GlassCard className="p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </GlassCard>
          </div>
          <div>
            <GlassCard className="p-6">
              <Skeleton className="h-6 w-24 mb-4" />
              <Skeleton className="h-8 w-full mb-2" />
              <Skeleton className="h-4 w-full" />
            </GlassCard>
          </div>
        </div>
      </div>
    );
  }

  if (!receivable) {
    return (
      <div className="p-4 md:p-6">
        <GlassCard className="p-8 text-center">
          <p className="text-muted-foreground">Receivable not found.</p>
          <Link href="/payments/receivables">
            <Button variant="outline" size="sm" className="mt-4">
              <ArrowLeftIcon className="size-4 mr-1" />
              Back to Receivables
            </Button>
          </Link>
        </GlassCard>
      </div>
    );
  }

  const client = receivable.client as { company_name: string; client_code: string } | null;
  const category = receivable.category as { name: string; color: string | null } | null;
  const payments = (receivable.payments || []) as FinancePayment[];
  const documents = (receivable.documents || []) as FinanceDocument[];
  const statusStyle = STATUS_BADGE_MAP[receivable.status as ReceivableStatus] || STATUS_BADGE_MAP.pending;
  const statusLabel = RECEIVABLE_STATUSES.find((s) => s.value === receivable.status)?.label || receivable.status;
  const progressPercent = receivable.total_amount > 0
    ? Math.min(100, Math.round((receivable.total_received / receivable.total_amount) * 100))
    : 0;

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Overdue Banner */}
      {receivable.days_overdue > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50/50 px-4 py-3 text-sm text-rose-700">
          <AlertTriangleIcon className="size-4 shrink-0" />
          <span>
            This receivable is <strong>{receivable.days_overdue} days overdue</strong>. Expected payment was due on {receivable.due_date}.
          </span>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-5">
          {/* DETAILS */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <GradientIcon icon={<FileTextIcon className="size-4" />} color="teal" size="sm" />
              <h3 className="text-sm font-semibold">Details</h3>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Client</dt>
                <dd className="font-medium">{client?.company_name || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Receivable Code</dt>
                <dd className="font-mono">{receivable.receivable_code}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Reference #</dt>
                <dd>{receivable.reference_number || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Category</dt>
                <dd>{category?.name || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Issue Date</dt>
                <dd className="flex items-center gap-1">
                  <CalendarIcon className="size-3.5 text-muted-foreground" />
                  {receivable.issue_date}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Due Date</dt>
                <dd className={cn(
                  "flex items-center gap-1",
                  receivable.days_overdue > 0 && "text-rose-600 font-medium"
                )}>
                  <CalendarIcon className="size-3.5 text-muted-foreground" />
                  {receivable.due_date}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Amount</dt>
                <dd className="font-medium tabular-nums">
                  {formatCurrency(receivable.total_amount, receivable.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Currency</dt>
                <dd>{receivable.currency}</dd>
              </div>
              {receivable.description && (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Description</dt>
                  <dd className="whitespace-pre-wrap">{receivable.description}</dd>
                </div>
              )}
              {receivable.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Notes</dt>
                  <dd className="text-muted-foreground whitespace-pre-wrap">{receivable.notes}</dd>
                </div>
              )}
            </dl>
          </GlassCard>

          {/* PAYMENT HISTORY */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GradientIcon icon={<CreditCardIcon className="size-4" />} color="teal" size="sm" />
                <h3 className="text-sm font-semibold">Payment History</h3>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPaymentDialogOpen(true)}
                disabled={receivable.status === "received" || receivable.status === "cancelled"}
              >
                <PlusIcon className="size-4 mr-1" />
                Record Payment
              </Button>
            </div>

            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No payments recorded yet.
              </p>
            ) : (
              <div className="divide-y">
                {payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between py-3 gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono">{payment.payment_code}</span>
                        <Badge variant="outline" className="text-xs">
                          {PAYMENT_METHODS.find((m) => m.value === payment.payment_method)?.label || payment.payment_method}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        <span>{payment.payment_date}</span>
                        {payment.reference_number && <span>Ref: {payment.reference_number}</span>}
                      </div>
                      {payment.notes && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">
                          {payment.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium tabular-nums text-teal-700">
                        +{formatCurrency(payment.amount, payment.currency)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeletePayment(payment.id)}
                      >
                        <Trash2Icon className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* DOCUMENTS */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GradientIcon icon={<FileTextIcon className="size-4" />} color="slate" size="sm" />
                <h3 className="text-sm font-semibold">Documents</h3>
              </div>
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
                className="hidden"
                onChange={handleFileUpload}
                accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx"
              />
            </div>

            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No documents uploaded yet.
              </p>
            ) : (
              <div className="divide-y">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between py-3 gap-4">
                    <div className="min-w-0">
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium hover:underline truncate block"
                      >
                        {doc.file_name}
                      </a>
                      <span className="text-xs text-muted-foreground">
                        {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : ""}
                        {doc.created_at ? ` — ${new Date(doc.created_at).toLocaleDateString()}` : ""}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteDocument(doc.id)}
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        {/* RIGHT COLUMN */}
        <div>
          <div className="sticky top-20 space-y-5">
            {/* SUMMARY */}
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <GradientIcon icon={<BanknoteIcon className="size-4" />} color="teal" size="sm" />
                <h3 className="text-sm font-semibold">Summary</h3>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge className={cn("text-xs", statusStyle.className)}>
                    {statusLabel}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(receivable.total_amount, receivable.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Received</span>
                  <span className="font-medium tabular-nums text-teal-700">
                    {formatCurrency(receivable.total_received, receivable.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Remaining</span>
                  <span className={cn(
                    "font-medium tabular-nums",
                    receivable.remaining > 0 && receivable.days_overdue > 0 && "text-rose-600"
                  )}>
                    {formatCurrency(receivable.remaining, receivable.currency)}
                  </span>
                </div>

                <div className="pt-1">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Collection progress</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <Progress value={progressPercent} className="h-2 [&>div]:bg-teal-500" />
                </div>
              </div>

              <Button
                className="w-full mt-5"
                onClick={() => setPaymentDialogOpen(true)}
                disabled={receivable.status === "received" || receivable.status === "cancelled"}
              >
                <CreditCardIcon className="size-4 mr-1" />
                Record Incoming Payment
              </Button>
            </GlassCard>
          </div>
        </div>
      </div>

      {/* Record Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Incoming Payment</DialogTitle>
            <DialogDescription>
              Record a payment received for {receivable.receivable_code}.
              Remaining: {formatCurrency(receivable.remaining, receivable.currency)}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmitPayment)} className="space-y-4">
            {/* Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="pay_amount">Amount *</Label>
              <Input
                id="pay_amount"
                type="number"
                step="0.01"
                min="0"
                max={receivable.remaining}
                {...register("amount", { valueAsNumber: true })}
                placeholder="0.00"
              />
              {paymentErrors.amount && (
                <p className="text-xs text-destructive">{paymentErrors.amount.message}</p>
              )}
            </div>

            {/* Payment Date */}
            <div className="space-y-1.5">
              <Label htmlFor="pay_date">Payment Date *</Label>
              <Input id="pay_date" type="date" {...register("payment_date")} />
              {paymentErrors.payment_date && (
                <p className="text-xs text-destructive">{paymentErrors.payment_date.message}</p>
              )}
            </div>

            {/* Payment Method */}
            <div className="space-y-1.5">
              <Label>Payment Method *</Label>
              <Select
                value={watchedPaymentMethod || "bank_transfer"}
                onValueChange={(val) => setPaymentValue("payment_method", val as PaymentFormData["payment_method"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reference Number */}
            <div className="space-y-1.5">
              <Label htmlFor="pay_ref">Reference #</Label>
              <Input
                id="pay_ref"
                {...register("reference_number")}
                placeholder="Transaction reference"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="pay_notes">Notes</Label>
              <Input
                id="pay_notes"
                {...register("notes")}
                placeholder="Optional notes..."
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={recordPayment.isPending}>
                {recordPayment.isPending ? "Recording..." : "Record Payment"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
