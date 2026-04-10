"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { receivableSchema } from "@/lib/validations/finance";
import type { ReceivableFormData } from "@/lib/validations/finance";
import {
  useCreateReceivable,
  useUpdateReceivable,
  useCategories,
} from "@/lib/react-query/finance";
import { CURRENCIES } from "@/types/finance";
import type { FinanceReceivableWithDetails } from "@/types/finance";

function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data } = await supabase
        .from("clients")
        .select("id, company_name, client_code")
        .eq("is_deleted", false)
        .order("company_name");
      return data || [];
    },
    staleTime: 60000,
  });
}

interface ReceivableSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receivable: FinanceReceivableWithDetails | null;
}

export function ReceivableSheet({ open, onOpenChange, receivable }: ReceivableSheetProps) {
  const isEditing = !!receivable;
  const createReceivable = useCreateReceivable();
  const updateReceivable = useUpdateReceivable();
  const { data: clients } = useClients();
  const { data: categories } = useCategories();
  const isPending = createReceivable.isPending || updateReceivable.isPending;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReceivableFormData>({
    resolver: zodResolver(receivableSchema),
    defaultValues: {
      currency: "TRY",
    },
  });

  useEffect(() => {
    if (open && receivable) {
      reset({
        client_id: receivable.client_id,
        category_id: receivable.category_id,
        reference_number: receivable.reference_number,
        issue_date: receivable.issue_date,
        due_date: receivable.due_date,
        total_amount: receivable.total_amount,
        currency: receivable.currency,
        description: receivable.description,
        notes: receivable.notes,
      });
    } else if (open) {
      reset({
        client_id: "",
        category_id: null,
        reference_number: null,
        issue_date: new Date().toISOString().split("T")[0],
        due_date: "",
        total_amount: 0,
        currency: "TRY",
        description: null,
        notes: null,
      });
    }
  }, [open, receivable, reset]);

  const onSubmit = (data: ReceivableFormData) => {
    if (isEditing) {
      updateReceivable.mutate(
        { id: receivable.id, ...data } as Record<string, unknown> & { id: string },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createReceivable.mutate(data as Record<string, unknown>, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const watchedClientId = watch("client_id");
  const watchedCategoryId = watch("category_id");
  const watchedCurrency = watch("currency");

  const incomeCategories = (categories || []).filter((c) => c.type === "income");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Receivable" : "New Receivable"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? `Update receivable ${receivable.receivable_code}`
              : "Record a new accounts receivable entry"}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden mt-4">
          <div className="flex-1 overflow-y-auto px-4 space-y-4 pb-2">
          {/* Client */}
          <div className="space-y-1.5">
            <Label>Client *</Label>
            <Select
              value={watchedClientId || ""}
              onValueChange={(val) => setValue("client_id", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {(clients || []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.client_code} — {c.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.client_id && (
              <p className="text-xs text-destructive">{errors.client_id.message}</p>
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
                {incomeCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reference Number */}
          <div className="space-y-1.5">
            <Label htmlFor="reference_number">Reference #</Label>
            <Input
              id="reference_number"
              {...register("reference_number")}
              placeholder="Client reference number"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="issue_date">Issue Date *</Label>
              <Input id="issue_date" type="date" {...register("issue_date")} />
              {errors.issue_date && (
                <p className="text-xs text-destructive">{errors.issue_date.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="due_date">Due Date *</Label>
              <Input id="due_date" type="date" {...register("due_date")} />
              {errors.due_date && (
                <p className="text-xs text-destructive">{errors.due_date.message}</p>
              )}
            </div>
          </div>

          {/* Amount + Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="total_amount">Amount *</Label>
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

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="What is this receivable for?"
              rows={2}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Internal notes..."
              rows={2}
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
                : isEditing ? "Save Changes" : "Create Receivable"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
