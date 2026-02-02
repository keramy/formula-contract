/**
 * Report PDF Generation Utility
 *
 * Shared logic for generating report PDFs that can be used for:
 * - Direct download (save to user's device)
 * - Upload to storage (return base64 for server upload)
 *
 * Design features:
 * - FC logo placeholder with teal gradient
 * - Detailed header with creator name & last updated date
 * - Compact continuation headers for pages 2+
 * - "Formula Contract" branding in footer
 * - Numbered sections (1. Title, 2. Title)
 * - Page borders
 * - Dynamic photo sizing with proper aspect ratio handling
 */

import type { Report } from "@/lib/actions/reports";
import { REPORT_TYPE_LABELS } from "@/components/reports/report-types";
import {
  type ImageData,
  loadImageWithDimensions,
  calculateFitDimensions,
} from "./image-helpers";

export interface GeneratePdfOptions {
  report: Report;
  projectName: string;
  projectCode: string;
}

export interface GeneratePdfResult {
  success: boolean;
  base64?: string;
  fileName?: string;
  error?: string;
}

/**
 * Internal PDF generation function
 * Creates the PDF document with the unified design
 */
async function generatePdfDocument(options: GeneratePdfOptions): Promise<{
  doc: import("jspdf").jsPDF;
  fileName: string;
}> {
  const { report, projectName, projectCode } = options;

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
  const fontFamily = await loadRobotoFonts(doc);

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  // Colors
  const teal = "#14b8a6";
  const black = "#111111";
  const darkGray = "#333333";
  const mediumGray = "#666666";
  const lightGray = "#888888";
  const borderGray = "#cccccc";

  // Report metadata
  const reportTypeLabel = REPORT_TYPE_LABELS[report.report_type];
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

  // Track Y position for content layout
  let y = margin;

  // Footer height reservation
  const footerHeight = 15;
  const maxContentY = pageHeight - margin - footerHeight;

  // === DRAW FC LOGO ===
  const drawLogo = (x: number, logoY: number, size: number) => {
    doc.setFillColor(teal);
    doc.roundedRect(x, logoY, size, size, 2, 2, "F");

    doc.setFontSize(size * 0.55);
    doc.setTextColor("#ffffff");
    doc.setFont(fontFamily, "bold");
    doc.text("FC", x + size / 2, logoY + size * 0.65, { align: "center" });
  };

  // === DRAW PAGE 1 HEADER ===
  const drawPage1Header = () => {
    const logoSize = 14;

    drawLogo(margin, y, logoSize);

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

    doc.setFontSize(7);
    doc.setTextColor(teal);
    doc.setFont(fontFamily, "bold");
    doc.text("REPORT DATE", rightX, y + 2, { align: "right" });

    doc.setFontSize(10);
    doc.setTextColor(black);
    doc.setFont(fontFamily, "bold");
    doc.text(dateStr, rightX, y + 7, { align: "right" });

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

    drawLogo(margin, y, logoSize);

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

    doc.setDrawColor(teal);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);

    y += 6;
  };

  // === DRAW FOOTER ===
  const drawFooter = (pageNum: number, totalPages: number) => {
    const footerY = pageHeight - margin - 5;

    doc.setDrawColor(teal);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

    doc.setFontSize(7);
    doc.setFont(fontFamily, "bold");
    doc.setTextColor(teal);
    doc.text("Formula Contract", margin, footerY);

    doc.setFont(fontFamily, "normal");
    doc.setTextColor(mediumGray);
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, footerY, { align: "right" });
  };

  // === CHECK PAGE BREAK ===
  const checkPageBreak = (neededHeight: number): boolean => {
    if (y + neededHeight > maxContentY) {
      doc.addPage();
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
      const estimatedHeight = 20 + (photoRows * 32);

      checkPageBreak(Math.min(estimatedHeight, 60));

      // Section title with underline
      doc.setFontSize(10);
      doc.setTextColor(black);
      doc.setFont(fontFamily, "bold");
      const titleText = `${sectionNum}. ${line.title}`;
      doc.text(titleText, margin, y);

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

      // Photos (3-column grid with dynamic sizing)
      if (hasPhotos) {
        const photos = line.photos as string[];
        const photoGap = 2;
        const photosPerRow = 3;
        const photoWidth = (contentWidth - (photosPerRow - 1) * photoGap) / photosPerRow;

        // Calculate dynamic photo height based on available space
        const defaultPhotoHeight = photoWidth * 0.75; // 4:3 default
        const photoRows = Math.ceil(photos.length / photosPerRow);
        const availableHeight = maxContentY - y - 8; // Leave some bottom margin
        const maxHeightPerRow = (availableHeight - (photoRows - 1) * photoGap) / photoRows;

        // Use larger size if space allows, but cap at 1.5x default
        const photoHeight = Math.min(
          Math.max(defaultPhotoHeight, maxHeightPerRow),
          defaultPhotoHeight * 1.5
        );

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
              const dims = calculateFitDimensions(
                imageData.width,
                imageData.height,
                photoWidth,
                photoHeight
              );

              const offsetX = (photoWidth - dims.width) / 2;
              const offsetY = (photoHeight - dims.height) / 2;

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
              doc.rect(photoX, y, photoWidth, photoHeight, "F");
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

  // Generate filename
  const dateForFile = new Date(report.created_at).toISOString().split("T")[0];
  const fileName = `${projectCode}_${reportTypeLabel.replace(/\s+/g, "_")}_${dateForFile}.pdf`;

  return { doc, fileName };
}

/**
 * Generate a PDF for a report and return it as base64
 * This is a client-side only function (uses browser APIs)
 */
export async function generateReportPdfBase64(
  options: GeneratePdfOptions
): Promise<GeneratePdfResult> {
  try {
    const { doc, fileName } = await generatePdfDocument(options);
    const base64 = doc.output("datauristring");

    return {
      success: true,
      base64,
      fileName,
    };
  } catch (error) {
    console.error("Error generating PDF:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate PDF",
    };
  }
}

/**
 * Generate and download a PDF for a report
 */
export async function downloadReportPdf(options: GeneratePdfOptions): Promise<boolean> {
  try {
    const { doc, fileName } = await generatePdfDocument(options);
    doc.save(fileName);
    return true;
  } catch (error) {
    console.error("Error generating PDF:", error);
    return false;
  }
}
