"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { DownloadIcon } from "lucide-react";
import { downloadScopeItemsTemplate } from "@/lib/excel-template";

interface DownloadTemplateButtonProps {
  projectCode: string;
  compact?: boolean;
}

export function DownloadTemplateButton({ projectCode, compact = false }: DownloadTemplateButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      await downloadScopeItemsTemplate(projectCode);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={isLoading}
      className="h-8 px-2.5"
    >
      {isLoading ? <Spinner className="size-3.5" /> : <DownloadIcon className="size-3.5" />}
      {compact ? (
        <>
          <span className="sm:hidden">Template</span>
          <span className="hidden sm:inline">Download Template</span>
        </>
      ) : (
        "Download Template"
      )}
    </Button>
  );
}
