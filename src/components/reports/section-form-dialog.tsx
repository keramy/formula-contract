"use client";

/**
 * SectionFormDialog Component
 *
 * Dialog for adding or editing report sections.
 * Includes title, description, and photo upload functionality.
 *
 * Used in both report creation and editing modals.
 */

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageIcon, XIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { sanitizeText, sanitizeHTML } from "@/lib/sanitize";
import { validateFile, IMAGE_CONFIG } from "@/lib/file-validation";
import { compressImage } from "@/lib/image-utils";
import type { LocalSection } from "./report-types";
import { generateLocalId } from "./report-types";

interface SectionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingSection: LocalSection | null;
  onSave: (section: LocalSection) => void;
  /**
   * Project ID for organizing uploaded photos
   */
  projectId: string;
  /**
   * Report ID for organizing uploaded photos (optional for new reports)
   */
  reportId?: string;
}

export function SectionFormDialog({
  open,
  onOpenChange,
  editingSection,
  onSave,
  projectId,
  reportId,
}: SectionFormDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);

  // Loading/error state
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when opening or when editing section changes
  useEffect(() => {
    if (open) {
      if (editingSection) {
        setTitle(editingSection.title);
        setDescription(editingSection.description);
        setPhotos([...editingSection.photos]);
      } else {
        setTitle("");
        setDescription("");
        setPhotos([]);
      }
      setError(null);
    }
  }, [open, editingSection]);

  // Photo upload handler with compression
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError(null);

    const supabase = createClient();
    const newPhotos: string[] = [];
    const errors: string[] = [];

    // Determine upload path
    const uploadPath = reportId
      ? `${projectId}/${reportId}`
      : `${projectId}/temp`;

    for (const originalFile of Array.from(files)) {
      // Validate file
      const validation = validateFile(originalFile, IMAGE_CONFIG);
      if (!validation.valid) {
        errors.push(`${originalFile.name}: ${validation.error || "Invalid file"}`);
        continue;
      }

      try {
        // Compress the image before upload (max 1920x1080, 80% quality)
        const compressedFile = await compressImage(originalFile, {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 0.8,
        });

        const fileExt = compressedFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const fileName = `${uploadPath}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

        const { data, error: uploadError } = await supabase.storage
          .from("reports")
          .upload(fileName, compressedFile);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          errors.push(`${originalFile.name}: ${uploadError.message}`);
          continue;
        }

        if (data) {
          const {
            data: { publicUrl },
          } = supabase.storage.from("reports").getPublicUrl(data.path);

          newPhotos.push(publicUrl);
        }
      } catch (err) {
        console.error("Upload exception:", err);
        errors.push(`${originalFile.name}: Upload failed`);
      }
    }

    if (errors.length > 0) {
      setError(errors.join(". "));
    }

    if (newPhotos.length > 0) {
      setPhotos((prev) => [...prev, ...newPhotos]);
    }

    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Save section
  const handleSave = () => {
    if (!title.trim()) return;

    const sanitizedTitle = sanitizeText(title.trim());
    const sanitizedDescription = description.trim()
      ? sanitizeHTML(description.trim())
      : "";

    const section: LocalSection = editingSection
      ? {
          ...editingSection,
          title: sanitizedTitle,
          description: sanitizedDescription,
          photos,
        }
      : {
          id: generateLocalId(),
          title: sanitizedTitle,
          description: sanitizedDescription,
          photos,
          isNew: true,
        };

    onSave(section);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        onOpenChange(newOpen);
        if (!newOpen) setError(null);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingSection ? "Edit Section" : "Add Section"}
          </DialogTitle>
          <DialogDescription>
            {editingSection
              ? "Update the section content."
              : "Add a new section to your report."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Error display */}
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="section-title">Title *</Label>
            <Input
              id="section-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Site Preparation Complete"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="section-description">Description</Label>
            <Textarea
              id="section-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details, notes, or observations..."
              rows={4}
            />
          </div>

          {/* Photos */}
          <div className="space-y-2">
            <Label>Photos</Label>
            <div className="flex flex-wrap gap-2">
              {photos.map((url, idx) => (
                <div
                  key={idx}
                  className="relative w-20 h-14 rounded-md overflow-hidden bg-slate-100 group"
                >
                  <Image
                    src={url}
                    alt={`Photo ${idx + 1}`}
                    fill
                    className="object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    className="absolute top-0.5 right-0.5 size-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <XIcon className="size-3" />
                  </button>
                </div>
              ))}

              {/* Upload Button */}
              <label className="size-16 rounded-md border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 flex flex-col items-center justify-center cursor-pointer transition-colors">
                {isUploading ? (
                  <Spinner className="size-5" />
                ) : (
                  <>
                    <ImageIcon className="size-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground mt-0.5">
                      Add
                    </span>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              Max 10MB per image. JPG, PNG, GIF, WebP supported.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!title.trim() || isUploading}
          >
            {editingSection ? "Save Changes" : "Add Section"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
