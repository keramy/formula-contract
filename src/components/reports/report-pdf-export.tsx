"use client";

/**
 * Report PDF Export Component
 *
 * UI wrapper for the shared PDF generation logic.
 * Provides a button to download reports as PDF with loading state.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { DownloadIcon } from "lucide-react";
import type { Report } from "@/lib/actions/reports";
import { logReportActivity } from "@/lib/actions/reports";
import { downloadReportPdf } from "@/lib/pdf/generate-report-pdf";

interface ReportPDFExportProps {
  report: Report;
  projectName: string;
  projectCode: string;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "icon";
}

export function ReportPDFExport({
  report,
  projectName,
  projectCode,
  variant = "outline",
  size = "sm",
}: ReportPDFExportProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleExport = async () => {
    setIsGenerating(true);

    try {
      const success = await downloadReportPdf({
        report,
        projectName,
        projectCode,
      });

      if (success) {
        // Log download activity (fire and forget)
        logReportActivity(report.id, "downloaded").catch(console.error);
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (size === "icon") {
    return (
      <Button
        size="icon"
        variant={variant}
        className="size-8"
        onClick={handleExport}
        disabled={isGenerating}
        title="Download PDF"
      >
        {isGenerating ? (
          <Spinner className="size-4" />
        ) : (
          <DownloadIcon className="size-4" />
        )}
      </Button>
    );
  }

  return (
    <Button
      size={size}
      variant={variant}
      onClick={handleExport}
      disabled={isGenerating}
    >
      {isGenerating ? (
        <>
          <Spinner className="size-4" />
          Generating...
        </>
      ) : (
        <>
          <DownloadIcon className="size-4" />
          Export PDF
        </>
      )}
    </Button>
  );
}
