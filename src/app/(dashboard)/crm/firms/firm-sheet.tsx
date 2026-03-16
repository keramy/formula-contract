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
  SheetFooter,
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
import { useCreateFirm, useUpdateFirm } from "@/lib/react-query/crm";
import { firmSchema } from "@/lib/validations/crm";
import {
  VENDOR_STATUSES,
  CONNECTION_STRENGTHS,
  CRM_PRIORITIES,
} from "@/types/crm";
import type {
  CrmFirmWithLinks,
  VendorListStatus,
  ConnectionStrength,
  CrmPriority,
} from "@/types/crm";
import { Loader2Icon } from "lucide-react";
import type { z } from "zod";

// ============================================================================
// Types + Constants
// ============================================================================

type FirmFormValues = z.input<typeof firmSchema>;

interface FirmSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  firm?: CrmFirmWithLinks | null;
}

const FIRM_FORM_DEFAULTS: FirmFormValues = {
  name: "",
  location: "",
  specialty: "",
  key_clients: "",
  vendor_list_status: "not_applied",
  vendor_application_date: "",
  website: "",
  connection_strength: "none",
  connection_notes: "",
  notes: "",
  priority: "medium",
};

// ============================================================================
// Component
// ============================================================================

export function FirmSheet({ open, onOpenChange, firm }: FirmSheetProps) {
  const isEditing = !!firm;
  const createFirm = useCreateFirm();
  const updateFirm = useUpdateFirm();
  const isPending = createFirm.isPending || updateFirm.isPending;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FirmFormValues>({
    resolver: zodResolver(firmSchema),
    defaultValues: FIRM_FORM_DEFAULTS,
  });

  useEffect(() => {
    if (firm) {
      reset({
        name: firm.name,
        location: firm.location ?? "",
        specialty: firm.specialty ?? "",
        key_clients: firm.key_clients ?? "",
        vendor_list_status: firm.vendor_list_status,
        vendor_application_date: firm.vendor_application_date ?? "",
        website: firm.website ?? "",
        connection_strength: firm.connection_strength,
        connection_notes: firm.connection_notes ?? "",
        notes: firm.notes ?? "",
        priority: firm.priority,
      });
    } else {
      reset(FIRM_FORM_DEFAULTS);
    }
  }, [firm, reset]);

  function onSubmit(data: FirmFormValues) {
    const payload: Record<string, unknown> = {
      ...data,
      location: data.location || null,
      specialty: data.specialty || null,
      key_clients: data.key_clients || null,
      vendor_application_date: data.vendor_application_date || null,
      website: data.website || null,
      connection_notes: data.connection_notes || null,
      notes: data.notes || null,
    };

    if (isEditing) {
      updateFirm.mutate(
        { id: firm.id, input: payload },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createFirm.mutate(payload, {
        onSuccess: () => onOpenChange(false),
      });
    }
  }

  const vendorStatusValue = watch("vendor_list_status");
  const connectionValue = watch("connection_strength");
  const priorityValue = watch("priority");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Firm" : "New Firm"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update architecture firm details below."
              : "Fill in the details to add a new architecture firm."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="firm-name">Name *</Label>
            <Input
              id="firm-name"
              placeholder="e.g. Gensler"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label htmlFor="firm-location">Location</Label>
            <Input
              id="firm-location"
              placeholder="e.g. New York, USA"
              {...register("location")}
            />
          </div>

          {/* Specialty */}
          <div className="space-y-1.5">
            <Label htmlFor="firm-specialty">Specialty</Label>
            <Input
              id="firm-specialty"
              placeholder="e.g. Retail, Hospitality"
              {...register("specialty")}
            />
          </div>

          {/* Key Clients */}
          <div className="space-y-1.5">
            <Label htmlFor="firm-key-clients">Key Clients</Label>
            <Input
              id="firm-key-clients"
              placeholder="e.g. Gucci, Dior, Chanel"
              {...register("key_clients")}
            />
          </div>

          {/* Vendor Status + Application Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Vendor Status</Label>
              <Select
                value={vendorStatusValue}
                onValueChange={(val) =>
                  setValue("vendor_list_status", val as VendorListStatus)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {VENDOR_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="firm-app-date">Application Date</Label>
              <Input
                id="firm-app-date"
                type="date"
                {...register("vendor_application_date")}
              />
            </div>
          </div>

          {/* Connection Strength + Priority row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Connection</Label>
              <Select
                value={connectionValue}
                onValueChange={(val) =>
                  setValue("connection_strength", val as ConnectionStrength)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select strength" />
                </SelectTrigger>
                <SelectContent>
                  {CONNECTION_STRENGTHS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select
                value={priorityValue}
                onValueChange={(val) =>
                  setValue("priority", val as CrmPriority)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {CRM_PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Connection Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="firm-connection-notes">Connection Notes</Label>
            <Textarea
              id="firm-connection-notes"
              placeholder="Who do we know? How did we connect?"
              rows={2}
              {...register("connection_notes")}
            />
          </div>

          {/* Website */}
          <div className="space-y-1.5">
            <Label htmlFor="firm-website">Website</Label>
            <Input
              id="firm-website"
              type="url"
              placeholder="https://..."
              {...register("website")}
            />
            {errors.website && (
              <p className="text-xs text-destructive">
                {errors.website.message}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="firm-notes">Notes</Label>
            <Textarea
              id="firm-notes"
              placeholder="Additional notes..."
              rows={3}
              {...register("notes")}
            />
          </div>

          <SheetFooter className="px-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && (
                <Loader2Icon className="size-4 mr-1 animate-spin" />
              )}
              {isEditing ? "Update Firm" : "Create Firm"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
