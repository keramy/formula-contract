"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  MoreHorizontalIcon,
  PencilIcon,
  TrashIcon,
  ClipboardListIcon,
  FactoryIcon,
  ShoppingCartIcon,
  ImageIcon,
  ChevronDownIcon,
  XIcon,
  PackageIcon,
  CheckCircle2Icon,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GlassCard, EmptyState, StatusBadge } from "@/components/ui/ui-helpers";

interface ScopeItem {
  id: string;
  item_code: string;
  name: string;
  item_path: "production" | "procurement";
  status: string;
  quantity: number;
  unit: string;
  unit_price: number | null;
  total_price: number | null;
  production_percentage: number;
  is_installed: boolean;
  images: string[] | null;
}

interface Material {
  id: string;
  material_code: string;
  name: string;
}

interface ScopeItemsTableProps {
  projectId: string;
  items: ScopeItem[];
  materials: Material[];
  currency?: string;
}

const currencySymbols: Record<string, string> = {
  TRY: "₺",
  USD: "$",
  EUR: "€",
};

const statusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  in_design: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  awaiting_approval: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  in_production: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  complete: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  on_hold: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  in_design: "In Design",
  awaiting_approval: "Awaiting Approval",
  approved: "Approved",
  in_production: "In Production",
  complete: "Complete",
  on_hold: "On Hold",
  cancelled: "Cancelled",
};

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

const unitOptions = [
  { value: "pcs", label: "pcs" },
  { value: "set", label: "set" },
  { value: "m", label: "m" },
  { value: "m2", label: "m²" },
  { value: "lot", label: "lot" },
];

