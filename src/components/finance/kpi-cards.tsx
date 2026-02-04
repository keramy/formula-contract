"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSignIcon,
  WalletIcon,
  ReceiptIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FinanceKPIs {
  totalContractValue: number;
  totalBudgetAllocated: number;
  totalActualSpent: number;
  variance: number;
  variancePercentage: number;
  currency: string;
  projectCount: number;
}

interface KPICardsProps {
  data: FinanceKPIs;
}

// Currency formatting helper
const currencySymbols: Record<string, string> = { TRY: "₺", USD: "$", EUR: "€" };

function formatCurrency(value: number, currency: string): string {
  const symbol = currencySymbols[currency] || currency;
  // Format large numbers with K/M suffix
  if (Math.abs(value) >= 1000000) {
    return `${symbol}${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `${symbol}${(value / 1000).toFixed(0)}K`;
  }
  return `${symbol}${value.toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}

function formatFullCurrency(value: number, currency: string): string {
  const symbol = currencySymbols[currency] || currency;
  return `${symbol}${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function KPICards({ data }: KPICardsProps) {
  const isPositiveVariance = data.variance >= 0;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
      {/* Total Contract Value */}
      <Card className="border border-base-200 overflow-hidden">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSignIcon className="size-5 rounded-md border p-1 text-emerald-600" />
                Total Contract Value
              </p>
              <p className="text-3xl font-bold tracking-tight">
                {formatCurrency(data.totalContractValue, data.currency)}
              </p>
              <p className="text-xs text-muted-foreground">
                Across {data.projectCount} projects
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget Allocated */}
      <Card className="border border-base-200 overflow-hidden">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <WalletIcon className="size-5 rounded-md border p-1 text-blue-600" />
                Budget Allocated
              </p>
              <p className="text-3xl font-bold tracking-tight">
                {formatCurrency(data.totalBudgetAllocated, data.currency)}
              </p>
              <p className="text-xs text-muted-foreground">
                Initial total cost of all items
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actual Spent */}
      <Card className="border border-base-200 overflow-hidden">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ReceiptIcon className="size-5 rounded-md border p-1 text-amber-600" />
                Actual Spent
              </p>
              <p className="text-3xl font-bold tracking-tight">
                {formatCurrency(data.totalActualSpent, data.currency)}
              </p>
              <p className="text-xs text-muted-foreground">
                Current costs (qty × actual unit cost)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Variance */}
      <Card className={cn(
        "border overflow-hidden",
        isPositiveVariance ? "border-emerald-200 bg-emerald-50/30" : "border-rose-200 bg-rose-50/30"
      )}>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                {isPositiveVariance ? (
                  <TrendingUpIcon className="size-5 rounded-md border p-1 text-emerald-600" />
                ) : (
                  <TrendingDownIcon className="size-5 rounded-md border p-1 text-rose-600" />
                )}
                Variance
              </p>
              <p className={cn(
                "text-3xl font-bold tracking-tight",
                isPositiveVariance ? "text-emerald-600" : "text-rose-600"
              )}>
                {isPositiveVariance ? "+" : ""}{formatCurrency(data.variance, data.currency)}
              </p>
              <div className="flex items-center gap-1">
                {isPositiveVariance ? (
                  <ArrowUpIcon className="size-3 text-emerald-600" />
                ) : (
                  <ArrowDownIcon className="size-3 text-rose-600" />
                )}
                <span className={cn(
                  "text-xs font-medium",
                  isPositiveVariance ? "text-emerald-600" : "text-rose-600"
                )}>
                  {Math.abs(data.variancePercentage)}% {isPositiveVariance ? "under" : "over"} budget
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
