"use client";

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";
import { TrendingUpIcon, TrendingDownIcon } from "lucide-react";

interface BudgetTrendItem {
  month: string;
  monthLabel: string;
  budget: number;
  actual: number;
}

interface BudgetTrendChartProps {
  data: BudgetTrendItem[];
  currency: string;
}

const chartConfig = {
  budget: {
    label: "Budget",
    color: "hsl(217, 91%, 60%)", // blue-500
  },
  actual: {
    label: "Actual",
    color: "hsl(142, 76%, 36%)", // emerald-500
  },
} satisfies ChartConfig;

export function BudgetTrendChart({ data, currency }: BudgetTrendChartProps) {
  // Calculate trend (comparing last month to previous)
  const lastMonth = data[data.length - 1];
  const prevMonth = data[data.length - 2];

  let trendPercent = 0;
  let isPositive = true;

  if (lastMonth && prevMonth && prevMonth.actual > 0) {
    trendPercent = Math.round(((lastMonth.actual - prevMonth.actual) / prevMonth.actual) * 100);
    isPositive = trendPercent <= 0; // Lower spend is positive
  }

  return (
    <Card className="border border-base-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Budget vs Actual Trend</CardTitle>
        <p className="text-sm text-muted-foreground">Monthly comparison (in thousands)</p>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[220px] w-full lg:h-[280px]">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="monthLabel"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
              tickFormatter={(value) => `${value}K`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <div className="flex items-center justify-between gap-8">
                      <span className="text-muted-foreground">{name}</span>
                      <span className="font-mono font-medium">
                        {currency === "TRY" ? "₺" : currency === "USD" ? "$" : "€"}
                        {Number(value).toLocaleString()}K
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Bar
              dataKey="budget"
              fill="var(--color-budget)"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
            <Bar
              dataKey="actual"
              fill="var(--color-actual)"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm border-t pt-4">
        <div className="flex items-center gap-2 font-medium">
          {isPositive ? (
            <>
              <TrendingDownIcon className="size-4 text-emerald-600" />
              <span className="text-emerald-600">
                Spending down {Math.abs(trendPercent)}% from last month
              </span>
            </>
          ) : (
            <>
              <TrendingUpIcon className="size-4 text-rose-600" />
              <span className="text-rose-600">
                Spending up {Math.abs(trendPercent)}% from last month
              </span>
            </>
          )}
        </div>
        <p className="text-muted-foreground">
          Last 6 months budget allocation vs actual spend
        </p>
      </CardFooter>
    </Card>
  );
}
