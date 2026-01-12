"use client";

import { Button } from "@/components/ui/button";
import { DownloadIcon } from "lucide-react";
import { exportMaterialsExcel, type ExportMaterial } from "@/lib/excel-template";

interface MaterialsExcelExportProps {
  materials: ExportMaterial[];
  projectCode: string;
  projectName: string;
  disabled?: boolean;
}

export function MaterialsExcelExport({
  materials,
  projectCode,
  projectName,
  disabled,
}: MaterialsExcelExportProps) {
  const handleExport = () => {
    exportMaterialsExcel(materials, projectCode, projectName);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={disabled || materials.length === 0}
    >
      <DownloadIcon className="size-4" />
      Export
    </Button>
  );
}
