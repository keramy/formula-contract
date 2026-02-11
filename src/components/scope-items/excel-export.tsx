"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { DownloadIcon } from "lucide-react";
import { exportScopeItemsExcel, type ExportScopeItem } from "@/lib/excel-template";

interface ExcelExportProps {
  items: ExportScopeItem[];
  projectCode: string;
  projectName: string;
  disabled?: boolean;
  compact?: boolean;
}

export function ExcelExport({ items, projectCode, projectName, disabled, compact = false }: ExcelExportProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async () => {
    if (items.length === 0) return;
    setIsLoading(true);
    try {
      await exportScopeItemsExcel(items, projectCode, projectName);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={disabled || items.length === 0 || isLoading}
      className="h-8 px-2.5"
    >
      {isLoading ? <Spinner className="size-3.5" /> : <DownloadIcon className="size-3.5" />}
      {compact ? (
        <>
          <span className="sm:hidden">Export</span>
          <span className="hidden sm:inline">Export Excel</span>
        </>
      ) : (
        "Export Excel"
      )}
    </Button>
  );
}
