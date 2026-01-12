"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UploadIcon, AlertTriangleIcon, CheckCircleIcon } from "lucide-react";
import { parseMaterialsExcel, type MaterialParseResult } from "@/lib/excel-template";

interface MaterialsExcelImportProps {
  projectId: string;
  projectCode: string;
}

export function MaterialsExcelImport({ projectId, projectCode }: MaterialsExcelImportProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [parseResult, setParseResult] = useState<MaterialParseResult | null>(null);
  const [importResult, setImportResult] = useState<{
    inserted: number;
    updated: number;
  } | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setImportResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const result = parseMaterialsExcel(buffer);
      setParseResult(result);
      setDialogOpen(true);
    } catch (error) {
      console.error("Failed to parse Excel file:", error);
      setParseResult({
        success: false,
        items: [],
        errors: [{ row: 0, message: "Failed to read Excel file" }],
        warnings: [],
      });
      setDialogOpen(true);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleImport = async () => {
    if (!parseResult || !parseResult.success) return;

    setIsLoading(true);
    const supabase = createClient();

    const results = { inserted: 0, updated: 0 };

    try {
      for (const material of parseResult.items) {
        // Check if material with same code exists (upsert by material_code)
        const { data: existing } = await supabase
          .from("materials")
          .select("id")
          .eq("project_id", projectId)
          .eq("material_code", material.material_code)
          .eq("is_deleted", false)
          .single();

        if (existing) {
          // UPDATE existing material (preserve status, images)
          const { error: updateError } = await supabase
            .from("materials")
            .update({
              name: material.name,
              specification: material.specification,
              supplier: material.supplier,
            })
            .eq("id", existing.id);

          if (!updateError) {
            results.updated++;
          }
        } else {
          // INSERT new material
          const { error: insertError } = await supabase.from("materials").insert({
            project_id: projectId,
            material_code: material.material_code,
            name: material.name,
            specification: material.specification,
            supplier: material.supplier,
            status: "pending",
          });

          if (!insertError) {
            results.inserted++;
          }
        }
      }

      setImportResult(results);
      router.refresh();
    } catch (error) {
      console.error("Import failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setDialogOpen(false);
    setParseResult(null);
    setImportResult(null);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading}
      >
        {isLoading ? <Spinner className="size-4" /> : <UploadIcon className="size-4" />}
        Import
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileSelect}
        className="hidden"
      />

      <Dialog open={dialogOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Materials</DialogTitle>
            <DialogDescription>
              Import materials from Excel file into {projectCode}
            </DialogDescription>
          </DialogHeader>

          {importResult ? (
            <div className="space-y-4">
              <Alert>
                <CheckCircleIcon className="size-4 text-green-500" />
                <AlertTitle>Import Complete</AlertTitle>
                <AlertDescription>
                  {importResult.inserted} material(s) added, {importResult.updated} updated.
                </AlertDescription>
              </Alert>
              <DialogFooter>
                <Button onClick={handleClose}>Done</Button>
              </DialogFooter>
            </div>
          ) : parseResult ? (
            <div className="space-y-4">
              {/* Summary */}
              <div className="text-sm">
                <p>
                  Found <strong>{parseResult.items.length}</strong> material(s) to import.
                </p>
                {parseResult.items.length > 0 && (
                  <p className="text-muted-foreground text-xs mt-1">
                    Existing materials with the same code will be updated.
                  </p>
                )}
              </div>

              {/* Errors */}
              {parseResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangleIcon className="size-4" />
                  <AlertTitle>{parseResult.errors.length} Error(s)</AlertTitle>
                  <AlertDescription>
                    <ScrollArea className="max-h-[100px] mt-2">
                      <ul className="text-xs space-y-1">
                        {parseResult.errors.map((err, i) => (
                          <li key={i}>
                            Row {err.row}: {err.message}
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </AlertDescription>
                </Alert>
              )}

              {/* Warnings */}
              {parseResult.warnings.length > 0 && (
                <Alert>
                  <AlertTriangleIcon className="size-4 text-yellow-500" />
                  <AlertTitle>{parseResult.warnings.length} Warning(s)</AlertTitle>
                  <AlertDescription>
                    <ScrollArea className="max-h-[100px] mt-2">
                      <ul className="text-xs space-y-1">
                        {parseResult.warnings.map((warn, i) => (
                          <li key={i}>
                            Row {warn.row}: {warn.message}
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </AlertDescription>
                </Alert>
              )}

              {/* Preview */}
              {parseResult.items.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Preview (first 5)</p>
                  <ScrollArea className="max-h-[150px]">
                    <div className="space-y-1 text-xs">
                      {parseResult.items.slice(0, 5).map((item, i) => (
                        <div key={i} className="p-2 bg-muted rounded">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-muted-foreground">{item.material_code}</span>
                            <span className="font-medium">{item.name}</span>
                          </div>
                          {item.specification && (
                            <p className="text-muted-foreground truncate">{item.specification}</p>
                          )}
                          {item.supplier && (
                            <p className="text-muted-foreground">Supplier: {item.supplier}</p>
                          )}
                        </div>
                      ))}
                      {parseResult.items.length > 5 && (
                        <p className="text-muted-foreground">
                          ...and {parseResult.items.length - 5} more
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={isLoading || !parseResult.success || parseResult.items.length === 0}
                >
                  {isLoading && <Spinner className="size-4 mr-2" />}
                  Import {parseResult.items.length} Material(s)
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
