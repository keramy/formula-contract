"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { GlassCard, GradientIcon, SectionHeader, EmptyState } from "@/components/ui/ui-helpers";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
  ActivityIcon,
  FolderIcon,
  FileIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  UploadIcon,
  SendIcon,
  EditIcon,
  PlusIcon,
  TrashIcon,
  PackageIcon,
  FileTextIcon,
} from "lucide-react";
import {
  getActivityLogs,
  getRecentActivityLogs,
  type ActivityLog,
} from "@/lib/activity-log/actions";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/constants";

type GradientColor = "coral" | "teal" | "violet" | "amber" | "rose" | "emerald" | "sky" | "slate";

const actionConfig: Record<string, { icon: React.ReactNode; gradientColor: GradientColor; label: string }> = {
  // Project actions
  [ACTIVITY_ACTIONS.PROJECT_CREATED]: {
    icon: <PlusIcon className="size-3.5" />,
    gradientColor: "emerald",
    label: "Created project",
  },
  [ACTIVITY_ACTIONS.PROJECT_UPDATED]: {
    icon: <EditIcon className="size-3.5" />,
    gradientColor: "violet",
    label: "Updated project",
  },
  [ACTIVITY_ACTIONS.PROJECT_STATUS_CHANGED]: {
    icon: <ActivityIcon className="size-3.5" />,
    gradientColor: "amber",
    label: "Changed project status",
  },
  [ACTIVITY_ACTIONS.PROJECT_DELETED]: {
    icon: <TrashIcon className="size-3.5" />,
    gradientColor: "rose",
    label: "Deleted project",
  },

  // User actions
  [ACTIVITY_ACTIONS.USER_CREATED]: {
    icon: <UserIcon className="size-3.5" />,
    gradientColor: "emerald",
    label: "Created user",
  },
  [ACTIVITY_ACTIONS.USER_UPDATED]: {
    icon: <UserIcon className="size-3.5" />,
    gradientColor: "sky",
    label: "Updated user",
  },
  [ACTIVITY_ACTIONS.USER_DEACTIVATED]: {
    icon: <UserIcon className="size-3.5" />,
    gradientColor: "rose",
    label: "Deactivated user",
  },
  [ACTIVITY_ACTIONS.USER_ASSIGNED]: {
    icon: <UserIcon className="size-3.5" />,
    gradientColor: "violet",
    label: "Assigned user to project",
  },
  [ACTIVITY_ACTIONS.USER_UNASSIGNED]: {
    icon: <UserIcon className="size-3.5" />,
    gradientColor: "coral",
    label: "Removed user from project",
  },

  // Scope item actions
  [ACTIVITY_ACTIONS.ITEM_CREATED]: {
    icon: <PlusIcon className="size-3.5" />,
    gradientColor: "emerald",
    label: "Created scope item",
  },
  [ACTIVITY_ACTIONS.ITEM_UPDATED]: {
    icon: <EditIcon className="size-3.5" />,
    gradientColor: "sky",
    label: "Updated scope item",
  },
  [ACTIVITY_ACTIONS.ITEM_DELETED]: {
    icon: <TrashIcon className="size-3.5" />,
    gradientColor: "rose",
    label: "Deleted scope item",
  },
  [ACTIVITY_ACTIONS.ITEM_STATUS_CHANGED]: {
    icon: <ActivityIcon className="size-3.5" />,
    gradientColor: "amber",
    label: "Changed item status",
  },

  // Drawing actions
  [ACTIVITY_ACTIONS.DRAWING_UPLOADED]: {
    icon: <UploadIcon className="size-3.5" />,
    gradientColor: "sky",
    label: "Uploaded drawing",
  },
  [ACTIVITY_ACTIONS.DRAWING_SENT_TO_CLIENT]: {
    icon: <SendIcon className="size-3.5" />,
    gradientColor: "amber",
    label: "Sent drawing to client",
  },
  [ACTIVITY_ACTIONS.DRAWING_APPROVED]: {
    icon: <CheckCircleIcon className="size-3.5" />,
    gradientColor: "emerald",
    label: "Approved drawing",
  },
  [ACTIVITY_ACTIONS.DRAWING_REJECTED]: {
    icon: <XCircleIcon className="size-3.5" />,
    gradientColor: "rose",
    label: "Rejected drawing",
  },
  [ACTIVITY_ACTIONS.DRAWING_PM_OVERRIDE]: {
    icon: <CheckCircleIcon className="size-3.5" />,
    gradientColor: "coral",
    label: "PM override on drawing",
  },

  // Material actions
  [ACTIVITY_ACTIONS.MATERIAL_CREATED]: {
    icon: <PackageIcon className="size-3.5" />,
    gradientColor: "teal",
    label: "Created material",
  },
  [ACTIVITY_ACTIONS.MATERIAL_UPDATED]: {
    icon: <PackageIcon className="size-3.5" />,
    gradientColor: "sky",
    label: "Updated material",
  },
  [ACTIVITY_ACTIONS.MATERIAL_SENT_TO_CLIENT]: {
    icon: <SendIcon className="size-3.5" />,
    gradientColor: "amber",
    label: "Sent material to client",
  },
  [ACTIVITY_ACTIONS.MATERIAL_APPROVED]: {
    icon: <CheckCircleIcon className="size-3.5" />,
    gradientColor: "emerald",
    label: "Approved material",
  },
  [ACTIVITY_ACTIONS.MATERIAL_REJECTED]: {
    icon: <XCircleIcon className="size-3.5" />,
    gradientColor: "rose",
    label: "Rejected material",
  },

  // Report actions
  [ACTIVITY_ACTIONS.REPORT_CREATED]: {
    icon: <FileTextIcon className="size-3.5" />,
    gradientColor: "violet",
    label: "Created report",
  },
  [ACTIVITY_ACTIONS.REPORT_PUBLISHED]: {
    icon: <FileTextIcon className="size-3.5" />,
    gradientColor: "teal",
    label: "Published report",
  },

  // Client actions
  [ACTIVITY_ACTIONS.CLIENT_CREATED]: {
    icon: <UserIcon className="size-3.5" />,
    gradientColor: "teal",
    label: "Created client",
  },
  [ACTIVITY_ACTIONS.CLIENT_UPDATED]: {
    icon: <UserIcon className="size-3.5" />,
    gradientColor: "sky",
    label: "Updated client",
  },

  // Auth actions
  [ACTIVITY_ACTIONS.USER_LOGIN]: {
    icon: <UserIcon className="size-3.5" />,
    gradientColor: "emerald",
    label: "User logged in",
  },
  [ACTIVITY_ACTIONS.PASSWORD_CHANGED]: {
    icon: <UserIcon className="size-3.5" />,
    gradientColor: "amber",
    label: "Changed password",
  },
};

