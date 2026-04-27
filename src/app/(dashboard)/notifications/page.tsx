"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePageHeader } from "@/components/layout/app-header";
import { GlassCard, GradientIcon, EmptyState } from "@/components/ui/ui-helpers";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BellIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ClockIcon,
  FileIcon,
  CheckCheckIcon,
  FilterIcon,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import {
  useFilteredNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useUnreadCount,
  type Notification,
} from "@/lib/react-query/notifications";

type GradientColor = "coral" | "teal" | "violet" | "amber" | "rose" | "emerald" | "sky" | "slate" | "primary";

const typeConfig: Record<string, { icon: React.ReactNode; color: GradientColor; label: string }> = {
  drawing_approved: { icon: <CheckCircleIcon className="size-3.5" />, color: "emerald", label: "Drawing Approved" },
  drawing_rejected: { icon: <AlertCircleIcon className="size-3.5" />, color: "rose", label: "Drawing Rejected" },
  drawing_uploaded: { icon: <FileIcon className="size-3.5" />, color: "sky", label: "Drawing Uploaded" },
  drawing_sent: { icon: <ClockIcon className="size-3.5" />, color: "amber", label: "Drawing Sent" },
  material_approved: { icon: <CheckCircleIcon className="size-3.5" />, color: "teal", label: "Material Approved" },
  material_rejected: { icon: <AlertCircleIcon className="size-3.5" />, color: "rose", label: "Material Rejected" },
  project_assigned: { icon: <FileIcon className="size-3.5" />, color: "primary", label: "Project Assigned" },
  milestone_due: { icon: <ClockIcon className="size-3.5" />, color: "coral", label: "Milestone Due" },
  milestone_overdue: { icon: <AlertCircleIcon className="size-3.5" />, color: "rose", label: "Milestone Overdue" },
  report_published: { icon: <FileIcon className="size-3.5" />, color: "teal", label: "Report Published" },
  finance_weekly_digest: { icon: <FileIcon className="size-3.5" />, color: "amber", label: "Finance Digest" },
  finance_manual_summary: { icon: <FileIcon className="size-3.5" />, color: "amber", label: "Payment Summary" },
  finance_urgent_notify: { icon: <AlertCircleIcon className="size-3.5" />, color: "rose", label: "Urgent Payment" },
  default: { icon: <BellIcon className="size-3.5" />, color: "slate", label: "Notification" },
};

const PAGE_SIZE = 30;

const NOTIFICATION_TYPES = [
  { value: "all", label: "All Types" },
  { value: "drawing_approved", label: "Drawing Approved" },
  { value: "drawing_rejected", label: "Drawing Rejected" },
  { value: "drawing_uploaded", label: "Drawing Uploaded" },
  { value: "drawing_sent", label: "Drawing Sent" },
  { value: "material_approved", label: "Material Approved" },
  { value: "material_rejected", label: "Material Rejected" },
  { value: "project_assigned", label: "Project Assigned" },
  { value: "milestone_due", label: "Milestone Due" },
  { value: "report_published", label: "Report Published" },
];

