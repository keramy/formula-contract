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
  TruckIcon,
  WrenchIcon,
  CheckCircleIcon,
  DownloadIcon,
  FileTextIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ScopeItemImageUpload } from "@/components/scope-items/scope-item-image-upload";
import { InstallationStatusEditor } from "@/components/scope-items/installation-status-editor";
import { InstallationStartedEditor } from "@/components/scope-items/installation-started-editor";
import { ShippedStatusEditor } from "@/components/scope-items/shipped-status-editor";
import { ProductionProgressEditor } from "@/components/scope-items/production-progress-editor";
import { DrawingApproval } from "@/components/drawings";
import type { ItemPath, ItemStatus, UserRole } from "@/types/database";

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
  /** User role for permission checks (e.g., showing drawing actions) */
  userRole?: UserRole;
}

interface ScopeItemData {
  id: string;
  item_code: string;
  name: string;
  description: string | null;
  unit: string;
  quantity: number;
  // Initial cost (budgeted, set once at creation)
  initial_unit_cost: number | null;
  initial_total_cost: number | null;
  // Actual cost (entered manually later)
  actual_unit_cost: number | null;
  actual_total_cost: number | null;
  // Sales price
  unit_sales_price: number | null;
  total_sales_price: number | null;
  item_path: string;
  status: string;
  notes: string | null;
  images: string[] | null;
  production_percentage: number;
  is_shipped: boolean;
  shipped_at: string | null;
  is_installation_started: boolean;
  installation_started_at: string | null;
  is_installed: boolean;
  installed_at: string | null;
}

interface DrawingRevision {
  id: string;
  revision: string;
  file_url: string;
  file_name: string;
  cad_file_url: string | null;
  cad_file_name: string | null;
}

interface Drawing {
  id: string;
  status: string;
  current_revision: string | null;
  revisions: DrawingRevision[];
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
  not_required: { variant: "default", label: "Not Required" },
};

