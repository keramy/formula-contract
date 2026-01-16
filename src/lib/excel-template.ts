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
  "item_code",
  "name",
  "description",
  "width",
  "depth",
  "height",
  "unit",
  "quantity",
  "unit_price",
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
export async function generateScopeItemsExcel() {
  const XLSX = await getXLSX();
  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Data sheet with headers only (no example row)
  const dataRows = [
    SCOPE_ITEMS_COLUMNS as unknown as string[],
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
    ["notes", "Additional notes", "No", "Any text"],
    [""],
    ["IMPORTANT:"],
    ["- item_code and name are required fields"],
    ["- First row must be the header row"],
    ["- Save as .xlsx format"],
    ["- Item path and status can be set after import using bulk edit"],
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
export async function downloadScopeItemsTemplate(projectCode: string = "PROJECT"): Promise<void> {
  const XLSX = await getXLSX();
  const workbook = await generateScopeItemsExcel();
  const filename = `${projectCode}_scope_items_template.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * Parse an Excel file and extract scope items
 */
export async function parseScopeItemsExcel(file: ArrayBuffer): Promise<ParseResult> {
  const XLSX = await getXLSX();
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

/**
 * Export scope items to Excel
 */
export interface ExportScopeItem {
  item_code: string;
  name: string;
  description: string | null;
  width: number | null;
  depth: number | null;
  height: number | null;
  unit: string;
  quantity: number;
  unit_price: number | null;
  total_price: number | null;
  item_path: string;
  status: string;
  production_percentage: number;
  notes: string | null;
}

const EXPORT_COLUMNS = [
  "item_code",
  "name",
  "description",
  "width",
  "depth",
  "height",
  "unit",
  "quantity",
  "unit_price",
  "total_price",
  "item_path",
  "status",
  "production_percentage",
  "notes",
];

const EXPORT_HEADERS = [
  "Item Code",
  "Name",
  "Description",
  "Width (cm)",
  "Depth (cm)",
  "Height (cm)",
  "Unit",
  "Quantity",
  "Unit Price",
  "Total Price",
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
    { wch: 15 }, // item_code
    { wch: 30 }, // name
    { wch: 40 }, // description
    { wch: 12 }, // width
    { wch: 12 }, // depth
    { wch: 12 }, // height
    { wch: 8 },  // unit
    { wch: 10 }, // quantity
    { wch: 12 }, // unit_price
    { wch: 12 }, // total_price
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
  const dataRows = [MATERIALS_COLUMNS as unknown as string[]];
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
