"use client";

import { Bar, BarChart, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface ProjectStatusChartProps {
  data: {
    tender: number;
    active: number;
    on_hold: number;
    completed: number;
    cancelled: number;
  };
}

const chartConfig = {
  count: {
    label: "Projects",
  },
  tender: {
    label: "Tender",
    color: "hsl(217, 91%, 60%)",
  },
  active: {
    label: "Active",
    color: "hsl(142, 71%, 45%)",
  },
  on_hold: {
    label: "On Hold",
    color: "hsl(45, 93%, 47%)",
  },
  completed: {
    label: "Completed",
    color: "hsl(215, 14%, 34%)",
  },
  cancelled: {
    label: "Cancelled",
    color: "hsl(0, 84%, 60%)",
  },
} satisfies ChartConfig;

export function ProjectStatusChart({ data }: ProjectStatusChartProps) {
  const chartData = [
    { status: "Tender", count: data.tender, fill: "hsl(217, 91%, 60%)" },
    { status: "Active", count: data.active, fill: "hsl(142, 71%, 45%)" },
    { status: "On Hold", count: data.on_hold, fill: "hsl(45, 93%, 47%)" },
    { status: "Completed", count: data.completed, fill: "hsl(215, 14%, 34%)" },
    { status: "Cancelled", count: data.cancelled, fill: "hsl(0, 84%, 60%)" },
  ].filter(item => item.count > 0);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
        No project data available
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-[200px] w-full">
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ left: 0, right: 0 }}
      >
        <YAxis
          dataKey="status"
          type="category"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          width={80}
        />
        <XAxis type="number" hide />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel />}
        />
        <Bar dataKey="count" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
