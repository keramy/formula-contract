"use client";

import { Cell, Pie, PieChart, Label } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface MaterialsStatusChartProps {
  data: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
}

const chartConfig = {
  materials: {
    label: "Materials",
  },
  pending: {
    label: "Pending",
    color: "hsl(45, 93%, 47%)",
  },
  approved: {
    label: "Approved",
    color: "hsl(142, 71%, 45%)",
  },
  rejected: {
    label: "Rejected",
    color: "hsl(0, 84%, 60%)",
  },
} satisfies ChartConfig;

const COLORS = [
  "hsl(45, 93%, 47%)",
  "hsl(142, 71%, 45%)",
  "hsl(0, 84%, 60%)",
];

export function MaterialsStatusChart({ data }: MaterialsStatusChartProps) {
  const chartData = [
    { name: "Pending", value: data.pending, fill: COLORS[0] },
    { name: "Approved", value: data.approved, fill: COLORS[1] },
    { name: "Rejected", value: data.rejected, fill: COLORS[2] },
  ].filter(item => item.value > 0);

  if (data.total === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
        No materials data
      </div>
    );
  }

  const approvalRate = data.total > 0
    ? Math.round((data.approved / data.total) * 100)
    : 0;

  return (
    <ChartContainer config={chartConfig} className="h-[200px] w-full">
      <PieChart>
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel />}
        />
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          innerRadius={50}
          outerRadius={80}
          strokeWidth={2}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
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
                      {approvalRate}%
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy || 0) + 20}
                      className="fill-muted-foreground text-xs"
                    >
                      Approved
                    </tspan>
                  </text>
                );
              }
            }}
          />
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}
