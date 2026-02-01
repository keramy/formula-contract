"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowUpDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
} from "lucide-react";
import { GlassCard, StatusBadge } from "@/components/ui/ui-helpers";
import { ReportPDFExport } from "@/components/reports/report-pdf-export";
import { ReportActivityModal } from "@/components/reports/report-activity-modal";
import {
  deleteReport,
  uploadReportPdf,
  publishReport,
  unpublishReport,
  type Report,
} from "@/lib/actions/reports";
import { generateReportPdfBase64 } from "@/lib/pdf/generate-report-pdf";
import { toast } from "sonner";
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

interface ReportsTableProps {
  projectId: string;
  projectName: string;
  projectCode: string;
  reports: Report[];
  userRole?: string;
  onEditReport: (report: Report) => void;
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  site: "Site",
  installation: "Installation",
  snagging: "Snagging",
};

const REPORT_TYPE_COLORS: Record<string, string> = {
  daily: "bg-blue-100 text-blue-700",
  weekly: "bg-teal-100 text-teal-700",
  site: "bg-violet-100 text-violet-700",
  installation: "bg-amber-100 text-amber-700",
  snagging: "bg-rose-100 text-rose-700",
};

type SortField = "report_type" | "is_published" | "created_at" | "updated_at" | "creator";
type SortDirection = "asc" | "desc";

