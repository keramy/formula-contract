"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createReport, updateReport, type Report } from "./reports/actions";

interface ReportFormDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editReport?: Report | null;
}

const REPORT_TYPES = [
  { value: "progress", label: "Progress Report" },
  { value: "weekly", label: "Weekly Report" },
  { value: "monthly", label: "Monthly Report" },
  { value: "milestone", label: "Milestone Report" },
  { value: "final", label: "Final Report" },
];

export function ReportFormDialog({
  projectId,
  open,
  onOpenChange,
  editReport,
}: ReportFormDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reportType, setReportType] = useState("progress");
  const [shareWithClient, setShareWithClient] = useState(false);
  const [shareInternal, setShareInternal] = useState(true);

  const isEditing = !!editReport;

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (editReport) {
        setReportType(editReport.report_type);
        setShareWithClient(editReport.share_with_client);
        setShareInternal(editReport.share_internal);
      } else {
        setReportType("progress");
        setShareWithClient(false);
        setShareInternal(true);
      }
      setError(null);
    }
  }, [open, editReport]);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (isEditing && editReport) {
        const result = await updateReport(editReport.id, {
          report_type: reportType,
          share_with_client: shareWithClient,
          share_internal: shareInternal,
        });

        if (!result.success) {
          setError(result.error || "Failed to update report");
          return;
        }
      } else {
        const result = await createReport(projectId, reportType);

        if (!result.success) {
          setError(result.error || "Failed to create report");
          return;
        }
      }

      onOpenChange(false);
      router.refresh();
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Report" : "Create New Report"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the report settings."
              : "Create a new report for this project. You can add content after creating."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <div className="p-2 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Report Type */}
          <div className="space-y-2">
            <Label htmlFor="report-type">Report Type</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger id="report-type">
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Share Settings */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="share-internal">Share Internally</Label>
                <p className="text-xs text-muted-foreground">
                  Visible to team members when published
                </p>
              </div>
              <Switch
                id="share-internal"
                checked={shareInternal}
                onCheckedChange={setShareInternal}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="share-client">Share with Client</Label>
                <p className="text-xs text-muted-foreground">
                  Visible to client when published
                </p>
              </div>
              <Switch
                id="share-client"
                checked={shareWithClient}
                onCheckedChange={setShareWithClient}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <Spinner className="size-4 mr-2" />
                {isEditing ? "Saving..." : "Creating..."}
              </>
            ) : isEditing ? (
              "Save Changes"
            ) : (
              "Create Report"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
