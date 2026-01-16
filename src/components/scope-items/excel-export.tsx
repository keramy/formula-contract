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
}

export function ExcelExport({ items, projectCode, projectName, disabled }: ExcelExportProps) {
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
    >
      {isLoading ? <Spinner className="size-4" /> : <DownloadIcon className="size-4" />}
      Export Excel
    </Button>
  );
}
