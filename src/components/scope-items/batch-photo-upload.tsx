"use client";

/**
 * BatchPhotoUpload — Upload photos to multiple scope items at once
 *
 * Name photos by row number (1.jpg, 2.jpg, 3_front.jpg, etc.)
 * and they auto-match to scope items by their position in the list.
 * Multiple photos per item supported (1.jpg, 1_2.jpg → both go to item #1).
 */

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { scopeItemKeys } from "@/lib/react-query/scope-items";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ImageIcon,
  UploadIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  XCircleIcon,
} from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-utils";

interface ScopeItemRef {
  id: string;
  item_code: string;
  name: string;
  images: string[] | null;
}

interface BatchPhotoUploadProps {
  projectId: string;
  /** Scope items in display order — index+1 = row number */
  items: ScopeItemRef[];
}

interface MatchedPhoto {
  file: File;
  fileName: string;
  rowNumber: number;
  item: ScopeItemRef | null;
  previewUrl: string;
}

/** Extract leading number from filename: "3.jpg" → 3, "12_front.jpg" → 12, "abc.jpg" → null */
function extractRowNumber(fileName: string): number | null {
  const match = fileName.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

export function BatchPhotoUpload({
  projectId,
  items,
}: BatchPhotoUploadProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"select" | "preview" | "uploading" | "complete">("select");
  const [matched, setMatched] = useState<MatchedPhoto[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [results, setResults] = useState<{ uploaded: number; failed: number; skipped: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const reset = () => {
    setStep("select");
    setMatched([]);
    setProgress(null);
    setResults(null);
    // Revoke preview URLs
    for (const m of matched) {
      URL.revokeObjectURL(m.previewUrl);
    }
  };

  const handleClose = () => {
    const hadUploads = results && results.uploaded > 0;
    reset();
    setIsOpen(false);
    if (hadUploads) {
      queryClient.invalidateQueries({ queryKey: scopeItemKeys.list(projectId) });
      router.refresh();
    }
  };

  const processFiles = (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      toast.error("No image files found");
      return;
    }

    const matches: MatchedPhoto[] = imageFiles.map((file) => {
      const rowNum = extractRowNumber(file.name);
      const item = rowNum !== null && rowNum >= 1 && rowNum <= items.length
        ? items[rowNum - 1]
        : null;

      return {
        file,
        fileName: file.name,
        rowNumber: rowNum ?? 0,
        item,
        previewUrl: URL.createObjectURL(file),
      };
    });

    // Sort by row number
    matches.sort((a, b) => a.rowNumber - b.rowNumber);

    setMatched(matches);
    setStep("preview");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    processFiles(Array.from(files));
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) processFiles(files);
  };

  const handleUpload = async () => {
    const validMatches = matched.filter((m) => m.item !== null);
    if (validMatches.length === 0) {
      toast.error("No matched photos to upload");
      return;
    }

    setStep("uploading");
    setIsUploading(true);
    setProgress({ done: 0, total: validMatches.length });

    const supabase = createClient();
    let uploaded = 0;
    let failed = 0;

    // Group by item for batch update
    const itemPhotos = new Map<string, { item: ScopeItemRef; urls: string[] }>();

    for (let i = 0; i < validMatches.length; i++) {
      const { file, item } = validMatches[i];
      if (!item) continue;

      try {
        // Compress
        const compressed = await compressImage(file, {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 0.8,
        });

        // Upload
        const ext = compressed.name.split(".").pop()?.toLowerCase() || "jpg";
        const fileName = `${projectId}/${item.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { data, error } = await supabase.storage
          .from("scope-items")
          .upload(fileName, compressed);

        if (error) {
          console.error(`Upload failed for ${file.name}:`, error);
          failed++;
          continue;
        }

        const { data: urlData } = supabase.storage
          .from("scope-items")
          .getPublicUrl(data.path);

        // Collect URLs per item
        if (!itemPhotos.has(item.id)) {
          itemPhotos.set(item.id, { item, urls: [...(item.images || [])] });
        }
        itemPhotos.get(item.id)!.urls.push(urlData.publicUrl);
        uploaded++;
      } catch {
        failed++;
      }

      setProgress({ done: i + 1, total: validMatches.length });
    }

    // Batch update each item's images array
    for (const [itemId, { urls }] of itemPhotos) {
      await supabase
        .from("scope_items")
        .update({ images: urls })
        .eq("id", itemId);
    }

    const skipped = matched.length - validMatches.length;
    setResults({ uploaded, failed, skipped });
    setStep("complete");
    setIsUploading(false);
  };

  const matchedCount = matched.filter((m) => m.item !== null).length;
  const unmatchedCount = matched.filter((m) => m.item === null).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? setIsOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 px-2.5">
          <ImageIcon className="size-3.5" />
          <span className="hidden sm:inline">Batch Photos</span>
          <span className="sm:hidden">Photos</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === "select" && "Batch Upload Photos"}
            {step === "preview" && "Preview Matches"}
            {step === "uploading" && "Uploading..."}
            {step === "complete" && "Upload Complete"}
          </DialogTitle>
          <DialogDescription>
            {step === "select" && "Name your photos by row number (1.jpg, 2.jpg, 3_front.jpg) to match them to scope items automatically."}
            {step === "preview" && `${matchedCount} matched, ${unmatchedCount} unmatched`}
            {step === "uploading" && `Uploading ${progress?.done || 0} of ${progress?.total || 0}...`}
            {step === "complete" && `${results?.uploaded || 0} uploaded, ${results?.failed || 0} failed, ${results?.skipped || 0} skipped`}
          </DialogDescription>
        </DialogHeader>

        {/* Select Step */}
        {step === "select" && (
          <div className="space-y-4 py-4">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-10 cursor-pointer transition-colors ${
                isDragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
            >
              <UploadIcon className="size-10 text-muted-foreground mb-4" />
              <p className="text-sm font-medium mb-1">Drop photos here or click to select</p>
              <p className="text-xs text-muted-foreground">
                Name files by row number: 1.jpg, 2.jpg, 3_front.jpg, 3_back.jpg
              </p>
            </div>

            <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
              <p className="text-xs font-medium">Naming rules:</p>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                <li><code className="bg-muted px-1 rounded">1.jpg</code> → Item #1 ({items[0]?.item_code || "..."})</li>
                <li><code className="bg-muted px-1 rounded">3_front.jpg</code> → Item #3 ({items[2]?.item_code || "..."})</li>
                <li><code className="bg-muted px-1 rounded">3_back.jpg</code> → Also Item #3 (multiple photos per item)</li>
                <li><code className="bg-muted px-1 rounded">abc.jpg</code> → Skipped (no leading number)</li>
              </ul>
            </div>
          </div>
        )}

        {/* Preview Step */}
        {step === "preview" && (
          <div className="space-y-4 py-2 flex-1 min-h-0">
            <ScrollArea className="h-[350px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Photo</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead className="w-[40px]">#</TableHead>
                    <TableHead>Matched Item</TableHead>
                    <TableHead className="w-[80px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matched.map((m, i) => (
                    <TableRow key={i} className={!m.item ? "bg-destructive/5" : ""}>
                      <TableCell>
                        <div className="size-10 rounded overflow-hidden bg-muted">
                          <img
                            src={m.previewUrl}
                            alt={m.fileName}
                            className="size-full object-cover"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono truncate max-w-[150px]">
                        {m.fileName}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {m.rowNumber || "?"}
                      </TableCell>
                      <TableCell>
                        {m.item ? (
                          <span className="text-sm">
                            <Badge variant="outline" className="font-mono text-[10px] mr-1.5">
                              {m.item.item_code}
                            </Badge>
                            {m.item.name}
                          </span>
                        ) : (
                          <span className="text-sm text-destructive">No match</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {m.item ? (
                          <CheckCircleIcon className="size-4 text-green-500" />
                        ) : (
                          <XCircleIcon className="size-4 text-destructive" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {unmatchedCount > 0 && (
              <div className="flex items-center gap-2 p-2.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                <AlertTriangleIcon className="size-4 shrink-0" />
                {unmatchedCount} photo{unmatchedCount !== 1 ? "s" : ""} couldn't be matched (no valid row number in filename). They will be skipped.
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button onClick={handleUpload} disabled={matchedCount === 0}>
                <UploadIcon className="size-4" />
                Upload {matchedCount} Photo{matchedCount !== 1 ? "s" : ""}
              </Button>
              <Button variant="outline" onClick={reset}>
                Choose Different Files
              </Button>
            </div>
          </div>
        )}

        {/* Uploading Step */}
        {step === "uploading" && (
          <div className="flex flex-col items-center justify-center py-8">
            <Spinner className="size-8 mb-4" />
            <p className="text-muted-foreground">
              Uploading {progress?.done || 0} of {progress?.total || 0}...
            </p>
          </div>
        )}

        {/* Complete Step */}
        {step === "complete" && results && (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center justify-center py-4">
              <CheckCircleIcon className="size-12 text-green-500 mb-4" />
              <p className="text-lg font-medium">Upload Complete</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-md bg-green-500/10 border border-green-500/20 text-center">
                <p className="text-2xl font-bold text-green-600">{results.uploaded}</p>
                <p className="text-sm text-muted-foreground">Uploaded</p>
              </div>
              <div className="p-4 rounded-md bg-destructive/10 border border-destructive/20 text-center">
                <p className="text-2xl font-bold text-destructive">{results.failed}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
              <div className="p-4 rounded-md bg-amber-500/10 border border-amber-500/20 text-center">
                <p className="text-2xl font-bold text-amber-600">{results.skipped}</p>
                <p className="text-sm text-muted-foreground">Skipped</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleClose}>Close</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