const defaultConfig = {
  icon: <ActivityIcon className="size-3.5" />,
  gradientColor: "slate" as GradientColor,
  label: "Activity",
};

interface ActivityFeedProps {
  projectId?: string;
  entityType?: string;
  entityId?: string;
  limit?: number;
  showTitle?: boolean;
  maxHeight?: string;
}

export function ActivityFeed({
  projectId,
  entityType,
  entityId,
  limit = 20,
  showTitle = true,
  maxHeight = "400px",
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, [projectId, entityType, entityId, limit]);

  const loadActivities = async () => {
    setIsLoading(true);
    const data = projectId || entityType || entityId
      ? await getActivityLogs({ projectId, entityType, entityId, limit })
      : await getRecentActivityLogs(limit);
    setActivities(data);
    setIsLoading(false);
  };

  const getConfig = (action: string) => {
    return actionConfig[action] || defaultConfig;
  };

  const getEntityLabel = (activity: ActivityLog) => {
    const details = activity.details as Record<string, string> | null;

    if (details?.name) {
      return details.name;
    }
    if (details?.item_code) {
      return details.item_code;
    }
    if (details?.project_code) {
      return details.project_code;
    }

    return activity.entity_type;
  };

  if (isLoading) {
    return (
      <GlassCard>
        {showTitle && (
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <GradientIcon icon={<ActivityIcon className="size-4" />} color="violet" size="sm" />
              Activity Log
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Spinner className="size-6 text-violet-500" />
          </div>
        </CardContent>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      {showTitle && (
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <GradientIcon icon={<ActivityIcon className="size-4" />} color="violet" size="sm" />
            Activity Log
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={showTitle ? "" : "pt-4"}>
        {activities.length === 0 ? (
          <EmptyState
            icon={<ActivityIcon className="size-6" />}
            title="No activity yet"
            description="Actions will appear here when they happen"
          />
        ) : (
          <ScrollArea style={{ maxHeight }}>
            <div className="relative">
              {/* Timeline connector line */}
              <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-violet-200 via-gray-200 to-transparent" />

              <div className="space-y-4">
                {activities.map((activity, index) => {
                  const config = getConfig(activity.action);
                  return (
                    <div key={activity.id} className="flex gap-3 relative group">
                      {/* Timeline dot with gradient icon */}
                      <div className="relative z-10 shrink-0">
                        <GradientIcon
                          icon={config.icon}
                          color={config.gradientColor}
                          size="sm"
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pb-1">
                        <div className="bg-gray-50/50 rounded-lg p-3 group-hover:bg-gray-100/70 transition-colors">
                          <p className="text-sm">
                            <span className="font-semibold text-foreground">
                              {activity.user?.name || "System"}
                            </span>{" "}
                            <span className="text-muted-foreground">
                              {config.label.toLowerCase()}
                            </span>
                            {getEntityLabel(activity) && (
                              <>
                                {" "}
                                <span className="font-semibold text-foreground">
                                  {getEntityLabel(activity)}
                                </span>
                              </>
                            )}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            {activity.project && (
                              <Badge
                                variant="secondary"
                                className="text-xs font-mono bg-violet-100 text-violet-700 hover:bg-violet-100"
                              >
                                {activity.project.project_code}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(activity.created_at), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </GlassCard>
  );
}
