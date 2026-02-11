"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useBreakpoint } from "@/hooks/use-media-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  SearchIcon,
  FilterIcon,
  XIcon,
  ChevronDownIcon,
  FactoryIcon,
  ShoppingCartIcon,
  TruckIcon,
  WrenchIcon,
  CheckCircle2Icon,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

export type ItemStatus =
  | "pending"
  | "in_design"
  | "awaiting_approval"
  | "approved"
  | "in_production"
  | "complete"
  | "on_hold"
  | "cancelled";

export type ItemPath = "production" | "procurement" | "all";

export type DeliveryFilter = "all" | "shipped" | "not_shipped" | "installing" | "installed";

export interface ScopeItemsFilters {
  search: string;
  status: ItemStatus[];
  path: ItemPath;
  delivery: DeliveryFilter;
}

export const defaultFilters: ScopeItemsFilters = {
  search: "",
  status: [],
  path: "all",
  delivery: "all",
};

// ============================================================================
// CONSTANTS
// ============================================================================

const statusOptions: { value: ItemStatus; label: string; color: string }[] = [
  { value: "pending", label: "Pending", color: "bg-gray-100 text-gray-700" },
  { value: "in_design", label: "In Design", color: "bg-blue-100 text-blue-700" },
  { value: "awaiting_approval", label: "Awaiting Approval", color: "bg-yellow-100 text-yellow-700" },
  { value: "approved", label: "Approved", color: "bg-green-100 text-green-700" },
  { value: "in_production", label: "In Production", color: "bg-purple-100 text-purple-700" },
  { value: "complete", label: "Complete", color: "bg-emerald-100 text-emerald-700" },
  { value: "on_hold", label: "On Hold", color: "bg-orange-100 text-orange-700" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-700" },
];

const pathOptions: { value: ItemPath; label: string; icon: React.ReactNode }[] = [
  { value: "all", label: "All Paths", icon: null },
  { value: "production", label: "Production", icon: <FactoryIcon className="h-4 w-4" /> },
  { value: "procurement", label: "Procurement", icon: <ShoppingCartIcon className="h-4 w-4" /> },
];

const deliveryOptions: { value: DeliveryFilter; label: string; icon: React.ReactNode }[] = [
  { value: "all", label: "All Items", icon: null },
  { value: "shipped", label: "Shipped", icon: <TruckIcon className="h-4 w-4" /> },
  { value: "not_shipped", label: "Not Shipped", icon: <TruckIcon className="h-4 w-4 opacity-50" /> },
  { value: "installing", label: "Installing", icon: <WrenchIcon className="h-4 w-4" /> },
  { value: "installed", label: "Installed", icon: <CheckCircle2Icon className="h-4 w-4" /> },
];

// ============================================================================
// FILTER BAR COMPONENT
// ============================================================================

interface ScopeItemsFilterBarProps {
  filters: ScopeItemsFilters;
  onFiltersChange: (filters: ScopeItemsFilters) => void;
  totalCount: number;
  filteredCount: number;
  renderExtraAction?: () => React.ReactNode;
  className?: string;
}

/**
 * Filter bar for the scope items table.
 * Provides search, status, path, and delivery filters.
 *
 * @example
 * const [filters, setFilters] = useState(defaultFilters);
 * <ScopeItemsFilterBar
 *   filters={filters}
 *   onFiltersChange={setFilters}
 *   totalCount={items.length}
 *   filteredCount={filteredItems.length}
 * />
 */
export function ScopeItemsFilterBar({
  filters,
  onFiltersChange,
  totalCount,
  filteredCount,
  renderExtraAction,
  className,
}: ScopeItemsFilterBarProps) {
  const { isMobile } = useBreakpoint();
  const [mobileFiltersOpen, setMobileFiltersOpen] = React.useState(false);
  const [draftFilters, setDraftFilters] = React.useState<ScopeItemsFilters>(filters);

  React.useEffect(() => {
    if (!mobileFiltersOpen) {
      setDraftFilters(filters);
    }
  }, [filters, mobileFiltersOpen]);

  // Count active filters
  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.status.length > 0) count++;
    if (filters.path !== "all") count++;
    if (filters.delivery !== "all") count++;
    return count;
  }, [filters]);

  const hasActiveFilters = activeFilterCount > 0;

  // Update individual filter
  const updateFilter = <K extends keyof ScopeItemsFilters>(
    key: K,
    value: ScopeItemsFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  // Toggle status in array
  const toggleStatus = (status: ItemStatus) => {
    const newStatuses = filters.status.includes(status)
      ? filters.status.filter((s) => s !== status)
      : [...filters.status, status];
    updateFilter("status", newStatuses);
  };

  // Clear all filters
  const clearAllFilters = () => {
    onFiltersChange(defaultFilters);
  };

  const updateDraftFilter = <K extends keyof ScopeItemsFilters>(
    key: K,
    value: ScopeItemsFilters[K]
  ) => {
    setDraftFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleDraftStatus = (status: ItemStatus) => {
    const newStatuses = draftFilters.status.includes(status)
      ? draftFilters.status.filter((s) => s !== status)
      : [...draftFilters.status, status];
    updateDraftFilter("status", newStatuses);
  };

  const applyMobileFilters = () => {
    onFiltersChange(draftFilters);
    setMobileFiltersOpen(false);
  };

  const clearMobileFilters = () => {
    setDraftFilters(defaultFilters);
    onFiltersChange(defaultFilters);
    setMobileFiltersOpen(false);
  };

  if (isMobile) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by code or name..."
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
              className="pl-8 h-8 text-sm"
            />
            {filters.search && (
              <button
                onClick={() => updateFilter("search", "")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-base-100 rounded"
                aria-label="Clear search"
              >
                <XIcon className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>

          {renderExtraAction && <div className="shrink-0">{renderExtraAction()}</div>}

          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 shrink-0 gap-1.5"
            onClick={() => setMobileFiltersOpen(true)}
          >
            <FilterIcon className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          {hasActiveFilters ? (
            <>
              Showing <span className="font-medium text-foreground">{filteredCount}</span> of {totalCount}
            </>
          ) : (
            <>{totalCount} items</>
          )}
        </p>

        <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
          <SheetContent
            side="bottom"
            className="h-[80vh] overflow-y-auto overscroll-contain pb-[calc(env(safe-area-inset-bottom)+1rem)]"
          >
            <SheetHeader>
              <SheetTitle>Filter Scope Items</SheetTitle>
              <SheetDescription>Apply path, status, and delivery filters.</SheetDescription>
            </SheetHeader>

            <div className="mt-4 space-y-6">
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Path</h4>
                <div className="grid grid-cols-1 gap-2">
                  {pathOptions.map((option) => (
                    <Button
                      key={option.value}
                      variant={draftFilters.path === option.value ? "default" : "outline"}
                      size="sm"
                      className="justify-start gap-2 h-10"
                      onClick={() => updateDraftFilter("path", option.value)}
                    >
                      {option.icon}
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Status</h4>
                <div className="space-y-2">
                  {statusOptions.map((option) => (
                    <label key={option.value} className="flex items-center gap-3 p-2 border rounded-md">
                      <Checkbox
                        checked={draftFilters.status.includes(option.value)}
                        onCheckedChange={() => toggleDraftStatus(option.value)}
                      />
                      <span className={cn("px-1.5 py-0.5 rounded text-xs", option.color)}>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Delivery</h4>
                <div className="grid grid-cols-1 gap-2">
                  {deliveryOptions.map((option) => (
                    <Button
                      key={option.value}
                      variant={draftFilters.delivery === option.value ? "default" : "outline"}
                      size="sm"
                      className="justify-start gap-2 h-10"
                      onClick={() => updateDraftFilter("delivery", option.value)}
                    >
                      {option.icon}
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 mt-6 flex items-center gap-2 bg-background pt-3">
              <Button variant="outline" className="flex-1" onClick={clearMobileFilters}>
                Clear
              </Button>
              <Button className="flex-1" onClick={applyMobileFilters}>
                Apply Filters
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Main filter row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by code or name..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-9 h-9"
          />
          {filters.search && (
            <button
              onClick={() => updateFilter("search", "")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-base-100 rounded"
            >
              <XIcon className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Path filter dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 gap-2",
                filters.path !== "all" && "border-primary/50 bg-primary/5"
              )}
            >
              {filters.path === "production" && <FactoryIcon className="h-4 w-4" />}
              {filters.path === "procurement" && <ShoppingCartIcon className="h-4 w-4" />}
              {filters.path === "all" ? "Path" : pathOptions.find(o => o.value === filters.path)?.label}
              <ChevronDownIcon className="h-3 w-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {pathOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => updateFilter("path", option.value)}
                className={cn(
                  "gap-2",
                  filters.path === option.value && "bg-primary/10"
                )}
              >
                {option.icon}
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Status filter dropdown (multi-select) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 gap-2",
                filters.status.length > 0 && "border-primary/50 bg-primary/5"
              )}
            >
              <FilterIcon className="h-4 w-4" />
              Status
              {filters.status.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {filters.status.length}
                </Badge>
              )}
              <ChevronDownIcon className="h-3 w-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[200px]">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Filter by status
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {statusOptions.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={filters.status.includes(option.value)}
                onCheckedChange={() => toggleStatus(option.value)}
              >
                <span className={cn("px-1.5 py-0.5 rounded text-xs", option.color)}>
                  {option.label}
                </span>
              </DropdownMenuCheckboxItem>
            ))}
            {filters.status.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => updateFilter("status", [])}
                  className="text-muted-foreground"
                >
                  Clear status filters
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Delivery filter dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 gap-2",
                filters.delivery !== "all" && "border-primary/50 bg-primary/5"
              )}
            >
              <TruckIcon className="h-4 w-4" />
              {filters.delivery === "all" ? "Delivery" : deliveryOptions.find(o => o.value === filters.delivery)?.label}
              <ChevronDownIcon className="h-3 w-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {deliveryOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => updateFilter("delivery", option.value)}
                className={cn(
                  "gap-2",
                  filters.delivery === option.value && "bg-primary/10"
                )}
              >
                {option.icon}
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {renderExtraAction && renderExtraAction()}

        {/* Clear all filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-9 text-muted-foreground hover:text-foreground"
          >
            <XIcon className="h-4 w-4 mr-1" />
            Clear all
          </Button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Results count */}
        <span className="text-sm text-muted-foreground">
          {hasActiveFilters ? (
            <>
              Showing <span className="font-medium text-foreground">{filteredCount}</span> of {totalCount}
            </>
          ) : (
            <>{totalCount} items</>
          )}
        </span>
      </div>

      {/* Active filters summary */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Active filters:</span>

          {filters.path !== "all" && (
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer hover:bg-base-200"
              onClick={() => updateFilter("path", "all")}
            >
              {filters.path === "production" ? (
                <FactoryIcon className="h-3 w-3" />
              ) : (
                <ShoppingCartIcon className="h-3 w-3" />
              )}
              {filters.path}
              <XIcon className="h-3 w-3 ml-1" />
            </Badge>
          )}

          {filters.status.map((status) => {
            const option = statusOptions.find((o) => o.value === status);
            return (
              <Badge
                key={status}
                variant="secondary"
                className={cn(
                  "gap-1 cursor-pointer hover:opacity-80",
                  option?.color
                )}
                onClick={() => toggleStatus(status)}
              >
                {option?.label}
                <XIcon className="h-3 w-3 ml-1" />
              </Badge>
            );
          })}

          {filters.delivery !== "all" && (
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer hover:bg-base-200"
              onClick={() => updateFilter("delivery", "all")}
            >
              {deliveryOptions.find((o) => o.value === filters.delivery)?.icon}
              {deliveryOptions.find((o) => o.value === filters.delivery)?.label}
              <XIcon className="h-3 w-3 ml-1" />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// FILTER HELPER FUNCTION
// ============================================================================

interface ScopeItemForFiltering {
  item_code: string;
  name: string;
  item_path: "production" | "procurement";
  status: string;
  is_shipped: boolean;
  is_installation_started: boolean;
  is_installed: boolean;
}

/**
 * Applies filters to an array of scope items.
 * Used in conjunction with ScopeItemsFilterBar.
 *
 * @example
 * const filteredItems = applyFilters(items, filters);
 */
export function applyFilters<T extends ScopeItemForFiltering>(
  items: T[],
  filters: ScopeItemsFilters
): T[] {
  return items.filter((item) => {
    // Search filter (case-insensitive)
    if (filters.search) {
      const search = filters.search.toLowerCase();
      const matchesCode = item.item_code.toLowerCase().includes(search);
      const matchesName = item.name.toLowerCase().includes(search);
      if (!matchesCode && !matchesName) return false;
    }

    // Path filter
    if (filters.path !== "all" && item.item_path !== filters.path) {
      return false;
    }

    // Status filter (any of selected statuses)
    if (filters.status.length > 0 && !filters.status.includes(item.status as ItemStatus)) {
      return false;
    }

    // Delivery filter
    if (filters.delivery !== "all") {
      switch (filters.delivery) {
        case "shipped":
          if (!item.is_shipped) return false;
          break;
        case "not_shipped":
          if (item.is_shipped) return false;
          break;
        case "installing":
          if (!item.is_installation_started || item.is_installed) return false;
          break;
        case "installed":
          if (!item.is_installed) return false;
          break;
      }
    }

    return true;
  });
}

export default ScopeItemsFilterBar;
