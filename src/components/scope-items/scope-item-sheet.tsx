"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GradientIcon, StatusBadge } from "@/components/ui/ui-helpers";
import { toast } from "sonner";
import {
  ClipboardListIcon,
  SaveIcon,
  PlusIcon,
  FactoryIcon,
  ShoppingCartIcon,
  FileIcon,
  PackageIcon,
  CheckCircleIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ScopeItemImageUpload } from "@/components/scope-items/scope-item-image-upload";
import type { ItemPath, ItemStatus } from "@/types/database";

interface ScopeItemSheetProps {
  projectId: string;
  projectCurrency?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pass itemId to edit an existing item (will fetch complete data) */
  itemId?: string | null;
  onSuccess?: () => void;
  /** When true, shows view-only mode with no pricing info (for clients) */
  isClient?: boolean;
}

interface ScopeItemData {
  id: string;
  item_code: string;
  name: string;
  description: string | null;
  unit: string;
  quantity: number;
  unit_cost: number | null;
  unit_sales_price: number | null;
  item_path: string;
  status: string;
  notes: string | null;
  images: string[] | null;
  production_percentage: number;
  is_installed: boolean;
  installed_at: string | null;
}

interface Drawing {
  id: string;
  status: string;
  current_revision: string | null;
}

interface Material {
  id: string;
  material_code: string;
  name: string;
}

const unitOptions = [
  { value: "pcs", label: "Pieces (pcs)" },
  { value: "set", label: "Set" },
  { value: "m", label: "Meters (m)" },
  { value: "m2", label: "Square Meters (m²)" },
  { value: "m3", label: "Cubic Meters (m³)" },
  { value: "kg", label: "Kilograms (kg)" },
  { value: "lot", label: "Lot" },
];

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "in_design", label: "In Design" },
  { value: "awaiting_approval", label: "Awaiting Approval" },
  { value: "approved", label: "Approved" },
  { value: "in_production", label: "In Production" },
  { value: "complete", label: "Complete" },
  { value: "on_hold", label: "On Hold" },
  { value: "cancelled", label: "Cancelled" },
];

const currencySymbols: Record<string, string> = {
  TRY: "₺",
  USD: "$",
  EUR: "€",
};

const drawingStatusConfig: Record<string, { variant: "info" | "success" | "warning" | "default" | "danger"; label: string }> = {
  not_uploaded: { variant: "default", label: "Not Uploaded" },
  uploaded: { variant: "info", label: "Uploaded" },
  sent_to_client: { variant: "warning", label: "Sent to Client" },
  approved: { variant: "success", label: "Approved" },
  rejected: { variant: "danger", label: "Rejected" },
  approved_with_comments: { variant: "success", label: "Approved w/ Comments" },
};

