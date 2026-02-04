"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Pie, PieChart, Cell, Label } from "recharts";

interface BudgetBreakdownItem {
  status: string;
  label: string;
  value: number;
  color: string;
  count: number;
  [key: string]: string | number; // Index signature for Recharts compatibility
}

interface BudgetBreakdownProps {
  data: BudgetBreakdownItem[];
  currency: string;
}

// Currency formatting helper
const currencySymbols: Record<string, string> = { TRY: "₺", USD: "$", EUR: "€" };

function formatCurrency(value: number, currency: string): string {
  const symbol = currencySymbols[currency] || currency;
  if (Math.abs(value) >= 1000000) {
    return `${symbol}${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `${symbol}${(value / 1000).toFixed(0)}K`;
  }
  return `${symbol}${value.toLocaleString("en-US")}`;
}

export function BudgetBreakdown({ data, currency }: BudgetBreakdownProps) {
  // Calculate total for center label
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const totalProjects = data.reduce((sum, item) => sum + item.count, 0);

  // Build chart config dynamically
  const chartConfig: ChartConfig = {};
  for (const item of data) {
    chartConfig[item.status] = {
      label: item.label,
      color: item.color,
    };
  }

  return (
    <Card className="border border-base-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Budget by Status</CardTitle>
        <p className="text-sm text-muted-foreground">Contract value distribution</p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row items-center gap-4">
          {/* Donut Chart */}
          <ChartContainer config={chartConfig} className="h-[200px] w-[200px] mx-auto">
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name, item) => (
                      <div className="flex items-center justify-between gap-8">
                        <div className="flex items-center gap-2">
                          <span
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: (item.payload as { fill?: string })?.fill || item.color }}
                          />
                          <span className="text-muted-foreground">{name}</span>
                        </div>
                        <span className="font-mono font-medium">
                          {formatCurrency(Number(value), currency)}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-2xl font-bold"
                          >
                            {formatCurrency(total, currency)}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 20}
                            className="fill-muted-foreground text-xs"
                          >
                            Total Value
                          </tspan>
                        </text>
                      );
                    }
                    return null;
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>

          {/* Legend */}
          <div className="grid gap-2 flex-1 w-full lg:w-auto">
            {data.map((item) => (
              <div
                key={item.status}
                className="flex items-center justify-between gap-4 bg-muted/50 rounded-md p-3"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="size-3 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {formatCurrency(item.value, currency)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.count} project{item.count !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
