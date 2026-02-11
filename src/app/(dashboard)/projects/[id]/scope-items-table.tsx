"use client";

import { useState, useTransition, useEffect, useCallback, useMemo, memo, useReducer } from "react";
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
  TruckIcon,
  BanknoteIcon,
  BarChart3Icon,
  ListIcon,
  SplitIcon,
  SlidersHorizontalIcon,
  EyeIcon,
  EyeOffIcon,
  PlusIcon,
  WrenchIcon,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GlassCard, EmptyState, StatusBadge } from "@/components/ui/ui-helpers";
import { ResponsiveDataView } from "@/components/ui/responsive-data-view";
import { useBreakpoint } from "@/hooks/use-media-query";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import dynamic from "next/dynamic";
import {
  ScopeItemsFilterBar,
  type ScopeItemsFilters,
  defaultFilters,
  applyFilters,
} from "@/components/scope-items/scope-items-filter-bar";
import { ScopeItemCard } from "@/components/scope-items/scope-item-card";

// ============================================================================
// PERFORMANCE: Lazy load the Sheet component
// Before: ScopeItemSheet (~700 lines + dependencies) loaded with table
// After:  Only loaded when user opens add/edit sheet
// ============================================================================
const ScopeItemSheet = dynamic(
  () => import("@/components/scope-items/scope-item-sheet").then((mod) => mod.ScopeItemSheet),
  {
    loading: () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-lg p-6 flex items-center gap-3 shadow-xl">
          <Spinner className="size-5" />
          <span>Loading editor...</span>
        </div>
      </div>
    ),
    ssr: false,
  }
);

