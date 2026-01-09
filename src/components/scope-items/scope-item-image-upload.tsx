"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ImageIcon, XIcon, UploadIcon } from "lucide-react";
import Image from "next/image";

interface ScopeItemImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  disabled?: boolean;
  maxImages?: number;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function ScopeItemImageUpload({
  images,
  onChange,
  disabled = false,
  maxImages = 5,
}: ScopeItemImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
        const fileName = `${timestamp}-${randomId}.${ext}`;

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

      {/* Upload Button */}
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || isUploading}
            onClick={() => inputRef.current?.click()}
          >
            {isUploading ? (
              <>
                <Spinner className="size-4" />
                Uploading...
              </>
            ) : (
              <>
                <UploadIcon className="size-4" />
                Add Images
              </>
            )}
          </Button>
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
