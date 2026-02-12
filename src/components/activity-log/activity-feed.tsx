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
  CalendarIcon,
  UploadCloudIcon,
} from "lucide-react";
import {
  getActivityLogs,
  getRecentActivityLogs,
  type ActivityLog,
} from "@/lib/activity-log/actions";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/constants";

type GradientColor = "coral" | "teal" | "violet" | "amber" | "rose" | "emerald" | "sky" | "slate";

// Action config with natural language verbs
// Format: "has {verb}" to create sentences like "John has created ITEM-001 on project Moodup"
const actionConfig: Record<string, { icon: React.ReactNode; gradientColor: GradientColor; verb: string; entityLabel?: string }> = {
  // Project actions
  [ACTIVITY_ACTIONS.PROJECT_CREATED]: {
    icon: <PlusIcon className="size-3.5" />,
    gradientColor: "emerald",
    verb: "created",
    entityLabel: "project",
  },
  [ACTIVITY_ACTIONS.PROJECT_UPDATED]: {
    icon: <EditIcon className="size-3.5" />,
    gradientColor: "sky",
    verb: "updated",
    entityLabel: "project",
  },
  [ACTIVITY_ACTIONS.PROJECT_STATUS_CHANGED]: {
    icon: <ActivityIcon className="size-3.5" />,
    gradientColor: "amber",
    verb: "changed status of",
    entityLabel: "project",
  },
  [ACTIVITY_ACTIONS.PROJECT_DELETED]: {
    icon: <TrashIcon className="size-3.5" />,
    gradientColor: "rose",
    verb: "deleted",
    entityLabel: "project",
  },

  // User actions
  [ACTIVITY_ACTIONS.USER_CREATED]: {
    icon: <UserIcon className="size-3.5" />,
    gradientColor: "emerald",
    verb: "created user",
  },
  [ACTIVITY_ACTIONS.USER_UPDATED]: {
    icon: <UserIcon className="size-3.5" />,
    gradientColor: "sky",
    verb: "updated user",
  },
  [ACTIVITY_ACTIONS.USER_DEACTIVATED]: {
    icon: <UserIcon className="size-3.5" />,
    gradientColor: "rose",
    verb: "deactivated user",
  },
  [ACTIVITY_ACTIONS.USER_ASSIGNED]: {
    icon: <UserIcon className="size-3.5" />,
    gradientColor: "sky",
    verb: "assigned",
    entityLabel: "to",
  },
  [ACTIVITY_ACTIONS.USER_UNASSIGNED]: {
    icon: <UserIcon className="size-3.5" />,
    gradientColor: "coral",
    verb: "removed",
    entityLabel: "from",
  },

  // Scope item actions
  [ACTIVITY_ACTIONS.ITEM_CREATED]: {
    icon: <PlusIcon className="size-3.5" />,
    gradientColor: "emerald",
    verb: "created",
  },
  [ACTIVITY_ACTIONS.ITEM_UPDATED]: {
    icon: <EditIcon className="size-3.5" />,
    gradientColor: "sky",
    verb: "updated",
  },
  [ACTIVITY_ACTIONS.ITEM_DELETED]: {
    icon: <TrashIcon className="size-3.5" />,
    gradientColor: "rose",
    verb: "deleted",
  },
  [ACTIVITY_ACTIONS.ITEM_STATUS_CHANGED]: {
    icon: <ActivityIcon className="size-3.5" />,
    gradientColor: "amber",
    verb: "changed status of",
  },

  // Drawing actions
  [ACTIVITY_ACTIONS.DRAWING_UPLOADED]: {
    icon: <UploadIcon className="size-3.5" />,
    gradientColor: "sky",
    verb: "uploaded drawing for",
  },
  [ACTIVITY_ACTIONS.DRAWING_SENT_TO_CLIENT]: {
    icon: <SendIcon className="size-3.5" />,
    gradientColor: "amber",
    verb: "sent drawing to client for",
  },
  [ACTIVITY_ACTIONS.DRAWING_APPROVED]: {
    icon: <CheckCircleIcon className="size-3.5" />,
    gradientColor: "emerald",
    verb: "approved drawing for",
  },
  [ACTIVITY_ACTIONS.DRAWING_REJECTED]: {
    icon: <XCircleIcon className="size-3.5" />,
    gradientColor: "rose",
    verb: "rejected drawing for",
  },
  [ACTIVITY_ACTIONS.DRAWING_PM_OVERRIDE]: {
    icon: <CheckCircleIcon className="size-3.5" />,
    gradientColor: "coral",
    verb: "PM override approved drawing for",
  },

  // Material actions
  [ACTIVITY_ACTIONS.MATERIAL_CREATED]: {
    icon: <PackageIcon className="size-3.5" />,
    gradientColor: "teal",
    verb: "created material",
  },
  [ACTIVITY_ACTIONS.MATERIAL_UPDATED]: {
    icon: <PackageIcon className="size-3.5" />,
    gradientColor: "sky",
    verb: "updated material",
  },
  [ACTIVITY_ACTIONS.MATERIAL_SENT_TO_CLIENT]: {
    icon: <SendIcon className="size-3.5" />,
    gradientColor: "amber",
    verb: "sent material to client",
  },
  [ACTIVITY_ACTIONS.MATERIAL_APPROVED]: {
    icon: <CheckCircleIcon className="size-3.5" />,
    gradientColor: "emerald",
    verb: "approved material",
  },
  [ACTIVITY_ACTIONS.MATERIAL_REJECTED]: {
    icon: <XCircleIcon className="size-3.5" />,
    gradientColor: "rose",
    verb: "rejected material",
  },

  // Report actions
  [ACTIVITY_ACTIONS.REPORT_CREATED]: {
    icon: <FileTextIcon className="size-3.5" />,
    gradientColor: "sky",
    verb: "created report",
  },
  [ACTIVITY_ACTIONS.REPORT_PUBLISHED]: {
    icon: <FileTextIcon className="size-3.5" />,
    gradientColor: "teal",
    verb: "published report",
  },

  // Client actions
  [ACTIVITY_ACTIONS.CLIENT_CREATED]: {
    icon: <UserIcon className="size-3.5" />,
    gradientColor: "teal",
    verb: "created client",
  },
  [ACTIVITY_ACTIONS.CLIENT_UPDATED]: {
    icon: <UserIcon className="size-3.5" />,
    gradientColor: "sky",
    verb: "updated client",
  },

  // Auth actions
  [ACTIVITY_ACTIONS.USER_LOGIN]: {
    icon: <UserIcon className="size-3.5" />,
    gradientColor: "emerald",
    verb: "logged in",
  },
  [ACTIVITY_ACTIONS.PASSWORD_CHANGED]: {
    icon: <UserIcon className="size-3.5" />,
    gradientColor: "amber",
    verb: "changed password",
  },

  // Milestone actions
  [ACTIVITY_ACTIONS.MILESTONE_CREATED]: {
    icon: <CalendarIcon className="size-3.5" />,
    gradientColor: "sky",
    verb: "created milestone",
  },
  [ACTIVITY_ACTIONS.MILESTONE_UPDATED]: {
    icon: <CalendarIcon className="size-3.5" />,
    gradientColor: "sky",
    verb: "updated milestone",
  },
  [ACTIVITY_ACTIONS.MILESTONE_COMPLETED]: {
    icon: <CheckCircleIcon className="size-3.5" />,
    gradientColor: "emerald",
    verb: "completed milestone",
  },
  [ACTIVITY_ACTIONS.MILESTONE_DELETED]: {
    icon: <TrashIcon className="size-3.5" />,
    gradientColor: "rose",
    verb: "deleted milestone",
  },

  // Bulk actions
  [ACTIVITY_ACTIONS.ITEMS_IMPORTED]: {
    icon: <UploadCloudIcon className="size-3.5" />,
    gradientColor: "teal",
    verb: "imported scope items to",
  },
};

