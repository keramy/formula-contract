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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supplierSchema } from "@/lib/validations/finance";
import type { SupplierFormData } from "@/lib/validations/finance";
import { useCreateSupplier, useUpdateSupplier } from "@/lib/react-query/finance";
import { SUPPLIER_CATEGORIES } from "@/types/finance";
import type { FinanceSupplierWithStats } from "@/types/finance";

interface SupplierSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: FinanceSupplierWithStats | null;
}

export function SupplierSheet({ open, onOpenChange, supplier }: SupplierSheetProps) {
  const isEditing = !!supplier;
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const isPending = createSupplier.isPending || updateSupplier.isPending;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    mode: "onChange",
  });

  useEffect(() => {
    if (open && supplier) {
      reset({
        name: supplier.name,
        contact_person: supplier.contact_person,
        phone: supplier.phone,
        email: supplier.email,
        category: supplier.category,
        tax_id: supplier.tax_id,
        iban: supplier.iban,
        bank_name: supplier.bank_name,
        address: supplier.address,
        notes: supplier.notes,
      });
    } else if (open) {
      reset({
        name: "",
        contact_person: null,
        phone: null,
        email: null,
        category: null,
        tax_id: null,
        iban: null,
        bank_name: null,
        address: null,
        notes: null,
      });
    }
  }, [open, supplier, reset]);

  const onSubmit = (data: SupplierFormData) => {
    if (isEditing) {
      updateSupplier.mutate(
        { id: supplier.id, ...data },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createSupplier.mutate(data as Record<string, unknown>, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const categoryValue = watch("category");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Supplier" : "New Supplier"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? `Update ${supplier.name} details`
              : "Add a new supplier/vendor to the registry"}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden mt-4">
          <div className="flex-1 overflow-y-auto px-4 space-y-4 pb-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Supplier Name *</Label>
            <Input id="name" {...register("name")} placeholder="Company name" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select
              value={categoryValue || ""}
              onValueChange={(val) => setValue("category", (val || null) as SupplierFormData["category"])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {SUPPLIER_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contact Person + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="contact_person">Contact Person</Label>
              <Input id="contact_person" {...register("contact_person")} placeholder="Full name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register("phone")} placeholder="+90 ..." />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} placeholder="accounting@supplier.com" />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          {/* Bank Details */}
          <div className="space-y-1.5">
            <Label htmlFor="bank_name">Bank Name</Label>
            <Input id="bank_name" {...register("bank_name")} placeholder="e.g. Garanti BBVA" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="iban">IBAN</Label>
            <Input id="iban" {...register("iban")} placeholder="TR..." className="font-mono" />
            {errors.iban && <p className="text-xs text-destructive">{errors.iban.message}</p>}
          </div>

          {/* Tax ID */}
          <div className="space-y-1.5">
            <Label htmlFor="tax_id">Tax ID</Label>
            <Input id="tax_id" {...register("tax_id")} placeholder="Tax identification number" />
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" {...register("address")} placeholder="Full address" rows={2} />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register("notes")} placeholder="Internal notes..." rows={2} />
          </div>

          </div>
          {/* Submit — pinned at bottom */}
          <div className="flex justify-end gap-2 py-3 px-4 border-t border-base-200 shrink-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? isEditing
                  ? "Saving..."
                  : "Creating..."
                : isEditing
                  ? "Save Changes"
                  : "Create Supplier"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
