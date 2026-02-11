"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { UploadIcon, FileSpreadsheetIcon, AlertTriangleIcon, CheckCircleIcon, XCircleIcon, RefreshCwIcon, GitMergeIcon } from "lucide-react";
import { parseScopeItemsExcel, type ParseResult, type ParsedScopeItem } from "@/lib/excel-template";
import { clearProjectScopeItems } from "@/lib/actions/scope-items";
import { logActivity } from "@/lib/activity-log/actions";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/constants";
import type { ScopeItemInsert } from "@/types/database";

type ImportMode = "merge" | "replace";

interface ExcelImportProps {
  projectId: string;
  projectCode: string;
  compact?: boolean;
}

type ImportStep = "upload" | "preview" | "importing" | "complete";

export function ExcelImport({ projectId, projectCode, compact = false }: ExcelImportProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<ImportStep>("upload");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importResults, setImportResults] = useState<{
    inserted: number;
    updated: number;
    failed: number;
    deleted: number;
    errors: string[];
  } | null>(null);

  // Import mode: merge (upsert) or replace (delete all first)
  const [importMode, setImportMode] = useState<ImportMode>("merge");
  const [existingItemsCount, setExistingItemsCount] = useState<number>(0);

  // Fetch existing items count when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchExistingItemsCount();
    }
  }, [isOpen]);

  const fetchExistingItemsCount = async () => {
    const supabase = createClient();
    const { count } = await supabase
      .from("scope_items")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("is_deleted", false);
    setExistingItemsCount(count || 0);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (!validTypes.includes(file.type) && !file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setError("Please select an Excel file (.xlsx or .xls)");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const buffer = await file.arrayBuffer();
      const result = await parseScopeItemsExcel(buffer);
      setParseResult(result);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse Excel file");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!parseResult || parseResult.items.length === 0) return;

    setIsLoading(true);
    setStep("importing");
    setError(null);

    const results = {
      inserted: 0,
      updated: 0,
      failed: 0,
      deleted: 0,
      errors: [] as string[],
    };

    try {
      const supabase = createClient();

      // If Replace mode, soft-delete all existing items first using server action
      if (importMode === "replace" && existingItemsCount > 0) {
        const clearResult = await clearProjectScopeItems(projectId);

        if (!clearResult.success) {
          throw new Error(`Failed to clear existing items: ${clearResult.error}`);
        }
        results.deleted = clearResult.data?.deletedCount || existingItemsCount;
      }

      // Import items one by one with upsert logic
      for (const item of parseResult.items) {
        try {
          // Check if item with same item_code exists in this project
          const { data: existing } = await supabase
            .from("scope_items")
            .select("id")
            .eq("project_id", projectId)
            .eq("item_code", item.item_code)
            .eq("is_deleted", false)
            .single();

          if (existing) {
            // UPDATE existing item - preserve initial costs (locked baseline), path, status
            // Only update: name, description, unit, quantity, sales prices
            // NOTE: initial_unit_cost and initial_total_cost are NEVER updated
            const { error: updateError } = await supabase
              .from("scope_items")
              .update({
                name: item.name,
                description: item.description,
                unit: item.unit,
                quantity: item.quantity,
                // Update sales price and recalculate total
                unit_sales_price: item.unit_sales_price,
                total_sales_price: item.unit_sales_price ? item.unit_sales_price * item.quantity : null,
                notes: item.notes,
              })
              .eq("id", existing.id);

            if (updateError) {
              results.failed++;
              results.errors.push(`${item.item_code}: ${updateError.message}`);
            } else {
              results.updated++;
            }
          } else {
            // INSERT new item with calculated totals
            // Set initial costs (locked baseline) - actual costs entered manually later
            const scopeItem: ScopeItemInsert = {
              project_id: projectId,
              item_code: item.item_code,
              name: item.name,
              description: item.description,
              unit: item.unit,
              quantity: item.quantity,
              // Initial cost (budgeted, set once, never changes)
              initial_unit_cost: item.initial_unit_cost,
              initial_total_cost: item.initial_unit_cost ? item.initial_unit_cost * item.quantity : null,
              // Sales price
              unit_sales_price: item.unit_sales_price,
              total_sales_price: item.unit_sales_price ? item.unit_sales_price * item.quantity : null,
              // Actual cost is NOT set during import - entered manually later
              item_path: item.item_path,
              status: item.status,
              notes: item.notes,
            };

            const { error: insertError } = await supabase
              .from("scope_items")
              .insert(scopeItem);

            if (insertError) {
              results.failed++;
              results.errors.push(`${item.item_code}: ${insertError.message}`);
            } else {
              results.inserted++;
            }
          }
        } catch (err) {
          results.failed++;
          results.errors.push(
            `${item.item_code}: ${err instanceof Error ? err.message : "Unknown error"}`
          );
        }
      }

      setImportResults(results);
      setStep("complete");

      // Log activity if any items were imported
      if (results.inserted > 0 || results.updated > 0) {
        await logActivity({
          action: ACTIVITY_ACTIONS.ITEMS_IMPORTED,
          entityType: "scope_item",
          projectId,
          details: {
            inserted: results.inserted,
            updated: results.updated,
            deleted: results.deleted,
            mode: importMode,
          },
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import items");
      setStep("preview");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    // Reset state after dialog closes
    setTimeout(() => {
      setStep("upload");
      setParseResult(null);
      setImportResults(null);
      setError(null);
      setImportMode("merge");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }, 200);

    // Refresh page if items were imported, updated, or deleted
    if (importResults && (importResults.inserted > 0 || importResults.updated > 0 || importResults.deleted > 0)) {
      router.refresh();
    }
  };

  const handleReset = () => {
    setStep("upload");
    setParseResult(null);
    setError(null);
    setImportMode("merge");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? setIsOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 px-2.5">
          <FileSpreadsheetIcon className="size-3.5" />
          {compact ? (
            <>
              <span className="sm:hidden">Import</span>
              <span className="hidden sm:inline">Import Excel</span>
            </>
          ) : (
            "Import Excel"
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === "upload" && "Import Scope Items from Excel"}
            {step === "preview" && "Preview Import"}
            {step === "importing" && "Importing..."}
            {step === "complete" && "Import Complete"}
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Upload an Excel file (.xlsx) with scope items data"}
            {step === "preview" && `Found ${parseResult?.items.length || 0} items to import`}
            {step === "importing" && "Please wait while items are being imported"}
            {step === "complete" && `${importResults?.inserted || 0} inserted, ${importResults?.updated || 0} updated`}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Upload Step */}
        {step === "upload" && (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 text-center">
              {isLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <Spinner className="size-8" />
                  <p className="text-sm text-muted-foreground">Parsing file...</p>
                </div>
              ) : (
                <>
                  <UploadIcon className="size-10 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Drag and drop an Excel file, or click to select
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="excel-upload"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                  >
                    Select File
                  </Button>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Use the &quot;Download Template&quot; button to get the correct format.
              Required columns: item_code, name
            </p>
          </div>
        )}

        {/* Preview Step */}
        {step === "preview" && parseResult && (
          <div className="flex-1 min-h-0 space-y-4">
            {/* Import Mode Selection - only show if there are existing items */}
            {existingItemsCount > 0 && (
            <div className="p-4 rounded-lg border bg-muted/30">
              <Label className="text-sm font-medium mb-3 block">Import Mode</Label>
              <RadioGroup
                value={importMode}
                onValueChange={(value) => setImportMode(value as ImportMode)}
                className="space-y-2"
              >
                <div className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50">
                  <RadioGroupItem value="merge" id="merge" className="mt-0.5" />
                  <Label htmlFor="merge" className="cursor-pointer flex-1">
                    <div className="flex items-center gap-2">
                      <GitMergeIcon className="size-4 text-blue-500" />
                      <span className="font-medium">Merge with existing items</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Update items with matching codes, add new ones
                    </p>
                  </Label>
                </div>
                <div className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50">
                  <RadioGroupItem value="replace" id="replace" className="mt-0.5" />
                  <Label htmlFor="replace" className="cursor-pointer flex-1">
                    <div className="flex items-center gap-2">
                      <RefreshCwIcon className="size-4 text-amber-500" />
                      <span className="font-medium">Replace all items</span>
                      {existingItemsCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {existingItemsCount} existing
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Delete all existing scope items, then import fresh
                    </p>
                  </Label>
                </div>
              </RadioGroup>

              {/* Warning for Replace mode */}
              {importMode === "replace" && (
                <div className="mt-3 p-2 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 text-sm flex items-start gap-2">
                  <AlertTriangleIcon className="size-4 mt-0.5 shrink-0" />
                  <span>
                    This will <strong>permanently delete</strong> all {existingItemsCount} existing items before importing.
                  </span>
                </div>
              )}
            </div>
            )}

            {/* Errors */}
            {parseResult.errors.length > 0 && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-2 text-destructive font-medium mb-2">
                  <XCircleIcon className="size-4" />
                  {parseResult.errors.length} Error(s) - These rows will be skipped
                </div>
                <ul className="text-sm space-y-1">
                  {parseResult.errors.slice(0, 5).map((err, i) => (
                    <li key={i}>Row {err.row}: {err.message}</li>
                  ))}
                  {parseResult.errors.length > 5 && (
                    <li className="text-muted-foreground">
                      ...and {parseResult.errors.length - 5} more errors
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Warnings */}
            {parseResult.warnings.length > 0 && (
              <div className="p-3 rounded-md bg-yellow-500/10 border border-yellow-500/20">
                <div className="flex items-center gap-2 text-yellow-600 font-medium mb-2">
                  <AlertTriangleIcon className="size-4" />
                  {parseResult.warnings.length} Warning(s)
                </div>
                <ul className="text-sm space-y-1">
                  {parseResult.warnings.slice(0, 3).map((warn, i) => (
                    <li key={i}>Row {warn.row}: {warn.message}</li>
                  ))}
                  {parseResult.warnings.length > 3 && (
                    <li className="text-muted-foreground">
                      ...and {parseResult.warnings.length - 3} more warnings
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Items Preview Table */}
            {parseResult.items.length > 0 ? (
              <ScrollArea className="h-[300px] border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-[60px]">Qty</TableHead>
                      <TableHead className="w-[100px] text-right">Initial Cost</TableHead>
                      <TableHead className="w-[100px] text-right">Sale Price</TableHead>
                      <TableHead className="w-[90px]">Path</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parseResult.items.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-sm">{item.item_code}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{item.name}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {item.initial_unit_cost ? item.initial_unit_cost.toLocaleString() : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.unit_sales_price ? item.unit_sales_price.toLocaleString() : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.item_path === "production" ? "default" : "secondary"} className="text-xs">
                            {item.item_path}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No valid items found to import
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleImport}
                disabled={parseResult.items.length === 0 || isLoading}
              >
                <UploadIcon className="size-4" />
                Import {parseResult.items.length} Items
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Choose Different File
              </Button>
            </div>
          </div>
        )}

        {/* Importing Step */}
        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-8">
            <Spinner className="size-8 mb-4" />
            <p className="text-muted-foreground">Importing items to {projectCode}...</p>
          </div>
        )}

        {/* Complete Step */}
        {step === "complete" && importResults && (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center justify-center py-4">
              <CheckCircleIcon className="size-12 text-green-500 mb-4" />
              <p className="text-lg font-medium">Import Complete</p>
            </div>

            <div className={`grid gap-4 ${importResults.deleted > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
              {importResults.deleted > 0 && (
                <div className="p-4 rounded-md bg-amber-500/10 border border-amber-500/20 text-center">
                  <p className="text-2xl font-bold text-amber-600">{importResults.deleted}</p>
                  <p className="text-sm text-muted-foreground">Deleted</p>
                </div>
              )}
              <div className="p-4 rounded-md bg-green-500/10 border border-green-500/20 text-center">
                <p className="text-2xl font-bold text-green-600">{importResults.inserted}</p>
                <p className="text-sm text-muted-foreground">Inserted</p>
              </div>
              <div className="p-4 rounded-md bg-blue-500/10 border border-blue-500/20 text-center">
                <p className="text-2xl font-bold text-blue-600">{importResults.updated}</p>
                <p className="text-sm text-muted-foreground">Updated</p>
              </div>
              <div className="p-4 rounded-md bg-destructive/10 border border-destructive/20 text-center">
                <p className="text-2xl font-bold text-destructive">{importResults.failed}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </div>

            {importResults.errors.length > 0 && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                <p className="font-medium text-destructive mb-2">Failed items:</p>
                <ul className="text-sm space-y-1">
                  {importResults.errors.slice(0, 5).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {importResults.errors.length > 5 && (
                    <li className="text-muted-foreground">
                      ...and {importResults.errors.length - 5} more
                    </li>
                  )}
                </ul>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
