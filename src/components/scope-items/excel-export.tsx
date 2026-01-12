"use client";

import { Button } from "@/components/ui/button";
import { DownloadIcon } from "lucide-react";
import { exportScopeItemsExcel, type ExportScopeItem } from "@/lib/excel-template";

interface ExcelExportProps {
  items: ExportScopeItem[];
  projectCode: string;
  projectName: string;
  disabled?: boolean;
}

export function ExcelExport({ items, projectCode, projectName, disabled }: ExcelExportProps) {
  const handleExport = () => {
    if (items.length === 0) return;
    exportScopeItemsExcel(items, projectCode, projectName);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={disabled || items.length === 0}
    >
      <DownloadIcon className="size-4" />
      Export Excel
    </Button>
  );
}
