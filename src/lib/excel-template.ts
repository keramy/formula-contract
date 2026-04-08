/**
 * Excel (XLSX) Template Generator and Parser for Scope Items
 * Uses SheetJS (xlsx) library for proper Excel file handling
 *
 * OPTIMIZED: XLSX (~150KB) is dynamically imported only when needed
 */

// Dynamic import helper - loads xlsx only when called
async function getXLSX() {
  return import("xlsx");
}

// Type for XLSX module (for type safety without importing)
type XLSXModule = typeof import("xlsx");

export const SCOPE_ITEMS_COLUMNS = [
  "floor",
  "area_name",
  "area_code",
  "item_code",
  "name",
  "description",
  "unit",
  "quantity",
  "initial_unit_cost",
  "unit_sales_price",
  "notes",
] as const;

export type ScopeItemColumn = (typeof SCOPE_ITEMS_COLUMNS)[number];

export const SCOPE_ITEMS_EXAMPLE_ROW: Record<ScopeItemColumn, string> = {
  floor: "Floor 1",
  area_name: "Master Bedroom",
  area_code: "MB",
  item_code: "MB-001",
  name: "Wardrobe",
  description: "Built-in wardrobe with sliding doors",
  unit: "pcs",
  quantity: "1",
  initial_unit_cost: "3500",
  unit_sales_price: "5000",
  notes: "Include internal LED lighting",
};

export const SCOPE_ITEMS_HEADER_DESCRIPTIONS: Record<ScopeItemColumn, string> = {
  floor: "Floor name (e.g., Floor 1, Ground Floor). Optional.",
  area_name: "Room/area name (e.g., Master Bedroom, Kitchen). Optional.",
  area_code: "Short area code (e.g., MB, KT). Optional — lookup key for area assignment.",
  item_code: "Unique item identifier (e.g., ITEM-001)",
  name: "Item name (required)",
  description: "Optional description",
  unit: "pcs, set, m, m2, or lot (default: pcs)",
  quantity: "Number of items (default: 1)",
  initial_unit_cost: "Budgeted cost per unit (set once, never changes)",
  unit_sales_price: "Sale price per unit to client (optional)",
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
  unit: (typeof VALID_UNITS)[number];
  quantity: number;
  initial_unit_cost: number | null;
  unit_sales_price: number | null;
  item_path: (typeof VALID_ITEM_PATHS)[number];
  status: (typeof VALID_STATUSES)[number];
  notes: string | null;
  // Area fields (optional — for linking to project areas)
  floor: string | null;
  area_name: string | null;
  area_code: string | null;
}

export interface ParseResult {
  success: boolean;
  items: ParsedScopeItem[];
  errors: { row: number; message: string }[];
  warnings: { row: number; message: string }[];
}

/**
 * Generate a styled Excel template file for scope items using exceljs
 */
