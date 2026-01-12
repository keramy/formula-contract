"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
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

const actionConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  // Project actions
  [ACTIVITY_ACTIONS.PROJECT_CREATED]: {
    icon: <PlusIcon className="size-4" />,
    color: "text-green-500",
    label: "Created project",
  },
  [ACTIVITY_ACTIONS.PROJECT_UPDATED]: {
    icon: <EditIcon className="size-4" />,
    color: "text-blue-500",
    label: "Updated project",
  },
  [ACTIVITY_ACTIONS.PROJECT_STATUS_CHANGED]: {
    icon: <ActivityIcon className="size-4" />,
    color: "text-yellow-500",
    label: "Changed project status",
  },
  [ACTIVITY_ACTIONS.PROJECT_DELETED]: {
    icon: <TrashIcon className="size-4" />,
    color: "text-red-500",
    label: "Deleted project",
  },

  // User actions
  [ACTIVITY_ACTIONS.USER_CREATED]: {
    icon: <UserIcon className="size-4" />,
    color: "text-green-500",
    label: "Created user",
  },
  [ACTIVITY_ACTIONS.USER_UPDATED]: {
    icon: <UserIcon className="size-4" />,
    color: "text-blue-500",
    label: "Updated user",
  },
  [ACTIVITY_ACTIONS.USER_DEACTIVATED]: {
    icon: <UserIcon className="size-4" />,
    color: "text-red-500",
    label: "Deactivated user",
  },
  [ACTIVITY_ACTIONS.USER_ASSIGNED]: {
    icon: <UserIcon className="size-4" />,
    color: "text-purple-500",
    label: "Assigned user to project",
  },
  [ACTIVITY_ACTIONS.USER_UNASSIGNED]: {
    icon: <UserIcon className="size-4" />,
    color: "text-orange-500",
    label: "Removed user from project",
  },

  // Scope item actions
  [ACTIVITY_ACTIONS.ITEM_CREATED]: {
    icon: <PlusIcon className="size-4" />,
    color: "text-green-500",
    label: "Created scope item",
  },
  [ACTIVITY_ACTIONS.ITEM_UPDATED]: {
    icon: <EditIcon className="size-4" />,
    color: "text-blue-500",
    label: "Updated scope item",
  },
  [ACTIVITY_ACTIONS.ITEM_DELETED]: {
    icon: <TrashIcon className="size-4" />,
    color: "text-red-500",
    label: "Deleted scope item",
  },
  [ACTIVITY_ACTIONS.ITEM_STATUS_CHANGED]: {
    icon: <ActivityIcon className="size-4" />,
    color: "text-yellow-500",
    label: "Changed item status",
  },

  // Drawing actions
  [ACTIVITY_ACTIONS.DRAWING_UPLOADED]: {
    icon: <UploadIcon className="size-4" />,
    color: "text-blue-500",
    label: "Uploaded drawing",
  },
  [ACTIVITY_ACTIONS.DRAWING_SENT_TO_CLIENT]: {
    icon: <SendIcon className="size-4" />,
    color: "text-yellow-500",
    label: "Sent drawing to client",
  },
  [ACTIVITY_ACTIONS.DRAWING_APPROVED]: {
    icon: <CheckCircleIcon className="size-4" />,
    color: "text-green-500",
    label: "Approved drawing",
  },
  [ACTIVITY_ACTIONS.DRAWING_REJECTED]: {
    icon: <XCircleIcon className="size-4" />,
    color: "text-red-500",
    label: "Rejected drawing",
  },
  [ACTIVITY_ACTIONS.DRAWING_PM_OVERRIDE]: {
    icon: <CheckCircleIcon className="size-4" />,
    color: "text-orange-500",
    label: "PM override on drawing",
  },

  // Material actions
  [ACTIVITY_ACTIONS.MATERIAL_CREATED]: {
    icon: <PackageIcon className="size-4" />,
    color: "text-green-500",
    label: "Created material",
  },
  [ACTIVITY_ACTIONS.MATERIAL_UPDATED]: {
    icon: <PackageIcon className="size-4" />,
    color: "text-blue-500",
    label: "Updated material",
  },
  [ACTIVITY_ACTIONS.MATERIAL_SENT_TO_CLIENT]: {
    icon: <SendIcon className="size-4" />,
    color: "text-yellow-500",
    label: "Sent material to client",
  },
  [ACTIVITY_ACTIONS.MATERIAL_APPROVED]: {
    icon: <CheckCircleIcon className="size-4" />,
    color: "text-green-500",
    label: "Approved material",
  },
  [ACTIVITY_ACTIONS.MATERIAL_REJECTED]: {
    icon: <XCircleIcon className="size-4" />,
    color: "text-red-500",
    label: "Rejected material",
  },

  // Report actions
  [ACTIVITY_ACTIONS.REPORT_CREATED]: {
    icon: <FileTextIcon className="size-4" />,
    color: "text-green-500",
    label: "Created report",
  },
  [ACTIVITY_ACTIONS.REPORT_PUBLISHED]: {
    icon: <FileTextIcon className="size-4" />,
    color: "text-blue-500",
    label: "Published report",
  },

  // Client actions
  [ACTIVITY_ACTIONS.CLIENT_CREATED]: {
    icon: <UserIcon className="size-4" />,
    color: "text-green-500",
    label: "Created client",
  },
  [ACTIVITY_ACTIONS.CLIENT_UPDATED]: {
    icon: <UserIcon className="size-4" />,
    color: "text-blue-500",
    label: "Updated client",
  },

  // Auth actions
  [ACTIVITY_ACTIONS.USER_LOGIN]: {
    icon: <UserIcon className="size-4" />,
    color: "text-green-500",
    label: "User logged in",
  },
  [ACTIVITY_ACTIONS.PASSWORD_CHANGED]: {
    icon: <UserIcon className="size-4" />,
    color: "text-yellow-500",
    label: "Changed password",
  },
};

const defaultConfig = {
  icon: <ActivityIcon className="size-4" />,
  color: "text-muted-foreground",
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
      <Card>
        {showTitle && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ActivityIcon className="size-5" />
              Activity Log
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Spinner className="size-6" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showTitle && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ActivityIcon className="size-5" />
            Activity Log
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={showTitle ? "" : "pt-4"}>
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ActivityIcon className="size-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No activity yet</p>
          </div>
        ) : (
          <ScrollArea style={{ maxHeight }}>
            <div className="space-y-4">
              {activities.map((activity) => {
                const config = getConfig(activity.action);
                return (
                  <div key={activity.id} className="flex gap-3">
                    <div className={`mt-0.5 ${config.color}`}>
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">
                          {activity.user?.name || "System"}
                        </span>{" "}
                        <span className="text-muted-foreground">
                          {config.label.toLowerCase()}
                        </span>
                        {getEntityLabel(activity) && (
                          <>
                            {" "}
                            <span className="font-medium">
                              {getEntityLabel(activity)}
                            </span>
                          </>
                        )}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {activity.project && (
                          <Badge variant="secondary" className="text-xs font-mono">
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
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