export function ScopeItemsTable({ projectId, items, materials, currency = "TRY" }: ScopeItemsTableProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isUpdating, setIsUpdating] = useState(false);

  // Dialog states for numeric inputs
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [quantityDialogOpen, setQuantityDialogOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  // Materials dialog state
  const [materialsDialogOpen, setMaterialsDialogOpen] = useState(false);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<string>>(new Set());

  const isAllSelected = items.length > 0 && selectedIds.size === items.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < items.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(item => item.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const bulkUpdate = async (field: string, value: unknown) => {
    if (selectedIds.size === 0) return;

    setIsUpdating(true);
    try {
      const supabase = createClient();
      const ids = Array.from(selectedIds);

      const { error } = await supabase
        .from("scope_items")
        .update({ [field]: value })
        .in("id", ids);

      if (error) throw error;

      setSelectedIds(new Set());
      router.refresh();
    } catch (error) {
      console.error("Bulk update failed:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePriceSubmit = () => {
    const price = parseFloat(inputValue);
    if (!isNaN(price) && price >= 0) {
      bulkUpdate("unit_price", price);
    }
    setPriceDialogOpen(false);
    setInputValue("");
  };

  const handleQuantitySubmit = () => {
    const qty = parseInt(inputValue);
    if (!isNaN(qty) && qty >= 1) {
      bulkUpdate("quantity", qty);
    }
    setQuantityDialogOpen(false);
    setInputValue("");
  };

  const toggleMaterialSelection = (materialId: string) => {
    const newSelected = new Set(selectedMaterialIds);
    if (newSelected.has(materialId)) {
      newSelected.delete(materialId);
    } else {
      newSelected.add(materialId);
    }
    setSelectedMaterialIds(newSelected);
  };

  const handleMaterialsSubmit = async () => {
    if (selectedIds.size === 0 || selectedMaterialIds.size === 0) return;

    setIsUpdating(true);
    try {
      const supabase = createClient();
      const itemIds = Array.from(selectedIds);
      const materialIds = Array.from(selectedMaterialIds);

      // Create assignments for all combinations
      const assignments: { item_id: string; material_id: string }[] = [];
      for (const itemId of itemIds) {
        for (const materialId of materialIds) {
          assignments.push({ item_id: itemId, material_id: materialId });
        }
      }

      // Upsert to avoid duplicates (using onConflict would be ideal but let's do it safely)
      for (const assignment of assignments) {
        // Check if assignment exists
        const { data: existing } = await supabase
          .from("item_materials")
          .select("id")
          .eq("item_id", assignment.item_id)
          .eq("material_id", assignment.material_id)
          .single();

        if (!existing) {
          await supabase.from("item_materials").insert(assignment);
        }
      }

      setSelectedIds(new Set());
      setSelectedMaterialIds(new Set());
      setMaterialsDialogOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Material assignment failed:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (items.length === 0) {
    return (
      <GlassCard>
        <EmptyState
          icon={<ClipboardListIcon className="size-8" />}
          title="No scope items"
          description="Add scope items to track production and procurement for this project."
          action={
            <Button asChild className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700">
              <Link href={`/projects/${projectId}/scope/new`}>Add Scope Item</Link>
            </Button>
          }
        />
      </GlassCard>
    );
  }

  const formatCurrency = (value: number | null) => {
    if (!value) return "-";
    const symbol = currencySymbols[currency] || currency;
    return `${symbol}${new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)}`;
  };

  return (
    <div className="space-y-2">
      {/* Selection Toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 border rounded-lg">
          <div className="flex items-center gap-2">
            <Checkbox checked={true} />
            <span className="text-sm font-medium">
              {selectedIds.size} item{selectedIds.size > 1 ? "s" : ""} selected
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {isUpdating && <Spinner className="size-4" />}

            {/* Bulk Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isUpdating}>
                  Bulk Actions
                  <ChevronDownIcon className="size-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {/* Status submenu */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Change Status</DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      {statusOptions.map((status) => (
                        <DropdownMenuItem
                          key={status.value}
                          onClick={() => bulkUpdate("status", status.value)}
                        >
                          <Badge variant="secondary" className={`${statusColors[status.value]} mr-2`}>
                            {status.label}
                          </Badge>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>

                {/* Path submenu */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Change Path</DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => bulkUpdate("item_path", "production")}>
                        <FactoryIcon className="size-4 mr-2 text-purple-500" />
                        Production
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => bulkUpdate("item_path", "procurement")}>
                        <ShoppingCartIcon className="size-4 mr-2 text-blue-500" />
                        Procurement
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>

                {/* Unit submenu */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Change Unit</DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      {unitOptions.map((unit) => (
                        <DropdownMenuItem
                          key={unit.value}
                          onClick={() => bulkUpdate("unit", unit.value)}
                        >
                          {unit.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>

                <DropdownMenuSeparator />

                {/* Price and Quantity dialogs */}
                <DropdownMenuItem onClick={() => setPriceDialogOpen(true)}>
                  Set Unit Price
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setQuantityDialogOpen(true)}>
                  Set Quantity
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => bulkUpdate("is_installed", true)}>
                  <CheckCircle2Icon className="size-4 mr-2 text-green-600" />
                  Mark as Installed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => bulkUpdate("is_installed", false)}>
                  <XIcon className="size-4 mr-2" />
                  Mark as Not Installed
                </DropdownMenuItem>

                {materials.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => {
                      setSelectedMaterialIds(new Set());
                      setMaterialsDialogOpen(true);
                    }}>
                      <PackageIcon className="size-4 mr-2" />
                      Assign Materials
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="sm" onClick={clearSelection} disabled={isUpdating}>
              <XIcon className="size-4" />
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <GlassCard className="py-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-gray-100">
              <TableHead className="w-[40px] py-4">
                <Checkbox
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) {
                      (el as HTMLButtonElement & { indeterminate?: boolean }).indeterminate = isSomeSelected;
                    }
                  }}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Path</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead className="text-center">Installed</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} data-state={selectedIds.has(item.id) ? "selected" : undefined}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(item.id)}
                    onCheckedChange={() => toggleSelect(item.id)}
                  />
                </TableCell>
                <TableCell>
                  {item.images && item.images.length > 0 ? (
                    <div className="size-10 rounded overflow-hidden relative bg-muted">
                      <Image
                        src={item.images[0]}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="size-10 rounded bg-muted flex items-center justify-center">
                      <ImageIcon className="size-4 text-muted-foreground" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-mono text-sm">{item.item_code}</TableCell>
                <TableCell>
                  <Link
                    href={`/projects/${projectId}/scope/${item.id}`}
                    className="font-medium hover:underline"
                  >
                    {item.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {item.item_path === "production" ? (
                      <FactoryIcon className="size-3.5 text-purple-500" />
                    ) : (
                      <ShoppingCartIcon className="size-3.5 text-blue-500" />
                    )}
                    <span className="text-xs capitalize">{item.item_path}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={statusColors[item.status]}>
                    {statusLabels[item.status] || item.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {item.quantity} {item.unit}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatCurrency(item.unit_price)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatCurrency(item.total_price)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 min-w-[100px]">
                    <Progress value={item.production_percentage} className="h-2" />
                    <span className="text-xs text-muted-foreground w-8">
                      {item.production_percentage}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {item.is_installed ? (
                    <CheckCircle2Icon className="size-5 text-green-600 mx-auto" />
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontalIcon className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/projects/${projectId}/scope/${item.id}`}>
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/projects/${projectId}/scope/${item.id}/edit`}>
                          <PencilIcon className="size-4 mr-2" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive">
                        <TrashIcon className="size-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </GlassCard>

      {/* Unit Price Dialog */}
      <Dialog open={priceDialogOpen} onOpenChange={setPriceDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Set Unit Price</DialogTitle>
            <DialogDescription>
              Set the unit price for {selectedIds.size} selected item{selectedIds.size > 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="price">Unit Price ({currency})</Label>
            <Input
              id="price"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePriceSubmit()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPriceDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePriceSubmit} disabled={!inputValue}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quantity Dialog */}
      <Dialog open={quantityDialogOpen} onOpenChange={setQuantityDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Set Quantity</DialogTitle>
            <DialogDescription>
              Set the quantity for {selectedIds.size} selected item{selectedIds.size > 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              step="1"
              placeholder="1"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleQuantitySubmit()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuantityDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleQuantitySubmit} disabled={!inputValue}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Materials Assignment Dialog */}
      <Dialog open={materialsDialogOpen} onOpenChange={setMaterialsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Materials</DialogTitle>
            <DialogDescription>
              Select materials to assign to {selectedIds.size} selected item{selectedIds.size > 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>
          {materials.length > 0 ? (
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-1 pr-4">
                {materials.map((material) => (
                  <label
                    key={material.id}
                    className="flex items-center gap-3 p-2 hover:bg-muted rounded cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedMaterialIds.has(material.id)}
                      onCheckedChange={() => toggleMaterialSelection(material.id)}
                    />
                    <span className="font-mono text-xs text-muted-foreground">
                      {material.material_code}
                    </span>
                    <span className="text-sm truncate">{material.name}</span>
                  </label>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No materials available. Add materials from the Materials tab first.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMaterialsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleMaterialsSubmit}
              disabled={isUpdating || selectedMaterialIds.size === 0}
            >
              {isUpdating && <Spinner className="size-4 mr-2" />}
              Assign {selectedMaterialIds.size > 0 ? `(${selectedMaterialIds.size})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