const defaultConfig = {
  icon: <ActivityIcon className="size-3.5" />,
  gradientColor: "slate" as GradientColor,
  verb: "performed action on",
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

  // Get entity identifier (item code, material code, name, etc.)
  const getEntityLabel = (activity: ActivityLog) => {
    const details = activity.details as Record<string, string> | null;

    // Prefer code over name for clarity
    if (details?.item_code) return details.item_code;
    if (details?.material_code) return details.material_code;
    if (details?.project_code) return details.project_code;
    if (details?.name) return details.name;

    return null;
  };

  // Build natural sentence: "John has updated ITEM-001 on project Moodup"
  const buildActivitySentence = (activity: ActivityLog, config: { verb: string; entityLabel?: string }) => {
    const userName = activity.user?.name || "System";
    const verb = config.verb;
    const entityLabel = getEntityLabel(activity);
    const projectName = activity.project?.name;
    const projectCode = activity.project?.project_code;

    // For project-level actions, show project name directly
    if (activity.entity_type === "project" && config.entityLabel === "project") {
      return (
        <>
          <span className="font-semibold">{userName}</span>
          {" has "}
          <span className="text-muted-foreground">{verb}</span>
          {entityLabel && (
            <>
              {" "}
              <span className="font-semibold">{entityLabel}</span>
            </>
          )}
        </>
      );
    }

    // For other actions: "John has updated ITEM-001 on project Moodup"
    return (
      <>
        <span className="font-semibold">{userName}</span>
        {" has "}
        <span className="text-muted-foreground">{verb}</span>
        {entityLabel && (
          <>
            {" "}
            <span className="font-semibold">{entityLabel}</span>
          </>
        )}
        {projectName && (
          <>
            {" "}
            <span className="text-muted-foreground">on project</span>
            {" "}
            <span className="font-semibold">{projectName}</span>
          </>
        )}
      </>
    );
  };

  if (isLoading) {
    return (
      <GlassCard>
        {showTitle && (
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <GradientIcon icon={<ActivityIcon className="size-4" />} color="primary" size="sm" />
              Activity Log
            </CardTitle>
          </CardHeader>
        )}
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
      {showTitle && (
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <GradientIcon icon={<ActivityIcon className="size-4" />} color="primary" size="sm" />
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
              <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-primary-200 via-gray-200 to-transparent" />

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
                          <p className="text-sm leading-relaxed">
                            {buildActivitySentence(activity, config)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1.5">
                            {formatDistanceToNow(new Date(activity.created_at), {
                              addSuffix: true,
                            })}
                          </p>
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