export function ScopeItemSheet({
  projectId,
  projectCurrency = "TRY",
  open,
  onOpenChange,
  itemId,
  onSuccess,
  isClient = false,
}: ScopeItemSheetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!itemId;
  // Clients can only view, never edit
  const isViewOnly = isClient;

  // Form state
  const [formData, setFormData] = useState({
    item_code: "",
    name: "",
    description: "",
    unit: "pcs",
    quantity: "1",
    unit_cost: "",
    unit_sales_price: "",
    item_path: "production",
    status: "pending",
    notes: "",
  });
  const [images, setImages] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Read-only data (only for editing existing items)
  const [productionProgress, setProductionProgress] = useState(0);
  const [isInstalled, setIsInstalled] = useState(false);
  const [drawing, setDrawing] = useState<Drawing | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);

  // Fetch item data when editing
  useEffect(() => {
    if (open && itemId) {
      fetchItemData(itemId);
    } else if (open && !itemId) {
      resetForm();
    }
  }, [open, itemId]);

  const resetForm = () => {
    setFormData({
      item_code: "",
      name: "",
      description: "",
      unit: "pcs",
      quantity: "1",
      unit_cost: "",
      unit_sales_price: "",
      item_path: "production",
      status: "pending",
      notes: "",
    });
    setImages([]);
    setErrors({});
    setProductionProgress(0);
    setIsInstalled(false);
    setDrawing(null);
    setMaterials([]);
  };

  const fetchItemData = async (id: string) => {
    setIsLoading(true);
    const supabase = createClient();

    try {
      // Fetch item, drawing, and materials in parallel
      const [itemResult, drawingResult, itemMaterialsResult] = await Promise.all([
        supabase
          .from("scope_items")
          .select(`
            id, item_code, name, description, unit, quantity,
            unit_cost, unit_sales_price, item_path, status,
            notes, images, production_percentage, is_installed, installed_at
          `)
          .eq("id", id)
          .single(),
        supabase
          .from("drawings")
          .select("id, status, current_revision")
          .eq("item_id", id)
          .maybeSingle(),
        supabase
          .from("item_materials")
          .select("material_id")
          .eq("item_id", id),
      ]);

      if (itemResult.error) throw itemResult.error;

      if (itemResult.data) {
        const item = itemResult.data as ScopeItemData;
        setFormData({
          item_code: item.item_code || "",
          name: item.name || "",
          description: item.description || "",
          unit: item.unit || "pcs",
          quantity: item.quantity?.toString() || "1",
          unit_cost: item.unit_cost?.toString() || "",
          unit_sales_price: item.unit_sales_price?.toString() || "",
          item_path: item.item_path || "production",
          status: item.status || "pending",
          notes: item.notes || "",
        });
        setImages(item.images || []);
        setProductionProgress(item.production_percentage || 0);
        setIsInstalled(item.is_installed || false);
      }

      if (drawingResult.data) {
        setDrawing(drawingResult.data as Drawing);
      }

      // Fetch materials if there are any
      if (itemMaterialsResult.data && itemMaterialsResult.data.length > 0) {
        const materialIds = itemMaterialsResult.data.map((im) => im.material_id);
        const { data: materialsData } = await supabase
          .from("materials")
          .select("id, material_code, name")
          .in("id", materialIds);

        if (materialsData) {
          setMaterials(materialsData as Material[]);
        }
      }
    } catch (error) {
      console.error("Error fetching item:", error);
      toast.error("Failed to load item data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.item_code.trim()) {
      newErrors.item_code = "Item code is required";
    }

    if (!formData.name.trim()) {
      newErrors.name = "Item name is required";
    }

    const quantity = parseInt(formData.quantity);
    if (isNaN(quantity) || quantity < 1) {
      newErrors.quantity = "Quantity must be at least 1";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    startTransition(async () => {
      try {
        const supabase = createClient();

        const quantity = parseInt(formData.quantity) || 1;
        const unitCost = formData.unit_cost ? parseFloat(formData.unit_cost) : null;
        const unitSalesPrice = formData.unit_sales_price ? parseFloat(formData.unit_sales_price) : null;

        // Base item data - shared fields for both insert and update
        // NOTE: initial_total_cost is intentionally excluded here
        // It should only be set once during item creation, never updated
        const baseItemData = {
          item_code: formData.item_code.trim(),
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          unit: formData.unit,
          quantity,
          unit_cost: unitCost,
          unit_sales_price: unitSalesPrice,
          total_sales_price: unitSalesPrice ? unitSalesPrice * quantity : null,
          item_path: formData.item_path as ItemPath,
          status: formData.status as ItemStatus,
          notes: formData.notes.trim() || null,
          images: images.length > 0 ? images : null,
        };

        if (isEditing && itemId) {
          // UPDATE: Do NOT touch initial_total_cost - preserve the original baseline
          const { error } = await supabase
            .from("scope_items")
            .update(baseItemData)
            .eq("id", itemId);

          if (error) throw error;
          toast.success("Scope item updated");
        } else {
          // INSERT: Set initial_total_cost once at creation time
          const { error } = await supabase.from("scope_items").insert({
            ...baseItemData,
            project_id: projectId,
            initial_total_cost: unitCost ? unitCost * quantity : null,
          });

          if (error) throw error;
          toast.success("Scope item created");
        }

        onOpenChange(false);
        router.refresh();
        onSuccess?.();
      } catch (error) {
        console.error("Error saving scope item:", error);
        toast.error(isEditing ? "Failed to update scope item" : "Failed to create scope item");
      }
    });
  };

  const currencySymbol = currencySymbols[projectCurrency] || "$";

  // Calculate totals
  const quantity = parseInt(formData.quantity) || 0;
  const unitCost = parseFloat(formData.unit_cost) || 0;
  const unitSalesPrice = parseFloat(formData.unit_sales_price) || 0;
  const totalCost = unitCost * quantity;
  const totalSalesPrice = unitSalesPrice * quantity;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0 h-full">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-violet-50 to-purple-50 shrink-0">
          <div className="flex items-center gap-3">
            <GradientIcon icon={<ClipboardListIcon className="size-5" />} color="violet" size="sm" />
            <div>
              <SheetTitle className="text-lg">
                {isViewOnly ? "View Scope Item" : isEditing ? "Edit Scope Item" : "Add Scope Item"}
              </SheetTitle>
              <SheetDescription>
                {isEditing || isViewOnly
                  ? `${formData.item_code} • ${formData.name}`
                  : "Add a new item to this project"}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Scrollable Content */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Spinner className="size-8" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-5 p-6">
              {/* Item Code & Name */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="item_code" className="text-sm font-medium">
                    Item Code {!isViewOnly && <span className="text-red-500">*</span>}
                  </Label>
                  <Input
                    id="item_code"
                    placeholder="e.g., ITEM-001"
                    value={formData.item_code}
                    onChange={(e) => handleChange("item_code", e.target.value)}
                    className={`font-mono ${errors.item_code ? "border-red-500" : ""}`}
                    disabled={isViewOnly}
                  />
                  {errors.item_code && (
                    <p className="text-xs text-red-500">{errors.item_code}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Name {!isViewOnly && <span className="text-red-500">*</span>}
                  </Label>
                  <Input
                    id="name"
                    placeholder="Item name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    className={errors.name ? "border-red-500" : ""}
                    disabled={isViewOnly}
                  />
                  {errors.name && (
                    <p className="text-xs text-red-500">{errors.name}</p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Item description..."
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  rows={2}
                  className="resize-none"
                  disabled={isViewOnly}
                />
              </div>

              {/* Path & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Item Path</Label>
                  <Select
                    value={formData.item_path}
                    onValueChange={(value) => handleChange("item_path", value)}
                    disabled={isViewOnly}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="production">
                        <div className="flex items-center gap-2">
                          <FactoryIcon className="size-4 text-violet-500" />
                          Production
                        </div>
                      </SelectItem>
                      <SelectItem value="procurement">
                        <div className="flex items-center gap-2">
                          <ShoppingCartIcon className="size-4 text-amber-500" />
                          Procurement
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleChange("status", value)}
                    disabled={isViewOnly}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Unit & Quantity */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Unit</Label>
                  <Select
                    value={formData.unit}
                    onValueChange={(value) => handleChange("unit", value)}
                    disabled={isViewOnly}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {unitOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity" className="text-sm font-medium">
                    Quantity {!isViewOnly && <span className="text-red-500">*</span>}
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => handleChange("quantity", e.target.value)}
                    className={errors.quantity ? "border-red-500" : ""}
                    disabled={isViewOnly}
                  />
                  {errors.quantity && (
                    <p className="text-xs text-red-500">{errors.quantity}</p>
                  )}
                </div>
              </div>

              {/* Pricing - Hidden from clients */}
              {!isClient && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Pricing</Label>
                    <span className="text-xs px-2 py-1 rounded-full bg-muted font-medium">
                      {projectCurrency} ({currencySymbol})
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Input
                        id="unit_cost"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Unit cost"
                        value={formData.unit_cost}
                        onChange={(e) => handleChange("unit_cost", e.target.value)}
                        disabled={isViewOnly}
                      />
                      <p className="text-xs text-muted-foreground">Our cost per unit</p>
                    </div>

                    <div className="space-y-1">
                      <Input
                        id="unit_sales_price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Sales price"
                        value={formData.unit_sales_price}
                        onChange={(e) => handleChange("unit_sales_price", e.target.value)}
                        disabled={isViewOnly}
                      />
                      <p className="text-xs text-muted-foreground">Client pays per unit</p>
                    </div>
                  </div>

                  {/* Totals */}
                  {(totalCost > 0 || totalSalesPrice > 0) && (
                    <div className="p-3 rounded-lg bg-muted/50 grid grid-cols-2 gap-4 text-sm">
                      {totalCost > 0 && (
                        <div>
                          <span className="text-muted-foreground">Total Cost:</span>
                          <span className="ml-2 font-medium text-red-600">
                            {currencySymbol}{totalCost.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {totalSalesPrice > 0 && (
                        <div>
                          <span className="text-muted-foreground">Total Price:</span>
                          <span className="ml-2 font-medium text-green-600">
                            {currencySymbol}{totalSalesPrice.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes..."
                  value={formData.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  rows={2}
                  className="resize-none"
                  disabled={isViewOnly}
                />
              </div>

              {/* Images - show as view-only for clients */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Images</Label>
                {isViewOnly ? (
                  images.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {images.map((url, idx) => (
                        <img
                          key={idx}
                          src={url}
                          alt={`Item image ${idx + 1}`}
                          className="w-20 h-20 object-cover rounded-lg border"
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No images</p>
                  )
                ) : (
                  <ScopeItemImageUpload
                    images={images}
                    onChange={setImages}
                  />
                )}
              </div>

              {/* Read-only Status Section (only shown when editing) */}
              {isEditing && (
                <>
                  <Separator />

                  <div className="space-y-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Current Status
                    </p>

                    {/* Production Progress */}
                    {formData.item_path === "production" && (
                      <div className="p-3 rounded-lg bg-violet-50 border border-violet-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-violet-700">
                            <FactoryIcon className="size-4" />
                            <span className="text-sm font-medium">Production Progress</span>
                          </div>
                          <span className="text-sm font-bold text-violet-700">
                            {productionProgress}%
                          </span>
                        </div>
                        <Progress value={productionProgress} className="h-2" />
                      </div>
                    )}

                    {/* Drawing Status */}
                    {formData.item_path === "production" && (
                      <div className="p-3 rounded-lg bg-sky-50 border border-sky-100">
                        <div className="flex items-center gap-2 mb-2 text-sky-700">
                          <FileIcon className="size-4" />
                          <span className="text-sm font-medium">Drawing</span>
                        </div>
                        {drawing ? (
                          <div className="flex items-center gap-2">
                            <StatusBadge
                              variant={drawingStatusConfig[drawing.status]?.variant || "default"}
                            >
                              {drawingStatusConfig[drawing.status]?.label || drawing.status}
                            </StatusBadge>
                            {drawing.current_revision && (
                              <span className="text-xs text-muted-foreground">
                                Rev {drawing.current_revision}
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No drawing uploaded</p>
                        )}
                      </div>
                    )}

                    {/* Materials */}
                    {materials.length > 0 && (
                      <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                        <div className="flex items-center gap-2 mb-2 text-amber-700">
                          <PackageIcon className="size-4" />
                          <span className="text-sm font-medium">Materials ({materials.length})</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {materials.map((mat) => (
                            <Badge key={mat.id} variant="outline" className="text-xs bg-white">
                              {mat.material_code}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Installation Status */}
                    <div className="p-3 rounded-lg bg-muted/50 border">
                      <div className="flex items-center gap-2">
                        <CheckCircleIcon className={`size-4 ${isInstalled ? "text-emerald-600" : "text-muted-foreground"}`} />
                        <span className="text-sm font-medium">
                          {isInstalled ? "Installed" : "Not Installed"}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <SheetFooter className="px-6 py-4 border-t bg-muted/30 shrink-0">
          {isViewOnly ? (
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Close
            </Button>
          ) : (
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending || isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isPending || isLoading || !formData.item_code.trim() || !formData.name.trim()}
                className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
              >
                {isPending ? (
                  <Spinner className="size-4 mr-2" />
                ) : isEditing ? (
                  <SaveIcon className="size-4 mr-2" />
                ) : (
                  <PlusIcon className="size-4 mr-2" />
                )}
                {isEditing ? "Save Changes" : "Add Item"}
              </Button>
            </div>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