export default function NotificationsPage() {
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [offset, setOffset] = useState(0);

  const { setContent } = usePageHeader();
  const { data: unreadCount = 0 } = useUnreadCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  useEffect(() => {
    setContent({
      icon: <GradientIcon icon={<BellIcon className="size-4" />} color="primary" size="sm" />,
      title: "Notifications",
      description: unreadCount > 0 ? `${unreadCount} unread` : "All caught up",
    });
    return () => setContent({});
  }, [setContent, unreadCount]);

  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value);
    setOffset(0);
  };

  const handleUnreadOnlyChange = (value: boolean) => {
    setUnreadOnly(value);
    setOffset(0);
  };

  const { data, isLoading } = useFilteredNotifications({
    unreadOnly,
    type: typeFilter !== "all" ? typeFilter : undefined,
    limit: PAGE_SIZE,
    offset,
  });

  const notifications = data?.notifications || [];
  const total = data?.total || 0;
  const hasMore = offset + PAGE_SIZE < total;

  const getConfig = (type: string) => typeConfig[type] || typeConfig.default;

  const handleClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }

    if (notification.project_id) {
      const type = notification.type;
      if (type === "drawing_approved" || type === "drawing_rejected" || type === "drawing_uploaded" || type === "drawing_sent") {
        router.push(`/projects/${notification.project_id}?tab=drawings`);
      } else if (type === "material_approved" || type === "material_rejected") {
        router.push(`/projects/${notification.project_id}?tab=materials`);
      } else if (type === "milestone_due" || type === "milestone_overdue") {
        router.push(`/projects/${notification.project_id}?tab=milestones`);
      } else if (notification.report_id || type === "report_published") {
        router.push(`/projects/${notification.project_id}?tab=reports`);
      } else {
        router.push(`/projects/${notification.project_id}`);
      }
    }
  };

  // Group notifications by project + 1-hour window
  const grouped = groupNotifications(notifications);

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
        <GlassCard>
          <div className="divide-y divide-base-100">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={`skel-${i}`} className="flex gap-3 p-4">
                <Skeleton className="size-8 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={unreadOnly ? "unread" : "all"} onValueChange={(v) => handleUnreadOnlyChange(v === "unread")}>
          <SelectTrigger className="w-[120px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={handleTypeFilterChange}>
          <SelectTrigger className="w-[170px] h-9">
            <FilterIcon className="size-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NOTIFICATION_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-xs text-muted-foreground ml-auto">
          {total} notification{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Notification List */}
      {grouped.length === 0 ? (
        <GlassCard>
          <EmptyState
            icon={<BellIcon className="size-8" />}
            title={unreadOnly ? "No unread notifications" : "No notifications"}
            description={unreadOnly ? "You're all caught up!" : "Notifications will appear here when they happen"}
          />
        </GlassCard>
      ) : (
        <GlassCard className="py-0">
          <div className="divide-y divide-base-100">
            {grouped.map((group) => {
              if (group.type === "single") {
                const n = group.notifications[0];
                const config = getConfig(n.type);
                const projectName = (n.project as { name: string } | null)?.name;
                const projectCode = (n.project as { project_code: string } | null)?.project_code;

                return (
                  <button
                    key={n.id}
                    className={cn(
                      "w-full flex gap-3 p-4 text-left hover:bg-primary/[0.04] transition-colors",
                      !n.is_read && "bg-primary/[0.02]"
                    )}
                    onClick={() => handleClick(n)}
                  >
                    <GradientIcon icon={config.icon} color={config.color} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm leading-snug", !n.is_read ? "font-medium" : "text-muted-foreground")}>
                        {n.title}
                        {projectName && (
                          <>
                            <span> on </span>
                            <span
                              role="button"
                              tabIndex={0}
                              className="text-primary font-medium hover:underline cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); router.push(`/projects/${n.project_id}`); }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  router.push(`/projects/${n.project_id}`);
                                }
                              }}
                            >{projectName}</span>
                          </>
                        )}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {projectCode && (
                          <span className="text-[11px] font-mono text-primary">{projectCode}</span>
                        )}
                        <span className="text-[11px] text-muted-foreground">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    {!n.is_read && (
                      <span className="size-2 rounded-full bg-primary shrink-0 mt-2" />
                    )}
                  </button>
                );
              }

              // Grouped notifications
              const first = group.notifications[0];
              const config = getConfig(first.type);
              const projectName = (first.project as { name: string } | null)?.name;
              const projectCode = (first.project as { project_code: string } | null)?.project_code;
              const unreadInGroup = group.notifications.filter((n) => !n.is_read).length;

              // Count by type within group
              const approved = group.notifications.filter((n) => n.type.includes("approved")).length;
              const rejected = group.notifications.filter((n) => n.type.includes("rejected")).length;

              return (
                <div key={group.key} className={cn(
                  "p-4",
                  unreadInGroup > 0 && "bg-primary/[0.02]"
                )}>
                  <div className="flex gap-3">
                    <GradientIcon icon={config.icon} color={config.color} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm leading-snug", unreadInGroup > 0 ? "font-medium" : "text-muted-foreground")}>
                        {group.notifications.length} notifications
                        {projectName && (
                          <>
                            <span> on </span>
                            <span
                              role="button"
                              tabIndex={0}
                              className="text-primary font-medium hover:underline cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); router.push(`/projects/${first.project_id}`); }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  router.push(`/projects/${first.project_id}`);
                                }
                              }}
                            >{projectName}</span>
                          </>
                        )}
                        {approved > 0 && rejected > 0 && (
                          <span className="text-muted-foreground"> — {approved} approved, {rejected} rejected</span>
                        )}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {projectCode && (
                          <span className="text-[11px] font-mono text-primary">{projectCode}</span>
                        )}
                        <span className="text-[11px] text-muted-foreground">
                          {formatDistanceToNow(new Date(first.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {/* Expanded items */}
                      <div className="mt-2 space-y-1 pl-1 border-l-2 border-base-200">
                        {group.notifications.map((n) => {
                          const itemConfig = getConfig(n.type);
                          return (
                            <button
                              key={n.id}
                              className="w-full flex items-center gap-2 py-1 pl-2 text-left hover:bg-primary/[0.04] rounded transition-colors"
                              onClick={() => handleClick(n)}
                            >
                              <GradientIcon icon={itemConfig.icon} color={itemConfig.color} size="xs" />
                              <span className={cn("text-xs flex-1 truncate", !n.is_read ? "font-medium" : "text-muted-foreground")}>
                                {n.title}
                              </span>
                              {!n.is_read && (
                                <span className="size-1.5 rounded-full bg-primary shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-muted-foreground">
            Showing {Math.min(offset + PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex gap-2">
            {offset > 0 && (
              <Button variant="outline" size="sm" onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}>
                Previous
              </Button>
            )}
            {hasMore && (
              <Button variant="outline" size="sm" onClick={() => setOffset((prev) => prev + PAGE_SIZE)}>
                Next
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Group notifications by project_id + 1-hour time window
interface NotificationGroup {
  key: string;
  type: "single" | "grouped";
  notifications: Notification[];
}

function groupNotifications(notifications: Notification[]): NotificationGroup[] {
  const groups: NotificationGroup[] = [];
  const ONE_HOUR = 60 * 60 * 1000;

  for (const n of notifications) {
    const projectId = n.project_id || "no-project";
    const timestamp = new Date(n.created_at).getTime();

    // Get the type category for grouping (drawing_, material_, finance_, or exact type match)
    const getTypeCategory = (type: string) => {
      if (type.startsWith("drawing_")) return "drawing";
      if (type.startsWith("material_")) return "material";
      return type; // Same exact type groups together (e.g. finance_weekly_digest)
    };

    const category = getTypeCategory(n.type);

    // Try to find an existing group for same project + same category within 1 hour
    const existingGroup = groups.find(
      (g) =>
        g.notifications[0].project_id === n.project_id &&
        Math.abs(new Date(g.notifications[0].created_at).getTime() - timestamp) < ONE_HOUR &&
        getTypeCategory(g.notifications[0].type) === category
    );

    if (existingGroup) {
      existingGroup.notifications.push(n);
      if (existingGroup.notifications.length > 1) {
        existingGroup.type = "grouped";
      }
    } else {
      groups.push({
        key: `${projectId}-${timestamp}`,
        type: "single",
        notifications: [n],
      });
    }
  }

  return groups;
}
