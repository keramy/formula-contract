"use client";

/**
 * Report PDF Export Component
 *
 * Generates professional A4 PDF reports with:
 * - FC logo placeholder (teal gradient)
 * - Teal brand accents
 * - Clean section layout with underlined titles
 * - 3x2 photo grids per section
 * - Proper pagination with continuation headers
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { DownloadIcon } from "lucide-react";
import type { Report } from "@/lib/actions/reports";
import { logReportActivity } from "@/lib/actions/reports";

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
      // Dynamic import - jsPDF (~100KB) loaded only when user clicks export
      const [{ jsPDF }, { loadRobotoFonts }] = await Promise.all([
        import("jspdf"),
        import("@/lib/fonts/roboto-loader"),
      ]);

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Load Roboto fonts for Turkish character support
      await loadRobotoFonts(doc);
      const fontFamily = "Roboto";

      const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
      const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
      const margin = 12;
      const contentWidth = pageWidth - margin * 2;

      // Colors
      const teal = "#14b8a6";
      const tealDark = "#0d9488";
      const black = "#111111";
      const darkGray = "#333333";
      const mediumGray = "#666666";
      const lightGray = "#888888";
      const borderGray = "#cccccc";

      // Report metadata
      const reportTypeLabel = REPORT_TYPE_LABELS[report.report_type] || report.report_type;
      const dateStr = new Date(report.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const creatorName = report.creator?.name || "Unknown";
      const lastUpdated = new Date(report.updated_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      // Track current page for headers
      let currentPage = 1;
      let y = margin;

      // Footer height reservation
      const footerHeight = 15;
      const maxContentY = pageHeight - margin - footerHeight;

      // === DRAW FC LOGO ===
      const drawLogo = (x: number, logoY: number, size: number) => {
        // Teal gradient background (simulated with solid color in PDF)
        doc.setFillColor(teal);
        doc.roundedRect(x, logoY, size, size, 2, 2, "F");

        // FC text - larger to fill the logo
        doc.setFontSize(size * 0.55);
        doc.setTextColor("#ffffff");
        doc.setFont(fontFamily, "bold");
        doc.text("FC", x + size / 2, logoY + size * 0.65, { align: "center" });
      };

      // === DRAW PAGE 1 HEADER ===
      const drawPage1Header = () => {
        const logoSize = 14;

        // Draw logo
        drawLogo(margin, y, logoSize);

        // Project info (next to logo)
        const infoX = margin + logoSize + 4;

        // Project name
        doc.setFontSize(14);
        doc.setTextColor(black);
        doc.setFont(fontFamily, "bold");
        doc.text(projectName, infoX, y + 5);

        // Project code (teal)
        doc.setFontSize(9);
        doc.setTextColor(teal);
        doc.setFont(fontFamily, "bold");
        doc.text(projectCode, infoX, y + 10);

        // Report type
        doc.setFontSize(8);
        doc.setTextColor(mediumGray);
        doc.setFont(fontFamily, "normal");
        doc.text(reportTypeLabel.toUpperCase(), infoX, y + 14);

        // Right side - Date info
        const rightX = pageWidth - margin;

        // "REPORT DATE" label
        doc.setFontSize(7);
        doc.setTextColor(teal);
        doc.setFont(fontFamily, "bold");
        doc.text("REPORT DATE", rightX, y + 2, { align: "right" });

        // Date
        doc.setFontSize(10);
        doc.setTextColor(black);
        doc.setFont(fontFamily, "bold");
        doc.text(dateStr, rightX, y + 7, { align: "right" });

        // Created by / Last updated
        doc.setFontSize(7);
        doc.setTextColor(mediumGray);
        doc.setFont(fontFamily, "normal");
        doc.text(`Created by: ${creatorName}`, rightX, y + 12, { align: "right" });
        doc.text(`Last updated: ${lastUpdated}`, rightX, y + 16, { align: "right" });

        y += logoSize + 4;

        // Teal header line
        doc.setDrawColor(teal);
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);

        y += 8;
      };

      // === DRAW PAGE 2+ HEADER ===
      const drawContinuationHeader = () => {
        const logoSize = 8;

        // Small logo
        drawLogo(margin, y, logoSize);

        // Project info inline
        const infoX = margin + logoSize + 3;
        doc.setFontSize(8);
        doc.setTextColor(darkGray);
        doc.setFont(fontFamily, "bold");
        doc.text(projectName, infoX, y + 5);

        const nameWidth = doc.getTextWidth(projectName);
        doc.setFont(fontFamily, "normal");
        doc.setTextColor(mediumGray);
        doc.text(` • ${projectCode} • ${reportTypeLabel}`, infoX + nameWidth, y + 5);

        y += logoSize + 2;

        // Thin teal line
        doc.setDrawColor(teal);
        doc.setLineWidth(0.3);
        doc.line(margin, y, pageWidth - margin, y);

        y += 6;
      };

      // === DRAW FOOTER ===
      const drawFooter = (pageNum: number, totalPages: number) => {
        const footerY = pageHeight - margin - 5;

        // Teal line
        doc.setDrawColor(teal);
        doc.setLineWidth(0.3);
        doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

        // "Formula Contract" in teal
        doc.setFontSize(7);
        doc.setFont(fontFamily, "bold");
        doc.setTextColor(teal);
        doc.text("Formula Contract", margin, footerY);

        // Page number
        doc.setFont(fontFamily, "normal");
        doc.setTextColor(mediumGray);
        doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, footerY, { align: "right" });
      };

      // === CHECK PAGE BREAK ===
      const checkPageBreak = (neededHeight: number): boolean => {
        if (y + neededHeight > maxContentY) {
          doc.addPage();
          currentPage++;
          y = margin;
          drawContinuationHeader();
          return true;
        }
        return false;
      };

      // === PAGE BORDER ===
      const drawPageBorder = () => {
        doc.setDrawColor(darkGray);
        doc.setLineWidth(0.4);
        doc.rect(margin - 2, margin - 2, contentWidth + 4, pageHeight - margin * 2 + 4, "S");
      };

      // ==========================================
      // START GENERATING PDF
      // ==========================================

      // Draw page 1 header
      drawPage1Header();

      // === SECTIONS ===
      const lines = report.lines || [];

      if (lines.length === 0) {
        doc.setFontSize(10);
        doc.setTextColor(mediumGray);
        doc.setFont(fontFamily, "normal");
        doc.text("No content has been added to this report yet.", margin, y);
      } else {
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const sectionNum = i + 1;

          // Estimate section height for page break check
          const hasPhotos = line.photos && line.photos.length > 0;
          const photoRows = hasPhotos ? Math.ceil((line.photos as string[]).length / 3) : 0;
          const estimatedHeight = 20 + (photoRows * 32); // title + desc + photos

          checkPageBreak(Math.min(estimatedHeight, 60)); // Check for at least partial section

          // Section title with underline
          doc.setFontSize(10);
          doc.setTextColor(black);
          doc.setFont(fontFamily, "bold");
          const titleText = `${sectionNum}. ${line.title}`;
          doc.text(titleText, margin, y);

          // Black underline only under title text
          const titleWidth = doc.getTextWidth(titleText);
          doc.setDrawColor(black);
          doc.setLineWidth(0.5);
          doc.line(margin, y + 1, margin + titleWidth, y + 1);

          y += 6;

          // Section description
          if (line.description) {
            doc.setFontSize(8);
            doc.setTextColor(darkGray);
            doc.setFont(fontFamily, "normal");

            const descLines = doc.splitTextToSize(line.description, contentWidth);
            for (const descLine of descLines) {
              checkPageBreak(5);
              doc.text(descLine, margin, y);
              y += 4;
            }
            y += 2;
          }

          // Photos (3x2 grid)
          if (hasPhotos) {
            const photos = line.photos as string[];
            const photoGap = 2;
            const photosPerRow = 3;
            const photoWidth = (contentWidth - (photosPerRow - 1) * photoGap) / photosPerRow;
            const photoHeight = photoWidth * 0.75; // 4:3 aspect ratio

            // Load all images
            const imageDataList: (ImageData | null)[] = await Promise.all(
              photos.map((url) => loadImageWithDimensions(url))
            );

            for (let j = 0; j < photos.length; j++) {
              const col = j % photosPerRow;
              const isNewRow = col === 0 && j > 0;

              if (isNewRow) {
                y += photoHeight + photoGap;
              }

              // Check page break for new row
              if (col === 0) {
                checkPageBreak(photoHeight + 5);
              }

              const photoX = margin + col * (photoWidth + photoGap);
              const imageData = imageDataList[j];

              try {
                if (imageData) {
                  // Calculate fit dimensions maintaining aspect ratio
                  const dims = calculateFitDimensions(
                    imageData.width,
                    imageData.height,
                    photoWidth,
                    photoHeight
                  );

                  // Center the image in its cell
                  const offsetX = (photoWidth - dims.width) / 2;
                  const offsetY = (photoHeight - dims.height) / 2;

                  // Border around photo area
                  doc.setDrawColor(borderGray);
                  doc.setLineWidth(0.2);
                  doc.rect(photoX, y, photoWidth, photoHeight, "S");

                  // Add image
                  doc.addImage(
                    imageData.base64,
                    "JPEG",
                    photoX + offsetX,
                    y + offsetY,
                    dims.width,
                    dims.height
                  );
                } else {
                  // Placeholder
                  doc.setFillColor("#f0f0f0");
                  doc.setDrawColor(borderGray);
                  doc.setLineWidth(0.2);
                  doc.rect(photoX, y, photoWidth, photoHeight, "FD");
                  doc.setFontSize(7);
                  doc.setTextColor(lightGray);
                  doc.text("Photo", photoX + photoWidth / 2, y + photoHeight / 2, { align: "center" });
                }
              } catch {
                // Error placeholder
                doc.setFillColor("#f0f0f0");
                doc.rect(photoX, y, photoWidth, photoHeight, "F");
              }
            }

            // Move Y after last row of photos
            y += photoHeight + 8;
          } else {
            y += 4;
          }

          // Section spacing
          if (i < lines.length - 1) {
            y += 4;
          }
        }
      }

      // === ADD BORDERS AND FOOTERS TO ALL PAGES ===
      const totalPages = doc.internal.pages.length - 1;
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        drawPageBorder();
        drawFooter(p, totalPages);
      }

      // === SAVE PDF ===
      const dateForFile = new Date(report.created_at).toISOString().split("T")[0];
      const fileName = `${projectCode}_${reportTypeLabel.replace(/\s+/g, "_")}_${dateForFile}.pdf`;

      doc.save(fileName);

      // Log download activity (fire and forget)
      logReportActivity(report.id, "downloaded").catch(console.error);
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
