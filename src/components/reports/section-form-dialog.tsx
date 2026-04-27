"use client";

/**
 * SectionFormDialog Component
 *
 * Dialog for adding or editing report sections.
 * Includes title, description, and photo upload functionality.
 *
 * Photo capture modes:
 * 1. In-browser camera (getUserMedia) — Apple Notes-like continuous capture
 * 2. Native camera fallback (<input capture>) — if getUserMedia unavailable
 * 3. Gallery picker (<input multiple>) — multi-select from photo library
 *
 * Used in both report creation and editing modals.
 */

import { useState, useRef, useCallback } from "react";
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
import { CameraIcon, ImageIcon, XIcon, CheckCircleIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { sanitizeText, sanitizeHTML } from "@/lib/sanitize";
import { validateFile, IMAGE_CONFIG } from "@/lib/file-validation";
import { compressImage } from "@/lib/image-utils";
import { CameraViewfinder } from "./camera-viewfinder";
import type { LocalSection } from "./report-types";
import { generateLocalId } from "./report-types";
import { toast } from "sonner";

interface SectionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingSection: LocalSection | null;
  onSave: (section: LocalSection) => void;
  projectId: string;
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
  const nativeCameraRef = useRef<HTMLInputElement>(null);

  // Form state — initialized from editingSection. Parent passes `key={editingSection?.id ?? "new-section"}`.
  const [title, setTitle] = useState(() => editingSection?.title ?? "");
  const [description, setDescription] = useState(() => editingSection?.description ?? "");
  const [photos, setPhotos] = useState<string[]>(() =>
    editingSection ? [...editingSection.photos] : []
  );

  // Loading/error state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Camera mode: "off" | "viewfinder" (getUserMedia) | "native" (input capture fallback)
  const [cameraMode, setCameraMode] = useState<"off" | "viewfinder" | "native">(
    "off"
  );
  const photosBeforeCameraRef = useRef(0);
  const [cameraCaptureCount, setCameraCaptureCount] = useState(0);

  // -------------------------------------------------------------------
  // Shared upload helper
  // -------------------------------------------------------------------
  const uploadSingleFile = useCallback(
    async (file: File): Promise<string | null> => {
      const validation = validateFile(file, IMAGE_CONFIG);
      if (!validation.valid) {
        throw new Error(`${file.name}: ${validation.error || "Invalid file"}`);
      }

      const compressedFile = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.8,
      });

      const uploadPath = reportId
        ? `${projectId}/${reportId}`
        : `${projectId}/temp`;

      const fileExt =
        compressedFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${uploadPath}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

      const supabase = createClient();
      const { data, error: uploadError } = await supabase.storage
        .from("reports")
        .upload(fileName, compressedFile);

      if (uploadError) {
        throw new Error(`${file.name}: ${uploadError.message}`);
      }

      if (data) {
        const {
          data: { publicUrl },
        } = supabase.storage.from("reports").getPublicUrl(data.path);
        return publicUrl;
      }

      return null;
    },
    [projectId, reportId]
  );

  // -------------------------------------------------------------------
  // Gallery upload — multiple files at once
  // -------------------------------------------------------------------
  const handleGalleryUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError(null);
    setUploadProgress({ done: 0, total: files.length });

    const newPhotos: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      try {
        const url = await uploadSingleFile(files[i]);
        if (url) newPhotos.push(url);
      } catch (err) {
        errors.push(err instanceof Error ? err.message : "Upload failed");
      }
      setUploadProgress({ done: i + 1, total: files.length });
    }

    if (errors.length > 0) setError(errors.join(". "));
    if (newPhotos.length > 0) setPhotos((prev) => [...prev, ...newPhotos]);

    setIsUploading(false);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // -------------------------------------------------------------------
  // In-browser camera capture (from CameraViewfinder)
  // -------------------------------------------------------------------
  const handleViewfinderCapture = useCallback(
    async (file: File) => {
      try {
        const url = await uploadSingleFile(file);
        if (url) {
          setPhotos((prev) => [...prev, url]);
          setCameraCaptureCount((c) => c + 1);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      }
    },
    [uploadSingleFile]
  );

  const handleViewfinderClose = useCallback(() => {
    setCameraMode("off");
  }, []);

  const handleViewfinderError = useCallback((message: string) => {
    // getUserMedia failed — fall back to native camera input
    toast.info(message);
    setCameraMode("native");
    // Open native camera after a tick
    setTimeout(() => {
      if (nativeCameraRef.current) {
        nativeCameraRef.current.click();
      }
    }, 200);
  }, []);

  // -------------------------------------------------------------------
  // Native camera fallback (auto-reopen after each capture)
  // -------------------------------------------------------------------
  const handleNativeCameraCapture = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      // User cancelled — exit camera mode
      setCameraMode("off");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const url = await uploadSingleFile(files[0]);
      if (url) {
        setPhotos((prev) => [...prev, url]);
        setCameraCaptureCount((c) => c + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }

    setIsUploading(false);
    if (nativeCameraRef.current) nativeCameraRef.current.value = "";

    // Auto-reopen native camera
    if (cameraMode === "native") {
      setTimeout(() => {
        if (nativeCameraRef.current) {
          nativeCameraRef.current.click();
        }
      }, 300);
    }
  };

  // -------------------------------------------------------------------
  // Start camera — try viewfinder first, fallback to native
  // -------------------------------------------------------------------
  const startCamera = () => {
    photosBeforeCameraRef.current = photos.length;
    setCameraCaptureCount(0);

    // Try getUserMedia first (in-browser viewfinder)
    if (typeof navigator.mediaDevices?.getUserMedia === "function") {
      setCameraMode("viewfinder");
    } else {
      // Fallback to native camera input
      setCameraMode("native");
      setTimeout(() => {
        if (nativeCameraRef.current) {
          nativeCameraRef.current.click();
        }
      }, 100);
    }
  };

  const stopCamera = () => {
    setCameraMode("off");
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // -------------------------------------------------------------------
  // Save section
  // -------------------------------------------------------------------
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

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------

  // When viewfinder is active, the dialog shows ONLY the camera
  if (cameraMode === "viewfinder") {
    return (
      <Dialog
        open={open}
        onOpenChange={(newOpen) => {
          if (!newOpen) setCameraMode("off");
          onOpenChange(newOpen);
        }}
      >
        <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:rounded-none">
          <CameraViewfinder
            onCapture={handleViewfinderCapture}
            onClose={handleViewfinderClose}
            onError={handleViewfinderError}
            capturedCount={cameraCaptureCount}
          />
        </DialogContent>
      </Dialog>
    );
  }

  // Normal form view (with optional native camera mode banner)
  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) {
          setCameraMode("off");
          setError(null);
        }
        onOpenChange(newOpen);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
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
              rows={5}
            />
          </div>

          {/* Photos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Photos</Label>
              <span className="text-xs text-muted-foreground">
                {photos.length} {photos.length === 1 ? "photo" : "photos"}
              </span>
            </div>

            {/* Photo thumbnails */}
            {photos.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {photos.map((url, idx) => (
                  <div
                    key={`${url}-${idx}`}
                    className="relative w-28 h-20 rounded-lg overflow-hidden bg-slate-100 group border"
                  >
                    <Image
                      src={url}
                      alt={`Photo ${idx + 1}`}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-1 right-1 size-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 max-sm:opacity-100 transition-opacity shadow-sm"
                    >
                      <XIcon className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Native camera mode banner (fallback) */}
            {cameraMode === "native" && (
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-2 min-w-0">
                  <CameraIcon className="size-4 text-primary shrink-0" />
                  <span className="text-sm font-medium text-primary truncate">
                    {isUploading
                      ? "Uploading photo..."
                      : cameraCaptureCount > 0
                      ? `${cameraCaptureCount} photo${cameraCaptureCount !== 1 ? "s" : ""} taken`
                      : "Camera ready"}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={stopCamera}
                  className="shrink-0 h-8 gap-1.5"
                >
                  <CheckCircleIcon className="size-3.5" />
                  Done
                </Button>
              </div>
            )}

            {/* Upload progress */}
            {uploadProgress && uploadProgress.total > 1 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner className="size-4" />
                <span>
                  Uploading {uploadProgress.done} of {uploadProgress.total}...
                </span>
              </div>
            )}

            {/* Action buttons — hidden when in native camera mode */}
            {cameraMode === "off" && (
              <div className="flex flex-wrap gap-2">
                {/* Take Photos — opens in-browser camera or native fallback */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={startCamera}
                  disabled={isUploading}
                  className="h-9 gap-2"
                >
                  {isUploading ? (
                    <Spinner className="size-4" />
                  ) : (
                    <CameraIcon className="size-4" />
                  )}
                  Take Photos
                </Button>

                {/* Choose from Gallery — opens file picker */}
                <label className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors">
                  <ImageIcon className="size-4" />
                  Choose from Gallery
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleGalleryUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
              </div>
            )}

            {/* Hidden native camera input (fallback for getUserMedia failure) */}
            <input
              ref={nativeCameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleNativeCameraCapture}
              className="hidden"
              disabled={isUploading}
            />

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
