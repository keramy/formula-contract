"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { GlassCard, GradientIcon, EmptyState } from "@/components/ui/ui-helpers";
import {
  PlusIcon,
  FileTextIcon,
  PencilIcon,
  EyeIcon,
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

      {/* Stats Cards (only for non-clients) */}
      {!isClient && (
        <div className="grid gap-4 md:grid-cols-3">
          <GlassCard hover="lift" className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-slate-500/10 to-gray-500/10">
                <FileTextIcon className="size-3.5 text-slate-600" />
              </div>
              <span className="text-xs font-medium">Total Reports</span>
            </div>
            <p className="text-2xl font-bold">{reports.length}</p>
          </GlassCard>
          <GlassCard hover="lift" className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/10">
                <EyeIcon className="size-3.5 text-emerald-600" />
              </div>
              <span className="text-xs font-medium">Published</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{publishedCount}</p>
          </GlassCard>
          <GlassCard hover="lift" className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500/10 to-yellow-500/10">
                <PencilIcon className="size-3.5 text-amber-600" />
              </div>
              <span className="text-xs font-medium">Drafts</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">{draftCount}</p>
          </GlassCard>
        </div>
      )}

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