export function ScopeItemSheet({
  projectId,
  projectCurrency = "TRY",
  open,
  onOpenChange,
  itemId,
  onSuccess,
  isClient = false,
  userRole = "pm",
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
    initial_unit_cost: "",
    actual_unit_cost: "",
    unit_sales_price: "",
    item_path: "production",
    status: "pending",
    notes: "",
  });
  // Store original initial costs (read-only after creation)
  const [initialCostLocked, setInitialCostLocked] = useState({
    unit_cost: null as number | null,
    total_cost: null as number | null,
  });
  const [images, setImages] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Read-only data (only for editing existing items)
  const [productionProgress, setProductionProgress] = useState(0);
  const [isShipped, setIsShipped] = useState(false);
  const [shippedAt, setShippedAt] = useState<string | null>(null);
  const [isInstallationStarted, setIsInstallationStarted] = useState(false);
  const [installationStartedAt, setInstallationStartedAt] = useState<string | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installedAt, setInstalledAt] = useState<string | null>(null);
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
      initial_unit_cost: "",
      actual_unit_cost: "",
      unit_sales_price: "",
      item_path: "production",
      status: "pending",
      notes: "",
    });
    setInitialCostLocked({ unit_cost: null, total_cost: null });
    setImages([]);
    setErrors({});
    setProductionProgress(0);
    setIsShipped(false);
    setShippedAt(null);
    setIsInstallationStarted(false);
    setInstallationStartedAt(null);
    setIsInstalled(false);
    setInstalledAt(null);
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
            initial_unit_cost, initial_total_cost, actual_unit_cost, actual_total_cost,
            unit_sales_price, total_sales_price, item_path, status,
            notes, images, production_percentage, is_shipped, shipped_at,
            is_installation_started, installation_started_at, is_installed, installed_at
          `)
          .eq("id", id)
          .single(),
        supabase
          .from("drawings")
          .select("id, status, current_revision, revisions:drawing_revisions(id, revision, file_url, file_name, cad_file_url, cad_file_name)")
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
          initial_unit_cost: item.initial_unit_cost?.toString() || "",
          actual_unit_cost: item.actual_unit_cost?.toString() || "",
          unit_sales_price: item.unit_sales_price?.toString() || "",
          item_path: item.item_path || "production",
          status: item.status || "pending",
          notes: item.notes || "",
        });
        // Lock initial costs - they're read-only after creation
        setInitialCostLocked({
          unit_cost: item.initial_unit_cost,
          total_cost: item.initial_total_cost,
        });
        setImages(item.images || []);
        setProductionProgress(item.production_percentage || 0);
        setIsShipped(item.is_shipped || false);
        setShippedAt(item.shipped_at || null);
        setIsInstallationStarted(item.is_installation_started || false);
        setInstallationStartedAt(item.installation_started_at || null);
        setIsInstalled(item.is_installed || false);
        setInstalledAt(item.installed_at || null);
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
        const initialUnitCost = formData.initial_unit_cost ? parseFloat(formData.initial_unit_cost) : null;
        const actualUnitCost = formData.actual_unit_cost ? parseFloat(formData.actual_unit_cost) : null;
        const unitSalesPrice = formData.unit_sales_price ? parseFloat(formData.unit_sales_price) : null;

        if (isEditing && itemId) {
          // UPDATE: Do NOT touch initial costs - they're locked after creation
          // Only update: actual costs, sales prices, and other editable fields
          const updateData = {
            item_code: formData.item_code.trim(),
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            unit: formData.unit,
            quantity,
            // Actual cost (editable)
            actual_unit_cost: actualUnitCost,
            actual_total_cost: actualUnitCost ? actualUnitCost * quantity : null,
            // Sales price (editable)
            unit_sales_price: unitSalesPrice,
            total_sales_price: unitSalesPrice ? unitSalesPrice * quantity : null,
            item_path: formData.item_path as ItemPath,
            status: formData.status as ItemStatus,
            notes: formData.notes.trim() || null,
            images: images.length > 0 ? images : null,
          };

          const { error } = await supabase
            .from("scope_items")
            .update(updateData)
            .eq("id", itemId);

          if (error) throw error;
          toast.success("Scope item updated");
        } else {
          // INSERT: Set initial costs once at creation time (locked forever after)
          const insertData = {
            project_id: projectId,
            item_code: formData.item_code.trim(),
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            unit: formData.unit,
            quantity,
            // Initial cost (set once, never changes)
            initial_unit_cost: initialUnitCost,
            initial_total_cost: initialUnitCost ? initialUnitCost * quantity : null,
            // Sales price
            unit_sales_price: unitSalesPrice,
            total_sales_price: unitSalesPrice ? unitSalesPrice * quantity : null,
            // Actual cost NOT set during creation - entered later
            item_path: formData.item_path as ItemPath,
            status: formData.status as ItemStatus,
            notes: formData.notes.trim() || null,
            images: images.length > 0 ? images : null,
          };

          const { error } = await supabase.from("scope_items").insert(insertData);

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
  const initialUnitCost = parseFloat(formData.initial_unit_cost) || 0;
  const actualUnitCost = parseFloat(formData.actual_unit_cost) || 0;
  const unitSalesPrice = parseFloat(formData.unit_sales_price) || 0;
  const initialTotalCost = initialUnitCost * quantity;
  const actualTotalCost = actualUnitCost * quantity;
  const totalSalesPrice = unitSalesPrice * quantity;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0 h-full">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b bg-base-50 shrink-0">
          <div className="flex items-center gap-3">
            <GradientIcon icon={<ClipboardListIcon className="size-5" />} color="primary" size="sm" />
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
                          <FactoryIcon className="size-4 text-primary" />
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
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Pricing</Label>
                    <span className="text-xs px-2 py-1 rounded-full bg-muted font-medium">
                      {projectCurrency} ({currencySymbol})
                    </span>
                  </div>

                  {/* Initial Cost - Editable only when creating, read-only when editing */}
                  <div className="p-3 rounded-lg border bg-blue-50/50 space-y-2">
                    <p className="text-xs font-medium text-blue-700">
                      Initial Cost {isEditing && "(Locked)"}
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Input
                          id="initial_unit_cost"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Unit cost"
                          value={isEditing ? (initialCostLocked.unit_cost?.toString() || "") : formData.initial_unit_cost}
                          onChange={(e) => handleChange("initial_unit_cost", e.target.value)}
                          disabled={isViewOnly || isEditing}
                          className={isEditing ? "bg-muted" : ""}
                        />
                        <p className="text-xs text-muted-foreground">Per unit</p>
                      </div>
                      <div className="space-y-1">
                        <Input
                          type="text"
                          value={isEditing
                            ? (initialCostLocked.total_cost ? `${currencySymbol}${initialCostLocked.total_cost.toLocaleString()}` : "-")
                            : (initialTotalCost > 0 ? `${currencySymbol}${initialTotalCost.toLocaleString()}` : "-")
                          }
                          disabled
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">Total (auto)</p>
                      </div>
                    </div>
                  </div>

                  {/* Actual Cost - Only shown when editing */}
                  {isEditing && (
                    <div className="p-3 rounded-lg border bg-amber-50/50 space-y-2">
                      <p className="text-xs font-medium text-amber-700">Actual Cost</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Input
                            id="actual_unit_cost"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Actual unit cost"
                            value={formData.actual_unit_cost}
                            onChange={(e) => handleChange("actual_unit_cost", e.target.value)}
                            disabled={isViewOnly}
                          />
                          <p className="text-xs text-muted-foreground">Per unit</p>
                        </div>
                        <div className="space-y-1">
                          <Input
                            type="text"
                            value={actualTotalCost > 0 ? `${currencySymbol}${actualTotalCost.toLocaleString()}` : "-"}
                            disabled
                            className="bg-muted"
                          />
                          <p className="text-xs text-muted-foreground">Total (auto)</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sales Price */}
                  <div className="p-3 rounded-lg border bg-green-50/50 space-y-2">
                    <p className="text-xs font-medium text-green-700">Sales Price</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Input
                          id="unit_sales_price"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Unit price"
                          value={formData.unit_sales_price}
                          onChange={(e) => handleChange("unit_sales_price", e.target.value)}
                          disabled={isViewOnly}
                        />
                        <p className="text-xs text-muted-foreground">Per unit</p>
                      </div>
                      <div className="space-y-1">
                        <Input
                          type="text"
                          value={totalSalesPrice > 0 ? `${currencySymbol}${totalSalesPrice.toLocaleString()}` : "-"}
                          disabled
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">Total (auto)</p>
                      </div>
                    </div>
                  </div>
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
                    projectId={projectId}
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

                    {/* Production Progress - Editable */}
                    {formData.item_path === "production" && (
                      <div className="p-3 rounded-lg bg-primary-50 border border-primary-100">
                        <div className="flex items-center gap-2 mb-2 text-primary-700">
                          <FactoryIcon className="size-4" />
                          <span className="text-sm font-medium">Production Progress</span>
                        </div>
                        <ProductionProgressEditor
                          projectId={projectId}
                          scopeItemId={itemId!}
                          initialValue={productionProgress}
                          readOnly={isViewOnly}
                        />
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
                          <div className="space-y-2">
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
                            {/* File download links for the current revision */}
                            {drawing.revisions && drawing.revisions.length > 0 && (() => {
                              const currentRev = drawing.revisions.find(
                                r => r.revision === drawing.current_revision
                              ) || drawing.revisions[drawing.revisions.length - 1];
                              return (
                                <div className="flex flex-wrap gap-2">
                                  <a
                                    href={currentRev.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-white border border-sky-200 text-sky-700 hover:bg-sky-50 transition-colors"
                                  >
                                    <FileTextIcon className="size-3.5" />
                                    View Drawing PDF
                                    <DownloadIcon className="size-3" />
                                  </a>
                                  {currentRev.cad_file_url && (
                                    <a
                                      href={currentRev.cad_file_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                      <FileIcon className="size-3.5" />
                                      Download CAD
                                      <DownloadIcon className="size-3" />
                                    </a>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No drawing uploaded</p>
                        )}
                        {/* Drawing Actions - for PM/Admin */}
                        {itemId && (
                          <div className="mt-2">
                            <DrawingApproval
                              drawingId={drawing?.id || null}
                              drawingStatus={drawing?.status || "not_uploaded"}
                              currentRevision={drawing?.current_revision || null}
                              scopeItemId={itemId}
                              userRole={isClient ? "client" : userRole}
                              projectId={projectId}
                              itemCode={formData.item_code}
                              onStatusChange={(newStatus) => {
                                // Sync local form state with DB change to prevent overwriting on save
                                setFormData((prev) => ({ ...prev, status: newStatus }));
                                // Refetch to get updated drawing data
                                fetchItemData(itemId);
                              }}
                            />
                          </div>
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

                    {/* Shipped Status - Interactive toggle */}
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                      <div className="flex items-center gap-2 mb-2 text-blue-700">
                        <TruckIcon className="size-4" />
                        <span className="text-sm font-medium">Shipping Status</span>
                      </div>
                      <ShippedStatusEditor
                        projectId={projectId}
                        scopeItemId={itemId!}
                        isShipped={isShipped}
                        shippedAt={shippedAt}
                        readOnly={isViewOnly}
                      />
                    </div>

                    {/* Installation Started - Interactive toggle */}
                    <div className="p-3 rounded-lg bg-primary-50 border border-primary-100">
                      <div className="flex items-center gap-2 mb-2 text-primary-700">
                        <WrenchIcon className="size-4" />
                        <span className="text-sm font-medium">Installation Progress</span>
                      </div>
                      <InstallationStartedEditor
                        projectId={projectId}
                        scopeItemId={itemId!}
                        isInstallationStarted={isInstallationStarted}
                        installationStartedAt={installationStartedAt}
                        readOnly={isViewOnly}
                      />
                    </div>

                    {/* Installation Completed - Interactive toggle */}
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                      <div className="flex items-center gap-2 mb-2 text-emerald-700">
                        <CheckCircleIcon className="size-4" />
                        <span className="text-sm font-medium">Installation Complete</span>
                      </div>
                      <InstallationStatusEditor
                        projectId={projectId}
                        scopeItemId={itemId!}
                        isInstalled={isInstalled}
                        installedAt={installedAt}
                        readOnly={isViewOnly}
                      />
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
                className="flex-1"
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
