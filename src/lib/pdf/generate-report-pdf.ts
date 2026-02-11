/**
 * Report PDF Generation Utility — V2 Design
 *
 * Print-friendly design with minimal ink usage:
 * - White background header (no dark bars)
 * - Teal accent lines only (thin, minimal ink)
 * - 2-column photo grid (3:2 aspect ratio)
 * - Clean inline teal section numbers (01, 02)
 * - Full-width title underlines
 * - Section dividers between sections
 * - Compact continuation header on pages 2+
 * - No page borders
 * - Footer: "Formula Contract" | "Confidential" | "Page X of Y"
 *
 * Data model: title (required), description (optional), photos[] (URLs)
 * Zero additional fields required.
 */

import type { Report } from "@/lib/actions/reports";
import { REPORT_TYPE_LABELS } from "@/components/reports/report-types";
import {
  type ImageData,
  loadImageWithDimensions,
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

// ============================================================================
// Colors — print-friendly palette (minimal ink)
// ============================================================================
const COLORS = {
  teal: "#14b8a6",
  tealDark: "#0d9488",
  tealSlim: "#5eead4", // lighter teal for continuation accent line
  textPrimary: "#1f2937",
  textSecondary: "#4b5563",
  textMuted: "#6b7280",
  textLight: "#9ca3af",
  border: "#e5e7eb",
  placeholder: "#f0f1f3",
  white: "#ffffff",
};

// ============================================================================
// Layout constants (mm)
// ============================================================================
const MARGIN = 16;
const FOOTER_HEIGHT = 12;
const MAX_DESCRIPTION_LINES = 3;
const IMAGE_RENDER_WIDTH = 1400;

/**
 * Internal PDF generation — creates the jsPDF document
 */
async function generatePdfDocument(options: GeneratePdfOptions): Promise<{
  doc: import("jspdf").jsPDF;
  fileName: string;
}> {
  const { report, projectName, projectCode } = options;

  // Dynamic imports (client-side only)
  const [{ jsPDF }, { loadRobotoFonts }] = await Promise.all([
    import("jspdf"),
    import("@/lib/fonts/roboto-loader"),
  ]);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const fontFamily = await loadRobotoFonts(doc);

  const pageWidth = doc.internal.pageSize.getWidth(); // 210
  const pageHeight = doc.internal.pageSize.getHeight(); // 297
  const contentWidth = pageWidth - MARGIN * 2; // 178
  const maxContentY = pageHeight - MARGIN - FOOTER_HEIGHT;

  // Report metadata
  const reportTypeLabel = REPORT_TYPE_LABELS[report.report_type];
  const dateStr = new Date(report.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const shortDateStr = new Date(report.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const creatorName = report.creator?.name || "Unknown";
  const lastUpdated = new Date(report.updated_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  // Current Y position tracker
  let y = MARGIN;

  // ------------------------------------------------------------------
  // Helper: Draw brand text "Formula Contract" (replaces logo)
  // ------------------------------------------------------------------
  function drawBrandText(x: number, brandY: number, fontSize: number) {
    doc.setFontSize(fontSize);
    doc.setTextColor(COLORS.tealDark);
    doc.setFont(fontFamily, "bold");
    doc.text("Formula Contract", x, brandY);
    return doc.getTextWidth("Formula Contract");
  }

  // ------------------------------------------------------------------
  // Page 1 header — full header with project info + date
  // ------------------------------------------------------------------
  function drawPage1Header() {
    // Brand name
    drawBrandText(MARGIN, y + 4, 13);

    // Project name (below brand)
    doc.setFontSize(11);
    doc.setTextColor(COLORS.textPrimary);
    doc.setFont(fontFamily, "bold");
    doc.text(projectName, MARGIN, y + 10);

    // Project code + report type (below project name)
    doc.setFontSize(8);
    doc.setTextColor(COLORS.textMuted);
    doc.setFont(fontFamily, "normal");
    doc.text(`${projectCode}  •  ${reportTypeLabel}`, MARGIN, y + 14.5);

    // Right side — date block
    const rx = pageWidth - MARGIN;

    doc.setFontSize(6);
    doc.setTextColor(COLORS.tealDark);
    doc.setFont(fontFamily, "bold");
    doc.text("REPORT DATE", rx, y + 2, { align: "right" });

    doc.setFontSize(10);
    doc.setTextColor(COLORS.textPrimary);
    doc.setFont(fontFamily, "bold");
    doc.text(dateStr, rx, y + 6.5, { align: "right" });

    doc.setFontSize(6.5);
    doc.setTextColor(COLORS.textMuted);
    doc.setFont(fontFamily, "normal");
    doc.text(`Created by: ${creatorName}`, rx, y + 10, { align: "right" });
    doc.text(`Last updated: ${lastUpdated}`, rx, y + 13, { align: "right" });

    // Teal accent line
    y += 17;
    doc.setFillColor(COLORS.teal);
    doc.rect(MARGIN, y, contentWidth, 0.7, "F");

    y += 8;
  }

  // ------------------------------------------------------------------
  // Page 2+ header — compact single-line
  // ------------------------------------------------------------------
  function drawContinuationHeader() {
    const ty = y + 4;

    // Brand
    doc.setFontSize(8);
    doc.setTextColor(COLORS.tealDark);
    doc.setFont(fontFamily, "bold");
    doc.text("Formula Contract", MARGIN, ty);

    let cx = MARGIN + doc.getTextWidth("Formula Contract");

    // Separator + project info
    const sep = "  •  ";
    doc.setFont(fontFamily, "normal");
    doc.setTextColor(COLORS.textLight);
    doc.text(sep, cx, ty);
    cx += doc.getTextWidth(sep);

    doc.setFontSize(7);
    doc.setTextColor(COLORS.textPrimary);
    doc.setFont(fontFamily, "bold");
    doc.text(projectName, cx, ty);
    cx += doc.getTextWidth(projectName);

    doc.setFont(fontFamily, "normal");
    doc.setTextColor(COLORS.textLight);
    doc.text(sep, cx, ty);
    cx += doc.getTextWidth(sep);

    doc.setFontSize(7);
    doc.setTextColor(COLORS.textMuted);
    doc.text(projectCode, cx, ty);

    // Date on right
    doc.setFontSize(7);
    doc.setTextColor(COLORS.textMuted);
    doc.text(shortDateStr, pageWidth - MARGIN, ty, { align: "right" });

    // Slim teal line
    y += 7;
    doc.setFillColor(COLORS.tealSlim);
    doc.rect(MARGIN, y, contentWidth, 0.4, "F");

    y += 6;
  }

  // ------------------------------------------------------------------
  // Footer — "Formula Contract" | "Confidential" | "Page X of Y"
  // ------------------------------------------------------------------
  function drawFooter(pageNum: number, totalPages: number) {
    const fy = pageHeight - MARGIN - 3;

    // Thin border line
    doc.setDrawColor(COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, fy - 4, pageWidth - MARGIN, fy - 4);

    doc.setFontSize(6);

    // Left: brand
    doc.setFont(fontFamily, "bold");
    doc.setTextColor(COLORS.tealDark);
    doc.text("Formula Contract", MARGIN, fy);

    // Center: confidential
    doc.setFont(fontFamily, "normal");
    doc.setTextColor(COLORS.textLight);
    doc.text("Confidential", pageWidth / 2, fy, { align: "center" });

    // Right: page number
    doc.setTextColor(COLORS.textMuted);
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - MARGIN, fy, {
      align: "right",
    });
  }

  // ------------------------------------------------------------------
  // Page break check — adds new page with continuation header if needed
  // ------------------------------------------------------------------
  function checkPageBreak(neededHeight: number): boolean {
    if (y + neededHeight > maxContentY) {
      doc.addPage();
      y = MARGIN;
      drawContinuationHeader();
      return true;
    }
    return false;
  }

  // ------------------------------------------------------------------
  // Pre-render image into exact frame dimensions (cover-crop).
  // Scales image to fill the frame completely, cropping overflow edges.
  // This avoids jsPDF stretching/distortion from aspect ratio mismatch.
  // ------------------------------------------------------------------
  const preparedImageCache = new Map<string, string>();

  async function prepareImageForFrame(
    imageData: ImageData,
    photoUrl: string,
    frameW: number,
    frameH: number
  ): Promise<string> {
    const cacheKey = `${photoUrl}|${frameW.toFixed(2)}|${frameH.toFixed(2)}`;
    const cached = preparedImageCache.get(cacheKey);
    if (cached) return cached;

    const img = new window.Image();
    img.src = imageData.base64;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to decode image"));
    });

    const targetW = IMAGE_RENDER_WIDTH;
    const targetH = Math.max(1, Math.round(IMAGE_RENDER_WIDTH * (frameH / frameW)));
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return imageData.base64;
    }

    // Cover: scale up to fill both dimensions, center and crop overflow
    const scale = Math.max(targetW / img.width, targetH / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const dx = (targetW - drawW) / 2;
    const dy = (targetH - drawH) / 2;

    ctx.drawImage(img, dx, dy, drawW, drawH);
    const prepared = canvas.toDataURL("image/jpeg", 0.88);
    preparedImageCache.set(cacheKey, prepared);
    return prepared;
  }

  async function drawImage(
    imageData: ImageData | null,
    photoUrl: string,
    photoX: number,
    photoY: number,
    frameW: number,
    frameH: number
  ) {
    if (imageData) {
      const prepared = await prepareImageForFrame(imageData, photoUrl, frameW, frameH);
      doc.addImage(prepared, "JPEG", photoX, photoY, frameW, frameH);
    } else {
      // Gray placeholder (no border — use "F" only)
      doc.setFillColor(COLORS.placeholder);
      doc.roundedRect(photoX, photoY, frameW, frameH, 1, 1, "F");
      doc.setFontSize(7);
      doc.setTextColor(COLORS.textLight);
      doc.setFont(fontFamily, "normal");
      doc.text("Photo", photoX + frameW / 2, photoY + frameH / 2, {
        align: "center",
      });
    }
  }

  // ====================================================================
  // BUILD PDF
  // ====================================================================

  drawPage1Header();

  const lines = report.lines || [];

  if (lines.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(COLORS.textMuted);
    doc.setFont(fontFamily, "normal");
    doc.text("No content has been added to this report yet.", MARGIN, y);
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const sectionNum = i + 1;
    const photos: string[] = Array.isArray(line.photos) ? line.photos : [];
    const hasPhotos = photos.length > 0;

    // --- Estimate height for page break ---
    // Badge+title ~10, description ~12, photos vary
    const photoRowCount = hasPhotos ? Math.ceil(photos.length / 2) : 0;
    const estimatedPhotoH = photoRowCount * 42; // rough estimate
    const estimatedH = 22 + estimatedPhotoH;
    checkPageBreak(Math.min(estimatedH, 55));

    // === SECTION NUMBER + TITLE ===
    // Teal inline number
    doc.setFontSize(10);
    doc.setTextColor(COLORS.teal);
    doc.setFont(fontFamily, "bold");
    const numStr = sectionNum.toString().padStart(2, "0");
    doc.text(numStr, MARGIN, y + 4);
    const numW = doc.getTextWidth(numStr);

    // Title text
    doc.setTextColor(COLORS.textPrimary);
    doc.setFont(fontFamily, "bold");

    const titleGap = 3;
    const titleMaxW = contentWidth - numW - titleGap;
    const titleLines = doc.splitTextToSize(line.title, titleMaxW);
    const titleLineH = 4.2;

    for (let t = 0; t < titleLines.length; t++) {
      doc.text(titleLines[t], MARGIN + numW + titleGap, y + 4 + t * titleLineH);
    }

    const titleBlockH = Math.max(5, titleLines.length * titleLineH + 1);
    y += titleBlockH + 2;

    // Full-width title underline (dark, 0.5mm)
    doc.setFillColor(COLORS.textPrimary);
    doc.rect(MARGIN, y, contentWidth, 0.4, "F");
    y += 5;

    // === DESCRIPTION ===
    if (line.description) {
      doc.setFontSize(8);
      doc.setTextColor(COLORS.textSecondary);
      doc.setFont(fontFamily, "normal");

      const descMaxW = contentWidth * 0.9;
      const descLines = doc.splitTextToSize(line.description, descMaxW) as string[];
      const isClamped = descLines.length > MAX_DESCRIPTION_LINES;
      const visibleLines = descLines.slice(0, MAX_DESCRIPTION_LINES);
      if (isClamped && visibleLines.length > 0) {
        visibleLines[visibleLines.length - 1] =
          `${visibleLines[visibleLines.length - 1].replace(/\s+$/, "")}…`;
      }

      for (const dl of visibleLines) {
        checkPageBreak(4.5);
        doc.text(dl, MARGIN, y);
        y += 3.8;
      }
      if (isClamped) {
        doc.setFontSize(7);
        doc.setTextColor(COLORS.textLight);
        doc.text("Description truncated for layout.", MARGIN, y);
        y += 3.2;
        doc.setFontSize(8);
        doc.setTextColor(COLORS.textSecondary);
      }
      y += 4;
    }

    // === PHOTOS ===
    if (hasPhotos) {
      const gap = 3; // mm between photos
      const colW = (contentWidth - gap) / 2; // width of each column
      const gridH = colW; // 1:1 square — uniform grid, works for all orientations

      // Load all images for this section
      const imageDataList: (ImageData | null)[] = await Promise.all(
        photos.map((url) => loadImageWithDimensions(url))
      );

      if (photos.length === 1) {
        // --- SINGLE PHOTO: full width, 1:1 square ---
        const singleH = contentWidth * (9 / 16); // 16:9 hero for single
        checkPageBreak(singleH + 5);
        try {
          await drawImage(imageDataList[0], photos[0], MARGIN, y, contentWidth, singleH);
        } catch {
          doc.setFillColor(COLORS.placeholder);
          doc.roundedRect(MARGIN, y, contentWidth, singleH, 1, 1, "F");
        }
        y += singleH + 4;

      } else if (photos.length === 3) {
        // --- TRIPLE: hero (full width 16:9) + 2 square side-by-side ---
        const heroH = contentWidth * (9 / 16);
        checkPageBreak(heroH + 5);
        try {
          await drawImage(imageDataList[0], photos[0], MARGIN, y, contentWidth, heroH);
        } catch {
          doc.setFillColor(COLORS.placeholder);
          doc.roundedRect(MARGIN, y, contentWidth, heroH, 1, 1, "F");
        }
        y += heroH + gap;

        checkPageBreak(gridH + 5);
        try {
          await drawImage(imageDataList[1], photos[1], MARGIN, y, colW, gridH);
        } catch {
          doc.setFillColor(COLORS.placeholder);
          doc.roundedRect(MARGIN, y, colW, gridH, 1, 1, "F");
        }
        try {
          await drawImage(imageDataList[2], photos[2], MARGIN + colW + gap, y, colW, gridH);
        } catch {
          doc.setFillColor(COLORS.placeholder);
          doc.roundedRect(MARGIN + colW + gap, y, colW, gridH, 1, 1, "F");
        }
        y += gridH + 4;

      } else {
        // --- STANDARD 2-COLUMN GRID (uniform 1:1 square frames) ---
        for (let j = 0; j < photos.length; j += 2) {
          const hasRight = j + 1 < photos.length;

          checkPageBreak(gridH + 5);

          // Left photo
          try {
            await drawImage(imageDataList[j], photos[j], MARGIN, y, colW, gridH);
          } catch {
            doc.setFillColor(COLORS.placeholder);
            doc.roundedRect(MARGIN, y, colW, gridH, 1, 1, "F");
          }

          // Right photo (if exists)
          if (hasRight) {
            try {
              await drawImage(imageDataList[j + 1], photos[j + 1], MARGIN + colW + gap, y, colW, gridH);
            } catch {
              doc.setFillColor(COLORS.placeholder);
              doc.roundedRect(MARGIN + colW + gap, y, colW, gridH, 1, 1, "F");
            }
          }

          y += gridH + gap;
        }

        // Replace last gap with final spacing
        y += 4 - gap;
      }
    }

    // === SECTION DIVIDER (except after last section) ===
    if (i < lines.length - 1) {
      y += 2;
      doc.setDrawColor(COLORS.border);
      doc.setLineWidth(0.3);
      doc.line(MARGIN, y, pageWidth - MARGIN, y);
      y += 6;
    } else {
      y += 4;
    }
  }

  // ====================================================================
  // FOOTERS — applied to every page at the end
  // ====================================================================
  const totalPages = doc.internal.pages.length - 1;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(p, totalPages);
  }

  // File name
  const dateForFile = new Date(report.created_at).toISOString().split("T")[0];
  const safeName = reportTypeLabel.replace(/\s+/g, "_");
  const fileName = `${projectCode}_${safeName}_${dateForFile}.pdf`;

  return { doc, fileName };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Generate a PDF and return as base64 data URI
 * (for uploading to storage)
 */
export async function generateReportPdfBase64(
  options: GeneratePdfOptions
): Promise<GeneratePdfResult> {
  try {
    const { doc, fileName } = await generatePdfDocument(options);
    const base64 = doc.output("datauristring");
    return { success: true, base64, fileName };
  } catch (error) {
    console.error("Error generating PDF:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate PDF",
    };
  }
}

/**
 * Generate a PDF and trigger browser download
 */
export async function downloadReportPdf(
  options: GeneratePdfOptions
): Promise<boolean> {
  try {
    const { doc, fileName } = await generatePdfDocument(options);
    doc.save(fileName);
    return true;
  } catch (error) {
    console.error("Error generating PDF:", error);
    return false;
  }
}