export function ReportsTable({
  projectId,
  projectName,
  projectCode,
  reports,
  userRole = "pm",
  onEditReport,
}: ReportsTableProps) {
  const router = useRouter();
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [isLoading, setIsLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteReportId, setDeleteReportId] = useState<string | null>(null);
  const [activityModalReport, setActivityModalReport] = useState<Report | null>(null);

  const isClient = userRole === "client";
  const isAdmin = userRole === "admin";
  const canManageReports = ["admin", "pm"].includes(userRole);

  // Sort reports
  const sortedReports = useMemo(() => {
    return [...reports].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "report_type":
          comparison = a.report_type.localeCompare(b.report_type);
          break;
        case "is_published":
          comparison = (a.is_published ? 1 : 0) - (b.is_published ? 1 : 0);
          break;
        case "created_at":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "updated_at":
          comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
        case "creator":
          comparison = (a.creator?.name || "").localeCompare(b.creator?.name || "");
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [reports, sortField, sortDirection]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
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
      // Unpublishing - just toggle status
      await unpublishReport(report.id);
    } else {
      // Publishing - generate PDF, upload to storage, then publish
      try {
        toast.info("Generating PDF...");

        // Generate PDF
        const pdfResult = await generateReportPdfBase64({
          report,
          projectName,
          projectCode,
        });

        if (!pdfResult.success || !pdfResult.base64) {
          toast.error("Failed to generate PDF");
          setIsLoading(false);
          return;
        }

        toast.info("Uploading PDF...");

        // Upload to Supabase Storage
        const uploadResult = await uploadReportPdf(
          report.id,
          pdfResult.base64,
          projectCode,
          report.report_type
        );

        if (!uploadResult.success || !uploadResult.url) {
          toast.error("Failed to upload PDF");
          setIsLoading(false);
          return;
        }

        // Publish with PDF URL
        await publishReport(report.id, false, uploadResult.url);
        toast.success("Report published successfully!");
      } catch (error) {
        console.error("Error publishing report:", error);
        toast.error("Failed to publish report");
      }
    }

    setIsLoading(false);
    router.refresh();
  };

  const SortHeader = ({
    field,
    children,
    className = "",
  }: {
    field: SortField;
    children: React.ReactNode;
    className?: string;
  }) => (
    <TableHead className={className}>
      <button
        className="flex items-center gap-1 hover:text-foreground transition-colors"
        onClick={() => toggleSort(field)}
      >
        {children}
        {sortField === field ? (
          sortDirection === "asc" ? (
            <ArrowUpIcon className="size-3" />
          ) : (
            <ArrowDownIcon className="size-3" />
          )
        ) : (
          <ArrowUpDownIcon className="size-3 opacity-50" />
        )}
      </button>
    </TableHead>
  );

  if (reports.length === 0) {
    return null; // Empty state handled by parent
  }

  return (
    <>
      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-32">Report Code</TableHead>
                <SortHeader field="report_type" className="w-28">
                  Type
                </SortHeader>
                <SortHeader field="is_published" className="w-24">
                  Status
                </SortHeader>
                <TableHead className="w-32">Shared With</TableHead>
                <SortHeader field="creator" className="w-32">
                  Created By
                </SortHeader>
                <SortHeader field="created_at" className="w-40">
                  Created
                </SortHeader>
                <SortHeader field="updated_at" className="w-40">
                  Last Edited
                </SortHeader>
                <TableHead className="w-28 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedReports.map((report) => {
                return (
                  <TableRow key={report.id} className="group">
                    {/* Report Code Column */}
                    <TableCell className="py-2">
                      <span className="text-sm font-mono font-medium text-teal-700">
                        {report.report_code || "—"}
                      </span>
                    </TableCell>

                    {/* Type */}
                    <TableCell className="py-2">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          REPORT_TYPE_COLORS[report.report_type] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {REPORT_TYPE_LABELS[report.report_type] || report.report_type}
                      </span>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="py-2">
                      {report.is_published ? (
                        <StatusBadge variant="success">Published</StatusBadge>
                      ) : (
                        <StatusBadge variant="warning">Draft</StatusBadge>
                      )}
                    </TableCell>

                    {/* Shared With - Only Internal/Client badges */}
                    <TableCell className="py-2">
                      <div className="flex items-center gap-1">
                        {report.share_internal && (
                          <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-violet-100 text-violet-700">
                            Internal
                          </span>
                        )}
                        {report.share_with_client && (
                          <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-sky-100 text-sky-700">
                            Client
                          </span>
                        )}
                        {!report.share_internal && !report.share_with_client && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Created By */}
                    <TableCell className="py-2">
                      <span className="text-sm">{report.creator?.name || "—"}</span>
                    </TableCell>

                    {/* Created - with time */}
                    <TableCell className="py-2">
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(report.created_at), "MMM d, yyyy HH:mm")}
                      </span>
                    </TableCell>

                    {/* Last Edited */}
                    <TableCell className="py-2">
                      {report.updater?.name && report.updated_by !== report.created_by ? (
                        <span className="text-sm text-muted-foreground">
                          {report.updater.name} · {format(new Date(report.updated_at), "MMM d, HH:mm")}
                        </span>
                      ) : report.updated_at !== report.created_at ? (
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(report.updated_at), "MMM d, HH:mm")}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <ReportPDFExport
                          report={report}
                          projectName={projectName}
                          projectCode={projectCode}
                          variant="ghost"
                          size="icon"
                        />
                        {isAdmin && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 hover:bg-violet-50 hover:text-violet-600"
                            onClick={() => setActivityModalReport(report)}
                            title="View activity"
                          >
                            <EyeIcon className="size-4" />
                          </Button>
                        )}
                        {canManageReports && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8 hover:bg-teal-50 hover:text-teal-600"
                              onClick={() => onEditReport(report)}
                            >
                              <PencilIcon className="size-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              onClick={() => handleDeleteClick(report.id)}
                            >
                              <TrashIcon className="size-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </GlassCard>

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
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }}
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

      {/* Activity Modal (Admin Only) */}
      {activityModalReport && (
        <ReportActivityModal
          reportId={activityModalReport.id}
          reportName={`${REPORT_TYPE_LABELS[activityModalReport.report_type] || activityModalReport.report_type} Report`}
          open={!!activityModalReport}
          onOpenChange={(open) => !open && setActivityModalReport(null)}
        />
      )}
    </>
  );
}
