"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { GradientIcon, EmptyState } from "@/components/ui/ui-helpers";
import {
  PlusIcon,
  FileTextIcon,
} from "lucide-react";
import { ReportsTable } from "./reports-table";
import { type Report } from "@/lib/actions/reports";

// OPTIMIZED: Lazy load heavy modal components (900+ lines each)
// These are only loaded when the user actually opens them
const ReportCreationModal = dynamic(
  () => import("./report-creation-modal").then((mod) => mod.ReportCreationModal),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <Spinner className="size-6" />
      </div>
    ),
    ssr: false,
  }
);

const ReportEditModal = dynamic(
  () => import("./report-edit-modal").then((mod) => mod.ReportEditModal),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <Spinner className="size-6" />
      </div>
    ),
    ssr: false,
  }
);

interface ReportsOverviewProps {
  projectId: string;
  projectName: string;
  projectCode: string;
  reports: Report[];
  userRole?: string;
}

export function ReportsOverview({
  projectId,
  projectName,
  projectCode,
  reports,
  userRole = "pm",
}: ReportsOverviewProps) {
  const [creationModalOpen, setCreationModalOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editReport, setEditReport] = useState<Report | null>(null);

  const isClient = userRole === "client";
  const canManageReports = ["admin", "pm"].includes(userRole);

  // Stats
  const publishedCount = reports.filter((r) => r.is_published).length;
  const draftCount = reports.filter((r) => !r.is_published).length;

  const handleAddClick = () => {
    setCreationModalOpen(true);
  };

  const handleEditReport = (report: Report) => {
    setEditReport(report);
    setEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GradientIcon icon={<FileTextIcon className="size-5" />} color="teal" size="default" />
          <div>
            <h3 className="text-lg font-medium">Reports</h3>
            <p className="text-sm text-muted-foreground">
              {reports.length} {reports.length === 1 ? "report" : "reports"}
              {!isClient && ` (${publishedCount} published, ${draftCount} draft)`}
            </p>
          </div>
        </div>
        {canManageReports && (
          <Button
            onClick={handleAddClick}
            className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
          >
            <PlusIcon className="size-4" />
            New Report
          </Button>
        )}
      </div>

      {/* Reports Table or Empty State */}
      {reports.length === 0 ? (
        <EmptyState
          icon={<FileTextIcon className="size-6" />}
          title="No reports yet"
          description={isClient ? "No reports available yet" : "No reports created yet"}
          action={
            canManageReports ? (
              <Button
                onClick={handleAddClick}
                className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
              >
                <PlusIcon className="size-4" />
                Create First Report
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ReportsTable
          projectId={projectId}
          projectName={projectName}
          projectCode={projectCode}
          reports={reports}
          userRole={userRole}
          onEditReport={handleEditReport}
        />
      )}

      {/* Creation Modal - Full editing experience for new reports */}
      <ReportCreationModal
        projectId={projectId}
        projectName={projectName}
        projectCode={projectCode}
        open={creationModalOpen}
        onOpenChange={setCreationModalOpen}
      />

      {/* Edit Modal - Full editing experience for existing reports */}
      {editReport && (
        <ReportEditModal
          projectId={projectId}
          report={editReport}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      )}
    </div>
  );
}
