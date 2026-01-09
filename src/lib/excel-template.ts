/**
 * Excel (XLSX) Template Generator and Parser for Scope Items
 * Uses SheetJS (xlsx) library for proper Excel file handling
 */

import * as XLSX from "xlsx";

export const SCOPE_ITEMS_COLUMNS = [
  "item_code",
  "name",
  "description",
  "width",
  "depth",
  "height",
  "unit",
  "quantity",
  "unit_price",
  "item_path",
  "status",
  "notes",
] as const;

export type ScopeItemColumn = (typeof SCOPE_ITEMS_COLUMNS)[number];

export const SCOPE_ITEMS_EXAMPLE_ROW: Record<ScopeItemColumn, string> = {
  item_code: "ITEM-001",
  name: "Reception Desk",
  description: "Main entrance reception desk with storage",
  width: "180",
  depth: "80",
  height: "110",
  unit: "pcs",
  quantity: "1",
  unit_price: "5000",
  item_path: "production",
  status: "pending",
  notes: "Include cable management",
};

export const SCOPE_ITEMS_HEADER_DESCRIPTIONS: Record<ScopeItemColumn, string> = {
  item_code: "Unique item identifier (e.g., ITEM-001)",
  name: "Item name (required)",
  description: "Optional description",
  width: "Width in cm (optional)",
  depth: "Depth in cm (optional)",
  height: "Height in cm (optional)",
  unit: "pcs, set, m, m2, or lot (default: pcs)",
  quantity: "Number of items (default: 1)",
  unit_price: "Price per unit (optional)",
  item_path: "production or procurement (default: production)",
  status: "pending, in_design, awaiting_approval, approved, in_production, complete, on_hold, cancelled (default: pending)",
  notes: "Additional notes (optional)",
};

export const VALID_UNITS = ["pcs", "set", "m", "m2", "lot"] as const;
export const VALID_ITEM_PATHS = ["production", "procurement"] as const;
export const VALID_STATUSES = [
  "pending",
  "in_design",
  "awaiting_approval",
  "approved",
  "in_production",
  "complete",
  "on_hold",
  "cancelled",
] as const;

export interface ParsedScopeItem {
  item_code: string;
  name: string;
  description: string | null;
  width: number | null;
  depth: number | null;
  height: number | null;
  unit: (typeof VALID_UNITS)[number];
  quantity: number;
  unit_price: number | null;
  item_path: (typeof VALID_ITEM_PATHS)[number];
  status: (typeof VALID_STATUSES)[number];
  notes: string | null;
}

export interface ParseResult {
  success: boolean;
  items: ParsedScopeItem[];
  errors: { row: number; message: string }[];
  warnings: { row: number; message: string }[];
}

/**
 * Generate an Excel template file for scope items
 */
export function generateScopeItemsExcel(): XLSX.WorkBook {
  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Data sheet with headers and example
  const dataRows = [
    SCOPE_ITEMS_COLUMNS as unknown as string[],
    SCOPE_ITEMS_COLUMNS.map((col) => SCOPE_ITEMS_EXAMPLE_ROW[col]),
  ];
  const dataSheet = XLSX.utils.aoa_to_sheet(dataRows);

  // Set column widths
  dataSheet["!cols"] = [
    { wch: 15 }, // item_code
    { wch: 25 }, // name
    { wch: 40 }, // description
    { wch: 10 }, // width
    { wch: 10 }, // depth
    { wch: 10 }, // height
    { wch: 8 },  // unit
    { wch: 10 }, // quantity
    { wch: 12 }, // unit_price
    { wch: 12 }, // item_path
    { wch: 15 }, // status
    { wch: 30 }, // notes
  ];

  XLSX.utils.book_append_sheet(workbook, dataSheet, "Scope Items");

  // Instructions sheet
  const instructionRows = [
    ["Scope Items Import Template - Instructions"],
    [""],
    ["Column", "Description", "Required", "Valid Values"],
    ["item_code", "Unique identifier for the item", "Yes", "Any text (e.g., ITEM-001)"],
    ["name", "Name of the item", "Yes", "Any text"],
    ["description", "Detailed description", "No", "Any text"],
    ["width", "Width in centimeters", "No", "Number"],
    ["depth", "Depth in centimeters", "No", "Number"],
    ["height", "Height in centimeters", "No", "Number"],
    ["unit", "Unit of measurement", "No", "pcs, set, m, m2, lot (default: pcs)"],
    ["quantity", "Number of items", "No", "Positive integer (default: 1)"],
    ["unit_price", "Price per unit", "No", "Number"],
    ["item_path", "Production path", "No", "production, procurement (default: production)"],
    ["status", "Current status", "No", "pending, in_design, awaiting_approval, approved, in_production, complete, on_hold, cancelled (default: pending)"],
    ["notes", "Additional notes", "No", "Any text"],
    [""],
    ["IMPORTANT:"],
    ["- Delete the example row before importing"],
    ["- item_code and name are required fields"],
    ["- First row must be the header row"],
    ["- Save as .xlsx format"],
  ];
  const instructionSheet = XLSX.utils.aoa_to_sheet(instructionRows);
  instructionSheet["!cols"] = [
    { wch: 15 },
    { wch: 40 },
    { wch: 10 },
    { wch: 60 },
  ];
  XLSX.utils.book_append_sheet(workbook, instructionSheet, "Instructions");

  return workbook;
}

