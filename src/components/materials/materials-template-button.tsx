"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { FileSpreadsheetIcon } from "lucide-react";
import { downloadMaterialsTemplate } from "@/lib/excel-template";

interface MaterialsTemplateButtonProps {
  projectCode: string;
  compact?: boolean;
  className?: string;
}

export function MaterialsTemplateButton({ projectCode, compact = false, className }: MaterialsTemplateButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      await downloadMaterialsTemplate(projectCode);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className={compact ? `h-8 px-2.5 text-xs ${className ?? ""}`.trim() : className}
      onClick={handleDownload}
      disabled={isLoading}
    >
      {isLoading ? <Spinner className="size-4" /> : <FileSpreadsheetIcon className="size-4" />}
      {compact ? "Template" : "Download Template"}
    </Button>
  );
}
