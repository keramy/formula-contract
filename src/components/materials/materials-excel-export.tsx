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
}

export function MaterialsExcelExport({
  materials,
  projectCode,
  projectName,
  disabled,
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
      onClick={handleExport}
      disabled={disabled || materials.length === 0 || isLoading}
    >
      {isLoading ? <Spinner className="size-4" /> : <DownloadIcon className="size-4" />}
      Export
    </Button>
  );
}
