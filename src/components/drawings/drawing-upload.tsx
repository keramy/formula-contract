"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UploadIcon, FileIcon, XIcon, AlertTriangleIcon } from "lucide-react";
import { validateFile, DRAWING_CONFIG, CAD_CONFIG, formatFileSize, sanitizeFileName } from "@/lib/file-validation";
import { sanitizeText } from "@/lib/sanitize";
import type { DrawingInsert, DrawingUpdate, DrawingRevisionInsert, ScopeItemUpdate } from "@/types/database";

interface DrawingUploadProps {
  projectId: string;
  scopeItemId: string;
  currentRevision: string | null;
  hasDrawing: boolean;
  /** Current drawing status — used to show confirmation when uploading a new revision on an approved drawing */
  drawingStatus?: string;
}

function getNextRevision(current: string | null): string {
  if (!current) return "A";
  // Handle A, B, C, ..., Z, then AA, AB, etc.
  if (current === "Z") return "AA";
  if (current.length === 1) {
    return String.fromCharCode(current.charCodeAt(0) + 1);
  }
  // For multi-letter revisions (AA, AB, etc.)
  const lastChar = current[current.length - 1];
  if (lastChar === "Z") {
    return String.fromCharCode(current.charCodeAt(0) + 1) + "A";
  }
  return current.slice(0, -1) + String.fromCharCode(lastChar.charCodeAt(0) + 1);
}

export function DrawingUpload({ projectId, scopeItemId, currentRevision, hasDrawing, drawingStatus }: DrawingUploadProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cadFileInputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const isApproved = drawingStatus === "approved" || drawingStatus === "approved_with_comments";
  const [error, setError] = useState<string | null>(null);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [cadFile, setCadFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");

  const nextRevision = getNextRevision(currentRevision);

  const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate using the drawing config (PDF + images)
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
      // Validate using the CAD config
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
    if (!pdfFile) {
      setError("Please select a PDF or image file");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Generate unique file names with sanitized names
      const timestamp = Date.now();
      const sanitizedPdfName = sanitizeFileName(pdfFile.name);
      const pdfFileName = `${projectId}/${scopeItemId}/${nextRevision}_${timestamp}_${sanitizedPdfName}`;

      // Upload PDF/image to storage
      const { error: uploadError } = await supabase.storage
        .from("drawings")
        .upload(pdfFileName, pdfFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("drawings")
        .getPublicUrl(pdfFileName);

      let cadFileUrl = null;
      let cadFileName = null;

      // Upload CAD file if provided
      if (cadFile) {
        const sanitizedCadName = sanitizeFileName(cadFile.name);
        const cadStorageName = `${projectId}/${scopeItemId}/${nextRevision}_${timestamp}_${sanitizedCadName}`;
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

      // Create or get drawing record
      let drawingId: string;

      if (!hasDrawing) {
        // Create new drawing record
        const drawingInsert: DrawingInsert = {
          item_id: scopeItemId,
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
        // Get existing drawing and update it
        const { data: existingDrawing, error: fetchError } = await supabase
          .from("drawings")
          .select("id")
          .eq("item_id", scopeItemId)
          .single();

        if (fetchError) throw fetchError;
        drawingId = (existingDrawing as { id: string }).id;

        // Update current revision
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

      // Create revision record with sanitized inputs
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

      // Update scope item status to "in_design" if it was "pending"
      const scopeItemUpdate: ScopeItemUpdate = { status: "in_design" };
      await supabase
        .from("scope_items")
        .update(scopeItemUpdate)
        .eq("id", scopeItemId)
        .eq("status", "pending");

      // Reset form and close dialog
      setPdfFile(null);
      setCadFile(null);
      setNotes("");
      setIsOpen(false);
      router.refresh();
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
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cadFileInputRef.current) cadFileInputRef.current.value = "";
  };

  return (
    <>
    {/* Confirmation dialog for uploading new revision on approved drawing */}
    <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangleIcon className="size-5 text-amber-500" />
            Upload New Revision?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This drawing has already been approved by the client. Uploading a new revision will reset the approval status and the client will need to review again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => setIsOpen(true)}>
            Continue with New Revision
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {isApproved ? (
        <Button size="sm" onClick={() => setShowConfirm(true)}>
          <UploadIcon className="size-4" />
          Upload Revision
        </Button>
      ) : (
        <DialogTrigger asChild>
          <Button size="sm">
            <UploadIcon className="size-4" />
            {hasDrawing ? "Upload Revision" : "Upload Drawing"}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {hasDrawing ? `Upload Revision ${nextRevision}` : "Upload First Drawing"}
          </DialogTitle>
          <DialogDescription>
            {hasDrawing
              ? `Upload a new revision. Current revision: ${currentRevision}`
              : "Upload the first drawing for this scope item"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
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
                  size="icon-sm"
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

          {/* CAD File Upload (optional) */}
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
                  size="icon-sm"
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
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isLoading || !pdfFile}>
              {isLoading ? (
                <>
                  <Spinner className="size-4" />
                  Uploading...
                </>
              ) : (
                <>
                  <UploadIcon className="size-4" />
                  Upload Revision {nextRevision}
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isLoading}
            >
              Reset
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}
