"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ImageIcon, XIcon, UploadIcon } from "lucide-react";
import Image from "next/image";

interface ScopeItemImageUploadProps {
  projectId: string;
  images: string[];
  onChange: (images: string[]) => void;
  disabled?: boolean;
  maxImages?: number;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function ScopeItemImageUpload({
  projectId,
  images,
  onChange,
  disabled = false,
  maxImages = 5,
}: ScopeItemImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Handle paste from clipboard (Ctrl+V screenshot)
  useEffect(() => {
    if (disabled) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            // Give pasted images a meaningful name
            const ext = file.type.split("/")[1] || "png";
            const named = new File([file], `screenshot-${Date.now()}.${ext}`, { type: file.type });
            imageFiles.push(named);
          }
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        await processFiles(imageFiles);
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [disabled, images.length]);

  // Handle drag & drop
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length > 0) await processFiles(files);
  };

  // Shared file processing logic
  const processFiles = async (fileList: File[]) => {
    setError(null);
    setIsUploading(true);

    try {
      const supabase = createClient();
      const newImages: string[] = [];

      for (const file of fileList) {
        if (file.size > MAX_FILE_SIZE) {
          setError(`File ${file.name} is too large. Max size is 5MB.`);
          continue;
        }
        if (images.length + newImages.length >= maxImages) {
          setError(`Maximum ${maxImages} images allowed.`);
          break;
        }
        if (!file.type.startsWith("image/")) {
          setError(`File ${file.name} is not an image.`);
          continue;
        }

        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 8);
        const ext = file.name.split(".").pop() || "jpg";
        const fileName = `${projectId}/${timestamp}-${randomId}.${ext}`;

        const { data, error: uploadError } = await supabase.storage
          .from("scope-items")
          .upload(fileName, file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          setError(`Failed to upload ${file.name}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from("scope-items")
          .getPublicUrl(data.path);

        if (urlData?.publicUrl) {
          newImages.push(urlData.publicUrl);
        }
      }

      if (newImages.length > 0) {
        onChange([...images, ...newImages]);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError("Failed to upload images");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setIsUploading(true);

    try {
      const supabase = createClient();
      const newImages: string[] = [];

      for (const file of Array.from(files)) {
        // Check file size
        if (file.size > MAX_FILE_SIZE) {
          setError(`File ${file.name} is too large. Max size is 5MB.`);
          continue;
        }

        // Check if we've reached max images
        if (images.length + newImages.length >= maxImages) {
          setError(`Maximum ${maxImages} images allowed.`);
          break;
        }

        // Check file type
        if (!file.type.startsWith("image/")) {
          setError(`File ${file.name} is not an image.`);
          continue;
        }

        // Generate unique file name
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 8);
        const ext = file.name.split(".").pop() || "jpg";
        const fileName = `${projectId}/${timestamp}-${randomId}.${ext}`;

        // Upload to storage
        const { data, error: uploadError } = await supabase.storage
          .from("scope-items")
          .upload(fileName, file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          setError(`Failed to upload ${file.name}`);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("scope-items")
          .getPublicUrl(data.path);

        newImages.push(urlData.publicUrl);
      }

      if (newImages.length > 0) {
        onChange([...images, ...newImages]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      // Reset input
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const handleRemove = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);
  };

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((url, index) => (
            <div
              key={url}
              className="relative group size-20 rounded-md overflow-hidden border bg-muted"
            >
              <Image
                src={url}
                alt={`Image ${index + 1}`}
                fill
                sizes="96px"
                className="object-cover"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="absolute top-0.5 right-0.5 p-0.5 rounded bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <XIcon className="size-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Area — click, drag & drop, or paste */}
      {images.length < maxImages && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            disabled={disabled || isUploading}
            className="hidden"
            id="scope-item-images"
          />
          <div
            ref={dropZoneRef}
            role="button"
            tabIndex={0}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !isUploading && inputRef.current?.click()}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && !isUploading) {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            className={cn(
              "flex flex-col items-center gap-1.5 p-4 rounded-lg border-2 border-dashed cursor-pointer transition-colors",
              isDragOver
                ? "border-primary bg-primary/5"
                : "border-base-300 hover:border-primary/50 hover:bg-base-50/50",
              isUploading && "opacity-50 cursor-not-allowed"
            )}
          >
            {isUploading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner className="size-4" />
                Uploading...
              </div>
            ) : (
              <>
                <UploadIcon className="size-5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground text-center">
                  Click to upload, drag & drop, or <span className="font-medium text-primary">Ctrl+V</span> to paste
                </p>
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {images.length}/{maxImages} images • Max 5MB each
          </p>
        </div>
      )}

      {/* Empty State */}
      {images.length === 0 && !isUploading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ImageIcon className="size-4" />
          No images uploaded
        </div>
      )}
    </div>
  );
}
