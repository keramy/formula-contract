import { describe, expect, it } from "vitest";
import {
  CAD_CONFIG,
  DOCUMENT_CONFIG,
  IMAGE_CONFIG,
  PDF_CONFIG,
  formatFileSize,
  getFileTypeCategory,
  isSuspiciousFileName,
  sanitizeFileName,
  validateFile,
} from "@/lib/file-validation";

function makeFile(content: string, name: string, type: string) {
  return new File([content], name, { type });
}

describe("validateFile", () => {
  it("accepts a valid image file", () => {
    const file = makeFile("image-data", "photo.png", "image/png");
    const result = validateFile(file, IMAGE_CONFIG);

    expect(result.valid).toBe(true);
    expect(result.sanitizedName).toBe("photo.png");
  });

  it("rejects oversized files", () => {
    const file = makeFile("a".repeat(2_000), "big.png", "image/png");
    const result = validateFile(file, {
      ...IMAGE_CONFIG,
      maxSize: 1_000,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain("too large");
  });

  it("rejects files with disallowed mime type", () => {
    const file = makeFile("content", "note.txt", "text/plain");
    const result = validateFile(file, IMAGE_CONFIG);

    expect(result.valid).toBe(false);
    expect(result.error).toContain("not allowed");
  });
});

describe("sanitizeFileName", () => {
  it("sanitizes path traversal patterns", () => {
    const sanitized = sanitizeFileName("../../etc/passwd");

    expect(sanitized).not.toContain("..");
    expect(sanitized).not.toContain("/");
    expect(sanitized).not.toContain("\\");
  });
});

describe("isSuspiciousFileName", () => {
  it("flags suspicious names and accepts normal ones", () => {
    expect(isSuspiciousFileName("photo.jpg")).toBe(false);
    expect(isSuspiciousFileName("script.php")).toBe(true);
    expect(isSuspiciousFileName("../../../etc/passwd")).toBe(true);
  });
});

describe("formatFileSize", () => {
  it("formats bytes to human readable values", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB");
    expect(formatFileSize(1_048_576)).toBe("1.0 MB");
  });
});

describe("getFileTypeCategory", () => {
  it("detects image, pdf, cad, and document categories", () => {
    expect(getFileTypeCategory(makeFile("x", "photo.jpg", "image/jpeg"))).toBe("image");
    expect(getFileTypeCategory(makeFile("x", "report.pdf", "application/pdf"))).toBe("pdf");
    expect(getFileTypeCategory(makeFile("x", "plan.dwg", "application/octet-stream"))).toBe("cad");
    expect(getFileTypeCategory(makeFile("x", "notes.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"))).toBe("document");
  });

  it("returns unknown for unsupported extension", () => {
    expect(getFileTypeCategory(makeFile("x", "archive.zip", "application/zip"))).toBe("unknown");
  });
});

describe("preset configs", () => {
  it("keeps expected MIME families available", () => {
    expect(IMAGE_CONFIG.allowedMimeTypes).toContain("image/png");
    expect(PDF_CONFIG.allowedMimeTypes).toContain("application/pdf");
    expect(CAD_CONFIG.allowedExtensions).toContain("dwg");
    expect(DOCUMENT_CONFIG.allowedExtensions).toContain("docx");
  });
});
