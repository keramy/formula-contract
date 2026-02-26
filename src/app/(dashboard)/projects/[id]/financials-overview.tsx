"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortIndicator } from "@/components/ui/sort-indicator";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  WalletIcon,
  ReceiptIcon,
  PercentIcon,
  FactoryIcon,
  PackageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types
interface ScopeItem {
  id: string;
  item_code: string;
  name: string;
  item_path: "production" | "procurement";
  quantity: number;
  initial_total_cost: number | null;
  actual_unit_cost: number | null;
}

interface FinancialsOverviewProps {
  scopeItems: ScopeItem[];
  currency: string;
  isClient: boolean;
}

// Currency formatting helper
const currencySymbols: Record<string, string> = { TRY: "₺", USD: "$", EUR: "€" };

function formatCurrency(value: number | null, currency: string): string {
  if (value === null || value === undefined) return "-";
  const symbol = currencySymbols[currency] || currency;
  return `${symbol}${value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

// KPI Card helper component
function KPICard({
  title,
  value,
  icon: Icon,
  subtitle,
  trend,
  trendLabel,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  subtitle?: string;
  trend?: "positive" | "negative" | "neutral";
  trendLabel?: string;
}) {
  return (
    <Card>
      <CardContent className="p-2.5 md:p-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[11px] md:text-xs font-medium text-muted-foreground">{title}</p>
            <p className="text-base md:text-lg font-bold leading-tight">{value}</p>
            {subtitle && (
              <p className="text-[10px] md:text-[11px] text-muted-foreground leading-tight">{subtitle}</p>
            )}
            {trendLabel && (
              <div className="mt-0.5 flex items-center gap-1">
                {trend === "positive" && (
                  <TrendingDownIcon className="size-3 text-emerald-500" />
                )}
                {trend === "negative" && (
                  <TrendingUpIcon className="size-3 text-rose-500" />
                )}
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    trend === "positive" && "text-emerald-600",
                    trend === "negative" && "text-rose-600",
                    trend === "neutral" && "text-muted-foreground"
                  )}
                >
                  {trendLabel}
                </span>
              </div>
            )}
          </div>
          <div className="rounded-md bg-muted p-1.5 md:p-2">
            <Icon className="size-3.5 md:size-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Path Breakdown Card helper component
function PathBreakdownCard({
  title,
  icon: Icon,
  count,
  budget,
  actual,
  variance,
  currency,
  colorClass,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  budget: number;
  actual: number;
  variance: number;
  currency: string;
  colorClass: string;
}) {
  const isPositiveVariance = variance >= 0;

  return (
    <Card>
      <CardHeader className="px-3 md:px-4 pb-1">
        <div className="flex items-center gap-2">
          <div className={cn("rounded-md p-1.5", colorClass)}>
            <Icon className="size-3.5" />
          </div>
          <div>
            <CardTitle className="text-xs md:text-sm font-semibold leading-tight">{title}</CardTitle>
            <p className="text-[10px] md:text-[11px] text-muted-foreground">{count} items</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 md:px-4 pt-1 pb-3">
        <div className="grid grid-cols-3 gap-2 md:gap-3 text-center">
          <div>
            <p className="mb-0.5 text-[10px] md:text-[11px] text-muted-foreground">Budget</p>
            <p className="text-xs md:text-sm font-semibold">
              {formatCurrency(budget, currency)}
            </p>
          </div>
          <div>
            <p className="mb-0.5 text-[10px] md:text-[11px] text-muted-foreground">Actual</p>
            <p className="text-xs md:text-sm font-semibold">
              {formatCurrency(actual, currency)}
            </p>
          </div>
          <div>
            <p className="mb-0.5 text-[10px] md:text-[11px] text-muted-foreground">Variance</p>
            <p
              className={cn(
                "text-xs md:text-sm font-semibold",
                isPositiveVariance ? "text-emerald-600" : "text-rose-600"
              )}
            >
              {isPositiveVariance ? "+" : ""}
              {formatCurrency(variance, currency)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type SortKey = "rowNumber" | "item_code" | "name" | "budget" | "actual" | "variance";
type SortDir = "asc" | "desc";

export function FinancialsOverview({
  scopeItems,
  currency,
  isClient,
}: FinancialsOverviewProps) {
  // Default sort by row number (same order as Scope Items table)
  const [sortKey, setSortKey] = useState<SortKey>("rowNumber");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Calculate totals
  const totals = useMemo(() => {
    const budget = scopeItems.reduce(
      (sum, item) => sum + (item.initial_total_cost || 0),
      0
    );
    const actual = scopeItems.reduce(
      (sum, item) => sum + (item.actual_unit_cost || 0) * item.quantity,
      0
    );
    const variance = budget - actual;
    const variancePercentage =
      budget > 0 ? Math.round((variance / budget) * 100) : 0;

    return { budget, actual, variance, variancePercentage };
  }, [scopeItems]);

  // Calculate path breakdowns
  const pathBreakdown = useMemo(() => {
    const production = scopeItems.filter(
      (item) => item.item_path === "production"
    );
    const procurement = scopeItems.filter(
      (item) => item.item_path === "procurement"
    );

    const calcPath = (items: ScopeItem[]) => {
      const budget = items.reduce(
        (sum, item) => sum + (item.initial_total_cost || 0),
        0
      );
      const actual = items.reduce(
        (sum, item) => sum + (item.actual_unit_cost || 0) * item.quantity,
        0
      );
      return { count: items.length, budget, actual, variance: budget - actual };
    };

    return {
      production: calcPath(production),
      procurement: calcPath(procurement),
    };
  }, [scopeItems]);

  // Process items for table with variance calculation and row numbers
  const tableData = useMemo(() => {
    return scopeItems.map((item, index) => {
      const budget = item.initial_total_cost || 0;
      const actual = (item.actual_unit_cost || 0) * item.quantity;
      const variance = budget - actual;
      return {
        ...item,
        rowNumber: index + 1, // Match Scope Items table numbering
        budget,
        actual,
        variance,
      };
    });
  }, [scopeItems]);

  // Sort table data with natural sorting for item codes
  const sortedTableData = useMemo(() => {
    return [...tableData].sort((a, b) => {
      let comparison = 0;

      switch (sortKey) {
        case "rowNumber":
          // Sort by original order (matches Scope Items table)
          comparison = a.rowNumber - b.rowNumber;
          break;
        case "item_code":
          // Natural sort: handles "2" < "10" correctly, works with "A-2", "A-10", etc.
          comparison = a.item_code.localeCompare(b.item_code, undefined, {
            numeric: true,
            sensitivity: "base",
          });
          break;
        case "name":
          comparison = a.name.localeCompare(b.name, undefined, {
            sensitivity: "base",
          });
          break;
        case "budget":
          comparison = a.budget - b.budget;
          break;
        case "actual":
          comparison = a.actual - b.actual;
          break;
        case "variance":
          comparison = a.variance - b.variance;
          break;
      }

      return sortDir === "asc" ? comparison : -comparison;
    });
  }, [tableData, sortKey, sortDir]);

  // Handle sort toggle
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      // Text columns default to asc, numeric columns default to desc (except rowNumber)
      setSortDir(key === "rowNumber" || key === "item_code" || key === "name" ? "asc" : "desc");
    }
  };

  // Clients shouldn't see financial data
  if (isClient) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <WalletIcon className="size-12 mx-auto mb-4 opacity-50" />
        <p>Financial information is not available for client users.</p>
      </div>
    );
  }

  const isPositiveVariance = totals.variance >= 0;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium">Financials</h3>
        <p className="text-sm text-muted-foreground">
          Budget vs actual cost analysis for {scopeItems.length} scope items
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
        <KPICard
          title="Budget"
          value={formatCurrency(totals.budget, currency)}
          icon={WalletIcon}
          subtitle="Initial total cost"
        />
        <KPICard
          title="Actual"
          value={formatCurrency(totals.actual, currency)}
          icon={ReceiptIcon}
          subtitle="Current total cost"
        />
        <KPICard
          title="Variance"
          value={`${isPositiveVariance ? "+" : ""}${formatCurrency(totals.variance, currency)}`}
          icon={isPositiveVariance ? TrendingDownIcon : TrendingUpIcon}
          trend={
            totals.variance === 0
              ? "neutral"
              : isPositiveVariance
                ? "positive"
                : "negative"
          }
          trendLabel={isPositiveVariance ? "Under budget" : "Over budget"}
        />
        <KPICard
          title="Variance %"
          value={`${totals.variancePercentage > 0 ? "+" : ""}${totals.variancePercentage}%`}
          icon={PercentIcon}
          trend={
            totals.variancePercentage === 0
              ? "neutral"
              : totals.variancePercentage > 0
                ? "positive"
                : "negative"
          }
          trendLabel={
            totals.variancePercentage >= 0
              ? "Savings achieved"
              : "Budget exceeded"
          }
        />
      </div>

      {/* Path Breakdown */}
      <div className="grid gap-2 md:gap-3 md:grid-cols-2">
        <PathBreakdownCard
          title="Production"
          icon={FactoryIcon}
          count={pathBreakdown.production.count}
          budget={pathBreakdown.production.budget}
          actual={pathBreakdown.production.actual}
          variance={pathBreakdown.production.variance}
          currency={currency}
          colorClass="bg-blue-100 text-blue-700"
        />
        <PathBreakdownCard
          title="Procurement"
          icon={PackageIcon}
          count={pathBreakdown.procurement.count}
          budget={pathBreakdown.procurement.budget}
          actual={pathBreakdown.procurement.actual}
          variance={pathBreakdown.procurement.variance}
          currency={currency}
          colorClass="bg-purple-100 text-purple-700"
        />
      </div>

      {/* Item-level Cost Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Item Cost Breakdown
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Detailed cost analysis per scope item
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[50px] pl-6">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort("rowNumber")}
                      className="-ml-3 h-8 font-medium"
                    >
                      #
                      <SortIndicator column="rowNumber" activeColumn={sortKey} direction={sortDir} />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[120px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort("item_code")}
                      className="-ml-3 h-8 font-medium"
                    >
                      Code
                      <SortIndicator column="item_code" activeColumn={sortKey} direction={sortDir} />
                    </Button>
                  </TableHead>
                  <TableHead className="min-w-[200px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort("name")}
                      className="-ml-3 h-8 font-medium"
                    >
                      Description
                      <SortIndicator column="name" activeColumn={sortKey} direction={sortDir} />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">Path</TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort("budget")}
                      className="-mr-3 h-8 font-medium"
                    >
                      Budget
                      <SortIndicator column="budget" activeColumn={sortKey} direction={sortDir} />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort("actual")}
                      className="-mr-3 h-8 font-medium"
                    >
                      Actual
                      <SortIndicator column="actual" activeColumn={sortKey} direction={sortDir} />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right pr-6">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort("variance")}
                      className="-mr-3 h-8 font-medium"
                    >
                      Variance
                      <SortIndicator column="variance" activeColumn={sortKey} direction={sortDir} />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTableData.length > 0 ? (
                  sortedTableData.map((item) => {
                    const isItemPositiveVariance = item.variance >= 0;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="pl-6 text-center text-sm text-muted-foreground">
                          {item.rowNumber}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {item.item_code}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium truncate max-w-[300px]">
                            {item.name}
                          </p>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              item.item_path === "production"
                                ? "border-blue-200 bg-blue-50 text-blue-700"
                                : "border-purple-200 bg-purple-50 text-purple-700"
                            )}
                          >
                            {item.item_path === "production"
                              ? "Production"
                              : "Procurement"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(item.budget, currency)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {item.actual > 0
                            ? formatCurrency(item.actual, currency)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          {item.actual > 0 ? (
                            <span
                              className={cn(
                                "font-mono text-sm font-medium",
                                isItemPositiveVariance
                                  ? "text-emerald-600"
                                  : "text-rose-600"
                              )}
                            >
                              {isItemPositiveVariance ? "+" : ""}
                              {formatCurrency(item.variance, currency)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <p className="text-muted-foreground">No scope items</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
