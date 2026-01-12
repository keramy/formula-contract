"use client";

import { Cell, Pie, PieChart, Label } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface ProductionProgressChartProps {
  data: {
    total: number;
    notStarted: number;
    inProgress: number;
    completed: number;
    avgProgress: number;
  };
}

const chartConfig = {
  items: {
    label: "Items",
  },
  notStarted: {
    label: "Not Started",
    color: "hsl(215, 14%, 75%)",
  },
  inProgress: {
    label: "In Progress",
    color: "hsl(217, 91%, 60%)",
  },
  completed: {
    label: "Completed",
    color: "hsl(142, 71%, 45%)",
  },
} satisfies ChartConfig;

const COLORS = [
  "hsl(215, 14%, 75%)",
  "hsl(217, 91%, 60%)",
  "hsl(142, 71%, 45%)",
];

export function ProductionProgressChart({ data }: ProductionProgressChartProps) {
  const chartData = [
    { name: "Not Started", value: data.notStarted, fill: COLORS[0] },
    { name: "In Progress", value: data.inProgress, fill: COLORS[1] },
    { name: "Completed", value: data.completed, fill: COLORS[2] },
  ].filter(item => item.value > 0);

  if (data.total === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
        No production items
      </div>
    );
  }

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
                      {data.avgProgress}%
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy || 0) + 20}
                      className="fill-muted-foreground text-xs"
                    >
                      Average
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
