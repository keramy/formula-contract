"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
import { CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { GlassCard } from "@/components/ui/ui-helpers";
import { ScopeItemImageUpload } from "@/components/scope-items";
import { AlertCircleIcon } from "lucide-react";
import {
  scopeItemSchema,
  safeValidate,
  getFirstError,
  parseOptionalNumber,
  parseIntWithDefault,
} from "@/lib/validations";
import type { ScopeItemInsert, ScopeItemUpdate } from "@/types/database";

interface ScopeItemFormProps {
  projectId: string;
  projectCurrency?: string;
  initialData?: {
    id: string;
    item_code: string;
    name: string;
    description: string | null;
    width: number | null;
    depth: number | null;
    height: number | null;
    unit: string;
    quantity: number;
    // Cost fields (what we pay)
    unit_cost: number | null;
    initial_total_cost: number | null;
    // Sales price fields (what client pays)
    unit_sales_price: number | null;
    item_path: string;
    status: string;
    notes: string | null;
    images: string[] | null;
  };
}

const currencySymbols: Record<string, string> = {
  TRY: "₺",
  USD: "$",
  EUR: "€",
};

const currencyLabels: Record<string, string> = {
  TRY: "Turkish Lira (₺)",
  USD: "US Dollar ($)",
  EUR: "Euro (€)",
};

export function ScopeItemForm({ projectId, projectCurrency = "TRY", initialData }: ScopeItemFormProps) {
  const router = useRouter();
  const isEditing = !!initialData;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [currency, setCurrency] = useState(projectCurrency);
  const [isCurrencyUpdating, setIsCurrencyUpdating] = useState(false);

  const [formData, setFormData] = useState({
    item_code: initialData?.item_code || "",
    name: initialData?.name || "",
    description: initialData?.description || "",
    // Dimensions removed from form - kept in database for backward compatibility
    unit: initialData?.unit || "pcs",
    quantity: initialData?.quantity?.toString() || "1",
    // Cost tracking (what we pay)
    unit_cost: initialData?.unit_cost?.toString() || "",
    // Sales price (what client pays) - renamed from unit_price
    unit_sales_price: initialData?.unit_sales_price?.toString() || "",
    item_path: initialData?.item_path || "production",
    status: initialData?.status || "pending",
    notes: initialData?.notes || "",
  });
  const [images, setImages] = useState<string[]>(initialData?.images || []);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleCurrencyChange = async (newCurrency: string) => {
    setIsCurrencyUpdating(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("projects")
        .update({ currency: newCurrency as "TRY" | "USD" | "EUR" })
        .eq("id", projectId);

      if (updateError) throw updateError;
      setCurrency(newCurrency);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update currency");
    } finally {
      setIsCurrencyUpdating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Prepare data for validation
    // Dimensions removed from form - preserve existing values if editing, null for new items
    const quantity = parseIntWithDefault(formData.quantity, 1);
    const unitCost = parseOptionalNumber(formData.unit_cost);

    const dataToValidate = {
      item_code: formData.item_code,
      name: formData.name,
      description: formData.description || null,
      width: initialData?.width ?? null,
      depth: initialData?.depth ?? null,
      height: initialData?.height ?? null,
      unit: formData.unit,
      quantity,
      // Cost tracking
      unit_cost: unitCost,
      // Sales price (to client)
      unit_sales_price: parseOptionalNumber(formData.unit_sales_price),
      item_path: formData.item_path,
      status: formData.status,
      notes: formData.notes || null,
      images: images.length > 0 ? images : null,
    };

    // Validate with Zod
    const validation = safeValidate(scopeItemSchema, dataToValidate);
    if (!validation.success) {
      setFieldErrors(validation.errors);
      setError(getFirstError(validation.errors));
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();

      // Calculate initial_total_cost only on first creation (not on edit)
      // This is a locked snapshot of the cost when the item was first created
      const shouldSetInitialCost = !isEditing && validation.data.unit_cost !== null;
      const initialTotalCost = shouldSetInitialCost
        ? (validation.data.unit_cost || 0) * validation.data.quantity
        : undefined;

      // Type-safe item data
      const itemData: ScopeItemInsert = {
        project_id: projectId,
        item_code: validation.data.item_code,
        name: validation.data.name,
        description: validation.data.description,
        width: validation.data.width,
        depth: validation.data.depth,
        height: validation.data.height,
        unit: validation.data.unit,
        quantity: validation.data.quantity,
        // Cost tracking
        unit_cost: validation.data.unit_cost,
        ...(initialTotalCost !== undefined && { initial_total_cost: initialTotalCost }),
        // Sales price (to client)
        unit_sales_price: validation.data.unit_sales_price,
        item_path: validation.data.item_path,
        status: validation.data.status,
        notes: validation.data.notes,
        images: validation.data.images,
      };

      if (isEditing) {
        const updateData: ScopeItemUpdate = { ...itemData };
        delete (updateData as Record<string, unknown>).project_id; // Don't update project_id

        const { error } = await supabase
          .from("scope_items")
          .update(updateData)
          .eq("id", initialData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("scope_items")
          .insert(itemData);
        if (error) throw error;
      }

      router.push(`/projects/${projectId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsLoading(false);
    }
  };

  return (
    <GlassCard>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
              <AlertCircleIcon className="size-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Item Code & Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="item_code">Item Code *</Label>
              <Input
                id="item_code"
                placeholder="e.g., ITEM-001"
                value={formData.item_code}
                onChange={(e) => handleChange("item_code", e.target.value)}
                disabled={isLoading}
                className={fieldErrors.item_code ? "border-destructive" : ""}
              />
              {fieldErrors.item_code && (
                <p className="text-xs text-destructive">{fieldErrors.item_code}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Reception Desk"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                disabled={isLoading}
                className={fieldErrors.name ? "border-destructive" : ""}
              />
              {fieldErrors.name && (
                <p className="text-xs text-destructive">{fieldErrors.name}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Item description..."
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              disabled={isLoading}
              rows={2}
            />
          </div>

          {/* Quantity & Unit */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => handleChange("quantity", e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) => handleChange("unit", value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                  <SelectItem value="set">Set</SelectItem>
                  <SelectItem value="m">Meter (m)</SelectItem>
                  <SelectItem value="m2">Square Meter (m2)</SelectItem>
                  <SelectItem value="lot">Lot</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={currency}
                onValueChange={handleCurrencyChange}
                disabled={isLoading || isCurrencyUpdating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRY">{currencyLabels.TRY}</SelectItem>
                  <SelectItem value="USD">{currencyLabels.USD}</SelectItem>
                  <SelectItem value="EUR">{currencyLabels.EUR}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Applies to all items</p>
            </div>
          </div>

          {/* Cost & Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit_cost">Unit Cost (Our Cost)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {currencySymbols[currency] || currency}
                </span>
                <Input
                  id="unit_cost"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-8"
                  value={formData.unit_cost}
                  onChange={(e) => handleChange("unit_cost", e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-muted-foreground">What we pay per unit</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit_sales_price">Unit Sales Price (Client Pays)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {currencySymbols[currency] || currency}
                </span>
                <Input
                  id="unit_sales_price"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-8"
                  value={formData.unit_sales_price}
                  onChange={(e) => handleChange("unit_sales_price", e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-muted-foreground">What client pays per unit</p>
            </div>
          </div>

          {/* Show Initial Cost info if editing and it's set */}
          {isEditing && initialData?.initial_total_cost !== null && initialData?.initial_total_cost !== undefined && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Initial Cost (locked):</span>{" "}
                <span className="font-mono">{currencySymbols[currency] || currency}{initialData.initial_total_cost.toLocaleString()}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                This is the cost snapshot when the item was first created and cannot be changed.
              </p>
            </div>
          )}

          {/* Path & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="item_path">Item Path *</Label>
              <Select
                value={formData.item_path}
                onValueChange={(value) => handleChange("item_path", value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">Production (requires drawings)</SelectItem>
                  <SelectItem value="procurement">Procurement (order tracking)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleChange("status", value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_design">In Design</SelectItem>
                  <SelectItem value="awaiting_approval">Awaiting Approval</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="in_production">In Production</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes..."
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              disabled={isLoading}
              rows={3}
            />
          </div>

          {/* Images */}
          <div className="space-y-2">
            <Label>Images</Label>
            <ScopeItemImageUpload
              images={images}
              onChange={setImages}
              disabled={isLoading}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600"
            >
              {isLoading ? (
                <>
                  <Spinner className="size-4" />
                  {isEditing ? "Updating..." : "Creating..."}
                </>
              ) : isEditing ? (
                "Update Item"
              ) : (
                "Create Item"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </GlassCard>
  );
}
