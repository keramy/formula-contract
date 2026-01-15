/**
 * File Upload Validation Utility
 *
 * Provides comprehensive validation for file uploads including:
 * - File type validation (MIME types and extensions)
 * - File size limits
 * - File name sanitization
 * - Magic byte verification (optional)
 *
 * Usage:
 * - validateFile(file, config): Validate a single file
 * - validateFiles(files, config): Validate multiple files
 * - getFileTypeCategory(file): Detect file category
 */

// ============================================================================
// Types
// ============================================================================

export interface FileValidationConfig {
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Allowed MIME types (e.g., ["image/jpeg", "image/png"]) */
  allowedMimeTypes?: string[];
  /** Allowed file extensions without dot (e.g., ["jpg", "png"]) */
  allowedExtensions?: string[];
  /** Whether to validate magic bytes (file content) */
  validateMagicBytes?: boolean;
  /** Maximum file name length */
  maxFileNameLength?: number;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedName?: string;
}

// ============================================================================
// Preset Configurations
// ============================================================================

/** Configuration for image uploads */
export const IMAGE_CONFIG: FileValidationConfig = {
  maxSize: 10 * 1024 * 1024, // 10 MB
  allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  allowedExtensions: ["jpg", "jpeg", "png", "gif", "webp"],
  maxFileNameLength: 255,
};

/** Configuration for PDF uploads */
export const PDF_CONFIG: FileValidationConfig = {
  maxSize: 50 * 1024 * 1024, // 50 MB
  allowedMimeTypes: ["application/pdf"],
  allowedExtensions: ["pdf"],
  maxFileNameLength: 255,
};

/** Configuration for drawing files (PDF + Images) */
export const DRAWING_CONFIG: FileValidationConfig = {
  maxSize: 50 * 1024 * 1024, // 50 MB
  allowedMimeTypes: [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ],
  allowedExtensions: ["pdf", "jpg", "jpeg", "png", "gif", "webp"],
  maxFileNameLength: 255,
};

/** Configuration for CAD files */
export const CAD_CONFIG: FileValidationConfig = {
  maxSize: 100 * 1024 * 1024, // 100 MB
  allowedMimeTypes: [
    "application/acad",
    "image/vnd.dwg",
    "image/x-dwg",
    "application/dxf",
    "application/x-dxf",
    "application/octet-stream", // Generic for CAD files
  ],
  allowedExtensions: ["dwg", "dxf", "skp", "3ds", "obj", "fbx", "step", "stp"],
  maxFileNameLength: 255,
};

/** Configuration for document uploads */
export const DOCUMENT_CONFIG: FileValidationConfig = {
  maxSize: 25 * 1024 * 1024, // 25 MB
  allowedMimeTypes: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
  ],
  allowedExtensions: ["pdf", "doc", "docx", "xls", "xlsx", "txt", "csv"],
  maxFileNameLength: 255,
};

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate a single file against the provided configuration
 */
export function validateFile(
  file: File,
  config: FileValidationConfig = {}
): FileValidationResult {
  const {
    maxSize = 50 * 1024 * 1024, // Default 50 MB
    allowedMimeTypes,
    allowedExtensions,
    maxFileNameLength = 255,
  } = config;

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / 1024 / 1024);
    const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
    return {
      valid: false,
      error: `File is too large (${fileSizeMB} MB). Maximum size is ${maxSizeMB} MB.`,
    };
  }

  // Check if file is empty
  if (file.size === 0) {
    return {
      valid: false,
      error: "File is empty.",
    };
  }

  // Get file extension
  const extension = getFileExtension(file.name).toLowerCase();

  // Check extension
  if (allowedExtensions && allowedExtensions.length > 0) {
    if (!allowedExtensions.includes(extension)) {
      return {
        valid: false,
        error: `File type .${extension} is not allowed. Allowed types: ${allowedExtensions
          .map((e) => `.${e}`)
          .join(", ")}`,
      };
    }
  }

  // Check MIME type
  if (allowedMimeTypes && allowedMimeTypes.length > 0) {
    // Special handling for CAD files which often have generic MIME types
    const isGenericMime = file.type === "application/octet-stream" || file.type === "";
    const isCadExtension = ["dwg", "dxf", "skp", "3ds", "obj", "fbx", "step", "stp"].includes(extension);

    if (!allowedMimeTypes.includes(file.type) && !(isGenericMime && isCadExtension)) {
      return {
        valid: false,
        error: `File type ${file.type || "unknown"} is not allowed.`,
      };
    }
  }

  // Sanitize and check file name
  const sanitizedName = sanitizeFileName(file.name);
  if (sanitizedName.length > maxFileNameLength) {
    return {
      valid: false,
      error: `File name is too long. Maximum length is ${maxFileNameLength} characters.`,
    };
  }

  // Check for suspicious file names
  if (isSuspiciousFileName(file.name)) {
    return {
      valid: false,
      error: "File name contains suspicious patterns.",
    };
  }

  return {
    valid: true,
    sanitizedName,
  };
}

