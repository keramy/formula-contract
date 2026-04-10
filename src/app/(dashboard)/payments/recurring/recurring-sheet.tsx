"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { recurringTemplateSchema } from "@/lib/validations/finance";
import type { RecurringTemplateFormData } from "@/lib/validations/finance";
import {
  useCreateRecurringTemplate,
  useUpdateRecurringTemplate,
  useSuppliers,
  useCategories,
} from "@/lib/react-query/finance";
import { RECURRING_FREQUENCIES, CURRENCIES } from "@/types/finance";
import type { FinanceRecurringWithSupplier } from "@/types/finance";

interface RecurringSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: FinanceRecurringWithSupplier | null;
}

export function RecurringSheet({ open, onOpenChange, template }: RecurringSheetProps) {
  const isEditing = !!template;
  const createTemplate = useCreateRecurringTemplate();
  const updateTemplate = useUpdateRecurringTemplate();
  const { data: suppliers } = useSuppliers();
  const { data: categories } = useCategories();
  const isPending = createTemplate.isPending || updateTemplate.isPending;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RecurringTemplateFormData>({
    resolver: zodResolver(recurringTemplateSchema),
    defaultValues: {
      currency: "TRY",
      frequency: "monthly",
      day_of_month: 1,
      requires_approval: false,
    },
  });

  useEffect(() => {
    if (open && template) {
      reset({
        supplier_id: template.supplier_id,
        category_id: template.category_id,
        description: template.description,
        amount: template.amount,
        currency: template.currency,
        frequency: template.frequency,
        day_of_month: template.day_of_month,
        next_due_date: template.next_due_date,
        requires_approval: template.requires_approval,
      });
    } else if (open) {
      reset({
        supplier_id: "",
        category_id: null,
        description: "",
        amount: 0,
        currency: "TRY",
        frequency: "monthly",
        day_of_month: 1,
        next_due_date: "",
        requires_approval: false,
      });
    }
  }, [open, template, reset]);

  const onSubmit = (data: RecurringTemplateFormData) => {
    if (isEditing) {
      updateTemplate.mutate(
        { id: template.id, ...data } as Record<string, unknown> & { id: string },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createTemplate.mutate(data as Record<string, unknown>, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const watchedSupplierId = watch("supplier_id");
  const watchedCategoryId = watch("category_id");
  const watchedCurrency = watch("currency");
  const watchedFrequency = watch("frequency");
  const watchedRequiresApproval = watch("requires_approval");

  const expenseCategories = (categories || []).filter((c) => c.type === "expense");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Template" : "New Recurring Template"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? `Update template ${template.template_code}`
              : "Create a template to auto-generate invoices on schedule"}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden mt-4">
          <div className="flex-1 overflow-y-auto px-4 space-y-4 pb-2">
          {/* Supplier */}
          <div className="space-y-1.5">
            <Label>Supplier *</Label>
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
              </SelectContent>
            </Select>
            {errors.supplier_id && (
              <p className="text-xs text-destructive">{errors.supplier_id.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="rec-desc">Description *</Label>
            <Textarea
              id="rec-desc"
              {...register("description")}
              placeholder="What is this recurring payment for? (e.g., Monthly rent)"
              rows={2}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select
              value={watchedCategoryId || ""}
              onValueChange={(val) => setValue("category_id", val || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount + Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="rec-amount">Amount *</Label>
              <Input
                id="rec-amount"
                type="number"
                step="0.01"
                min="0"
                {...register("amount", { valueAsNumber: true })}
                placeholder="0.00"
              />
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
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

          {/* Frequency + Day of Month */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Frequency *</Label>
              <Select
                value={watchedFrequency || "monthly"}
                onValueChange={(val) => setValue("frequency", val as RecurringTemplateFormData["frequency"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECURRING_FREQUENCIES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rec-day">Day of Month (1-28) *</Label>
              <Input
                id="rec-day"
                type="number"
                min="1"
                max="28"
                {...register("day_of_month", { valueAsNumber: true })}
              />
              {errors.day_of_month && (
                <p className="text-xs text-destructive">{errors.day_of_month.message}</p>
              )}
            </div>
          </div>

          {/* Next Due Date */}
          <div className="space-y-1.5">
            <Label htmlFor="rec-next">Next Due Date *</Label>
            <Input id="rec-next" type="date" {...register("next_due_date")} />
            {errors.next_due_date && (
              <p className="text-xs text-destructive">{errors.next_due_date.message}</p>
            )}
          </div>

          {/* Requires Approval */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-sm font-medium">Requires Approval</Label>
              <p className="text-xs text-muted-foreground">
                Generated invoices must be approved before payment
              </p>
            </div>
            <Switch
              checked={watchedRequiresApproval || false}
              onCheckedChange={(checked) => setValue("requires_approval", checked)}
            />
          </div>

          </div>
          {/* Submit — pinned at bottom */}
          <div className="flex justify-end gap-2 py-3 px-4 border-t border-base-200 shrink-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? isEditing ? "Saving..." : "Creating..."
                : isEditing ? "Save Changes" : "Create Template"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
