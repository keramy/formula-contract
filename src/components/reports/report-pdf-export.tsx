"use client";

import { useState } from "react";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { DownloadIcon } from "lucide-react";
import { loadRobotoFonts } from "@/lib/fonts/roboto-loader";
import type { Report } from "@/app/(dashboard)/projects/[id]/reports/actions";

interface ReportPDFExportProps {
  report: Report;
  projectName: string;
  projectCode: string;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "icon";
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  progress: "Progress Report",
  weekly: "Weekly Report",
  monthly: "Monthly Report",
  milestone: "Milestone Report",
  final: "Final Report",
};

// Image data with dimensions for proper aspect ratio
interface ImageData {
  base64: string;
  width: number;
  height: number;
}

// Convert image URL to base64 and get dimensions
async function loadImageWithDimensions(url: string): Promise<ImageData | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();

    return new Promise((resolve) => {
      const img = new window.Image();

      img.onload = () => {
        // Convert to base64
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const base64 = canvas.toDataURL("image/jpeg", 0.85);

        resolve({
          base64,
          width: img.width,
          height: img.height,
        });
      };

      img.onerror = () => resolve(null);
      img.src = URL.createObjectURL(blob);
    });
  } catch {
    return null;
  }
}

// Calculate dimensions that fit within max bounds while preserving aspect ratio
function calculateFitDimensions(
  imgWidth: number,
  imgHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const aspectRatio = imgWidth / imgHeight;

  let width = maxWidth;
  let height = width / aspectRatio;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return { width, height };
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
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Load Roboto fonts for Turkish character support
      await loadRobotoFonts(doc);
      const fontFamily = "Roboto"; // Use Roboto for Turkish support

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      // Colors
      const orange = "#f97316";
      const darkGray = "#1e293b";
      const mediumGray = "#475569";
      const lightGray = "#64748b";
      const violet = "#7c3aed";
      const sky = "#0284c7";

      // Helper to add new page if needed
      const checkPageBreak = (neededHeight: number) => {
        if (y + neededHeight > pageHeight - 30) {
          doc.addPage();
          y = margin;
          return true;
        }
        return false;
      };

      // === HEADER ===
      // Logo
      doc.setFontSize(24);
      doc.setTextColor(orange);
      doc.setFont(fontFamily, "bold");
      doc.text("FORMULA", margin, y + 8);

      // Report type and date on the right
      doc.setFontSize(9);
      doc.setTextColor(lightGray);
      doc.setFont(fontFamily, "normal");
      const reportTypeLabel = REPORT_TYPE_LABELS[report.report_type] || report.report_type;
      doc.text(reportTypeLabel.toUpperCase(), pageWidth - margin, y + 3, { align: "right" });

      const dateStr = new Date(report.created_at).toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric"
      });
      doc.text(dateStr, pageWidth - margin, y + 8, { align: "right" });

      y += 18;

      // Project name
      doc.setFontSize(18);
      doc.setTextColor(darkGray);
      doc.setFont(fontFamily, "bold");
      doc.text(projectName, margin, y);
      y += 7;

      // Project code
      doc.setFontSize(10);
      doc.setTextColor(mediumGray);
      doc.setFont(fontFamily, "normal");
      doc.text(`Project Code: ${projectCode}`, margin, y);
      y += 6;

      // Created by info
      if (report.creator?.name) {
        doc.setFontSize(9);
        doc.setTextColor(lightGray);
        doc.text(`Created by: ${report.creator.name}`, margin, y);
        y += 5;
      }

      // Last edited by info (only if different from creator or edited after creation)
      if (report.updater?.name && report.updated_by !== report.created_by) {
        const editedDate = new Date(report.updated_at).toLocaleDateString("en-US", {
          year: "numeric", month: "short", day: "numeric"
        });
        doc.text(`Last edited by: ${report.updater.name} on ${editedDate}`, margin, y);
        y += 5;
      }

      y += 3;

      // Sharing badges (instead of just PUBLISHED/DRAFT)
      let badgeX = margin;

      if (!report.is_published) {
        // Draft badge
        doc.setFillColor("#fef3c7");
        doc.setFontSize(8);
        doc.setFont(fontFamily, "bold");
        const draftWidth = doc.getTextWidth("DRAFT") + 8;
        doc.roundedRect(badgeX, y - 4, draftWidth, 6, 1, 1, "F");
        doc.setTextColor("#92400e");
        doc.text("DRAFT", badgeX + 4, y);
        badgeX += draftWidth + 4;
      } else {
        // Show sharing badges for published reports
        if (report.share_internal) {
          doc.setFillColor("#ede9fe"); // violet-100
          doc.setFontSize(8);
          doc.setFont(fontFamily, "bold");
          const internalWidth = doc.getTextWidth("INTERNAL") + 8;
          doc.roundedRect(badgeX, y - 4, internalWidth, 6, 1, 1, "F");
          doc.setTextColor(violet);
          doc.text("INTERNAL", badgeX + 4, y);
          badgeX += internalWidth + 4;
        }

        if (report.share_with_client) {
          doc.setFillColor("#e0f2fe"); // sky-100
          doc.setFontSize(8);
          doc.setFont(fontFamily, "bold");
          const clientWidth = doc.getTextWidth("CLIENT") + 8;
          doc.roundedRect(badgeX, y - 4, clientWidth, 6, 1, 1, "F");
          doc.setTextColor(sky);
          doc.text("CLIENT", badgeX + 4, y);
          badgeX += clientWidth + 4;
        }

        // If published but no sharing options
        if (!report.share_internal && !report.share_with_client) {
          doc.setFillColor("#dcfce7");
          doc.setFontSize(8);
          doc.setFont(fontFamily, "bold");
          const pubWidth = doc.getTextWidth("PUBLISHED") + 8;
          doc.roundedRect(badgeX, y - 4, pubWidth, 6, 1, 1, "F");
          doc.setTextColor("#166534");
          doc.text("PUBLISHED", badgeX + 4, y);
        }
      }

      y += 10;

      // Header divider
      doc.setDrawColor(orange);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      y += 15;

      // === SECTIONS ===
      const lines = report.lines || [];
      const teal = "#14b8a6"; // Accent color for section indicators

      if (lines.length === 0) {
        doc.setFontSize(11);
        doc.setTextColor(lightGray);
        doc.setFont(fontFamily, "normal");
        doc.text("No content has been added to this report yet.", margin, y);
      } else {
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          // Check if we need a new page (estimate section height)
          checkPageBreak(40);

          // Accent bar on the left of the title
          doc.setFillColor(teal);
          doc.rect(margin, y - 4, 2, 6, "F");

          // Section title (no "Section X" label - cleaner design)
          doc.setFontSize(12);
          doc.setTextColor(darkGray);
          doc.setFont(fontFamily, "bold");
          doc.text(line.title, margin + 6, y);
          y += 8;

          // Section description
          if (line.description) {
            doc.setFontSize(10);
            doc.setTextColor(mediumGray);
            doc.setFont(fontFamily, "normal");

            // Word wrap the description
            const descLines = doc.splitTextToSize(line.description, contentWidth - 6);
            for (const descLine of descLines) {
              checkPageBreak(6);
              doc.text(descLine, margin + 6, y);
              y += 5;
            }
            y += 2;
          }

          // Photos (if any)
          if (line.photos && line.photos.length > 0) {
            y += 3;
            const photos = line.photos as string[];
            const maxPhotoWidth = 55; // Slightly larger photos
            const maxPhotoHeight = 40;
            const photoGap = 4;

            // Load all images first to get their dimensions
            const imageDataList: (ImageData | null)[] = await Promise.all(
              photos.map((url) => loadImageWithDimensions(url))
            );

            let currentX = margin + 6;
            let rowMaxHeight = 0;
            const photoAreaWidth = contentWidth - 6;

            for (let j = 0; j < photos.length; j++) {
              const imageData = imageDataList[j];

              // Calculate dimensions that maintain aspect ratio
              let photoWidth = maxPhotoWidth;
              let photoHeight = maxPhotoHeight;

              if (imageData) {
                const dims = calculateFitDimensions(
                  imageData.width,
                  imageData.height,
                  maxPhotoWidth,
                  maxPhotoHeight
                );
                photoWidth = dims.width;
                photoHeight = dims.height;
              }

              // Check if we need to wrap to next row
              if (currentX + photoWidth > margin + 6 + photoAreaWidth) {
                currentX = margin + 6;
                y += rowMaxHeight + photoGap;
                rowMaxHeight = 0;
              }

              // Check page break
              if (y + photoHeight > pageHeight - 30) {
                doc.addPage();
                y = margin;
                currentX = margin + 6;
                rowMaxHeight = 0;
              }

              // Track max height in this row for proper row spacing
              rowMaxHeight = Math.max(rowMaxHeight, photoHeight);

              try {
                if (imageData) {
                  // Add subtle border around image
                  doc.setDrawColor("#e2e8f0");
                  doc.setLineWidth(0.2);
                  doc.rect(currentX - 0.5, y - 0.5, photoWidth + 1, photoHeight + 1, "S");
                  doc.addImage(imageData.base64, "JPEG", currentX, y, photoWidth, photoHeight);
                } else {
                  // Draw placeholder
                  doc.setFillColor("#f1f5f9");
                  doc.rect(currentX, y, photoWidth, photoHeight, "F");
                  doc.setFontSize(8);
                  doc.setTextColor(lightGray);
                  doc.text("Image", currentX + photoWidth / 2, y + photoHeight / 2, { align: "center" });
                }
              } catch {
                // Draw placeholder on error
                doc.setFillColor("#f1f5f9");
                doc.rect(currentX, y, photoWidth, photoHeight, "F");
              }

              // Move X position for next image
              currentX += photoWidth + photoGap;
            }

            // Move Y after the last row of photos
            y += rowMaxHeight + 8;
          } else {
            y += 4;
          }

          // Section spacing (subtle, no divider line for cleaner look)
          if (i < lines.length - 1) {
            y += 6;
          }
        }
      }

      // === FOOTER (on every page) ===
      const totalPages = doc.internal.pages.length - 1;
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(8);
        doc.setTextColor(lightGray);
        doc.setFont(fontFamily, "normal");

        const footerY = pageHeight - 15;
        doc.setDrawColor("#e2e8f0");
        doc.setLineWidth(0.3);
        doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

        doc.text(
          `Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
          margin,
          footerY
        );
        doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, footerY, { align: "right" });
      }

      // Create filename and download
      const dateForFile = new Date(report.created_at).toISOString().split("T")[0];
      const fileName = `${projectCode}_${reportTypeLabel.replace(/\s+/g, "_")}_${dateForFile}.pdf`;

      doc.save(fileName);
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
