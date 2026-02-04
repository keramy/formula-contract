"use client";

import { useState, useEffect, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { GlassCard, GradientIcon, EmptyState } from "@/components/ui/ui-helpers";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
  ActivityIcon,
  FileImageIcon,
  PackageIcon,
  ClipboardListIcon,
  FilterIcon,
  XIcon,
} from "lucide-react";
import {
  getActivityLogs,
  type ActivityLog,
} from "@/lib/activity-log/actions";

type ActivityCategory = "all" | "drawings" | "materials" | "scope_items";

interface ProjectActivityFeedProps {
  projectId: string;
  limit?: number;
  maxHeight?: string;
}

const categoryConfig: Record<
  ActivityCategory,
  { label: string; icon: React.ComponentType<{ className?: string }>; actions: string[] }
> = {
  all: {
    label: "All Activity",
    icon: ActivityIcon,
    actions: [],
  },
  drawings: {
    label: "Drawings",
    icon: FileImageIcon,
    actions: ["drawing_uploaded", "drawing_sent_to_client", "drawing_approved", "drawing_rejected", "drawing_pm_override"],
  },
  materials: {
    label: "Materials",
    icon: PackageIcon,
    actions: ["material_created", "material_updated", "material_sent_to_client", "material_approved", "material_rejected"],
  },
  scope_items: {
    label: "Scope Items",
    icon: ClipboardListIcon,
    actions: ["item_created", "item_updated", "item_deleted", "item_status_changed"],
  },
};

const actionLabels: Record<string, string> = {
  project_created: "Created project",
  project_updated: "Updated project",
  project_status_changed: "Changed project status",
  drawing_uploaded: "Uploaded drawing",
  drawing_sent_to_client: "Sent drawing to client",
  drawing_approved: "Approved drawing",
  drawing_rejected: "Rejected drawing",
  drawing_pm_override: "PM override on drawing",
  material_created: "Created material",
  material_updated: "Updated material",
  material_sent_to_client: "Sent material to client",
  material_approved: "Approved material",
  material_rejected: "Rejected material",
  item_created: "Created scope item",
  item_updated: "Updated scope item",
  item_deleted: "Deleted scope item",
  item_status_changed: "Changed item status",
  user_assigned: "User assigned to project",
  user_unassigned: "User removed from project",
  report_created: "Created report",
  report_published: "Published report",
};

const actionColors: Record<string, string> = {
  // Success actions (green)
  drawing_approved: "bg-green-100 text-green-700",
  material_approved: "bg-green-100 text-green-700",
  item_created: "bg-green-100 text-green-700",
  report_published: "bg-green-100 text-green-700",

  // Warning actions (amber)
  drawing_sent_to_client: "bg-amber-100 text-amber-700",
  material_sent_to_client: "bg-amber-100 text-amber-700",
  item_status_changed: "bg-amber-100 text-amber-700",

  // Danger actions (red)
  drawing_rejected: "bg-red-100 text-red-700",
  material_rejected: "bg-red-100 text-red-700",
  item_deleted: "bg-red-100 text-red-700",

  // Info actions (blue)
  drawing_uploaded: "bg-blue-100 text-blue-700",
  item_updated: "bg-blue-100 text-blue-700",
  material_updated: "bg-blue-100 text-blue-700",

  // Default (violet)
  default: "bg-primary-100 text-primary-700",
};

export function ProjectActivityFeed({
  projectId,
  limit = 30,
  maxHeight = "400px",
}: ProjectActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<ActivityCategory>("all");

  useEffect(() => {
    loadActivities();
  }, [projectId, limit]);

  const loadActivities = async () => {
    setIsLoading(true);
    const data = await getActivityLogs({ projectId, limit });
    setActivities(data);
    setIsLoading(false);
  };

  // Filter activities based on selected category
  const filteredActivities = useMemo(() => {
    if (activeCategory === "all") {
      return activities;
    }
    const allowedActions = categoryConfig[activeCategory].actions;
    return activities.filter((a) => allowedActions.includes(a.action));
  }, [activities, activeCategory]);

  const getEntityLabel = (activity: ActivityLog) => {
    const details = activity.details as Record<string, string> | null;
    if (details?.name) return details.name;
    if (details?.item_code) return details.item_code;
    return null;
  };

  const getActionColor = (action: string) => {
    return actionColors[action] || actionColors.default;
  };

  if (isLoading) {
    return (
      <GlassCard>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <GradientIcon icon={<ActivityIcon className="size-4" />} color="primary" size="sm" />
            Project Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Spinner className="size-6 text-primary" />
          </div>
        </CardContent>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <GradientIcon icon={<ActivityIcon className="size-4" />} color="primary" size="sm" />
            Project Activity
          </CardTitle>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <FilterIcon className="size-3" />
            Filter
          </div>
        </div>
      </CardHeader>

      {/* Category Filter Chips */}
      <div className="px-4 pb-3">
        <div className="flex flex-wrap gap-2">
          {(Object.entries(categoryConfig) as [ActivityCategory, typeof categoryConfig["all"]][]).map(
            ([key, config]) => {
              const isActive = activeCategory === key;
              const Icon = config.icon;
              const count =
                key === "all"
                  ? activities.length
                  : activities.filter((a) => config.actions.includes(a.action)).length;

              return (
                <Button
                  key={key}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-7 text-xs gap-1.5",
                    isActive && "bg-primary hover:bg-primary-700"
                  )}
                  onClick={() => setActiveCategory(key)}
                >
                  <Icon className="size-3" />
                  {config.label}
                  <span className="ml-1 opacity-70">({count})</span>
                </Button>
              );
            }
          )}
        </div>
      </div>

      <CardContent className="pt-0">
        {filteredActivities.length === 0 ? (
          <EmptyState
            icon={<ActivityIcon className="size-6" />}
            title="No activity"
            description={
              activeCategory === "all"
                ? "No activity recorded for this project yet"
                : `No ${categoryConfig[activeCategory].label.toLowerCase()} activity`
            }
          />
        ) : (
          <ScrollArea style={{ maxHeight }}>
            <div className="space-y-3">
              {filteredActivities.map((activity) => {
                const entityLabel = getEntityLabel(activity);
                const actionLabel = actionLabels[activity.action] || activity.action;
                const colorClass = getActionColor(activity.action);

                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-gray-50/50 hover:bg-gray-100/70 transition-colors"
                  >
                    {/* Action badge */}
                    <div className={cn("px-2 py-1 rounded-md text-xs font-medium shrink-0", colorClass)}>
                      {actionLabel}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{activity.user?.name || "System"}</span>
                        {entityLabel && (
                          <>
                            {" "}
                            <span className="text-muted-foreground">on</span>{" "}
                            <span className="font-medium">{entityLabel}</span>
                          </>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </GlassCard>
  );
}
