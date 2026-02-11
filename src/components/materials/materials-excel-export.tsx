"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { DownloadIcon } from "lucide-react";
import { exportMaterialsExcel, type ExportMaterial } from "@/lib/excel-template";

interface MaterialsExcelExportProps {
  materials: ExportMaterial[];
  projectCode: string;
  projectName: string;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}

export function MaterialsExcelExport({
  materials,
  projectCode,
  projectName,
  disabled,
  compact = false,
  className,
}: MaterialsExcelExportProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async () => {
    setIsLoading(true);
    try {
      await exportMaterialsExcel(materials, projectCode, projectName);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className={compact ? `h-8 px-2.5 text-xs ${className ?? ""}`.trim() : className}
      onClick={handleExport}
      disabled={disabled || materials.length === 0 || isLoading}
    >
      {isLoading ? <Spinner className="size-4" /> : <DownloadIcon className="size-4" />}
      {compact ? "Export" : "Export Excel"}
    </Button>
  );
}