export async function generateScopeItemsExcel() {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Formula Contract";
  workbook.created = new Date();

  // ── Scope Items Sheet ──
  const sheet = workbook.addWorksheet("Scope Items", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  const HEADER_LABELS: Record<ScopeItemColumn, string> = {
    floor: "Floor",
    area_name: "Area Name",
    area_code: "Area Code",
    item_code: "Item Code *",
    name: "Name *",
    description: "Description",
    unit: "Unit",
    quantity: "Qty",
    initial_unit_cost: "Budget Unit Cost",
    unit_sales_price: "Sales Unit Price",
    notes: "Notes",
  };

  sheet.columns = [
    { key: "floor", width: 15 },
    { key: "area_name", width: 20 },
    { key: "area_code", width: 12 },
    { key: "item_code", width: 15 },
    { key: "name", width: 28 },
    { key: "description", width: 35 },
    { key: "unit", width: 8 },
    { key: "quantity", width: 10 },
    { key: "initial_unit_cost", width: 16 },
    { key: "unit_sales_price", width: 16 },
    { key: "notes", width: 30 },
  ];

  // Row 1 — Raw column keys (used by parser, styled as header)
  const headerRow = sheet.addRow([...SCOPE_ITEMS_COLUMNS]);
  headerRow.height = 28;
  headerRow.eachCell((cell, colNumber) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A2B3C" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = { bottom: { style: "thin", color: { argb: "FF1A2B3C" } } };
    // Add comment with human-readable label + description
    const col = SCOPE_ITEMS_COLUMNS[colNumber - 1];
    if (col) {
      cell.note = {
        texts: [
          { font: { bold: true, size: 9 }, text: HEADER_LABELS[col] + "\n" },
          { font: { size: 8, color: { argb: "FF666666" } }, text: SCOPE_ITEMS_HEADER_DESCRIPTIONS[col] },
        ],
      };
    }
  });

  // Row 2 — Example row (gray text, user should delete before importing)
  const exampleRow = sheet.addRow(SCOPE_ITEMS_COLUMNS.map((col) => SCOPE_ITEMS_EXAMPLE_ROW[col]));
  exampleRow.eachCell((cell) => {
    cell.font = { size: 10, color: { argb: "FFAAAAAA" }, italic: true };
    cell.alignment = { vertical: "middle" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFAFA" } };
    cell.border = { bottom: { style: "thin", color: { argb: "FFE5E7EB" } } };
  });

  // Add empty rows for user data (with subtle borders)
  for (let i = 0; i < 48; i++) {
    const row = sheet.addRow([]);
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        bottom: { style: "hair", color: { argb: "FFF0F0F0" } },
      };
    });
    // Apply borders to all cells in the row
    for (let col = 1; col <= SCOPE_ITEMS_COLUMNS.length; col++) {
      const cell = row.getCell(col);
      cell.border = {
        bottom: { style: "hair", color: { argb: "FFF0F0F0" } },
        right: { style: "hair", color: { argb: "FFF0F0F0" } },
      };
    }
  }

  // Highlight required columns (item_code + name) with a subtle left border
  for (let row = 3; row <= 50; row++) {
    sheet.getCell(row, 4).border = {
      ...sheet.getCell(row, 4).border,
      left: { style: "thin", color: { argb: "FF3B82F6" } },
    };
    sheet.getCell(row, 5).border = {
      ...sheet.getCell(row, 5).border,
      left: { style: "thin", color: { argb: "FF3B82F6" } },
    };
  }

  // Data validation for unit column
  for (let row = 3; row <= 50; row++) {
    sheet.getCell(row, 7).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"pcs,set,m,m2,lot"'],
      showErrorMessage: true,
      errorTitle: "Invalid unit",
      error: "Please select: pcs, set, m, m2, or lot",
    };
  }

  // ── Instructions Sheet ──
  const instrSheet = workbook.addWorksheet("Instructions");

  instrSheet.columns = [
    { key: "a", width: 18 },
    { key: "b", width: 35 },
    { key: "c", width: 12 },
    { key: "d", width: 40 },
  ];

  // Title
  const titleRow = instrSheet.addRow(["Formula Contract — Scope Items Import Template"]);
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: "FF1A2B3C" } };
  titleRow.height = 24;

  instrSheet.addRow([]);

  // Column reference header
  const refHeaderRow = instrSheet.addRow(["Column", "Description", "Required", "Valid Values"]);
  refHeaderRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A2B3C" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.alignment = { vertical: "middle" };
  });
  refHeaderRow.height = 24;

  // Column descriptions
  const columns: [string, string, string, string][] = [
    ["floor", "Floor name for area grouping", "No", "Any text (e.g., Floor 1, Ground Floor)"],
    ["area_name", "Room/area name", "No", "Any text (e.g., Master Bedroom, Kitchen)"],
    ["area_code", "Short area code (lookup key)", "No", "Short text (e.g., MB, KT, LR)"],
    ["item_code", "Unique identifier for the item", "Yes", "Any text (e.g., ITEM-001)"],
    ["name", "Name of the item", "Yes", "Any text"],
    ["description", "Detailed description", "No", "Any text"],
    ["unit", "Unit of measurement", "No", "pcs, set, m, m2, lot (default: pcs)"],
    ["quantity", "Quantity (supports decimals)", "No", "Number (default: 1)"],
    ["initial_unit_cost", "Budgeted cost per unit (set once)", "No", "Number (e.g., 3500)"],
    ["unit_sales_price", "Sale price per unit to client", "No", "Number (e.g., 5000)"],
    ["notes", "Additional notes", "No", "Any text"],
  ];

  columns.forEach(([col, desc, req, valid], idx) => {
    const row = instrSheet.addRow([col, desc, req, valid]);
    row.getCell(1).font = { bold: true, size: 10, name: "Consolas" };
    if (req === "Yes") {
      row.getCell(3).font = { bold: true, color: { argb: "FFDC2626" }, size: 10 };
    }
    if (idx % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
      });
    }
    row.eachCell((cell) => {
      cell.border = { bottom: { style: "thin", color: { argb: "FFE5E7EB" } } };
    });
  });

  instrSheet.addRow([]);

  // Important notes
  const notesTitle = instrSheet.addRow(["Important Notes"]);
  notesTitle.getCell(1).font = { bold: true, size: 11 };

  const notes = [
    "item_code and name are required fields",
    "Each item_code must be UNIQUE — duplicates will be skipped",
    "First row must be the header row (do not delete it)",
    "Delete the example row (row 3) before importing",
    "Save as .xlsx format",
    "Initial total cost = initial_unit_cost × quantity (auto-calculated)",
    "Item path and status can be set after import in the app",
  ];

  notes.forEach((note) => {
    const row = instrSheet.addRow([`• ${note}`]);
    row.getCell(1).font = { size: 9, color: { argb: "FF555555" } };
  });

  return workbook;
}

