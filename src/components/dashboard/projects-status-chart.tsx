"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlassCard, GradientIcon } from "@/components/ui/ui-helpers";
import { PieChartIcon } from "lucide-react";
import type { ProjectsByStatus } from "@/lib/actions/dashboard";

interface ProjectsStatusChartProps {
  data: ProjectsByStatus;
}

const STATUS_CONFIG = [
  { key: "active", label: "Active", color: "#10b981" },        // emerald-500
  { key: "tender", label: "Tender", color: "#0ea5e9" },        // sky-500
  { key: "on_hold", label: "On Hold", color: "#f59e0b" },      // amber-500
  { key: "completed", label: "Completed", color: "#6b7280" },  // gray-500
  { key: "cancelled", label: "Cancelled", color: "#ef4444" },  // red-500
  { key: "not_awarded", label: "Not Awarded", color: "#ec4899" }, // pink-500 (distinguishes from cancelled)
];

export function ProjectsStatusChart({ data }: ProjectsStatusChartProps) {
  // Transform data for the chart
  const chartData = STATUS_CONFIG
    .map(status => ({
      name: status.label,
      value: data[status.key as keyof Omit<ProjectsByStatus, 'total'>],
      color: status.color,
    }))
    .filter(item => item.value > 0); // Only show statuses with projects

  if (data.total === 0) {
    return (
      <GlassCard>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center gap-2">
            <GradientIcon icon={<PieChartIcon className="size-4" />} color="teal" size="sm" />
            <CardTitle className="text-sm font-semibold">Projects by Status</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="py-8 text-center text-muted-foreground">
            <PieChartIcon className="size-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No projects yet</p>
          </div>
        </CardContent>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <CardHeader className="pb-0 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GradientIcon icon={<PieChartIcon className="size-4" />} color="teal" size="sm" />
            <CardTitle className="text-sm font-semibold">Projects by Status</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground">{data.total} total</span>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white border border-base-200 rounded-lg shadow-sm px-3 py-2">
                        <p className="text-sm font-medium">{data.name}</p>
                        <p className="text-lg font-bold" style={{ color: data.color }}>
                          {data.value} project{data.value !== 1 ? "s" : ""}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
          {chartData.map((item) => (
            <div key={item.name} className="flex items-center gap-1.5">
              <div
                className="size-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-muted-foreground">
                {item.name} ({item.value})
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </GlassCard>
  );
}
