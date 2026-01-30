import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlassCard, GradientIcon } from "@/components/ui/ui-helpers";
import {
  BanknoteIcon,
  TrendingUpIcon,
  CircleDotIcon,
} from "lucide-react";
import type { FinancialOverview } from "@/lib/actions/dashboard";

interface FinancialOverviewWidgetProps {
  financial: FinancialOverview;
}

const currencySymbols: Record<string, string> = { TRY: "₺", USD: "$", EUR: "€" };

function formatCurrency(value: number, currency: string): string {
  const symbol = currencySymbols[currency] || currency;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${symbol}${formatted}`;
}

export function FinancialOverviewWidget({ financial }: FinancialOverviewWidgetProps) {
  const total = financial.totalContractValue;
  const tenderPercent = total > 0 ? Math.round((financial.byStatus.tender / total) * 100) : 0;
  const activePercent = total > 0 ? Math.round((financial.byStatus.active / total) * 100) : 0;
  const completedPercent = total > 0 ? Math.round((financial.byStatus.completed / total) * 100) : 0;

  return (
    <GlassCard>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <GradientIcon icon={<BanknoteIcon className="size-4" />} color="emerald" size="sm" />
          <CardTitle className="text-base font-semibold">Financial Overview</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="py-6 text-center text-muted-foreground">
            <BanknoteIcon className="size-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No contract values recorded</p>
            <p className="text-xs text-muted-foreground mt-1">Add contract values to projects</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Total Value */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100">
              <div className="flex items-center gap-2 text-sm text-emerald-700 mb-1">
                <TrendingUpIcon className="size-4" />
                <span>Total Contract Value</span>
              </div>
              <p className="text-2xl font-bold text-emerald-800">
                {formatCurrency(total, financial.currency)}
              </p>
              <p className="text-xs text-emerald-600 mt-1">
                Across {financial.projectCount} projects
              </p>
            </div>

            {/* Breakdown by Status */}
            <div className="space-y-3">
              {/* Visual Bar */}
              <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
                {tenderPercent > 0 && (
                  <div
                    className="bg-sky-500"
                    style={{ width: `${tenderPercent}%` }}
                    title={`Tender: ${tenderPercent}%`}
                  />
                )}
                {activePercent > 0 && (
                  <div
                    className="bg-emerald-500"
                    style={{ width: `${activePercent}%` }}
                    title={`Active: ${activePercent}%`}
                  />
                )}
                {completedPercent > 0 && (
                  <div
                    className="bg-gray-400"
                    style={{ width: `${completedPercent}%` }}
                    title={`Completed: ${completedPercent}%`}
                  />
                )}
              </div>

              {/* Legend */}
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <CircleDotIcon className="size-3 text-sky-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Tender</p>
                    <p className="font-medium">{formatCurrency(financial.byStatus.tender, financial.currency)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CircleDotIcon className="size-3 text-emerald-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Active</p>
                    <p className="font-medium">{formatCurrency(financial.byStatus.active, financial.currency)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CircleDotIcon className="size-3 text-gray-400" />
                  <div>
                    <p className="text-xs text-muted-foreground">Done</p>
                    <p className="font-medium">{formatCurrency(financial.byStatus.completed, financial.currency)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </GlassCard>
  );
}
