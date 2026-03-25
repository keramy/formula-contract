"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { invoiceSchema } from "@/lib/validations/finance";
import type { InvoiceFormData } from "@/lib/validations/finance";
import {
  useCreateInvoice,
  useUpdateInvoice,
  useSuppliers,
  useCategories,
  useApprovers,
  useProjectsForFinance,
  useUploadFinanceDocument,
} from "@/lib/react-query/finance";
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
import { PlusIcon, TrashIcon, PaperclipIcon, FileIcon, XIcon, PercentIcon, BanknoteIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CURRENCIES, VAT_RATES } from "@/types/finance";
import type { FinanceInvoiceWithDetails } from "@/types/finance";
import { SupplierSheet } from "../suppliers/supplier-sheet";

interface InvoiceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: FinanceInvoiceWithDetails | null;
}

export function InvoiceSheet({ open, onOpenChange, invoice }: InvoiceSheetProps) {
  const isEditing = !!invoice;
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const { data: suppliers } = useSuppliers();
  const { data: categories } = useCategories();
  const { data: approvers } = useApprovers();
  const { data: projects } = useProjectsForFinance();
  const isPending = createInvoice.isPending || updateInvoice.isPending;

  const [supplierSheetOpen, setSupplierSheetOpen] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  // Track which installments use percentage mode (UI-only, DB stores amounts)
  const [installmentModes, setInstallmentModes] = useState<Record<number, "amount" | "percent">>({});
  const uploadDocument = useUploadFinanceDocument();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isDirty },
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      currency: "TRY",
      vat_rate: 20,
      requires_approval: false,
      approved_by: null,
      has_installments: false,
      installments: [],
    },
  });

  const { fields: installmentFields, append: addInstallment, remove: removeInstallment } = useFieldArray({
    control,
    name: "installments" as never,
  });

  // Intercept close attempts — block if form has data
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && isDirty) {
        setConfirmCloseOpen(true);
        return;
      }
      onOpenChange(nextOpen);
    },
    [isDirty, onOpenChange]
  );

  const handleConfirmDiscard = () => {
    setConfirmCloseOpen(false);
    reset();
    setPendingFiles([]);
    setInstallmentModes({});
    onOpenChange(false);
  };

  const handleCancelClose = () => {
    setConfirmCloseOpen(false);
  };

  useEffect(() => {
    if (open && invoice) {
      reset({
        supplier_id: invoice.supplier_id,
        category_id: invoice.category_id,
        project_id: invoice.project_id,
        invoice_number: invoice.invoice_number,
        invoice_date: invoice.invoice_date,
        due_date: invoice.due_date,
        total_amount: invoice.total_amount,
        currency: invoice.currency,
        vat_rate: invoice.vat_rate || 0,
        description: invoice.description,
        requires_approval: invoice.requires_approval,
        approved_by: invoice.approved_by,
        has_installments: invoice.has_installments || false,
        installments: (invoice.installments || []).map((inst) => ({
          amount: inst.amount,
          due_date: inst.due_date,
        })),
        notes: invoice.notes,
      });
    } else if (open) {
      reset({
        supplier_id: "",
        category_id: null,
        project_id: null,
        invoice_number: null,
        invoice_date: new Date().toISOString().split("T")[0],
        due_date: "",
        total_amount: 0,
        currency: "TRY",
        vat_rate: 20,
        description: null,
        requires_approval: false,
        approved_by: null,
        has_installments: false,
        installments: [],
        notes: null,
      });
    }
  }, [open, invoice, reset]);

  const onSubmit = async (data: InvoiceFormData) => {
    // Convert percentage installments to real amounts before saving
    if (data.has_installments && data.installments) {
      data.installments = data.installments.map((inst, idx) => {
        const mode = installmentModes[idx] || "amount";
        if (mode === "percent") {
          return { ...inst, amount: ((inst.amount || 0) / 100) * (data.total_amount || 0) };
        }
        return inst;
      });
    }

    if (isEditing) {
      updateInvoice.mutate(
        { id: invoice.id, ...data } as Record<string, unknown> & { id: string },
        { onSuccess: () => { setPendingFiles([]); setInstallmentModes({}); onOpenChange(false); } }
      );
    } else {
      createInvoice.mutate(data as Record<string, unknown>, {
        onSuccess: async (result) => {
          // Upload pending files if any — wait for upload before closing
          if (pendingFiles.length > 0 && result.id) {
            try {
              const fileData = await Promise.all(
                pendingFiles.map(async (file) => {
                  const buffer = await file.arrayBuffer();
                  const base64 = btoa(
                    new Uint8Array(buffer).reduce((d, byte) => d + String.fromCharCode(byte), "")
                  );
                  return {
                    name: file.name,
                    type: file.type,
                    data: `data:${file.type};base64,${base64}`,
                  };
                })
              );
              // Import and call server action directly to await it
              const { uploadFinanceDocument } = await import("@/lib/actions/finance");
              await uploadFinanceDocument("invoice", result.id, fileData);
            } catch (e) {
              console.error("File upload failed:", e);
            }
          }
          setPendingFiles([]);
          onOpenChange(false);
        },
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setPendingFiles((prev) => [...prev, ...Array.from(files)]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const watchedSupplierId = watch("supplier_id");
  const watchedCategoryId = watch("category_id");
  const watchedCurrency = watch("currency");
  const watchedVatRate = watch("vat_rate") || 0;
  const watchedRequiresApproval = watch("requires_approval");
  const watchedHasInstallments = watch("has_installments");
  const watchedInstallments = watch("installments") || [];
  const watchedTotalAmount = watch("total_amount");
  const vatAmount = ((watchedTotalAmount || 0) * watchedVatRate) / 100;
  const totalWithVat = (watchedTotalAmount || 0) + vatAmount;

  // Calculate real amounts (convert percentages to amounts)
  const getInstallmentAmount = (index: number): number => {
    const inst = watchedInstallments[index];
    if (!inst) return 0;
    const mode = installmentModes[index] || "amount";
    if (mode === "percent") {
      return ((inst.amount || 0) / 100) * (watchedTotalAmount || 0);
    }
    return inst.amount || 0;
  };

  const installmentsSum = watchedInstallments.reduce((sum, _, idx) => sum + getInstallmentAmount(idx), 0);
  const installmentsMatch = Math.abs(installmentsSum - (watchedTotalAmount || 0)) < 0.01;

  // Calculate percentage total for display
  const percentTotal = watchedInstallments.reduce((sum, inst, idx) => {
    const mode = installmentModes[idx] || "amount";
    if (mode === "percent") return sum + (inst?.amount || 0);
    if (watchedTotalAmount && watchedTotalAmount > 0) return sum + ((inst?.amount || 0) / watchedTotalAmount) * 100;
    return sum;
  }, 0);

  const expenseCategories = (categories || []).filter((c) => c.type === "expense");

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg flex flex-col"
        onInteractOutside={(e) => { if (isDirty) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (isDirty) { e.preventDefault(); setConfirmCloseOpen(true); } }}
      >
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Invoice" : "New Invoice"}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col px-4 mt-2">
          <div className="space-y-3 flex-1">
            {/* Supplier + Category — 2 col */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Supplier *</Label>
                <Select
                  value={watchedSupplierId || ""}
                  onValueChange={(val) => setValue("supplier_id", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {(suppliers || []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.supplier_code} — {s.name}
                      </SelectItem>
                    ))}
                    <div className="border-t border-base-200 mt-1 pt-1 px-2 pb-1">
                      <button
                        type="button"
                        className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs text-primary hover:bg-primary/5 rounded-md transition-colors"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSupplierSheetOpen(true);
                        }}
                      >
                        <PlusIcon className="size-3.5" />
                        New Supplier
                      </button>
                    </div>
                  </SelectContent>
                </Select>
                {errors.supplier_id && (
                  <p className="text-xs text-destructive">{errors.supplier_id.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Category</Label>
                <Select
                  value={watchedCategoryId || ""}
                  onValueChange={(val) => setValue("category_id", val || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Invoice # + Amount + Currency — 3 col */}
            <div className="grid grid-cols-5 gap-3">
              <div className="col-span-2 space-y-1">
                <Label htmlFor="invoice_number" className="text-xs">Invoice #</Label>
                <Input
                  id="invoice_number"
                  {...register("invoice_number")}
                  placeholder="Supplier's #"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label htmlFor="total_amount" className="text-xs">Amount *</Label>
                <Input
                  id="total_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("total_amount", { valueAsNumber: true })}
                  placeholder="0.00"
                />
                {errors.total_amount && (
                  <p className="text-xs text-destructive">{errors.total_amount.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Currency</Label>
                <Select
                  value={watchedCurrency || "TRY"}
                  onValueChange={(val) => setValue("currency", val as "TRY" | "USD" | "EUR")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.symbol} {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* VAT Rate + Summary */}
            <div className="grid grid-cols-5 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">VAT (KDV)</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={watchedVatRate}
                  onChange={(e) => setValue("vat_rate", Number(e.target.value))}
                >
                  {VAT_RATES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-3">
                {(watchedTotalAmount || 0) > 0 && (
                  <div className="rounded-md bg-base-50 border border-base-200 px-2.5 py-1.5 h-full flex flex-col justify-center">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="tabular-nums">{(watchedTotalAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                    </div>
                    {watchedVatRate > 0 && (
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">VAT ({watchedVatRate}%)</span>
                        <span className="tabular-nums">{vatAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs font-semibold border-t border-base-200 pt-0.5 mt-0.5">
                      <span>Total</span>
                      <span className="tabular-nums">{totalWithVat.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Invoice Date + Due Date (hidden when installments on) */}
            <div className={watchedHasInstallments ? "grid grid-cols-2 gap-3" : "grid grid-cols-2 gap-3"}>
              <div className="space-y-1">
                <Label htmlFor="invoice_date" className="text-xs">Invoice Date *</Label>
                <Input id="invoice_date" type="date" {...register("invoice_date")} />
                {errors.invoice_date && (
                  <p className="text-xs text-destructive">{errors.invoice_date.message}</p>
                )}
              </div>
              {!watchedHasInstallments && (
                <div className="space-y-1">
                  <Label htmlFor="due_date" className="text-xs">Due Date *</Label>
                  <Input id="due_date" type="date" {...register("due_date")} />
                  {errors.due_date && (
                    <p className="text-xs text-destructive">{errors.due_date.message}</p>
                  )}
                </div>
              )}
              {watchedHasInstallments && (
                <div className="flex items-end">
                  <p className="text-xs text-muted-foreground pb-2">
                    Due dates set per installment below
                  </p>
                </div>
              )}
            </div>

            {/* Installment Plan Toggle + Rows */}
            <div className="rounded-lg border p-2.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-medium">Installment Plan</Label>
                  <p className="text-xs text-muted-foreground">
                    Split into multiple payments
                  </p>
                </div>
                <Switch
                  checked={watchedHasInstallments || false}
                  onCheckedChange={(checked) => {
                    setValue("has_installments", checked);
                    if (checked && installmentFields.length === 0) {
                      addInstallment({ amount: 0, due_date: "" });
                    }
                    if (!checked) {
                      setValue("installments", []);
                    }
                  }}
                />
              </div>

              {watchedHasInstallments && (
                <div className="space-y-2 pt-1 border-t border-base-200">
                  {installmentFields.map((field, index) => {
                    const mode = installmentModes[index] || "amount";
                    const computedAmount = getInstallmentAmount(index);
                    return (
                      <div key={field.id} className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground w-4 shrink-0">
                          {index + 1}.
                        </span>
                        {/* Mode toggle button */}
                        <button
                          type="button"
                          className={cn(
                            "h-8 w-8 shrink-0 rounded-md border flex items-center justify-center text-xs transition-colors",
                            mode === "percent"
                              ? "bg-primary/10 border-primary/30 text-primary"
                              : "bg-base-50 border-base-200 text-muted-foreground hover:border-base-300"
                          )}
                          onClick={() => setInstallmentModes((prev) => ({
                            ...prev,
                            [index]: mode === "percent" ? "amount" : "percent",
                          }))}
                          title={mode === "percent" ? "Switch to fixed amount" : "Switch to percentage"}
                        >
                          {mode === "percent" ? <PercentIcon className="size-3" /> : <BanknoteIcon className="size-3" />}
                        </button>
                        {/* Value input */}
                        <div className="relative flex-1">
                          <Input
                            type="number"
                            step={mode === "percent" ? "1" : "0.01"}
                            min="0"
                            max={mode === "percent" ? "100" : undefined}
                            placeholder={mode === "percent" ? "%" : "Amount"}
                            className="pr-12"
                            {...register(`installments.${index}.amount` as const, { valueAsNumber: true })}
                          />
                          {/* Calculated preview */}
                          {mode === "percent" && watchedTotalAmount > 0 && (
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground tabular-nums">
                              = {computedAmount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                          )}
                          {mode === "amount" && (
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                              {invoice?.currency || watchedCurrency || "TRY"}
                            </span>
                          )}
                        </div>
                        {/* Due date */}
                        <Input
                          type="date"
                          className="w-[140px] shrink-0"
                          {...register(`installments.${index}.due_date` as const)}
                        />
                        {installmentFields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() => {
                              removeInstallment(index);
                              // Clean up mode for removed index
                              setInstallmentModes((prev) => {
                                const next = { ...prev };
                                delete next[index];
                                return next;
                              });
                            }}
                          >
                            <TrashIcon className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => addInstallment({ amount: 0, due_date: "" })}
                    >
                      <PlusIcon className="size-3 mr-1" />
                      Add Installment
                    </Button>
                    <div className="text-xs tabular-nums space-x-2">
                      <span>
                        <span className="text-muted-foreground">Sum: </span>
                        <span className={installmentsMatch ? "text-emerald-600 font-medium" : "text-rose-600 font-medium"}>
                          {installmentsSum.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-muted-foreground"> / {(watchedTotalAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                        {installmentsMatch && <span className="text-emerald-600 ml-1">✓</span>}
                      </span>
                      <span className="text-muted-foreground">
                        ({Math.round(percentTotal)}%)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Project + Description */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Project</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={watch("project_id") || ""}
                  onChange={(e) => setValue("project_id", e.target.value || null)}
                >
                  <option value="">General expense</option>
                  {(projects || []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.project_code} — {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="description" className="text-xs">Description</Label>
                <Input
                  id="description"
                  {...register("description")}
                  placeholder="Additional notes..."
                />
              </div>
            </div>

            {/* Requires Approval */}
            <div className="rounded-lg border p-2.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-medium">Requires Approval</Label>
                  <p className="text-xs text-muted-foreground">
                    Must be approved before payment
                  </p>
                </div>
                <Switch
                  checked={watchedRequiresApproval || false}
                  onCheckedChange={(checked) => {
                    setValue("requires_approval", checked);
                    if (!checked) setValue("approved_by", null);
                  }}
                />
              </div>

              {watchedRequiresApproval && (
                <div className="space-y-1 pt-1 border-t border-base-200">
                  <Label className="text-xs">Approver *</Label>
                  <Select
                    value={watch("approved_by") || ""}
                    onValueChange={(val) => setValue("approved_by", val || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Who should approve?" />
                    </SelectTrigger>
                    <SelectContent>
                      {(approvers || []).map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                      {(!approvers || approvers.length === 0) && (
                        <SelectItem value="none" disabled>
                          No approvers configured
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <Label htmlFor="notes" className="text-xs">Notes</Label>
              <Input
                id="notes"
                {...register("notes")}
                placeholder="Internal notes..."
              />
            </div>

            {/* File Attachments */}
            <div className="space-y-1.5">
              <Label className="text-xs">Attachments</Label>
              {pendingFiles.length > 0 && (
                <div className="space-y-1">
                  {pendingFiles.map((file, idx) => (
                    <div
                      key={`${file.name}-${idx}`}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-base-50 border border-base-200 text-xs"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <FileIcon className="size-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{file.name}</span>
                        <span className="text-muted-foreground shrink-0">
                          ({(file.size / 1024).toFixed(0)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-destructive shrink-0 ml-2"
                        onClick={() => removeFile(idx)}
                      >
                        <XIcon className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                className="flex items-center gap-1.5 px-2.5 py-1.5 w-full rounded-md border border-dashed border-base-300 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <PaperclipIcon className="size-3.5" />
                {pendingFiles.length > 0 ? "Add more files" : "Attach invoice PDF or image"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          </div>

          {/* Submit — pinned at bottom */}
          <div className="flex justify-end gap-2 py-3 border-t border-base-200 mt-3">
            <Button type="button" variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending
                ? isEditing ? "Saving..." : "Creating..."
                : isEditing ? "Save Changes" : "Create Invoice"}
            </Button>
          </div>
        </form>
      </SheetContent>

      {/* Inline Supplier Creation Sheet */}
      <SupplierSheet
        open={supplierSheetOpen}
        onOpenChange={setSupplierSheetOpen}
        supplier={null}
      />

      {/* Unsaved Changes Confirmation */}
      <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to discard them?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelClose}>
              Continue Editing
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDiscard}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
