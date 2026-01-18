"use client";

import { useState, useTransition, useEffect, useCallback, useMemo, memo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { bulkUpdateScopeItems, bulkAssignMaterials, splitScopeItem, deleteScopeItem, type ScopeItemField } from "@/lib/actions/scope-items";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { Progress } from "@/components/ui/progress";
import {
  MoreHorizontalIcon,
  PencilIcon,
  TrashIcon,
  ClipboardListIcon,
  FactoryIcon,
  ShoppingCartIcon,
  ChevronDownIcon,
  XIcon,
  PackageIcon,
  CheckCircle2Icon,
  BanknoteIcon,
  BarChart3Icon,
  ListIcon,
  SplitIcon,
  SlidersHorizontalIcon,
  EyeIcon,
  EyeOffIcon,
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
  // Cost tracking fields (what WE pay)
  unit_cost: number | null;
  initial_total_cost: number | null;
  // Sales price fields (what CLIENT pays)
  unit_sales_price: number | null;
  total_sales_price: number | null;
  production_percentage: number;
  is_installed: boolean;
  images: string[] | null;
  parent_id: string | null; // References parent item when created via split
}

// Extended interface for hierarchical display
interface HierarchicalScopeItem extends ScopeItem {
  isChild: boolean;
  parentRowNumber: number | null;
  childIndex: number | null;
  displayRowNumber: string; // e.g., "14" for parents, "14.1" for children
  hasChildren: boolean; // True if this is a parent with children
  actualTotalCost: number; // Computed: sum of children's costs or own cost
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

// Status tooltips explaining what each status means
const statusTooltips: Record<string, string> = {
  pending: "Initial state - no work started yet",
  in_design: "Drawing work in progress",
  awaiting_approval: "Sent to client, waiting for response",
  approved: "Client approved the drawing",
  in_production: "Being manufactured",
  complete: "Manufacturing finished",
  on_hold: "Work paused",
  cancelled: "Item cancelled",
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

// Column visibility configuration
interface ColumnConfig {
  id: string;
  label: string;
  defaultVisible: boolean;
}

const COLUMNS: ColumnConfig[] = [
  { id: "row", label: "#", defaultVisible: true },
  { id: "code", label: "Code", defaultVisible: true },
  { id: "name", label: "Name", defaultVisible: true },
  { id: "path", label: "Path", defaultVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "quantity", label: "Qty", defaultVisible: true },
  { id: "unit_cost", label: "Unit Cost", defaultVisible: false },
  { id: "initial_cost", label: "Initial Cost", defaultVisible: false },
  { id: "actual_cost", label: "Cost", defaultVisible: true },
  { id: "sales_price", label: "Sales", defaultVisible: true },
  { id: "progress", label: "Progress", defaultVisible: true },
  { id: "installed", label: "Installed", defaultVisible: false },
];

const STORAGE_KEY = "scope-items-visible-columns";

// Get default visible columns
const getDefaultVisibleColumns = (): Set<string> => {
  return new Set(COLUMNS.filter(col => col.defaultVisible).map(col => col.id));
};

// ============================================================================
// PERFORMANCE: Memoized currency formatters (created once, reused)
// Before: new Intl.NumberFormat() created 50+ times per render
// After:  Created once per currency, cached for reuse
// ============================================================================
const currencyFormatters = new Map<string, Intl.NumberFormat>();

function getCurrencyFormatter(currency: string): Intl.NumberFormat {
  if (!currencyFormatters.has(currency)) {
    currencyFormatters.set(
      currency,
      new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }
  return currencyFormatters.get(currency)!;
}

function formatCurrencyValue(value: number | null, currency: string): string {
  if (!value) return "-";
  const symbol = currencySymbols[currency] || currency;
  return `${symbol}${getCurrencyFormatter(currency).format(value)}`;
}

/**
 * Organizes scope items into hierarchical order where children appear directly after their parent.
 * Returns items with additional hierarchy metadata for display, including computed actual costs.
 */
function organizeHierarchically(items: ScopeItem[]): HierarchicalScopeItem[] {
  // Separate items into parents (no parent_id) and children (has parent_id)
  const parents = items.filter(item => !item.parent_id);
  const childrenMap = new Map<string, ScopeItem[]>();

  // Group children by their parent_id
  for (const item of items) {
    if (item.parent_id) {
      const siblings = childrenMap.get(item.parent_id) || [];
      siblings.push(item);
      childrenMap.set(item.parent_id, siblings);
    }
  }

  // Sort children by item_code to maintain order (e.g., ITEM-001.1, ITEM-001.2)
  for (const siblings of childrenMap.values()) {
    siblings.sort((a, b) => a.item_code.localeCompare(b.item_code));
  }

  // Build hierarchical list: parent followed by its children
  const result: HierarchicalScopeItem[] = [];
  let parentRowNumber = 0;

  for (const parent of parents) {
    parentRowNumber++;
    const children = childrenMap.get(parent.id) || [];
    const hasChildren = children.length > 0;

    // Calculate actual cost: sum of children's costs if has children, else own cost
    let actualTotalCost: number;
    if (hasChildren) {
      actualTotalCost = children.reduce((sum, child) => {
        return sum + ((child.unit_cost || 0) * (child.quantity || 0));
      }, 0);
    } else {
      actualTotalCost = (parent.unit_cost || 0) * (parent.quantity || 0);
    }

    // Add parent item
    result.push({
      ...parent,
      isChild: false,
      parentRowNumber: null,
      childIndex: null,
      displayRowNumber: parentRowNumber.toString(),
      hasChildren,
      actualTotalCost,
    });

    // Add children immediately after parent
    children.forEach((child, index) => {
      const childActualCost = (child.unit_cost || 0) * (child.quantity || 0);
      result.push({
        ...child,
        isChild: true,
        parentRowNumber,
        childIndex: index + 1,
        displayRowNumber: `${parentRowNumber}.${index + 1}`,
        hasChildren: false, // Children cannot have their own children in this model
        actualTotalCost: childActualCost,
      });
    });
  }

  return result;
}

export function ScopeItemsTable({ projectId, items, materials, currency = "TRY" }: ScopeItemsTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Column visibility state - initialize from localStorage or defaults
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => getDefaultVisibleColumns());
  const [columnPopoverOpen, setColumnPopoverOpen] = useState(false);

  // Load column visibility from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        setVisibleColumns(new Set(parsed));
      }
    } catch {
      // If localStorage fails, use defaults
    }
  }, []);

  // ============================================================================
  // PERFORMANCE: Memoized callbacks to prevent unnecessary re-renders
  // ============================================================================

  // Memoized currency formatter for this component
  const formatCurrency = useCallback(
    (value: number | null) => formatCurrencyValue(value, currency),
    [currency]
  );

  // Save column visibility to localStorage when it changes
  const updateVisibleColumns = useCallback((newColumns: Set<string>) => {
    setVisibleColumns(newColumns);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(newColumns)));
    } catch {
      // localStorage might be full or disabled
    }
  }, []);

  // Toggle a single column visibility
  const toggleColumn = useCallback((columnId: string) => {
    setVisibleColumns(prev => {
      const newColumns = new Set(prev);
      if (newColumns.has(columnId)) {
        // Don't allow hiding all columns - keep at least code and name
        if (columnId !== "code" && columnId !== "name") {
          newColumns.delete(columnId);
        }
      } else {
        newColumns.add(columnId);
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(newColumns)));
      } catch {
        // localStorage might be full or disabled
      }
      return newColumns;
    });
  }, []);

  // Reset to default columns
  const resetToDefaults = useCallback(() => {
    const defaults = getDefaultVisibleColumns();
    setVisibleColumns(defaults);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(defaults)));
    } catch {
      // localStorage might be full or disabled
    }
  }, []);

  // Check if a column is visible - memoized
  const isColumnVisible = useCallback(
    (columnId: string) => visibleColumns.has(columnId),
    [visibleColumns]
  );

  // ============================================================================
  // PERFORMANCE: Memoize hierarchical items computation
  // Before: Recalculated on every render
  // After:  Only recalculated when items change
  // ============================================================================
  const hierarchicalItems = useMemo(() => organizeHierarchically(items), [items]);

  // Dialog states for numeric inputs
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [quantityDialogOpen, setQuantityDialogOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  // Materials dialog state
  const [materialsDialogOpen, setMaterialsDialogOpen] = useState(false);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<string>>(new Set());

  // Split item dialog state
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [itemToSplit, setItemToSplit] = useState<ScopeItem | null>(null);
  const [splitTargetPath, setSplitTargetPath] = useState<"production" | "procurement">("production");
  const [splitQuantity, setSplitQuantity] = useState("");
  const [splitName, setSplitName] = useState("");

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<HierarchicalScopeItem | null>(null);

  // ============================================================================
  // PERFORMANCE: Memoized selection state and handlers
  // ============================================================================

  const isAllSelected = useMemo(
    () => items.length > 0 && selectedIds.size === items.length,
    [items.length, selectedIds.size]
  );
  const isSomeSelected = useMemo(
    () => selectedIds.size > 0 && selectedIds.size < items.length,
    [selectedIds.size, items.length]
  );

  // Memoize item IDs for toggleSelectAll
  const allItemIds = useMemo(() => items.map(item => item.id), [items]);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      if (prev.size === allItemIds.length) {
        return new Set();
      }
      return new Set(allItemIds);
    });
  }, [allItemIds]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return newSelected;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const bulkUpdate = useCallback((field: ScopeItemField, value: unknown) => {
    if (selectedIds.size === 0) return;

    startTransition(async () => {
      const ids = Array.from(selectedIds);
      const result = await bulkUpdateScopeItems(projectId, ids, field, value);

      if (result.success) {
        setSelectedIds(new Set());
        router.refresh();
        toast.success(`Updated ${ids.length} item${ids.length > 1 ? "s" : ""}`);
      } else {
        toast.error(result.error || "Failed to update items");
      }
    });
  }, [selectedIds, projectId, router]);

  const handlePriceSubmit = useCallback(() => {
    const price = parseFloat(inputValue);
    if (!isNaN(price) && price >= 0) {
      bulkUpdate("unit_sales_price", price);
    }
    setPriceDialogOpen(false);
    setInputValue("");
  }, [inputValue, bulkUpdate]);

  const handleQuantitySubmit = useCallback(() => {
    const qty = parseInt(inputValue);
    if (!isNaN(qty) && qty >= 1) {
      bulkUpdate("quantity", qty);
    }
    setQuantityDialogOpen(false);
    setInputValue("");
  }, [inputValue, bulkUpdate]);

  const toggleMaterialSelection = useCallback((materialId: string) => {
    setSelectedMaterialIds(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(materialId)) {
        newSelected.delete(materialId);
      } else {
        newSelected.add(materialId);
      }
      return newSelected;
    });
  }, []);

  const handleMaterialsSubmit = useCallback(() => {
    if (selectedIds.size === 0 || selectedMaterialIds.size === 0) return;

    startTransition(async () => {
      const itemIds = Array.from(selectedIds);
      const materialIds = Array.from(selectedMaterialIds);

      const result = await bulkAssignMaterials(projectId, itemIds, materialIds);

      if (result.success && result.data) {
        setSelectedIds(new Set());
        setSelectedMaterialIds(new Set());
        setMaterialsDialogOpen(false);
        router.refresh();
        toast.success(`Assigned ${result.data.assigned} material-item combination${result.data.assigned !== 1 ? "s" : ""}`);
      } else {
        toast.error(result.error || "Failed to assign materials");
      }
    });
  }, [selectedIds, selectedMaterialIds, projectId, router]);

  // Open split dialog for an item
  const openSplitDialog = useCallback((item: ScopeItem) => {
    setItemToSplit(item);
    // Default to opposite path
    setSplitTargetPath(item.item_path === "production" ? "procurement" : "production");
    // Default to 50% of quantity (minimum 1)
    setSplitQuantity(Math.max(1, Math.floor(item.quantity / 2)).toString());
    // Default name - user can customize
    setSplitName(item.name);
    setSplitDialogOpen(true);
  }, []);

  // Handle split item submit
  const handleSplitSubmit = useCallback(() => {
    if (!itemToSplit) return;

    const qty = parseInt(splitQuantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Quantity must be at least 1");
      return;
    }

    if (!splitName.trim()) {
      toast.error("Please enter a name for the split item");
      return;
    }

    startTransition(async () => {
      const result = await splitScopeItem({
        itemId: itemToSplit.id,
        projectId,
        targetPath: splitTargetPath,
        newQuantity: qty,
        newName: splitName.trim(),
      });

      if (result.success) {
        setSplitDialogOpen(false);
        setItemToSplit(null);
        setSplitName("");
        router.refresh();
        toast.success(`Item split successfully! New ${splitTargetPath} item created.`);
      } else {
        toast.error(result.error || "Failed to split item");
      }
    });
  }, [itemToSplit, splitQuantity, splitName, projectId, splitTargetPath, router]);

  // Handle delete item
  const handleDelete = useCallback(() => {
    if (!itemToDelete) return;

    startTransition(async () => {
      const result = await deleteScopeItem(projectId, itemToDelete.id);

      if (result.success) {
        setDeleteDialogOpen(false);
        setItemToDelete(null);
        router.refresh();
        toast.success(`"${itemToDelete.name}" deleted successfully`);
      } else {
        toast.error(result.error || "Failed to delete item");
      }
    });
  }, [itemToDelete, projectId, router]);

  // ============================================================================
  // PERFORMANCE: Memoize summary statistics
  // ============================================================================
  const summaryStats = useMemo(() => {
    const parentItems = hierarchicalItems.filter(item => !item.isChild);
    const totalSalesPrice = items.reduce((sum, item) => sum + (item.total_sales_price || 0), 0);
    const totalActualCost = parentItems.reduce((sum, item) => sum + item.actualTotalCost, 0);
    const totalInitialCost = parentItems.reduce((sum, item) => sum + (item.initial_total_cost || 0), 0);
    const avgProgress = items.length > 0
      ? Math.round(items.reduce((sum, item) => sum + item.production_percentage, 0) / items.length)
      : 0;
    return { totalSalesPrice, totalActualCost, totalInitialCost, avgProgress };
  }, [items, hierarchicalItems]);

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

  // Extract memoized summary values for cleaner JSX
  const { totalSalesPrice, totalActualCost, totalInitialCost, avgProgress } = summaryStats;

  return (
    <div className="space-y-3">
      {/* Summary Bar */}
      <div className="flex flex-wrap items-center gap-4 p-3 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 border border-violet-100 dark:border-violet-900/30 rounded-lg">
        <div className="flex items-center gap-2">
          <ListIcon className="size-4 text-violet-600" />
          <span className="text-sm font-medium">Items:</span>
          <span className="text-sm font-bold text-violet-700">{items.length}</span>
        </div>
        <div className="h-4 w-px bg-violet-200 dark:bg-violet-800" />
        <div className="flex items-center gap-2" title="Total Sales Price (what client pays)">
          <BanknoteIcon className="size-4 text-emerald-600" />
          <span className="text-sm font-medium">Sales:</span>
          <span className="text-sm font-bold text-emerald-700">{formatCurrency(totalSalesPrice)}</span>
        </div>
        <div className="h-4 w-px bg-violet-200 dark:bg-violet-800" />
        <div className="flex items-center gap-2" title="Total Actual Cost (what we pay)">
          <BanknoteIcon className="size-4 text-orange-600" />
          <span className="text-sm font-medium">Actual Cost:</span>
          <span className="text-sm font-bold text-orange-700">{formatCurrency(totalActualCost)}</span>
        </div>
        {totalInitialCost > 0 && (
          <>
            <div className="h-4 w-px bg-violet-200 dark:bg-violet-800" />
            <div className="flex items-center gap-2" title="Total Initial Cost (locked snapshot)">
              <BanknoteIcon className="size-4 text-gray-500" />
              <span className="text-sm font-medium">Initial:</span>
              <span className="text-sm font-bold text-gray-600">{formatCurrency(totalInitialCost)}</span>
            </div>
          </>
        )}
        <div className="h-4 w-px bg-violet-200 dark:bg-violet-800" />
        <div className="flex items-center gap-2">
          <BarChart3Icon className="size-4 text-blue-600" />
          <span className="text-sm font-medium">Progress:</span>
          <span className="text-sm font-bold text-blue-700">{avgProgress}%</span>
        </div>

        {/* Column Visibility Toggle */}
        <div className="ml-auto">
          <Popover open={columnPopoverOpen} onOpenChange={setColumnPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <SlidersHorizontalIcon className="size-4 mr-1.5" />
                Columns
                <Badge variant="secondary" className="ml-1.5 text-xs px-1.5">
                  {visibleColumns.size}
                </Badge>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-3">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Visible Columns</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={resetToDefaults}
                  >
                    Reset
                  </Button>
                </div>
                <div className="space-y-1">
                  {COLUMNS.map((column) => (
                    <label
                      key={column.id}
                      className="flex items-center gap-2 p-1.5 hover:bg-muted rounded cursor-pointer"
                    >
                      <Checkbox
                        checked={isColumnVisible(column.id)}
                        onCheckedChange={() => toggleColumn(column.id)}
                        disabled={column.id === "code" || column.id === "name"}
                      />
                      <span className="text-sm flex-1">{column.label}</span>
                      {isColumnVisible(column.id) ? (
                        <EyeIcon className="size-3.5 text-muted-foreground" />
                      ) : (
                        <EyeOffIcon className="size-3.5 text-muted-foreground" />
                      )}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Code and Name are always visible
                </p>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
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
            {isPending && <Spinner className="size-4" />}

            {/* Bulk Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isPending}>
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

            <Button variant="ghost" size="sm" onClick={clearSelection} disabled={isPending}>
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
              {isColumnVisible("row") && <TableHead className="w-[40px] text-center">#</TableHead>}
              {isColumnVisible("code") && <TableHead>Code</TableHead>}
              {isColumnVisible("name") && <TableHead>Name</TableHead>}
              {isColumnVisible("path") && <TableHead>Path</TableHead>}
              {isColumnVisible("status") && <TableHead>Status</TableHead>}
              {isColumnVisible("quantity") && <TableHead className="text-right">Qty</TableHead>}
              {isColumnVisible("unit_cost") && <TableHead className="text-right" title="Unit Cost (per item)">Unit Cost</TableHead>}
              {isColumnVisible("initial_cost") && <TableHead className="text-right" title="Initial Total Cost (locked snapshot)">Initial</TableHead>}
              {isColumnVisible("actual_cost") && <TableHead className="text-right" title="Actual Cost (aggregated for parents)">Cost</TableHead>}
              {isColumnVisible("sales_price") && <TableHead className="text-right" title="Sales Price (what client pays)">Sales</TableHead>}
              {isColumnVisible("progress") && <TableHead className="w-[100px]">Progress</TableHead>}
              {isColumnVisible("installed") && <TableHead className="text-center">Installed</TableHead>}
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hierarchicalItems.map((item) => (
              <TableRow
                key={item.id}
                data-state={selectedIds.has(item.id) ? "selected" : undefined}
                className={item.isChild ? "bg-gray-50/50 dark:bg-gray-900/20" : ""}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(item.id)}
                    onCheckedChange={() => toggleSelect(item.id)}
                  />
                </TableCell>
                {isColumnVisible("row") && (
                  <TableCell className="text-center text-muted-foreground font-mono text-sm">
                    {/* Show hierarchical row number: parent = "14", child = "⤷ 14.1" */}
                    {item.isChild ? (
                      <span className="flex items-center justify-center gap-0.5">
                        <span className="text-violet-500">⤷</span>
                        <span className="text-xs">{item.displayRowNumber}</span>
                      </span>
                    ) : (
                      item.displayRowNumber
                    )}
                  </TableCell>
                )}
                {isColumnVisible("code") && (
                  <TableCell className={`font-mono text-sm ${item.isChild ? "pl-2" : ""}`}>
                    {item.isChild && <span className="text-violet-400 mr-1">└</span>}
                    {item.item_code}
                  </TableCell>
                )}
                {isColumnVisible("name") && (
                  <TableCell>
                    <Link
                      href={`/projects/${projectId}/scope/${item.id}`}
                      className={`font-medium hover:underline ${item.isChild ? "text-muted-foreground hover:text-foreground" : ""}`}
                    >
                      {item.name}
                    </Link>
                  </TableCell>
                )}
                {isColumnVisible("path") && (
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
                )}
                {isColumnVisible("status") && (
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={`${statusColors[item.status]} cursor-help`}
                      title={statusTooltips[item.status] || ""}
                    >
                      {statusLabels[item.status] || item.status}
                    </Badge>
                  </TableCell>
                )}
                {isColumnVisible("quantity") && (
                  <TableCell className="text-right text-sm">
                    {item.quantity} {item.unit}
                  </TableCell>
                )}
                {isColumnVisible("unit_cost") && (
                  <TableCell className="text-right font-mono text-sm">
                    {/* Unit Cost: Per item cost */}
                    {item.hasChildren ? (
                      <span className="text-muted-foreground">-</span>
                    ) : (
                      formatCurrency(item.unit_cost)
                    )}
                  </TableCell>
                )}
                {isColumnVisible("initial_cost") && (
                  <TableCell className="text-right font-mono text-sm text-muted-foreground">
                    {/* Initial Total Cost: Locked snapshot at creation */}
                    {formatCurrency(item.initial_total_cost)}
                  </TableCell>
                )}
                {isColumnVisible("actual_cost") && (
                  <TableCell className="text-right font-mono text-sm">
                    {/* Actual Total Cost: Aggregated for parents, own for leaf items */}
                    <span className={item.hasChildren ? "text-orange-600 font-semibold" : ""}>
                      {formatCurrency(item.actualTotalCost || null)}
                    </span>
                  </TableCell>
                )}
                {isColumnVisible("sales_price") && (
                  <TableCell className="text-right font-mono text-sm">
                    {/* Sales Price: What client pays */}
                    {formatCurrency(item.total_sales_price)}
                  </TableCell>
                )}
                {isColumnVisible("progress") && (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={item.production_percentage} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground w-7">
                        {item.production_percentage}%
                      </span>
                    </div>
                  </TableCell>
                )}
                {isColumnVisible("installed") && (
                  <TableCell className="text-center">
                    {item.is_installed ? (
                      <CheckCircle2Icon className="size-4 text-green-600 mx-auto" />
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                )}
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
                      {/* Only show Split option for parent items (non-children) */}
                      {!item.isChild && (
                        <DropdownMenuItem onClick={() => openSplitDialog(item)}>
                          <SplitIcon className="size-4 mr-2" />
                          Split Item
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setItemToDelete(item);
                          setDeleteDialogOpen(true);
                        }}
                        className="text-destructive focus:text-destructive"
                      >
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
              disabled={isPending || selectedMaterialIds.size === 0}
            >
              {isPending && <Spinner className="size-4 mr-2" />}
              Assign {selectedMaterialIds.size > 0 ? `(${selectedMaterialIds.size})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Split Item Dialog */}
      <Dialog open={splitDialogOpen} onOpenChange={setSplitDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SplitIcon className="size-5" />
              Split Item
            </DialogTitle>
            <DialogDescription>
              Create a related item with a different path. For example, split "Cabinet" into "Cabinet" (production) and "Marble Supply" (procurement).
            </DialogDescription>
          </DialogHeader>
          {itemToSplit && (
            <div className="space-y-4 py-4">
              {/* Original Item Info */}
              <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Original Item</p>
                <p className="text-sm font-medium">{itemToSplit.item_code} - {itemToSplit.name}</p>
                <div className="flex items-center gap-2 text-sm">
                  {itemToSplit.item_path === "production" ? (
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                      <FactoryIcon className="size-3 mr-1" />
                      Production
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      <ShoppingCartIcon className="size-3 mr-1" />
                      Procurement
                    </Badge>
                  )}
                </div>
              </div>

              {/* New Item Name */}
              <div className="space-y-2">
                <Label htmlFor="splitName">New item name *</Label>
                <Input
                  id="splitName"
                  value={splitName}
                  onChange={(e) => setSplitName(e.target.value)}
                  placeholder="e.g., Marble Supply, Door Handle, etc."
                />
                <p className="text-xs text-muted-foreground">
                  New code will be: <strong>{itemToSplit.item_code}.1</strong> (or .2, .3, etc.)
                </p>
              </div>

              {/* Target Path Selection */}
              <div className="space-y-2">
                <Label>Path for new item</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={splitTargetPath === "production" ? "default" : "outline"}
                    className={splitTargetPath === "production" ? "bg-purple-600 hover:bg-purple-700" : ""}
                    onClick={() => setSplitTargetPath("production")}
                  >
                    <FactoryIcon className="size-4 mr-2" />
                    Production
                  </Button>
                  <Button
                    type="button"
                    variant={splitTargetPath === "procurement" ? "default" : "outline"}
                    className={splitTargetPath === "procurement" ? "bg-blue-600 hover:bg-blue-700" : ""}
                    onClick={() => setSplitTargetPath("procurement")}
                  >
                    <ShoppingCartIcon className="size-4 mr-2" />
                    Procurement
                  </Button>
                </div>
              </div>

              {/* Summary */}
              <div className="p-3 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 text-sm space-y-1">
                <p className="font-medium text-violet-800 dark:text-violet-300">New item will be created:</p>
                <p className="text-violet-700 dark:text-violet-400">
                  • Code: <strong>{itemToSplit.item_code}.1</strong> (or next available)
                </p>
                <p className="text-violet-700 dark:text-violet-400">
                  • Name: <strong>{splitName || "(enter name)"}</strong>
                </p>
                <p className="text-violet-700 dark:text-violet-400">
                  • Path: <strong>{splitTargetPath}</strong>
                </p>
                <p className="text-violet-700 dark:text-violet-400">
                  • Quantity: <strong>{parseInt(splitQuantity) || 0} {itemToSplit.unit}</strong>
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSplitDialogOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleSplitSubmit}
              disabled={isPending || !splitName.trim() || !splitQuantity || parseInt(splitQuantity) <= 0}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
            >
              {isPending ? (
                <>
                  <Spinner className="size-4" />
                  Creating...
                </>
              ) : (
                <>
                  <SplitIcon className="size-4" />
                  Create Split Item
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scope Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                {itemToDelete?.item_code} - {itemToDelete?.name}
              </span>
              ? This action cannot be undone.
              {itemToDelete && !itemToDelete.isChild && (
                <span className="block mt-2 text-orange-600 dark:text-orange-400">
                  ⚠️ This is a parent item. Deleting it will NOT automatically delete its child items.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? (
                <>
                  <Spinner className="size-4 mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