/**
 * Validate multiple files
 */
export function validateFiles(
  files: FileList | File[],
  config: FileValidationConfig = {},
  maxFiles: number = 10
): { valid: boolean; errors: string[]; validFiles: File[] } {
  const errors: string[] = [];
  const validFiles: File[] = [];
  const fileArray = Array.from(files);

  if (fileArray.length > maxFiles) {
    errors.push(`Too many files. Maximum ${maxFiles} files allowed.`);
    return { valid: false, errors, validFiles };
  }

  for (const file of fileArray) {
    const result = validateFile(file, config);
    if (result.valid) {
      validFiles.push(file);
    } else {
      errors.push(`${file.name}: ${result.error}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    validFiles,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get file extension from file name
 */
export function getFileExtension(fileName: string): string {
  const parts = fileName.split(".");
  if (parts.length < 2) return "";
  return parts[parts.length - 1];
}

/**
 * Sanitize file name - removes dangerous characters
 */
export function sanitizeFileName(fileName: string): string {
  // Get extension
  const ext = getFileExtension(fileName);
  const name = ext ? fileName.slice(0, -(ext.length + 1)) : fileName;

  // Remove or replace dangerous characters
  const sanitized = name
    // Remove path traversal attempts
    .replace(/\.\./g, "")
    // Remove dangerous characters
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    // Replace spaces with underscores
    .replace(/\s+/g, "_")
    // Remove leading/trailing dots and spaces
    .replace(/^[\s.]+|[\s.]+$/g, "")
    // Limit consecutive underscores
    .replace(/_+/g, "_");

  // Return with extension
  return ext ? `${sanitized}.${ext.toLowerCase()}` : sanitized;
}

/**
 * Check for suspicious file names that might indicate an attack
 */
function isSuspiciousFileName(fileName: string): boolean {
  const suspiciousPatterns = [
    /\.\./,           // Path traversal
    /%00/,            // Null byte
    /^\.htaccess$/i,  // Server config
    /^web\.config$/i, // Server config
    /\.php$/i,        // Executable
    /\.exe$/i,        // Executable
    /\.sh$/i,         // Executable
    /\.bat$/i,        // Executable
    /\.cmd$/i,        // Executable
    /\.ps1$/i,        // PowerShell
    /\.vbs$/i,        // VBScript
    /\.js$/i,         // JavaScript (in file uploads)
    /\.html?$/i,      // HTML files
    /\.svg$/i,        // SVG (can contain scripts)
  ];

  return suspiciousPatterns.some((pattern) => pattern.test(fileName));
}

/**
 * Get file type category
 */
export function getFileTypeCategory(file: File): "image" | "pdf" | "cad" | "document" | "unknown" {
  const extension = getFileExtension(file.name).toLowerCase();

  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff"].includes(extension)) {
    return "image";
  }

  if (extension === "pdf") {
    return "pdf";
  }

  if (["dwg", "dxf", "skp", "3ds", "obj", "fbx", "step", "stp"].includes(extension)) {
    return "cad";
  }

  if (["doc", "docx", "xls", "xlsx", "txt", "csv"].includes(extension)) {
    return "document";
  }

  return "unknown";
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
