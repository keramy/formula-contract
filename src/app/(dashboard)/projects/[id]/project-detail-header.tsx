"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronRightIcon, FileBarChartIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/ui-helpers";
import { usePageHeader } from "@/components/layout/app-header";
import { generateExecutiveSummary } from "@/lib/actions/executive-summary";
import type { SummaryOptions } from "@/lib/actions/executive-summary";

type StatusVariant = "info" | "success" | "warning" | "default" | "danger";

const statusConfig: Record<string, { variant: StatusVariant; label: string }> = {
  tender: { variant: "info", label: "Tender" },
  active: { variant: "success", label: "Active" },
  on_hold: { variant: "warning", label: "On Hold" },
  completed: { variant: "default", label: "Completed" },
  cancelled: { variant: "danger", label: "Cancelled" },
  not_awarded: { variant: "danger", label: "Not Awarded" },
};

const SECTION_OPTIONS: { key: keyof SummaryOptions; label: string; description: string }[] = [
  { key: "includeMetrics", label: "Key Metrics", description: "Contract value, budget, actual spent, variance" },
  { key: "includeProgress", label: "Progress Overview", description: "Overall completion percentage and item counts" },
  { key: "includeScope", label: "Scope Breakdown", description: "Production/procurement items and approvals" },
  { key: "includeStatus", label: "Items by Status", description: "Bar chart showing items grouped by status" },
  { key: "includeMilestones", label: "Milestones", description: "Timeline with upcoming and completed milestones" },
  { key: "includeCosts", label: "Cost Breakdown", description: "Production vs procurement cost comparison" },
  { key: "includeSnagging", label: "Snagging Summary", description: "Snagging issues and resolution status" },
];

interface ProjectDetailHeaderProps {
  projectId: string;
  projectName: string;
  projectCode: string;
  status: string;
}

export function ProjectDetailHeader({
  projectId,
  projectName,
  projectCode,
  status,
}: ProjectDetailHeaderProps) {
  const { setContent } = usePageHeader();
  const config = statusConfig[status] || { variant: "default" as StatusVariant, label: status };
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [options, setOptions] = useState<SummaryOptions>({
    includeMetrics: true,
    includeProgress: true,
    includeScope: true,
    includeStatus: true,
    includeMilestones: true,
    includeCosts: true,
    includeSnagging: true,
  });

  const toggleOption = (key: keyof SummaryOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectedCount = Object.values(options).filter(Boolean).length;

  const handleGenerate = useCallback(async () => {
    setIsExporting(true);
    try {
      const result = await generateExecutiveSummary(projectId, options);
      if (!result.success) {
        console.error("Export summary error:", result.error);
        alert("Failed to generate summary: " + (result.error || "Unknown error"));
        return;
      }
      if (result.data) {
        const byteCharacters = atob(result.data.base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.data.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setDialogOpen(false);
      }
    } catch (e) {
      console.error("Export summary exception:", e);
      alert("Failed to generate summary. Check console for details.");
    } finally {
      setIsExporting(false);
    }
  }, [projectId, options]);

  // Push header content
  useEffect(() => {
    setContent({
      actions: (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDialogOpen(true)}
        >
          <FileBarChartIcon className="size-4 mr-1" />
          Export Summary
        </Button>
      ),
      backLink: (
        <nav className="flex items-center gap-1.5 min-w-0">
          <Link
            href="/projects"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            Projects
          </Link>
          <ChevronRightIcon className="size-3.5 text-muted-foreground/50 shrink-0" />
          <span className="text-sm font-semibold truncate">{projectName}</span>
          <span className="text-sm text-muted-foreground shrink-0">·</span>
          <span className="text-sm font-mono text-muted-foreground shrink-0">{projectCode}</span>
          <StatusBadge variant={config.variant} dot>
            {config.label}
          </StatusBadge>
        </nav>
      ),
    });
    return () => setContent({});
  }, [projectName, projectCode, status, projectId, setContent, config.variant, config.label]);

  // Dialog renders here — the header button opens it
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Executive Summary</DialogTitle>
          <DialogDescription>
            Choose which sections to include in the PDF for {projectCode}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1 py-2">
          {SECTION_OPTIONS.map((section) => (
            <label
              key={section.key}
              htmlFor={`exec-section-${section.key}`}
              className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-base-50 cursor-pointer transition-colors"
            >
              <Checkbox
                id={`exec-section-${section.key}`}
                checked={options[section.key]}
                onCheckedChange={() => toggleOption(section.key)}
                className="mt-0.5"
              />
              <div>
                <div className="text-sm font-medium">{section.label}</div>
                <div className="text-xs text-muted-foreground">{section.description}</div>
              </div>
            </label>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-xs text-muted-foreground">
            {selectedCount} of {SECTION_OPTIONS.length} sections selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleGenerate}
              disabled={isExporting || selectedCount === 0}
            >
              <FileBarChartIcon className="size-4 mr-1" />
              {isExporting ? "Generating..." : "Generate PDF"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
