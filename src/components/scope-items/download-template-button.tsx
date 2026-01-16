"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { DownloadIcon } from "lucide-react";
import { downloadScopeItemsTemplate } from "@/lib/excel-template";

interface DownloadTemplateButtonProps {
  projectCode: string;
}

export function DownloadTemplateButton({ projectCode }: DownloadTemplateButtonProps) {
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
    >
      {isLoading ? <Spinner className="size-4" /> : <DownloadIcon className="size-4" />}
      Download Template
    </Button>
  );
}
