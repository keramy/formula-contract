"use client";

import { Button } from "@/components/ui/button";
import { DownloadIcon } from "lucide-react";
import { downloadScopeItemsTemplate } from "@/lib/excel-template";

interface DownloadTemplateButtonProps {
  projectCode: string;
}

export function DownloadTemplateButton({ projectCode }: DownloadTemplateButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => downloadScopeItemsTemplate(projectCode)}
    >
      <DownloadIcon className="size-4" />
      Download Template
    </Button>
  );
}
