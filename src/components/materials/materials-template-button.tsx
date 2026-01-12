"use client";

import { Button } from "@/components/ui/button";
import { FileSpreadsheetIcon } from "lucide-react";
import { downloadMaterialsTemplate } from "@/lib/excel-template";

interface MaterialsTemplateButtonProps {
  projectCode: string;
}

export function MaterialsTemplateButton({ projectCode }: MaterialsTemplateButtonProps) {
  const handleDownload = () => {
    downloadMaterialsTemplate(projectCode);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleDownload}>
      <FileSpreadsheetIcon className="size-4" />
      Template
    </Button>
  );
}
