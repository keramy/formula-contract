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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateBrand, useUpdateBrand } from "@/lib/react-query/crm";
import { brandSchema } from "@/lib/validations/crm";
import { BRAND_TIERS, CRM_PRIORITIES } from "@/types/crm";
import type { CrmBrandWithStats, BrandTier, CrmPriority } from "@/types/crm";
import { Loader2Icon } from "lucide-react";
import type { z } from "zod";

type BrandFormValues = z.input<typeof brandSchema>;

interface BrandSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand?: CrmBrandWithStats | null;
}

const BRAND_FORM_DEFAULTS: BrandFormValues = {
  name: "",
  parent_group: "",
  tier: "mid_luxury",
  segment: "",
  store_count: null,
  expansion_rate: "",
  creative_director: "",
  cd_changed_recently: false,
  headquarters: "",
  website: "",
  annual_revenue: "",
  notes: "",
  priority: "medium",
};

export function BrandSheet({ open, onOpenChange, brand }: BrandSheetProps) {
  const isEditing = !!brand;
  const createBrand = useCreateBrand();
  const updateBrand = useUpdateBrand();
  const isPending = createBrand.isPending || updateBrand.isPending;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BrandFormValues>({
    resolver: zodResolver(brandSchema),
    defaultValues: BRAND_FORM_DEFAULTS,
  });

  useEffect(() => {
    if (brand) {
      reset({
        name: brand.name,
        parent_group: brand.parent_group ?? "",
        tier: brand.tier,
        segment: brand.segment ?? "",
        store_count: brand.store_count,
        expansion_rate: brand.expansion_rate ?? "",
        creative_director: brand.creative_director ?? "",
        cd_changed_recently: brand.cd_changed_recently,
        headquarters: brand.headquarters ?? "",
        website: brand.website ?? "",
        annual_revenue: brand.annual_revenue ?? "",
        notes: brand.notes ?? "",
        priority: brand.priority,
      });
    } else {
      reset(BRAND_FORM_DEFAULTS);
    }
  }, [brand, reset]);

  function onSubmit(data: BrandFormValues) {
    const payload: Record<string, unknown> = {
      ...data,
      parent_group: data.parent_group || null,
      segment: data.segment || null,
      expansion_rate: data.expansion_rate || null,
      creative_director: data.creative_director || null,
      headquarters: data.headquarters || null,
      website: data.website || null,
      annual_revenue: data.annual_revenue || null,
      notes: data.notes || null,
    };

    if (isEditing) {
      updateBrand.mutate(
        { id: brand.id, input: payload },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createBrand.mutate(payload, {
        onSuccess: () => onOpenChange(false),
      });
    }
  }

  const tierValue = watch("tier");
  const priorityValue = watch("priority");
  const cdChanged = watch("cd_changed_recently");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Brand" : "New Brand"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update brand details below."
              : "Fill in the details to create a new brand."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="brand-name">Name *</Label>
            <Input
              id="brand-name"
              placeholder="e.g. Louis Vuitton"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Parent Group */}
          <div className="space-y-1.5">
            <Label htmlFor="brand-parent-group">Parent Group</Label>
            <Input
              id="brand-parent-group"
              placeholder="e.g. LVMH"
              {...register("parent_group")}
            />
          </div>

          {/* Tier + Priority row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tier</Label>
              <Select
                value={tierValue}
                onValueChange={(val) =>
                  setValue("tier", val as BrandTier)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tier" />
                </SelectTrigger>
                <SelectContent>
                  {BRAND_TIERS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
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

          {/* Segment */}
          <div className="space-y-1.5">
            <Label htmlFor="brand-segment">Segment</Label>
            <Input
              id="brand-segment"
              placeholder="e.g. Fashion, Jewelry, Hospitality"
              {...register("segment")}
            />
          </div>

          {/* Store Count + Expansion Rate row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="brand-store-count">Store Count</Label>
              <Input
                id="brand-store-count"
                type="number"
                min={0}
                placeholder="0"
                {...register("store_count", { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="brand-expansion-rate">Expansion Rate</Label>
              <Input
                id="brand-expansion-rate"
                placeholder="e.g. 15 stores/year"
                {...register("expansion_rate")}
              />
            </div>
          </div>

          {/* Creative Director + CD Changed row */}
          <div className="space-y-1.5">
            <Label htmlFor="brand-creative-director">Creative Director</Label>
            <Input
              id="brand-creative-director"
              placeholder="e.g. Virgil Abloh"
              {...register("creative_director")}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="brand-cd-changed"
              checked={cdChanged}
              onCheckedChange={(checked) =>
                setValue("cd_changed_recently", checked === true)
              }
            />
            <Label htmlFor="brand-cd-changed" className="text-sm font-normal">
              Creative director changed recently
            </Label>
          </div>

          {/* Headquarters */}
          <div className="space-y-1.5">
            <Label htmlFor="brand-headquarters">Headquarters</Label>
            <Input
              id="brand-headquarters"
              placeholder="e.g. Paris, France"
              {...register("headquarters")}
            />
          </div>

          {/* Website */}
          <div className="space-y-1.5">
            <Label htmlFor="brand-website">Website</Label>
            <Input
              id="brand-website"
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

          {/* Annual Revenue */}
          <div className="space-y-1.5">
            <Label htmlFor="brand-annual-revenue">Annual Revenue</Label>
            <Input
              id="brand-annual-revenue"
              placeholder="e.g. $75B"
              {...register("annual_revenue")}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="brand-notes">Notes</Label>
            <Textarea
              id="brand-notes"
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
              {isPending && <Loader2Icon className="size-4 mr-1 animate-spin" />}
              {isEditing ? "Update Brand" : "Create Brand"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