interface ScopeItem {
  id: string;
  item_code: string;
  name: string;
  item_path: "production" | "procurement";
  status: string;
  quantity: number;
  unit: string;
  // Initial cost (budgeted, set once at creation)
  initial_unit_cost: number | null;
  initial_total_cost: number | null;
  // Actual cost (entered manually later)
  actual_unit_cost: number | null;
  actual_total_cost: number | null;
  // Sales price fields (what CLIENT pays)
  unit_sales_price: number | null;
  total_sales_price: number | null;
  production_percentage: number;
  is_shipped: boolean;
  is_installation_started: boolean;
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
  isClient?: boolean; // Hide sensitive cost data from clients
  userRole?: string; // User role for permission checks
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

// Default columns: Code, Name, Path, Status, Qty, Sale Total, Progress
// Users can expand via "Columns" toggle for full detail
const COLUMNS: ColumnConfig[] = [
  { id: "row", label: "#", defaultVisible: false },
  { id: "code", label: "Code", defaultVisible: true },
  { id: "name", label: "Name", defaultVisible: true },
  { id: "path", label: "Path", defaultVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "quantity", label: "Qty", defaultVisible: true },
  // Initial cost (budgeted) - hidden by default
  { id: "initial_unit_cost", label: "Init Unit", defaultVisible: false },
  { id: "initial_total_cost", label: "Init Total", defaultVisible: false },
  // Actual cost - hidden by default
  { id: "actual_unit_cost", label: "Act Unit", defaultVisible: false },
  { id: "actual_total_cost", label: "Act Total", defaultVisible: false },
  // Sales (what client pays)
  { id: "unit_sales_price", label: "Sale Unit", defaultVisible: false },
  { id: "total_sales_price", label: "Sale Total", defaultVisible: true },
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

// ============================================================================
// PERFORMANCE: Dialog state reducer
// Consolidates 11 separate useState calls into 1 useReducer
// Benefits: Single state update, predictable transitions, better batching
// ============================================================================

type DialogType = "price" | "quantity" | "materials" | "split" | "delete" | null;

interface DialogState {
  activeDialog: DialogType;
  // Shared input value for price/quantity dialogs
  inputValue: string;
  // Materials dialog
  selectedMaterialIds: Set<string>;
  // Split dialog
  itemToSplit: ScopeItem | null;
  splitTargetPath: "production" | "procurement";
  splitQuantity: string;
  splitName: string;
  // Delete dialog
  itemToDelete: HierarchicalScopeItem | null;
}

type DialogAction =
  | { type: "OPEN_PRICE_DIALOG" }
  | { type: "OPEN_QUANTITY_DIALOG" }
  | { type: "OPEN_MATERIALS_DIALOG" }
  | { type: "OPEN_SPLIT_DIALOG"; item: ScopeItem }
  | { type: "OPEN_DELETE_DIALOG"; item: HierarchicalScopeItem }
  | { type: "CLOSE_DIALOG" }
  | { type: "SET_INPUT_VALUE"; value: string }
  | { type: "TOGGLE_MATERIAL"; materialId: string }
  | { type: "SET_SPLIT_PATH"; path: "production" | "procurement" }
  | { type: "SET_SPLIT_QUANTITY"; value: string }
  | { type: "SET_SPLIT_NAME"; value: string }
  | { type: "RESET_MATERIALS" };

const initialDialogState: DialogState = {
  activeDialog: null,
  inputValue: "",
  selectedMaterialIds: new Set(),
  itemToSplit: null,
  splitTargetPath: "production",
  splitQuantity: "",
  splitName: "",
  itemToDelete: null,
};

// ============================================================================
// PERFORMANCE: Memoized table row component
// Prevents re-rendering of all rows when only one row changes
// ============================================================================

interface ScopeItemRowProps {
  item: HierarchicalScopeItem;
  isSelected: boolean;
  projectId: string;
  isColumnVisible: (columnId: string) => boolean;
  formatCurrency: (value: number | null) => string;
  onToggleSelect: (id: string) => void;
  onOpenSplitDialog: (item: ScopeItem) => void;
  onOpenDeleteDialog: (item: HierarchicalScopeItem) => void;
  onEditItem: (item: HierarchicalScopeItem) => void;
  onViewItem: (item: HierarchicalScopeItem) => void;
}

const ScopeItemRow = memo(function ScopeItemRow({
  item,
  isSelected,
  projectId,
  isColumnVisible,
  formatCurrency,
  onToggleSelect,
  onOpenSplitDialog,
  onOpenDeleteDialog,
  onEditItem,
  onViewItem,
}: ScopeItemRowProps) {

  return (
    <TableRow
      data-state={isSelected ? "selected" : undefined}
      className={item.isChild ? "bg-gray-50/50 dark:bg-gray-900/20" : ""}
    >
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(item.id)}
        />
      </TableCell>
      {isColumnVisible("row") && (
        <TableCell className="text-center text-muted-foreground font-mono text-sm">
          {item.isChild ? (
            <span className="flex items-center justify-center gap-0.5">
              <span className="text-base-400">⤷</span>
              <span className="text-xs">{item.displayRowNumber}</span>
            </span>
          ) : (
            item.displayRowNumber
          )}
        </TableCell>
      )}
      {isColumnVisible("code") && (
        <TableCell className={`font-mono text-sm ${item.isChild ? "pl-2" : ""}`}>
          {item.isChild && <span className="text-base-400 mr-1">└</span>}
          {item.item_code}
        </TableCell>
      )}
      {isColumnVisible("name") && (
        <TableCell>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onViewItem(item)}
              className={`font-medium hover:underline text-left cursor-pointer ${item.isChild ? "text-muted-foreground hover:text-foreground" : ""}`}
            >
              {item.name}
            </button>
            {item.is_installed && (
              <span className="inline-flex items-center gap-1 text-green-600 shrink-0">
                <CheckCircle2Icon className="size-3.5" />
                <span className="text-xs font-medium">Installed</span>
              </span>
            )}
          </div>
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
      {isColumnVisible("initial_unit_cost") && (
        <TableCell className="text-right font-mono text-sm text-blue-600">
          {item.hasChildren ? (
            <span className="text-muted-foreground">-</span>
          ) : (
            formatCurrency(item.initial_unit_cost)
          )}
        </TableCell>
      )}
      {isColumnVisible("initial_total_cost") && (
        <TableCell className="text-right font-mono text-sm text-blue-600">
          {formatCurrency(item.initial_total_cost)}
        </TableCell>
      )}
      {isColumnVisible("actual_unit_cost") && (
        <TableCell className="text-right font-mono text-sm text-amber-600">
          {item.hasChildren ? (
            <span className="text-muted-foreground">-</span>
          ) : (
            formatCurrency(item.actual_unit_cost)
          )}
        </TableCell>
      )}
      {isColumnVisible("actual_total_cost") && (
        <TableCell className="text-right font-mono text-sm text-amber-600">
          <span className={item.hasChildren ? "font-semibold" : ""}>
            {formatCurrency(item.actualTotalCost)}
          </span>
        </TableCell>
      )}
      {isColumnVisible("unit_sales_price") && (
        <TableCell className="text-right font-mono text-sm text-green-600">
          {item.hasChildren ? (
            <span className="text-muted-foreground">-</span>
          ) : (
            formatCurrency(item.unit_sales_price)
          )}
        </TableCell>
      )}
      {isColumnVisible("total_sales_price") && (
        <TableCell className="text-right font-mono text-sm text-green-600">
          {formatCurrency(item.total_sales_price)}
        </TableCell>
      )}
      {isColumnVisible("progress") && (
        <TableCell>
          <TooltipProvider delayDuration={200}>
            {(() => {
              // Calculate combined progress matching project overview formula
              // Production: 90% from production_percentage + 5% for installation_started + 5% for installed
              // Procurement: 100% when installed, 0% otherwise
              const installationProgress = item.is_installed ? 10 : (item.is_installation_started ? 5 : 0);
              const combinedProgress = item.item_path === "production"
                ? Math.round((item.production_percentage * 0.9) + installationProgress)
                : (item.is_installed ? 100 : 0);

              // === PROCUREMENT ITEMS ===
              if (item.item_path === "procurement") {
                if (item.is_installed) {
                  // Installed
                  return (
                    <div className="flex items-center gap-1.5">
                      <Progress value={100} className="h-2 flex-1 max-w-[60px]" />
                      <span className="text-xs text-muted-foreground w-8">100%</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">
                            <CheckCircle2Icon className="size-3.5 text-green-600 shrink-0" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Installed</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  );
                } else if (item.is_installation_started) {
                  // Installation in progress
                  return (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5 text-primary cursor-help">
                          <WrenchIcon className="size-3.5" />
                          <span className="text-xs font-medium">Installing</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Installation in progress</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                } else if (item.is_shipped) {
                  // Shipped, awaiting installation
                  return (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5 text-blue-600 cursor-help">
                          <TruckIcon className="size-3.5" />
                          <span className="text-xs font-medium">Shipped</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">At site, awaiting installation</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                } else {
                  // Not shipped yet
                  return (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5 text-muted-foreground cursor-help">
                          <PackageIcon className="size-3.5" />
                          <span className="text-xs">Awaiting shipment</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Ready to ship to site</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                }
              }

              // === PRODUCTION ITEMS ===
              // Not started
              if (item.production_percentage === 0 && !item.is_shipped && !item.is_installation_started && !item.is_installed) {
                return <span className="text-xs text-muted-foreground italic">Not started</span>;
              }

              // Determine the status icon based on workflow state
              let StatusIcon: React.ReactNode;
              let statusTooltip: string;

              if (item.is_installed) {
                StatusIcon = <CheckCircle2Icon className="size-3.5 text-green-600 shrink-0" />;
                statusTooltip = "Installed";
              } else if (item.is_installation_started) {
                StatusIcon = <WrenchIcon className="size-3.5 text-primary shrink-0" />;
                statusTooltip = "Installation in progress (+5%)";
              } else if (item.is_shipped) {
                StatusIcon = <TruckIcon className="size-3.5 text-blue-600 shrink-0" />;
                statusTooltip = "Shipped to site";
              } else if (item.production_percentage === 100) {
                StatusIcon = <PackageIcon className="size-3.5 text-amber-600 shrink-0" />;
                statusTooltip = "Ready to ship";
              } else {
                StatusIcon = <FactoryIcon className="size-3.5 text-amber-500 shrink-0" />;
                statusTooltip = "In production";
              }

              // Show progress bar with combined value
              return (
                <div className="flex items-center gap-1.5">
                  <Progress value={combinedProgress} className="h-2 flex-1 max-w-[60px]" />
                  <span className="text-xs text-muted-foreground w-8">
                    {combinedProgress}%
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help">{StatusIcon}</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">{statusTooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              );
            })()}
          </TooltipProvider>
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
            <Button variant="ghost" size="icon-sm" aria-label="Open item actions menu">
              <MoreHorizontalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onViewItem(item)}>
              <EyeIcon className="size-4 mr-2" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEditItem(item)}>
              <PencilIcon className="size-4 mr-2" />
              Edit
            </DropdownMenuItem>
            {!item.isChild && (
              <DropdownMenuItem onClick={() => onOpenSplitDialog(item)}>
                <SplitIcon className="size-4 mr-2" />
                Split Item
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onOpenDeleteDialog(item)}
              className="text-destructive focus:text-destructive"
            >
              <TrashIcon className="size-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
});

function dialogReducer(state: DialogState, action: DialogAction): DialogState {
  switch (action.type) {
    case "OPEN_PRICE_DIALOG":
      return { ...state, activeDialog: "price", inputValue: "" };
    case "OPEN_QUANTITY_DIALOG":
      return { ...state, activeDialog: "quantity", inputValue: "" };
    case "OPEN_MATERIALS_DIALOG":
      return { ...state, activeDialog: "materials", selectedMaterialIds: new Set() };
    case "OPEN_SPLIT_DIALOG": {
      const item = action.item;
      return {
        ...state,
        activeDialog: "split",
        itemToSplit: item,
        splitTargetPath: item.item_path === "production" ? "procurement" : "production",
        splitQuantity: Math.max(1, Math.floor(item.quantity / 2)).toString(),
        splitName: item.name,
      };
    }
    case "OPEN_DELETE_DIALOG":
      return { ...state, activeDialog: "delete", itemToDelete: action.item };
    case "CLOSE_DIALOG":
      return {
        ...state,
        activeDialog: null,
        inputValue: "",
        itemToSplit: null,
        splitName: "",
        itemToDelete: null,
      };
    case "SET_INPUT_VALUE":
      return { ...state, inputValue: action.value };
    case "TOGGLE_MATERIAL": {
      const newSet = new Set(state.selectedMaterialIds);
      if (newSet.has(action.materialId)) {
        newSet.delete(action.materialId);
      } else {
        newSet.add(action.materialId);
      }
      return { ...state, selectedMaterialIds: newSet };
    }
    case "SET_SPLIT_PATH":
      return { ...state, splitTargetPath: action.path };
    case "SET_SPLIT_QUANTITY":
      return { ...state, splitQuantity: action.value };
    case "SET_SPLIT_NAME":
      return { ...state, splitName: action.value };
    case "RESET_MATERIALS":
      return { ...state, selectedMaterialIds: new Set() };
    default:
      return state;
  }
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

    // Calculate computed actual cost: sum of children's costs if has children
    // Always calculate from actual_unit_cost * quantity for accuracy
    let actualTotalCost: number;
    if (hasChildren) {
      actualTotalCost = children.reduce((sum, child) => {
        return sum + ((child.actual_unit_cost || 0) * (child.quantity || 0));
      }, 0);
    } else {
      actualTotalCost = (parent.actual_unit_cost || 0) * (parent.quantity || 0);
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
      const childActualCost = (child.actual_unit_cost || 0) * (child.quantity || 0);
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

export function ScopeItemsTable({ projectId, items, materials, currency = "TRY", isClient = false, userRole = "pm" }: ScopeItemsTableProps) {
  const { isMobile } = useBreakpoint();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Column visibility state - initialize from localStorage or defaults
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => getDefaultVisibleColumns());
  const [columnPopoverOpen, setColumnPopoverOpen] = useState(false);

  // Filter state for scope items
  const [filters, setFilters] = useState<ScopeItemsFilters>(defaultFilters);

  // Sheet state (merged view + edit)
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

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

  // Columns hidden from clients (cost/pricing data)
  const clientHiddenColumns = useMemo(() =>
    new Set(["initial_unit_cost", "initial_total_cost", "actual_unit_cost", "actual_total_cost", "sales_price"]),
    []
  );

  // Check if a column is visible - memoized
  // Also hides cost columns from client users
  const isColumnVisible = useCallback(
    (columnId: string) => {
      // Always hide cost columns from clients
      if (isClient && clientHiddenColumns.has(columnId)) {
        return false;
      }
      return visibleColumns.has(columnId);
    },
    [visibleColumns, isClient, clientHiddenColumns]
  );

  // ============================================================================
  // PERFORMANCE: Memoize filtered + hierarchical items computation
  // Before: Recalculated on every render
  // After:  Only recalculated when items or filters change
  // ============================================================================
  const filteredItems = useMemo(() => applyFilters(items, filters), [items, filters]);
  const hierarchicalItems = useMemo(() => organizeHierarchically(filteredItems), [filteredItems]);

  // ============================================================================
  // PERFORMANCE: Consolidated dialog state with useReducer
  // Before: 11 separate useState calls = 11 potential re-renders
  // After:  1 useReducer = single batched update
  // ============================================================================
  const [dialogState, dispatch] = useReducer(dialogReducer, initialDialogState);

  // Destructure for convenience (these are stable references from the reducer)
  const {
    activeDialog,
    inputValue,
    selectedMaterialIds,
    itemToSplit,
    splitTargetPath,
    splitQuantity,
    splitName,
    itemToDelete,
  } = dialogState;

  // Dialog open state helpers
  const materialsDialogOpen = activeDialog === "materials";
  const splitDialogOpen = activeDialog === "split";
  const deleteDialogOpen = activeDialog === "delete";

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

  const toggleMaterialSelection = useCallback((materialId: string) => {
    dispatch({ type: "TOGGLE_MATERIAL", materialId });
  }, []);

  const handleMaterialsSubmit = useCallback(() => {
    if (selectedIds.size === 0 || selectedMaterialIds.size === 0) return;

    startTransition(async () => {
      const itemIds = Array.from(selectedIds);
      const materialIds = Array.from(selectedMaterialIds);

      const result = await bulkAssignMaterials(projectId, itemIds, materialIds);

      if (result.success && result.data) {
        setSelectedIds(new Set());
        dispatch({ type: "CLOSE_DIALOG" });
        router.refresh();
        toast.success(`Assigned ${result.data.assigned} material-item combination${result.data.assigned !== 1 ? "s" : ""}`);
      } else {
        toast.error(result.error || "Failed to assign materials");
      }
    });
  }, [selectedIds, selectedMaterialIds, projectId, router]);

  // Open split dialog for an item - now dispatches to reducer
  const openSplitDialog = useCallback((item: ScopeItem) => {
    dispatch({ type: "OPEN_SPLIT_DIALOG", item });
  }, []);

  // Open delete dialog for an item
  const openDeleteDialog = useCallback((item: HierarchicalScopeItem) => {
    dispatch({ type: "OPEN_DELETE_DIALOG", item });
  }, []);

  // Open sheet for an item (both view and edit use the same merged sheet)
  const openItemSheet = useCallback((item: HierarchicalScopeItem) => {
    setSelectedItemId(item.id);
    setSheetOpen(true);
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
        dispatch({ type: "CLOSE_DIALOG" });
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
        dispatch({ type: "CLOSE_DIALOG" });
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
    // Calculate average progress using combined formula (matching project overview)
    // Production: 90% from production_percentage + 5% for installation_started + 5% for installed
    // Procurement: 100% when installed, 0% otherwise
    const avgProgress = items.length > 0
      ? Math.round(
          items.reduce((sum, item) => {
            const installationProgress = item.is_installed ? 10 : (item.is_installation_started ? 5 : 0);
            const itemProgress = item.item_path === "production"
              ? (item.production_percentage * 0.9) + installationProgress
              : (item.is_installed ? 100 : 0);
            return sum + itemProgress;
          }, 0) / items.length
        )
      : 0;
    return { totalSalesPrice, totalActualCost, totalInitialCost, avgProgress };
  }, [items, hierarchicalItems]);

  // Function to open sheet for adding new item
  const openAddSheet = useCallback(() => {
    setSelectedItemId(null);
    setSheetOpen(true);
  }, []);

  if (items.length === 0) {
    return (
      <>
        <GlassCard>
          <EmptyState
            icon={<ClipboardListIcon className="size-8" />}
            title="No scope items"
            description="Add scope items to track production and procurement for this project."
            action={
              <Button
                onClick={openAddSheet}
              >
                <PlusIcon className="size-4 mr-2" />
                Add Scope Item
              </Button>
            }
          />
        </GlassCard>

        {/* Sheet for adding items - only mount when open */}
        {sheetOpen && (
          <ScopeItemSheet
            projectId={projectId}
            projectCurrency={currency}
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            itemId={null}
            userRole={userRole as "admin" | "pm" | "production" | "procurement" | "management" | "client"}
          />
        )}
      </>
    );
  }

  // Extract memoized summary values for cleaner JSX
  const { totalSalesPrice, totalActualCost, avgProgress } = summaryStats;

  const renderColumnsControl = () => (
    <Popover open={columnPopoverOpen} onOpenChange={setColumnPopoverOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 px-2.5">
          <SlidersHorizontalIcon className="size-3.5 mr-1.5" />
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
            {COLUMNS
              .filter(column => !isClient || !clientHiddenColumns.has(column.id))
              .map((column) => (
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
  );

  return (
    <div className="space-y-3">
      {/* Summary Bar */}
      <div className="rounded-lg border border-base-200 bg-base-50/70 p-1.5 dark:border-base-800 dark:bg-base-900/20">
        <div className="grid grid-cols-2 gap-1.5">
          <div className="rounded-md border border-base-200/80 bg-white px-2.5 py-1.5 dark:bg-base-950/40">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <ListIcon className="size-3 text-primary" />
                Items
              </span>
            </div>
            <p className="mt-1 truncate text-sm font-semibold leading-none text-primary">{items.length}</p>
          </div>

          {!isClient && (
            <div
              className="rounded-md border border-base-200/80 bg-white px-2.5 py-1.5 dark:bg-base-950/40"
              title="Total Sales Price (what client pays)"
            >
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <BanknoteIcon className="size-3 text-emerald-600" />
                  Sales
                </span>
              </div>
              <p className="mt-1 truncate text-sm font-semibold leading-none text-emerald-700">
                {formatCurrency(totalSalesPrice)}
              </p>
            </div>
          )}

          {!isClient && (
            <div
              className="rounded-md border border-base-200/80 bg-white px-2.5 py-1.5 dark:bg-base-950/40"
              title="Total Actual Cost (what we pay)"
            >
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <BanknoteIcon className="size-3 text-orange-600" />
                  Actual
                </span>
              </div>
              <p className="mt-1 truncate text-sm font-semibold leading-none text-orange-700">
                {formatCurrency(totalActualCost)}
              </p>
            </div>
          )}

          <div className="rounded-md border border-base-200/80 bg-white px-2.5 py-1.5 dark:bg-base-950/40">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <BarChart3Icon className="size-3 text-blue-600" />
                Progress
              </span>
              <span className="text-xs font-semibold text-blue-700">{avgProgress}%</span>
            </div>
            <Progress value={avgProgress} className="mt-1 h-1.5 [&>div]:bg-teal-400" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <ScopeItemsFilterBar
        filters={filters}
        onFiltersChange={setFilters}
        totalCount={items.length}
        filteredCount={filteredItems.length}
        renderExtraAction={isMobile ? undefined : renderColumnsControl}
      />

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
                  Actions
                  <ChevronDownIcon className="size-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {/* Status submenu */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <BarChart3Icon className="size-4 mr-2 text-primary" />
                    Update Status
                  </DropdownMenuSubTrigger>
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
                  <DropdownMenuSubTrigger>
                    <FactoryIcon className="size-4 mr-2 text-purple-500" />
                    Change Path
                  </DropdownMenuSubTrigger>
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

                <DropdownMenuSeparator />

                {/* Shipping actions */}
                <DropdownMenuItem onClick={() => bulkUpdate("is_shipped", true)}>
                  <TruckIcon className="size-4 mr-2 text-blue-600" />
                  Mark as Shipped
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => bulkUpdate("is_shipped", false)}>
                  <PackageIcon className="size-4 mr-2 text-muted-foreground" />
                  Remove Shipped
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Installation started actions */}
                <DropdownMenuItem onClick={() => bulkUpdate("is_installation_started", true)}>
                  <WrenchIcon className="size-4 mr-2 text-primary" />
                  Mark Installation Started
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => bulkUpdate("is_installation_started", false)}>
                  <WrenchIcon className="size-4 mr-2 text-muted-foreground" />
                  Remove Installation Started
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Installation completed actions */}
                <DropdownMenuItem onClick={() => bulkUpdate("is_installed", true)}>
                  <CheckCircle2Icon className="size-4 mr-2 text-green-600" />
                  Mark as Installed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => bulkUpdate("is_installed", false)}>
                  <XIcon className="size-4 mr-2 text-muted-foreground" />
                  Remove Installation
                </DropdownMenuItem>

                {materials.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => dispatch({ type: "OPEN_MATERIALS_DIALOG" })}>
                      <PackageIcon className="size-4 mr-2 text-amber-500" />
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

      <ResponsiveDataView
        data={hierarchicalItems}
        cardsClassName="grid grid-cols-1 gap-3"
        tableView={(
          <GlassCard className="py-0">
            <div className="overflow-x-auto">
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
                    {isColumnVisible("initial_unit_cost") && (
                      <TableHead className="text-right text-blue-600">
                        <Tooltip>
                          <TooltipTrigger className="cursor-help underline decoration-dotted underline-offset-2">Init Unit</TooltipTrigger>
                          <TooltipContent>Initial/Budget Unit Cost</TooltipContent>
                        </Tooltip>
                      </TableHead>
                    )}
                    {isColumnVisible("initial_total_cost") && (
                      <TableHead className="text-right text-blue-600">
                        <Tooltip>
                          <TooltipTrigger className="cursor-help underline decoration-dotted underline-offset-2">Init Total</TooltipTrigger>
                          <TooltipContent>Initial/Budget Total Cost (locked)</TooltipContent>
                        </Tooltip>
                      </TableHead>
                    )}
                    {isColumnVisible("actual_unit_cost") && (
                      <TableHead className="text-right text-amber-600">
                        <Tooltip>
                          <TooltipTrigger className="cursor-help underline decoration-dotted underline-offset-2">Act Unit</TooltipTrigger>
                          <TooltipContent>Actual Unit Cost (real cost per item)</TooltipContent>
                        </Tooltip>
                      </TableHead>
                    )}
                    {isColumnVisible("actual_total_cost") && (
                      <TableHead className="text-right text-amber-600">
                        <Tooltip>
                          <TooltipTrigger className="cursor-help underline decoration-dotted underline-offset-2">Act Total</TooltipTrigger>
                          <TooltipContent>Actual Total Cost (real cost)</TooltipContent>
                        </Tooltip>
                      </TableHead>
                    )}
                    {isColumnVisible("unit_sales_price") && (
                      <TableHead className="text-right text-green-600">
                        <Tooltip>
                          <TooltipTrigger className="cursor-help underline decoration-dotted underline-offset-2">Sale Unit</TooltipTrigger>
                          <TooltipContent>Selling Price per Unit</TooltipContent>
                        </Tooltip>
                      </TableHead>
                    )}
                    {isColumnVisible("total_sales_price") && (
                      <TableHead className="text-right text-green-600">
                        <Tooltip>
                          <TooltipTrigger className="cursor-help underline decoration-dotted underline-offset-2">Sale Total</TooltipTrigger>
                          <TooltipContent>Total Selling Price (unit × qty)</TooltipContent>
                        </Tooltip>
                      </TableHead>
                    )}
                    {isColumnVisible("progress") && <TableHead className="w-[100px]">Progress</TableHead>}
                    {isColumnVisible("installed") && <TableHead className="text-center">Installed</TableHead>}
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hierarchicalItems.map((item) => (
                    <ScopeItemRow
                      key={item.id}
                      item={item}
                      isSelected={selectedIds.has(item.id)}
                      projectId={projectId}
                      isColumnVisible={isColumnVisible}
                      formatCurrency={formatCurrency}
                      onToggleSelect={toggleSelect}
                      onOpenSplitDialog={openSplitDialog}
                      onOpenDeleteDialog={openDeleteDialog}
                      onEditItem={openItemSheet}
                      onViewItem={openItemSheet}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </GlassCard>
        )}
        renderCard={(item) => (
          <ScopeItemCard
            key={item.id}
            item={item}
            isSelected={selectedIds.has(item.id)}
            isClient={isClient}
            formatCurrency={formatCurrency}
            onToggleSelect={toggleSelect}
            onView={openItemSheet}
            onEdit={openItemSheet}
            onSplit={openSplitDialog}
            onDelete={openDeleteDialog}
          />
        )}
      />

      {/* Materials Assignment Dialog */}
      <Dialog open={materialsDialogOpen} onOpenChange={(open) => !open && dispatch({ type: "CLOSE_DIALOG" })}>
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
            <Button variant="outline" onClick={() => dispatch({ type: "CLOSE_DIALOG" })}>
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
      <Dialog open={splitDialogOpen} onOpenChange={(open) => !open && dispatch({ type: "CLOSE_DIALOG" })}>
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
                  onChange={(e) => dispatch({ type: "SET_SPLIT_NAME", value: e.target.value })}
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
                    onClick={() => dispatch({ type: "SET_SPLIT_PATH", path: "production" })}
                  >
                    <FactoryIcon className="size-4 mr-2" />
                    Production
                  </Button>
                  <Button
                    type="button"
                    variant={splitTargetPath === "procurement" ? "default" : "outline"}
                    className={splitTargetPath === "procurement" ? "bg-blue-600 hover:bg-blue-700" : ""}
                    onClick={() => dispatch({ type: "SET_SPLIT_PATH", path: "procurement" })}
                  >
                    <ShoppingCartIcon className="size-4 mr-2" />
                    Procurement
                  </Button>
                </div>
              </div>

              {/* Summary */}
              <div className="p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 text-sm space-y-1">
                <p className="font-medium text-primary-800 dark:text-primary-300">New item will be created:</p>
                <p className="text-primary-700 dark:text-primary-400">
                  • Code: <strong>{itemToSplit.item_code}.1</strong> (or next available)
                </p>
                <p className="text-primary-700 dark:text-primary-400">
                  • Name: <strong>{splitName || "(enter name)"}</strong>
                </p>
                <p className="text-primary-700 dark:text-primary-400">
                  • Path: <strong>{splitTargetPath}</strong>
                </p>
                <p className="text-primary-700 dark:text-primary-400">
                  • Quantity: <strong>{parseInt(splitQuantity) || 0} {itemToSplit.unit}</strong>
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => dispatch({ type: "CLOSE_DIALOG" })} disabled={isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleSplitSubmit}
              disabled={isPending || !splitName.trim() || !splitQuantity || parseInt(splitQuantity) <= 0}
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
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => !open && dispatch({ type: "CLOSE_DIALOG" })}>
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
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
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

      {/* Scope Item Sheet (merged view + edit) - only mount when open */}
      {sheetOpen && (
        <ScopeItemSheet
          projectId={projectId}
          projectCurrency={currency}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          itemId={selectedItemId}
          userRole={userRole as "admin" | "pm" | "production" | "procurement" | "management" | "client"}
        />
      )}
    </div>
  );
}
