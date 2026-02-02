/**
 * Report PDF Generation Utility
 *
 * Shared logic for generating report PDFs that can be used for:
 * - Direct download (save to user's device)
 * - Upload to storage (return base64 for server upload)
 */

import type { Report } from "@/lib/actions/reports";

const REPORT_TYPE_LABELS: Record<string, string> = {
  daily: "Daily Report",
  weekly: "Weekly Report",
  site: "Site Report",
  installation: "Installation Report",
  snagging: "Snagging Report",
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
 * Generate a PDF for a report and return it as base64
 * This is a client-side only function (uses browser APIs)
 */
export async function generateReportPdfBase64(
  options: GeneratePdfOptions
): Promise<GeneratePdfResult> {
  const { report, projectName, projectCode } = options;

  try {
    // Dynamic import - jsPDF (~100KB) loaded only when needed
    const [{ jsPDF }, { loadRobotoFonts }] = await Promise.all([
      import("jspdf"),
      import("@/lib/fonts/roboto-loader"),
    ]);

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Load Roboto fonts (returns font family to use - Roboto or helvetica fallback)
    const fontFamily = await loadRobotoFonts(doc);

    // Page dimensions
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;

    // Colors
    const tealColor: [number, number, number] = [20, 184, 166]; // #14b8a6
    const darkGray: [number, number, number] = [31, 41, 55]; // #1f2937
    const lightGray: [number, number, number] = [107, 114, 128]; // #6b7280

    let currentY = margin;

    // Helper: Check if we need a new page
    const checkNewPage = (neededHeight: number): boolean => {
      if (currentY + neededHeight > pageHeight - margin - 15) {
        doc.addPage();
        currentY = margin;
        return true;
      }
      return false;
    };

    // Helper: Draw page border
    const drawPageBorder = () => {
      doc.setDrawColor(...tealColor);
      doc.setLineWidth(0.5);
      doc.rect(margin - 5, margin - 5, contentWidth + 10, pageHeight - 2 * margin + 10);
    };

    // Helper: Draw footer
    const drawFooter = (pageNum: number, totalPages: number) => {
      doc.setFont(fontFamily, "normal");
      doc.setFontSize(8);
      doc.setTextColor(...lightGray);
      doc.text(
        `Page ${pageNum} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: "center" }
      );
    };

    // === HEADER SECTION ===
    // Logo placeholder (teal gradient box)
    doc.setFillColor(...tealColor);
    doc.roundedRect(margin, currentY, 35, 12, 2, 2, "F");
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("FC", margin + 17.5, currentY + 7.5, { align: "center" });

    // Report type badge
    const reportTypeLabel = REPORT_TYPE_LABELS[report.report_type] || report.report_type;
    doc.setFillColor(240, 253, 250); // teal-50
    doc.roundedRect(pageWidth - margin - 40, currentY, 40, 12, 2, 2, "F");
    doc.setFont(fontFamily, "medium");
    doc.setFontSize(9);
    doc.setTextColor(...tealColor);
    doc.text(reportTypeLabel, pageWidth - margin - 20, currentY + 7.5, { align: "center" });

    currentY += 20;

    // Project name
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(20);
    doc.setTextColor(...darkGray);
    doc.text(projectName, margin, currentY);
    currentY += 8;

    // Project code
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(10);
    doc.setTextColor(...lightGray);
    doc.text(projectCode, margin, currentY);
    currentY += 10;

    // Divider
    doc.setDrawColor(...tealColor);
    doc.setLineWidth(0.75);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 8;

    // Report code and date info
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(9);
    doc.setTextColor(...lightGray);
    const createdDate = new Date(report.created_at).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    // Display report code if available
    if (report.report_code) {
      doc.setFont(fontFamily, "medium");
      doc.setTextColor(...tealColor);
      doc.text(`Report: ${report.report_code}`, margin, currentY);
      doc.setFont(fontFamily, "normal");
      doc.setTextColor(...lightGray);
      doc.text(`  |  ${createdDate}`, margin + doc.getTextWidth(`Report: ${report.report_code}`), currentY);
    } else {
      doc.text(`Report Date: ${createdDate}`, margin, currentY);
    }
    currentY += 15;

    // === REPORT LINES (SECTIONS) ===
    const lines = report.lines || [];
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];

      // Section header
      checkNewPage(25);
      doc.setFont(fontFamily, "bold");
      doc.setFontSize(13);
      doc.setTextColor(...darkGray);
      doc.text(line.title, margin, currentY);

      // Underline for section title
      const titleWidth = doc.getTextWidth(line.title);
      doc.setDrawColor(...tealColor);
      doc.setLineWidth(0.5);
      doc.line(margin, currentY + 1.5, margin + titleWidth, currentY + 1.5);
      currentY += 8;

      // Description
      if (line.description) {
        doc.setFont(fontFamily, "normal");
        doc.setFontSize(10);
        doc.setTextColor(...lightGray);
        const descLines = doc.splitTextToSize(line.description, contentWidth);
        for (const descLine of descLines) {
          checkNewPage(6);
          doc.text(descLine, margin, currentY);
          currentY += 5;
        }
        currentY += 5;
      }

      // Photos (3x2 grid layout)
      const photos = line.photos || [];
      if (photos.length > 0) {
        const photosPerRow = 3;
        const photoMaxWidth = (contentWidth - 10) / photosPerRow;
        const photoMaxHeight = 40;
        const photoGap = 5;

        for (let i = 0; i < photos.length; i += photosPerRow) {
          const rowPhotos = photos.slice(i, i + photosPerRow);

          // Check if we need new page for this row
          checkNewPage(photoMaxHeight + photoGap);

          let xOffset = margin;
          for (const photoUrl of rowPhotos) {
            const imageData = await loadImageWithDimensions(photoUrl);
            if (imageData) {
              const { width, height } = calculateFitDimensions(
                imageData.width,
                imageData.height,
                photoMaxWidth - 2,
                photoMaxHeight
              );

              // Center the image in its cell
              const xPos = xOffset + (photoMaxWidth - width) / 2;
              doc.addImage(imageData.base64, "JPEG", xPos, currentY, width, height);
            }
            xOffset += photoMaxWidth + photoGap;
          }
          currentY += photoMaxHeight + photoGap;
        }
      }

      // Space between sections
      currentY += 10;
    }

    // === ADD BORDERS AND FOOTERS TO ALL PAGES ===
    const totalPages = doc.internal.pages.length - 1;
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      drawPageBorder();
      drawFooter(p, totalPages);
    }

    // === GENERATE BASE64 ===
    const dateForFile = new Date(report.created_at).toISOString().split("T")[0];
    const fileName = `${projectCode}_${reportTypeLabel.replace(/\s+/g, "_")}_${dateForFile}.pdf`;

    // Get base64 data
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
    const [{ jsPDF }, { loadRobotoFonts }] = await Promise.all([
      import("jspdf"),
      import("@/lib/fonts/roboto-loader"),
    ]);

    const { report, projectName, projectCode } = options;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Load Roboto fonts (returns font family to use - Roboto or helvetica fallback)
    const fontFamily = await loadRobotoFonts(doc);

    // Page dimensions
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;

    // Colors
    const tealColor: [number, number, number] = [20, 184, 166];
    const darkGray: [number, number, number] = [31, 41, 55];
    const lightGray: [number, number, number] = [107, 114, 128];

    let currentY = margin;

    const checkNewPage = (neededHeight: number): boolean => {
      if (currentY + neededHeight > pageHeight - margin - 15) {
        doc.addPage();
        currentY = margin;
        return true;
      }
      return false;
    };

    const drawPageBorder = () => {
      doc.setDrawColor(...tealColor);
      doc.setLineWidth(0.5);
      doc.rect(margin - 5, margin - 5, contentWidth + 10, pageHeight - 2 * margin + 10);
    };

    const drawFooter = (pageNum: number, totalPages: number) => {
      doc.setFont(fontFamily, "normal");
      doc.setFontSize(8);
      doc.setTextColor(...lightGray);
      doc.text(
        `Page ${pageNum} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: "center" }
      );
    };

    // === HEADER ===
    doc.setFillColor(...tealColor);
    doc.roundedRect(margin, currentY, 35, 12, 2, 2, "F");
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("FC", margin + 17.5, currentY + 7.5, { align: "center" });

    const reportTypeLabel = REPORT_TYPE_LABELS[report.report_type] || report.report_type;
    doc.setFillColor(240, 253, 250);
    doc.roundedRect(pageWidth - margin - 40, currentY, 40, 12, 2, 2, "F");
    doc.setFont(fontFamily, "medium");
    doc.setFontSize(9);
    doc.setTextColor(...tealColor);
    doc.text(reportTypeLabel, pageWidth - margin - 20, currentY + 7.5, { align: "center" });

    currentY += 20;

    doc.setFont(fontFamily, "bold");
    doc.setFontSize(20);
    doc.setTextColor(...darkGray);
    doc.text(projectName, margin, currentY);
    currentY += 8;

    doc.setFont(fontFamily, "normal");
    doc.setFontSize(10);
    doc.setTextColor(...lightGray);
    doc.text(projectCode, margin, currentY);
    currentY += 10;

    doc.setDrawColor(...tealColor);
    doc.setLineWidth(0.75);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 8;

    // Report code and date info
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(9);
    doc.setTextColor(...lightGray);
    const createdDate = new Date(report.created_at).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    // Display report code if available
    if (report.report_code) {
      doc.setFont(fontFamily, "medium");
      doc.setTextColor(...tealColor);
      doc.text(`Report: ${report.report_code}`, margin, currentY);
      doc.setFont(fontFamily, "normal");
      doc.setTextColor(...lightGray);
      doc.text(`  |  ${createdDate}`, margin + doc.getTextWidth(`Report: ${report.report_code}`), currentY);
    } else {
      doc.text(`Report Date: ${createdDate}`, margin, currentY);
    }
    currentY += 15;

    // === SECTIONS ===
    const lines = report.lines || [];
    for (const line of lines) {
      checkNewPage(25);
      doc.setFont(fontFamily, "bold");
      doc.setFontSize(13);
      doc.setTextColor(...darkGray);
      doc.text(line.title, margin, currentY);

      const titleWidth = doc.getTextWidth(line.title);
      doc.setDrawColor(...tealColor);
      doc.setLineWidth(0.5);
      doc.line(margin, currentY + 1.5, margin + titleWidth, currentY + 1.5);
      currentY += 8;

      if (line.description) {
        doc.setFont(fontFamily, "normal");
        doc.setFontSize(10);
        doc.setTextColor(...lightGray);
        const descLines = doc.splitTextToSize(line.description, contentWidth);
        for (const descLine of descLines) {
          checkNewPage(6);
          doc.text(descLine, margin, currentY);
          currentY += 5;
        }
        currentY += 5;
      }

      const photos = line.photos || [];
      if (photos.length > 0) {
        const photosPerRow = 3;
        const photoMaxWidth = (contentWidth - 10) / photosPerRow;
        const photoMaxHeight = 40;
        const photoGap = 5;

        for (let i = 0; i < photos.length; i += photosPerRow) {
          const rowPhotos = photos.slice(i, i + photosPerRow);
          checkNewPage(photoMaxHeight + photoGap);

          let xOffset = margin;
          for (const photoUrl of rowPhotos) {
            const imageData = await loadImageWithDimensions(photoUrl);
            if (imageData) {
              const { width, height } = calculateFitDimensions(
                imageData.width,
                imageData.height,
                photoMaxWidth - 2,
                photoMaxHeight
              );
              const xPos = xOffset + (photoMaxWidth - width) / 2;
              doc.addImage(imageData.base64, "JPEG", xPos, currentY, width, height);
            }
            xOffset += photoMaxWidth + photoGap;
          }
          currentY += photoMaxHeight + photoGap;
        }
      }
      currentY += 10;
    }

    // === BORDERS AND FOOTERS ===
    const totalPages = doc.internal.pages.length - 1;
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      drawPageBorder();
      drawFooter(p, totalPages);
    }

    // === SAVE ===
    const dateForFile = new Date(report.created_at).toISOString().split("T")[0];
    const fileName = `${projectCode}_${reportTypeLabel.replace(/\s+/g, "_")}_${dateForFile}.pdf`;
    doc.save(fileName);

    return true;
  } catch (error) {
    console.error("Error generating PDF:", error);
    return false;
  }
}
