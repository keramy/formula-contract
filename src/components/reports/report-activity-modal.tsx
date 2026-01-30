"use client";

/**
 * Report Activity Modal
 *
 * Admin-only modal that displays view and download activity for a report.
 * Triggered by eye icon in reports table actions.
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import {
  EyeIcon,
  DownloadIcon,
  UsersIcon,
  ClockIcon,
  ActivityIcon,
} from "lucide-react";
import {
  getReportActivity,
  getReportActivitySummary,
  type ReportActivity,
} from "@/lib/actions/reports";
import { formatDate } from "@/lib/utils";

interface ReportActivityModalProps {
  reportId: string;
  reportName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportActivityModal({
  reportId,
  reportName,
  open,
  onOpenChange,
}: ReportActivityModalProps) {
  const [summary, setSummary] = useState<{
    viewCount: number;
    downloadCount: number;
    uniqueViewers: number;
    lastViewed: string | null;
    lastViewedBy: string | null;
  } | null>(null);
  const [activity, setActivity] = useState<ReportActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!open) return;

    async function loadActivity() {
      setIsLoading(true);
      try {
        const [summaryData, activityData] = await Promise.all([
          getReportActivitySummary(reportId),
          getReportActivity(reportId, 50),
        ]);
        setSummary(summaryData);
        setActivity(activityData);
      } catch (error) {
        console.error("Error loading activity:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadActivity();
  }, [reportId, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ActivityIcon className="size-5 text-violet-500" />
            Report Activity
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{reportName}</p>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner className="size-6" />
          </div>
        ) : !summary ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Unable to load activity data</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-blue-50 border border-blue-100">
                <div className="flex items-center justify-center mb-2">
                  <EyeIcon className="size-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-blue-700">{summary.viewCount}</p>
                <p className="text-xs text-blue-600">Views</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-green-50 border border-green-100">
                <div className="flex items-center justify-center mb-2">
                  <DownloadIcon className="size-5 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-green-700">{summary.downloadCount}</p>
                <p className="text-xs text-green-600">Downloads</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-purple-50 border border-purple-100">
                <div className="flex items-center justify-center mb-2">
                  <UsersIcon className="size-5 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-purple-700">{summary.uniqueViewers}</p>
                <p className="text-xs text-purple-600">Unique Users</p>
              </div>
            </div>

            {/* Last Viewed */}
            {summary.lastViewed && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                <ClockIcon className="size-4" />
                <span>
                  Last viewed by <span className="font-medium text-foreground">{summary.lastViewedBy}</span>
                  {" "}on {formatDate(summary.lastViewed)}
                </span>
              </div>
            )}

            {/* Activity Log */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                Activity Log
                <Badge variant="secondary" className="text-[10px]">
                  {activity.length}
                </Badge>
              </h4>

              {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No activity recorded yet
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {activity.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 text-sm py-2 px-3 rounded-lg bg-muted/30 hover:bg-muted/50"
                    >
                      {item.action === "viewed" ? (
                        <div className="p-1.5 rounded-full bg-blue-100">
                          <EyeIcon className="size-3 text-blue-600" />
                        </div>
                      ) : (
                        <div className="p-1.5 rounded-full bg-green-100">
                          <DownloadIcon className="size-3 text-green-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.user?.name || "Unknown User"}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.action === "viewed" ? "Viewed report" : "Downloaded PDF"}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(item.created_at, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit"
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
