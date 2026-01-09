/**
 * Excel/CSV Template Generator for Scope Items
 */

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

export const SCOPE_ITEMS_EXAMPLE_ROW = {
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

const SCOPE_ITEMS_HEADER_DESCRIPTIONS = {
  item_code: "Unique item identifier (e.g., ITEM-001)",
  name: "Item name",
  description: "Optional description",
  width: "Width in cm (optional)",
  depth: "Depth in cm (optional)",
  height: "Height in cm (optional)",
  unit: "pcs, set, m, m2, or lot",
  quantity: "Number of items (default: 1)",
  unit_price: "Price per unit (optional)",
  item_path: "production or procurement",
  status: "pending, in_design, awaiting_approval, approved, in_production, complete, on_hold, cancelled",
  notes: "Additional notes (optional)",
};

function escapeCSVValue(value: string): string {
  // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function generateScopeItemsCSV(): string {
  const rows: string[] = [];

  // Header row
  rows.push(SCOPE_ITEMS_COLUMNS.map(escapeCSVValue).join(","));

  // Description row (commented with #)
  const descriptionRow = SCOPE_ITEMS_COLUMNS.map(
    (col) => `# ${SCOPE_ITEMS_HEADER_DESCRIPTIONS[col]}`
  );
  rows.push(descriptionRow.map(escapeCSVValue).join(","));

  // Example row
  const exampleRow = SCOPE_ITEMS_COLUMNS.map(
    (col) => SCOPE_ITEMS_EXAMPLE_ROW[col]
  );
  rows.push(exampleRow.map(escapeCSVValue).join(","));

  return rows.join("\n");
}

export function downloadScopeItemsTemplate(projectCode: string = "PROJECT"): void {
  const csv = generateScopeItemsCSV();
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${projectCode}_scope_items_template.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
