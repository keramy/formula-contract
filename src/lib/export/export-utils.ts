import * as XLSX from "xlsx";

// ============================================================================
// DATA EXPORT UTILITIES
// ============================================================================

export interface ColumnDefinition {
  key: string;
  header: string;
  /** Optional formatter function for the value */
  format?: (value: unknown) => string | number;
}

/**
 * Prepares data for export by extracting specified columns and applying formatting
 */
function prepareData(
  data: Record<string, unknown>[],
  columns: ColumnDefinition[]
): Record<string, string | number>[] {
  return data.map((row) => {
    const exportRow: Record<string, string | number> = {};
    columns.forEach((col) => {
      const value = getNestedValue(row, col.key);
      if (col.format) {
        exportRow[col.header] = col.format(value);
      } else if (value === null || value === undefined) {
        exportRow[col.header] = "";
      } else if (typeof value === "object") {
        exportRow[col.header] = JSON.stringify(value);
      } else {
        exportRow[col.header] = String(value);
      }
    });
    return exportRow;
  });
}

/**
 * Gets a nested value from an object using dot notation (e.g., "client.name")
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((current, key) => {
    if (current && typeof current === "object" && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj as unknown);
}

/**
 * Generates a filename with timestamp
 */
function generateFilename(baseName: string, extension: string): string {
  const date = new Date();
  const timestamp = date.toISOString().split("T")[0]; // YYYY-MM-DD
  return `${baseName}_${timestamp}.${extension}`;
}

/**
 * Triggers a file download in the browser
 */
function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// CSV EXPORT
// ============================================================================

export interface ExportToCSVOptions {
  data: Record<string, unknown>[];
  columns: ColumnDefinition[];
  filename?: string;
}

/**
 * Exports data to a CSV file
 *
 * @example
 * exportToCSV({
 *   data: scopeItems,
 *   columns: [
 *     { key: "item_code", header: "Code" },
 *     { key: "name", header: "Name" },
 *     { key: "status", header: "Status" },
 *   ],
 *   filename: "scope-items",
 * });
 */
export function exportToCSV({ data, columns, filename = "export" }: ExportToCSVOptions): void {
  const preparedData = prepareData(data, columns);

  // Create CSV header
  const headers = columns.map((col) => `"${col.header.replace(/"/g, '""')}"`).join(",");

  // Create CSV rows
  const rows = preparedData.map((row) =>
    columns
      .map((col) => {
        const value = row[col.header];
        if (typeof value === "string") {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      })
      .join(",")
  );

  const csv = [headers, ...rows].join("\n");

  // Add BOM for Excel compatibility with UTF-8
  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8" });
  downloadFile(blob, generateFilename(filename, "csv"));
}

// ============================================================================
// EXCEL EXPORT
// ============================================================================

export interface ExportToExcelOptions {
  data: Record<string, unknown>[];
  columns: ColumnDefinition[];
  filename?: string;
  sheetName?: string;
}

/**
 * Exports data to an Excel (.xlsx) file
 *
 * @example
 * exportToExcel({
 *   data: scopeItems,
 *   columns: [
 *     { key: "item_code", header: "Code" },
 *     { key: "name", header: "Name" },
 *     { key: "status", header: "Status" },
 *   ],
 *   filename: "scope-items",
 *   sheetName: "Scope Items",
 * });
 */
export function exportToExcel({
  data,
  columns,
  filename = "export",
  sheetName = "Sheet1",
}: ExportToExcelOptions): void {
  const preparedData = prepareData(data, columns);

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(preparedData);

  // Auto-size columns based on content
  const colWidths = columns.map((col) => {
    const headerLength = col.header.length;
    const maxDataLength = preparedData.reduce((max, row) => {
      const value = row[col.header];
      const valueLength = String(value).length;
      return Math.max(max, valueLength);
    }, 0);
    return { wch: Math.min(Math.max(headerLength, maxDataLength) + 2, 50) };
  });
  worksheet["!cols"] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Generate Excel file
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadFile(blob, generateFilename(filename, "xlsx"));
}

// ============================================================================
// JSON EXPORT
// ============================================================================

export interface ExportToJSONOptions {
  data: Record<string, unknown>[];
  columns?: ColumnDefinition[];
  filename?: string;
  /** If true, exports the raw data without column filtering */
  raw?: boolean;
}

/**
 * Exports data to a JSON file
 *
 * @example
 * exportToJSON({
 *   data: scopeItems,
 *   filename: "scope-items",
 *   raw: true, // Export all fields
 * });
 */
export function exportToJSON({
  data,
  columns,
  filename = "export",
  raw = false,
}: ExportToJSONOptions): void {
  let exportData: unknown;

  if (raw || !columns) {
    exportData = data;
  } else {
    exportData = prepareData(data, columns);
  }

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  downloadFile(blob, generateFilename(filename, "json"));
}

// ============================================================================
// MULTI-FORMAT EXPORT HELPER
// ============================================================================

export type ExportFormat = "csv" | "excel" | "json";

export interface ExportDataOptions {
  data: Record<string, unknown>[];
  columns: ColumnDefinition[];
  format: ExportFormat;
  filename?: string;
  sheetName?: string;
}

/**
 * Unified export function that supports multiple formats
 *
 * @example
 * exportData({
 *   data: scopeItems,
 *   columns: [
 *     { key: "item_code", header: "Code" },
 *     { key: "name", header: "Name" },
 *   ],
 *   format: "excel",
 *   filename: "scope-items",
 * });
 */
export function exportData({ data, columns, format, filename, sheetName }: ExportDataOptions): void {
  switch (format) {
    case "csv":
      exportToCSV({ data, columns, filename });
      break;
    case "excel":
      exportToExcel({ data, columns, filename, sheetName });
      break;
    case "json":
      exportToJSON({ data, columns, filename });
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

// ============================================================================
// COMMON COLUMN FORMATTERS
// ============================================================================

export const formatters = {
  /** Formats a date value to a readable string */
  date: (value: unknown): string => {
    if (!value) return "";
    const date = new Date(value as string | number | Date);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  },

  /** Formats a datetime value to a readable string */
  dateTime: (value: unknown): string => {
    if (!value) return "";
    const date = new Date(value as string | number | Date);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  },

  /** Formats a number as currency */
  currency: (currency: string = "USD") => (value: unknown): string => {
    if (value === null || value === undefined) return "";
    const symbols: Record<string, string> = { TRY: "₺", USD: "$", EUR: "€" };
    const symbol = symbols[currency] || currency;
    const num = Number(value);
    return `${symbol}${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  },

  /** Formats a number as percentage */
  percentage: (value: unknown): string => {
    if (value === null || value === undefined) return "";
    return `${Number(value).toFixed(1)}%`;
  },

  /** Formats a boolean value */
  boolean: (trueLabel = "Yes", falseLabel = "No") => (value: unknown): string => {
    return value ? trueLabel : falseLabel;
  },

  /** Capitalizes and replaces underscores with spaces */
  status: (value: unknown): string => {
    if (!value) return "";
    return String(value)
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  },
};