/**
 * Download the Excel template
 */
export function downloadScopeItemsTemplate(projectCode: string = "PROJECT"): void {
  const workbook = generateScopeItemsExcel();
  const filename = `${projectCode}_scope_items_template.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * Parse an Excel file and extract scope items
 */
export function parseScopeItemsExcel(file: ArrayBuffer): ParseResult {
  const errors: { row: number; message: string }[] = [];
  const warnings: { row: number; message: string }[] = [];
  const items: ParsedScopeItem[] = [];

  try {
    const workbook = XLSX.read(file, { type: "array" });

    // Get first sheet (should be "Scope Items" or the first available)
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
    });

    if (rows.length === 0) {
      return {
        success: false,
        items: [],
        errors: [{ row: 0, message: "No data found in the Excel file" }],
        warnings: [],
      };
    }

    // Process each row
    rows.forEach((row, index) => {
      const rowNum = index + 2; // +2 because row 1 is header, and we're 0-indexed

      // Skip empty rows
      if (!row.item_code && !row.name) {
        return;
      }

      // Validate required fields
      if (!row.item_code) {
        errors.push({ row: rowNum, message: "item_code is required" });
        return;
      }
      if (!row.name) {
        errors.push({ row: rowNum, message: "name is required" });
        return;
      }

      // Parse and validate each field
      const item: ParsedScopeItem = {
        item_code: String(row.item_code).trim(),
        name: String(row.name).trim(),
        description: row.description ? String(row.description).trim() : null,
        width: parseNumber(row.width),
        depth: parseNumber(row.depth),
        height: parseNumber(row.height),
        unit: parseUnit(row.unit, rowNum, warnings),
        quantity: parseQuantity(row.quantity, rowNum, warnings),
        unit_price: parseNumber(row.unit_price),
        item_path: parseItemPath(row.item_path, rowNum, warnings),
        status: parseStatus(row.status, rowNum, warnings),
        notes: row.notes ? String(row.notes).trim() : null,
      };

      // Validate item_code length
      if (item.item_code.length > 20) {
        errors.push({ row: rowNum, message: `item_code "${item.item_code}" exceeds 20 characters` });
        return;
      }

      // Validate name length
      if (item.name.length > 100) {
        errors.push({ row: rowNum, message: `name exceeds 100 characters` });
        return;
      }

      items.push(item);
    });

    return {
      success: errors.length === 0,
      items,
      errors,
      warnings,
    };
  } catch (error) {
    return {
      success: false,
      items: [],
      errors: [{ row: 0, message: `Failed to parse Excel file: ${error instanceof Error ? error.message : "Unknown error"}` }],
      warnings: [],
    };
  }
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const num = Number(value);
  return isNaN(num) ? null : num;
}

function parseQuantity(
  value: unknown,
  row: number,
  warnings: { row: number; message: string }[]
): number {
  if (value === null || value === undefined || value === "") {
    return 1;
  }
  const num = Number(value);
  if (isNaN(num) || num < 1) {
    warnings.push({ row, message: `Invalid quantity "${value}", using default: 1` });
    return 1;
  }
  return Math.floor(num);
}

function parseUnit(
  value: unknown,
  row: number,
  warnings: { row: number; message: string }[]
): (typeof VALID_UNITS)[number] {
  if (!value) return "pcs";
  const unit = String(value).toLowerCase().trim();
  if (VALID_UNITS.includes(unit as (typeof VALID_UNITS)[number])) {
    return unit as (typeof VALID_UNITS)[number];
  }
  warnings.push({ row, message: `Invalid unit "${value}", using default: pcs` });
  return "pcs";
}

function parseItemPath(
  value: unknown,
  row: number,
  warnings: { row: number; message: string }[]
): (typeof VALID_ITEM_PATHS)[number] {
  if (!value) return "production";
  const path = String(value).toLowerCase().trim();
  if (VALID_ITEM_PATHS.includes(path as (typeof VALID_ITEM_PATHS)[number])) {
    return path as (typeof VALID_ITEM_PATHS)[number];
  }
  warnings.push({ row, message: `Invalid item_path "${value}", using default: production` });
  return "production";
}

function parseStatus(
  value: unknown,
  row: number,
  warnings: { row: number; message: string }[]
): (typeof VALID_STATUSES)[number] {
  if (!value) return "pending";
  const status = String(value).toLowerCase().trim();
  if (VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return status as (typeof VALID_STATUSES)[number];
  }
  warnings.push({ row, message: `Invalid status "${value}", using default: pending` });
  return "pending";
}