/**
 * Download the styled Excel template
 */
export async function downloadScopeItemsTemplate(projectCode: string = "PROJECT"): Promise<void> {
  const workbook = await generateScopeItemsExcel();
  const buffer = await workbook.xlsx.writeBuffer();

  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${projectCode}_scope_items_template.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parse an Excel file and extract scope items
 * Includes duplicate item_code detection
 */
export async function parseScopeItemsExcel(file: ArrayBuffer): Promise<ParseResult> {
  const XLSX = await getXLSX();
  const errors: { row: number; message: string }[] = [];
  const warnings: { row: number; message: string }[] = [];
  const items: ParsedScopeItem[] = [];

  // Track seen item_codes to detect duplicates within the Excel file
  const seenItemCodes = new Map<string, number>(); // item_code -> first row number

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

      // Skip the example row from the template (gray italic sample data)
      const itemCodeStr = String(row.item_code || "").trim();
      if (itemCodeStr === SCOPE_ITEMS_EXAMPLE_ROW.item_code && String(row.name || "").trim() === SCOPE_ITEMS_EXAMPLE_ROW.name) {
        warnings.push({ row: rowNum, message: "Skipped example row from template" });
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

      const itemCode = String(row.item_code).trim();

      // Check for duplicate item_code within the Excel file
      if (seenItemCodes.has(itemCode)) {
        const firstRow = seenItemCodes.get(itemCode)!;
        errors.push({
          row: rowNum,
          message: `Duplicate item_code "${itemCode}" - first seen in row ${firstRow}. Each item_code must be unique.`
        });
        return;
      }
      seenItemCodes.set(itemCode, rowNum);

      // Parse area fields (optional)
      const areaName = row.area_name ? String(row.area_name).trim() : null;
      const floor = row.floor ? String(row.floor).trim() : null;
      // Auto-generate area_code from area_name if not provided
      let areaCode = row.area_code ? String(row.area_code).trim().toUpperCase() : null;
      if (!areaCode && areaName) {
        areaCode = areaName.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "");
      }

      // Warn if area_code is provided without area_name (needed for auto-creation)
      if (areaCode && !areaName) {
        warnings.push({
          row: rowNum,
          message: `area_code "${areaCode}" provided without area_name — area will be created with code as name if it doesn't exist`,
        });
      }

      // Parse and validate each field
      const item: ParsedScopeItem = {
        item_code: itemCode,
        name: String(row.name).trim(),
        description: row.description ? String(row.description).trim() : null,
        unit: parseUnit(row.unit, rowNum, warnings),
        quantity: parseQuantity(row.quantity, rowNum, warnings),
        initial_unit_cost: parseNumber(row.initial_unit_cost),
        unit_sales_price: parseNumber(row.unit_sales_price),
        item_path: parseItemPath(row.item_path, rowNum, warnings),
        status: parseStatus(row.status, rowNum, warnings),
        notes: row.notes ? String(row.notes).trim() : null,
        floor,
        area_name: areaName,
        area_code: areaCode,
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

/**
 * Normalize numeric string to handle both comma and dot as decimal separator
 * Handles: "4.8", "4,8", "1.234,56" (European), "1,234.56" (US)
 */
function normalizeNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return NaN;

  let str = value.trim();

  // If contains both comma and dot, determine which is decimal separator
  const hasComma = str.includes(",");
  const hasDot = str.includes(".");

  if (hasComma && hasDot) {
    // Whichever comes last is the decimal separator
    const lastComma = str.lastIndexOf(",");
    const lastDot = str.lastIndexOf(".");
    if (lastComma > lastDot) {
      // European: 1.234,56 → 1234.56
      str = str.replace(/\./g, "").replace(",", ".");
    } else {
      // US: 1,234.56 → 1234.56
      str = str.replace(/,/g, "");
    }
  } else if (hasComma) {
    // Only comma: could be "4,8" (decimal) or "1,234" (thousands)
    // If single comma with 1-2 digits after, treat as decimal
    const parts = str.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      str = str.replace(",", ".");
    } else {
      str = str.replace(/,/g, "");
    }
  }
  // If only dot, it's already correct format

  return Number(str);
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const num = normalizeNumber(value);
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
  const num = normalizeNumber(value);
  if (isNaN(num) || num <= 0) {
    warnings.push({ row, message: `Invalid quantity "${value}", using default: 1` });
    return 1;
  }
  // Round to 2 decimal places for cleaner values
  return Math.round(num * 100) / 100;
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

/**
 * Export scope items to Excel
 */
export interface ExportScopeItem {
  item_code: string;
  name: string;
  description: string | null;
  unit: string;
  quantity: number;
  // Initial cost (budgeted, set once)
  initial_unit_cost: number | null;
  initial_total_cost: number | null;
  // Actual cost (entered manually later)
  actual_unit_cost: number | null;
  actual_total_cost: number | null;
  // Sales price fields (what CLIENT pays)
  unit_sales_price: number | null;
  total_sales_price: number | null;
  item_path: string;
  status: string;
  production_percentage: number;
  notes: string | null;
  // Area fields (resolved from joined data)
  floor: string | null;
  area_name: string | null;
  area_code: string | null;
}

const EXPORT_COLUMNS = [
  "floor",
  "area_name",
  "area_code",
  "item_code",
  "name",
  "description",
  "unit",
  "quantity",
  "initial_unit_cost",
  "initial_total_cost",
  "actual_unit_cost",
  "actual_total_cost",
  "unit_sales_price",
  "total_sales_price",
  "item_path",
  "status",
  "production_percentage",
  "notes",
];

const EXPORT_HEADERS = [
  "Floor",
  "Area Name",
  "Area Code",
  "Item Code",
  "Name",
  "Description",
  "Unit",
  "Quantity",
  "Initial Unit Cost",
  "Initial Total Cost",
  "Actual Unit Cost",
  "Actual Total Cost",
  "Unit Sales Price",
  "Total Sales Price",
  "Path",
  "Status",
  "Progress %",
  "Notes",
];

export async function exportScopeItemsExcel(
  items: ExportScopeItem[],
  projectCode: string,
  projectName: string
): Promise<void> {
  const XLSX = await getXLSX();
  const workbook = XLSX.utils.book_new();

  // Convert items to rows
  const dataRows: (string | number | null)[][] = [
    EXPORT_HEADERS,
    ...items.map((item) =>
      EXPORT_COLUMNS.map((col) => {
        const value = item[col as keyof ExportScopeItem];
        return value ?? "";
      })
    ),
  ];

  const dataSheet = XLSX.utils.aoa_to_sheet(dataRows);

  // Set column widths
  dataSheet["!cols"] = [
    { wch: 15 }, // floor
    { wch: 20 }, // area_name
    { wch: 12 }, // area_code
    { wch: 15 }, // item_code
    { wch: 30 }, // name
    { wch: 40 }, // description
    { wch: 8 },  // unit
    { wch: 10 }, // quantity
    { wch: 16 }, // initial_unit_cost
    { wch: 16 }, // initial_total_cost
    { wch: 16 }, // actual_unit_cost
    { wch: 16 }, // actual_total_cost
    { wch: 14 }, // unit_sales_price
    { wch: 14 }, // total_sales_price
    { wch: 12 }, // item_path
    { wch: 15 }, // status
    { wch: 12 }, // production_percentage
    { wch: 30 }, // notes
  ];

  XLSX.utils.book_append_sheet(workbook, dataSheet, "Scope Items");

  // Add summary sheet
  const summaryRows = [
    ["Project Export Summary"],
    [""],
    ["Project Code", projectCode],
    ["Project Name", projectName],
    ["Export Date", new Date().toLocaleDateString()],
    ["Total Items", items.length],
    [""],
    ["Status Breakdown"],
    ...Object.entries(
      items.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([status, count]) => [status, count]),
    [""],
    ["Path Breakdown"],
    ["Production", items.filter((i) => i.item_path === "production").length],
    ["Procurement", items.filter((i) => i.item_path === "procurement").length],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet["!cols"] = [{ wch: 20 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  const filename = `${projectCode}_scope_items_export.xlsx`;
  XLSX.writeFile(workbook, filename);
}

// =============================================================================
// Materials Excel Template and Parser
// =============================================================================

export const MATERIALS_COLUMNS = [
  "material_code",
  "name",
  "specification",
  "supplier",
] as const;

export type MaterialColumn = (typeof MATERIALS_COLUMNS)[number];

export interface ParsedMaterial {
  material_code: string;
  name: string;
  specification: string | null;
  supplier: string | null;
}

export interface MaterialParseResult {
  success: boolean;
  items: ParsedMaterial[];
  errors: { row: number; message: string }[];
  warnings: { row: number; message: string }[];
}

/**
 * Generate an Excel template file for materials
 */
export async function generateMaterialsExcel() {
  const XLSX = await getXLSX();
  const workbook = XLSX.utils.book_new();

  // Data sheet with headers only
  const dataRows = [[...MATERIALS_COLUMNS]];
  const dataSheet = XLSX.utils.aoa_to_sheet(dataRows);

  dataSheet["!cols"] = [
    { wch: 15 }, // material_code
    { wch: 30 }, // name
    { wch: 40 }, // specification
    { wch: 30 }, // supplier
  ];

  XLSX.utils.book_append_sheet(workbook, dataSheet, "Materials");

  // Instructions sheet
  const instructionRows = [
    ["Materials Import Template - Instructions"],
    [""],
    ["Column", "Description", "Required"],
    ["material_code", "Unique material identifier (e.g., MAT-001)", "Yes"],
    ["name", "Material name (e.g., Oak Wood - Natural Finish)", "Yes"],
    ["specification", "Material specifications (e.g., Grade A, 20mm thickness)", "No"],
    ["supplier", "Supplier name (e.g., ABC Wood Co.)", "No"],
    [""],
    ["IMPORTANT:"],
    ["- material_code and name are required fields"],
    ["- First row must be the header row"],
    ["- Save as .xlsx format"],
    ["- Existing materials with the same code will be updated (upsert)"],
    ["- Images and item assignments can be added after import"],
  ];
  const instructionSheet = XLSX.utils.aoa_to_sheet(instructionRows);
  instructionSheet["!cols"] = [{ wch: 20 }, { wch: 50 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(workbook, instructionSheet, "Instructions");

  return workbook;
}

/**
 * Download the materials Excel template
 */
export async function downloadMaterialsTemplate(projectCode: string = "PROJECT"): Promise<void> {
  const XLSX = await getXLSX();
  const workbook = await generateMaterialsExcel();
  const filename = `${projectCode}_materials_template.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * Parse an Excel file and extract materials
 */
export async function parseMaterialsExcel(file: ArrayBuffer): Promise<MaterialParseResult> {
  const XLSX = await getXLSX();
  const errors: { row: number; message: string }[] = [];
  const warnings: { row: number; message: string }[] = [];
  const items: ParsedMaterial[] = [];

  try {
    const workbook = XLSX.read(file, { type: "array" });

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

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

    rows.forEach((row, index) => {
      const rowNum = index + 2;

      // Skip empty rows
      if (!row.material_code && !row.name) {
        return;
      }

      // Validate required fields
      if (!row.material_code) {
        errors.push({ row: rowNum, message: "material_code is required" });
        return;
      }
      if (!row.name) {
        errors.push({ row: rowNum, message: "name is required" });
        return;
      }

      const item: ParsedMaterial = {
        material_code: String(row.material_code).trim(),
        name: String(row.name).trim(),
        specification: row.specification ? String(row.specification).trim() : null,
        supplier: row.supplier ? String(row.supplier).trim() : null,
      };

      // Validate material_code length
      if (item.material_code.length > 20) {
        errors.push({ row: rowNum, message: `material_code "${item.material_code}" exceeds 20 characters` });
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

/**
 * Export materials to Excel
 */
export interface ExportMaterial {
  material_code: string;
  name: string;
  specification: string | null;
  supplier: string | null;
  status: string;
  assignedItemsCount: number;
}

const MATERIALS_EXPORT_HEADERS = [
  "Code",
  "Name",
  "Specification",
  "Supplier",
  "Status",
  "Assigned Items",
];

export async function exportMaterialsExcel(
  materials: ExportMaterial[],
  projectCode: string,
  projectName: string
): Promise<void> {
  const XLSX = await getXLSX();
  const workbook = XLSX.utils.book_new();

  // Convert materials to rows
  const dataRows: (string | number | null)[][] = [
    MATERIALS_EXPORT_HEADERS,
    ...materials.map((m) => [
      m.material_code,
      m.name,
      m.specification ?? "",
      m.supplier ?? "",
      m.status,
      m.assignedItemsCount,
    ]),
  ];

  const dataSheet = XLSX.utils.aoa_to_sheet(dataRows);

  dataSheet["!cols"] = [
    { wch: 15 }, // code
    { wch: 30 }, // name
    { wch: 40 }, // specification
    { wch: 25 }, // supplier
    { wch: 15 }, // status
    { wch: 15 }, // assigned items
  ];

  XLSX.utils.book_append_sheet(workbook, dataSheet, "Materials");

  // Add summary sheet
  const summaryRows = [
    ["Materials Export Summary"],
    [""],
    ["Project Code", projectCode],
    ["Project Name", projectName],
    ["Export Date", new Date().toLocaleDateString()],
    ["Total Materials", materials.length],
    [""],
    ["Status Breakdown"],
    ["Pending", materials.filter((m) => m.status === "pending").length],
    ["Approved", materials.filter((m) => m.status === "approved").length],
    ["Rejected", materials.filter((m) => m.status === "rejected").length],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet["!cols"] = [{ wch: 20 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  const filename = `${projectCode}_materials_export.xlsx`;
  XLSX.writeFile(workbook, filename);
}
