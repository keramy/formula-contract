"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  PlusIcon,
  FileTextIcon,
  PencilIcon,
  TrashIcon,
  SendIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  EyeIcon,
  EyeOffIcon,
  UsersIcon,
  GlobeIcon,
} from "lucide-react";
import { ReportFormDialog } from "./report-form-dialog";
import { ReportLineEditor } from "./report-line-editor";
import {
  deleteReport,
  publishReport,
  unpublishReport,
  type Report,
} from "./reports/actions";

interface ReportsOverviewProps {
  projectId: string;
  reports: Report[];
  userRole?: string;
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  progress: "Progress Report",
  weekly: "Weekly Report",
  monthly: "Monthly Report",
  milestone: "Milestone Report",
  final: "Final Report",
};

export function ReportsOverview({
  projectId,
  reports,
  userRole = "pm",
}: ReportsOverviewProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editReport, setEditReport] = useState<Report | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteReportId, setDeleteReportId] = useState<string | null>(null);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  const isClient = userRole === "client";
  const canManageReports = ["admin", "pm"].includes(userRole);

  // Stats
  const publishedCount = reports.filter((r) => r.is_published).length;
  const draftCount = reports.filter((r) => !r.is_published).length;

  const handleAddClick = () => {
    setEditReport(null);
    setFormDialogOpen(true);
  };

  const handleEditClick = (report: Report) => {
    setEditReport(report);
    setFormDialogOpen(true);
  };

  const handleDeleteClick = (reportId: string) => {
    setDeleteReportId(reportId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteReportId) return;

    setIsLoading(true);
    await deleteReport(deleteReportId);
    setDeleteDialogOpen(false);
    setDeleteReportId(null);
    setIsLoading(false);
    router.refresh();
  };

  const handlePublishToggle = async (report: Report) => {
    setIsLoading(true);
    if (report.is_published) {
      await unpublishReport(report.id);
    } else {
      await publishReport(report.id);
    }
    setIsLoading(false);
    router.refresh();
  };

  const toggleExpand = (reportId: string) => {
    setExpandedReportId(expandedReportId === reportId ? null : reportId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Reports</h3>
          <p className="text-sm text-muted-foreground">
            {reports.length} {reports.length === 1 ? "report" : "reports"}
            {!isClient && ` (${publishedCount} published, ${draftCount} draft)`}
          </p>
        </div>
        {canManageReports && (
          <Button onClick={handleAddClick}>
            <PlusIcon className="size-4" />
            New Report
          </Button>
        )}
      </div>

      {/* Stats Cards (only for non-clients) */}
      {!isClient && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{reports.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Published
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{publishedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Drafts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-600">{draftCount}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reports List */}
      {reports.length === 0 ? (
        <Card className="p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <FileTextIcon className="size-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground mb-3">
              {isClient ? "No reports available yet" : "No reports created yet"}
            </p>
            {canManageReports && (
              <Button onClick={handleAddClick}>
                <PlusIcon className="size-4" />
                Create First Report
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const isExpanded = expandedReportId === report.id;
            return (
              <Card key={report.id}>
                <Collapsible open={isExpanded} onOpenChange={() => toggleExpand(report.id)}>
                  {/* Report Header */}
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Expand Toggle */}
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8 mt-0.5">
                          {isExpanded ? (
                            <ChevronDownIcon className="size-4" />
                          ) : (
                            <ChevronRightIcon className="size-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>

                      {/* Report Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">
                            {REPORT_TYPE_LABELS[report.report_type] || report.report_type}
                          </h4>
                          {report.is_published ? (
                            <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              Published
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Draft</Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>
                            Created {format(new Date(report.created_at), "MMM d, yyyy")}
                          </span>
                          {report.creator?.name && (
                            <span>by {report.creator.name}</span>
                          )}
                          {report.is_published && report.published_at && (
                            <span>
                              Published {format(new Date(report.published_at), "MMM d, yyyy")}
                            </span>
                          )}
                        </div>

                        {/* Sharing Indicators */}
                        <div className="flex items-center gap-3 mt-2">
                          {report.share_internal && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <UsersIcon className="size-3" />
                              Internal
                            </div>
                          )}
                          {report.share_with_client && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <GlobeIcon className="size-3" />
                              Client
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      {canManageReports && (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant={report.is_published ? "outline" : "default"}
                            onClick={() => handlePublishToggle(report)}
                            disabled={isLoading}
                          >
                            {report.is_published ? (
                              <>
                                <EyeOffIcon className="size-4" />
                                Unpublish
                              </>
                            ) : (
                              <>
                                <SendIcon className="size-4" />
                                Publish
                              </>
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            onClick={() => handleEditClick(report)}
                          >
                            <PencilIcon className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteClick(report.id)}
                          >
                            <TrashIcon className="size-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Report Lines (Expandable) */}
                  <CollapsibleContent>
                    <div className="px-4 pb-4 pt-0 border-t">
                      <div className="pt-4">
                        <ReportLineEditor
                          projectId={projectId}
                          reportId={report.id}
                          lines={report.lines || []}
                          readOnly={isClient || !canManageReports}
                        />
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}

      {/* Form Dialog */}
      <ReportFormDialog
        projectId={projectId}
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        editReport={editReport}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this report? This will also delete all report
              content and photos. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? (
                <>
                  <Spinner className="size-4 mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete Report"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
