"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { UploadIcon, FileIcon, XIcon, FileImageIcon } from "lucide-react";
import { validateFile, DRAWING_CONFIG, CAD_CONFIG, formatFileSize, sanitizeFileName } from "@/lib/file-validation";
import { sanitizeText } from "@/lib/sanitize";
import type { DrawingInsert, DrawingUpdate, DrawingRevisionInsert, ScopeItemUpdate } from "@/types/database";

interface ScopeItem {
  id: string;
  item_code: string;
  name: string;
  hasDrawing?: boolean;
  currentRevision?: string | null;
}

interface DrawingUploadSheetProps {
  projectId: string;
  scopeItems: ScopeItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedItemId?: string;
  onSuccess?: () => void;
}

function getNextRevision(current: string | null): string {
  if (!current) return "A";
  if (current === "Z") return "AA";
  if (current.length === 1) {
    return String.fromCharCode(current.charCodeAt(0) + 1);
  }
  const lastChar = current[current.length - 1];
  if (lastChar === "Z") {
    return String.fromCharCode(current.charCodeAt(0) + 1) + "A";
  }
  return current.slice(0, -1) + String.fromCharCode(lastChar.charCodeAt(0) + 1);
}

export function DrawingUploadSheet({
  projectId,
  scopeItems,
  open,
  onOpenChange,
  preselectedItemId,
  onSuccess,
}: DrawingUploadSheetProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cadFileInputRef = useRef<HTMLInputElement>(null);

  const [selectedItemId, setSelectedItemId] = useState(preselectedItemId || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [cadFile, setCadFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");

  const selectedItem = scopeItems.find((item) => item.id === selectedItemId);
  const hasDrawing = selectedItem?.hasDrawing || false;
  const currentRevision = selectedItem?.currentRevision || null;
  const nextRevision = getNextRevision(currentRevision);

  const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateFile(file, DRAWING_CONFIG);
      if (!validation.valid) {
        setError(validation.error || "Invalid file");
        return;
      }
      setPdfFile(file);
      setError(null);
    }
  };

  const handleCadSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateFile(file, CAD_CONFIG);
      if (!validation.valid) {
        setError(validation.error || "Invalid CAD file");
        return;
      }
      setCadFile(file);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedItemId) {
      setError("Please select a scope item");
      return;
    }

    if (!pdfFile) {
      setError("Please select a PDF or image file");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const timestamp = Date.now();
      const sanitizedPdfName = sanitizeFileName(pdfFile.name);
      const pdfFileName = `${selectedItemId}/${nextRevision}_${timestamp}_${sanitizedPdfName}`;

      const { error: uploadError } = await supabase.storage
        .from("drawings")
        .upload(pdfFileName, pdfFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("drawings")
        .getPublicUrl(pdfFileName);

      let cadFileUrl = null;
      let cadFileName = null;

      if (cadFile) {
        const sanitizedCadName = sanitizeFileName(cadFile.name);
        const cadStorageName = `${selectedItemId}/${nextRevision}_${timestamp}_${sanitizedCadName}`;
        const { error: cadUploadError } = await supabase.storage
          .from("drawings")
          .upload(cadStorageName, cadFile);

        if (cadUploadError) throw cadUploadError;

        const { data: cadUrlData } = supabase.storage
          .from("drawings")
          .getPublicUrl(cadStorageName);

        cadFileUrl = cadUrlData.publicUrl;
        cadFileName = cadFile.name;
      }

      let drawingId: string;

      if (!hasDrawing) {
        const drawingInsert: DrawingInsert = {
          item_id: selectedItemId,
          status: "uploaded",
          current_revision: nextRevision,
        };
        const { data: newDrawing, error: drawingError } = await supabase
          .from("drawings")
          .insert(drawingInsert)
          .select("id")
          .single();

        if (drawingError) throw drawingError;
        drawingId = (newDrawing as { id: string }).id;
      } else {
        const { data: existingDrawing, error: fetchError } = await supabase
          .from("drawings")
          .select("id")
          .eq("item_id", selectedItemId)
          .single();

        if (fetchError) throw fetchError;
        drawingId = (existingDrawing as { id: string }).id;

        const drawingUpdate: DrawingUpdate = {
          current_revision: nextRevision,
          status: "uploaded"
        };
        const { error: updateError } = await supabase
          .from("drawings")
          .update(drawingUpdate)
          .eq("id", drawingId);

        if (updateError) throw updateError;
      }

      const revisionInsert: DrawingRevisionInsert = {
        drawing_id: drawingId,
        revision: nextRevision,
        file_url: urlData.publicUrl,
        file_name: sanitizedPdfName,
        file_size: pdfFile.size,
        cad_file_url: cadFileUrl,
        cad_file_name: cadFileName ? sanitizeFileName(cadFileName) : null,
        notes: notes ? sanitizeText(notes) : null,
        uploaded_by: user.id,
      };
      const { error: revisionError } = await supabase
        .from("drawing_revisions")
        .insert(revisionInsert);

      if (revisionError) throw revisionError;

      const scopeItemUpdate: ScopeItemUpdate = { status: "in_design" };
      await supabase
        .from("scope_items")
        .update(scopeItemUpdate)
        .eq("id", selectedItemId)
        .eq("status", "pending");

      // Reset form and close sheet
      handleReset();
      onOpenChange(false);
      router.refresh();
      onSuccess?.();
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Failed to upload drawing");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setPdfFile(null);
    setCadFile(null);
    setNotes("");
    setError(null);
    if (!preselectedItemId) {
      setSelectedItemId("");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cadFileInputRef.current) cadFileInputRef.current.value = "";
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b bg-base-50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <FileImageIcon className="size-5 text-blue-600" />
            </div>
            <div>
              <SheetTitle className="text-lg">Upload Drawing</SheetTitle>
              <SheetDescription>
                Upload a drawing file for a scope item
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Scope Item Selection */}
          <div className="space-y-2">
            <Label>Scope Item *</Label>
            <Select
              value={selectedItemId}
              onValueChange={setSelectedItemId}
              disabled={!!preselectedItemId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a scope item" />
              </SelectTrigger>
              <SelectContent>
                {scopeItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    <span className="font-medium">{item.item_code}</span>
                    <span className="text-muted-foreground ml-2">- {item.name}</span>
                    {item.hasDrawing && (
                      <span className="text-xs text-blue-600 ml-2">
                        (Rev {item.currentRevision})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedItemId && (
            <div className="p-3 rounded-md bg-muted text-sm">
              {hasDrawing ? (
                <>
                  <p className="font-medium">Uploading Revision {nextRevision}</p>
                  <p className="text-muted-foreground">Current revision: {currentRevision}</p>
                </>
              ) : (
                <p className="font-medium">Uploading first drawing (Revision A)</p>
              )}
            </div>
          )}

          {/* PDF/Image Upload */}
          <div className="space-y-2">
            <Label>Drawing File (PDF or Image) *</Label>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/*"
              onChange={handlePdfSelect}
              disabled={isLoading}
              className="cursor-pointer"
            />
            {pdfFile && (
              <div className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm">
                <FileIcon className="size-4 text-muted-foreground" />
                <span className="flex-1 truncate">{pdfFile.name}</span>
                <span className="text-muted-foreground">{formatFileSize(pdfFile.size)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="size-6 p-0"
                  onClick={() => {
                    setPdfFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  <XIcon className="size-3" />
                </Button>
              </div>
            )}
          </div>

          {/* CAD File Upload */}
          <div className="space-y-2">
            <Label>CAD File (optional)</Label>
            <Input
              ref={cadFileInputRef}
              type="file"
              accept=".dwg,.dxf,.skp,.3ds,.obj"
              onChange={handleCadSelect}
              disabled={isLoading}
              className="cursor-pointer"
            />
            {cadFile && (
              <div className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm">
                <FileIcon className="size-4 text-muted-foreground" />
                <span className="flex-1 truncate">{cadFile.name}</span>
                <span className="text-muted-foreground">{formatFileSize(cadFile.size)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="size-6 p-0"
                  onClick={() => {
                    setCadFile(null);
                    if (cadFileInputRef.current) cadFileInputRef.current.value = "";
                  }}
                >
                  <XIcon className="size-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Changes in this revision..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isLoading}
              rows={3}
            />
          </div>
        </form>

        <SheetFooter className="px-6 py-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={isLoading}
          >
            Reset
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !pdfFile || !selectedItemId}>
            {isLoading ? (
              <>
                <Spinner className="size-4" />
                Uploading...
              </>
            ) : (
              <>
                <UploadIcon className="size-4" />
                Upload {selectedItemId ? `Revision ${nextRevision}` : "Drawing"}
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
