"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "./dropdown-menu";
import {
  Download,
  FileSpreadsheet,
  FileJson,
  FileText,
  ChevronDown,
} from "lucide-react";
import {
  exportToCSV,
  exportToExcel,
  exportToJSON,
  type ColumnDefinition,
  type ExportFormat,
} from "@/lib/export/export-utils";

// ============================================================================
// EXPORT BUTTON - Dropdown button for exporting data in multiple formats
// ============================================================================

interface ExportButtonProps {
  /** Data to export (array of objects) */
  data: Record<string, unknown>[];
  /** Column definitions for export */
  columns: ColumnDefinition[];
  /** Base filename (without extension) */
  filename?: string;
  /** Sheet name for Excel export */
  sheetName?: string;
  /** Available export formats */
  formats?: ExportFormat[];
  /** Button variant */
  variant?: "default" | "outline" | "ghost" | "secondary";
  /** Button size */
  size?: "default" | "sm" | "lg" | "icon";
  /** Additional CSS classes */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Show icon only (no text) */
  iconOnly?: boolean;
}

/**
 * A dropdown button that allows exporting data in CSV, Excel, or JSON format.
 *
 * @example
 * <ExportButton
 *   data={scopeItems}
 *   columns={[
 *     { key: "item_code", header: "Code" },
 *     { key: "name", header: "Name" },
 *     { key: "status", header: "Status", format: formatters.status },
 *   ]}
 *   filename="scope-items"
 * />
 */
export function ExportButton({
  data,
  columns,
  filename = "export",
  sheetName,
  formats = ["csv", "excel", "json"],
  variant = "outline",
  size = "sm",
  className,
  disabled = false,
  iconOnly = false,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = React.useState(false);

  const handleExport = async (format: ExportFormat) => {
    if (data.length === 0) return;

    setIsExporting(true);
    try {
      // Small delay for UX feedback
      await new Promise((resolve) => setTimeout(resolve, 100));

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
      }
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const formatIcons: Record<ExportFormat, React.ReactNode> = {
    csv: <FileText className="h-4 w-4" />,
    excel: <FileSpreadsheet className="h-4 w-4" />,
    json: <FileJson className="h-4 w-4" />,
  };

  const formatLabels: Record<ExportFormat, string> = {
    csv: "CSV",
    excel: "Excel (.xlsx)",
    json: "JSON",
  };

  const isDisabled = disabled || data.length === 0 || isExporting;

  // Single format - direct button
  if (formats.length === 1) {
    const format = formats[0];
    return (
      <Button
        variant={variant}
        size={size}
        onClick={() => handleExport(format)}
        disabled={isDisabled}
        className={cn("gap-2", className)}
        aria-label={`Export as ${formatLabels[format]}`}
      >
        {formatIcons[format]}
        {!iconOnly && <span>Export {formatLabels[format]}</span>}
      </Button>
    );
  }

  // Multiple formats - dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={isDisabled}
          className={cn("gap-2", className)}
          aria-label="Export data"
        >
          <Download className="h-4 w-4" />
          {!iconOnly && <span>Export</span>}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Export {data.length} {data.length === 1 ? "item" : "items"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {formats.map((format) => (
          <DropdownMenuItem
            key={format}
            onClick={() => handleExport(format)}
            className="gap-2 cursor-pointer"
          >
            {formatIcons[format]}
            <span>{formatLabels[format]}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================================================
// QUICK EXPORT BUTTONS - Convenience components for specific formats
// ============================================================================

type QuickExportButtonProps = Omit<ExportButtonProps, "formats">;

export function ExportCSVButton(props: QuickExportButtonProps) {
  return <ExportButton {...props} formats={["csv"]} />;
}

export function ExportExcelButton(props: QuickExportButtonProps) {
  return <ExportButton {...props} formats={["excel"]} />;
}

export function ExportJSONButton(props: QuickExportButtonProps) {
  return <ExportButton {...props} formats={["json"]} />;
}

export default ExportButton;
