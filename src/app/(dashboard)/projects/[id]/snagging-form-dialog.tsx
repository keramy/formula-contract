"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusIcon, XIcon } from "lucide-react";

interface ScopeItem {
  id: string;
  item_code: string;
  name: string;
}

interface Snagging {
  id: string;
  project_id: string;
  item_id: string | null;
  description: string;
  photos: string[] | null;
  is_resolved: boolean;
  resolution_notes: string | null;
}

interface SnaggingFormDialogProps {
  projectId: string;
  scopeItems: ScopeItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem: Snagging | null;
}

export function SnaggingFormDialog({
  projectId,
  scopeItems,
  open,
  onOpenChange,
  editItem,
}: SnaggingFormDialogProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Form state
  const [description, setDescription] = useState("");
  const [itemId, setItemId] = useState<string>("none");
  const [photos, setPhotos] = useState<string[]>([]);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const isEditing = !!editItem;

  // Sync form with editItem
  useEffect(() => {
    if (open) {
      if (editItem) {
        setDescription(editItem.description);
        setItemId(editItem.item_id || "none");
        setPhotos(editItem.photos || []);
        setResolutionNotes(editItem.resolution_notes || "");
      } else {
        setDescription("");
        setItemId("none");
        setPhotos([]);
        setResolutionNotes("");
      }
    }
  }, [open, editItem]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    const supabase = createClient();
    const newPhotos: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${projectId}/snagging/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("snagging")
          .upload(fileName, file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from("snagging")
          .getPublicUrl(fileName);

        if (urlData?.publicUrl) {
          newPhotos.push(urlData.publicUrl);
        }
      }

      setPhotos([...photos, ...newPhotos]);
    } catch (error) {
      console.error("Failed to upload images:", error);
    } finally {
      setUploadingImages(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!description.trim()) return;

    setIsLoading(true);
    const supabase = createClient();

    try {
      const data = {
        project_id: projectId,
        item_id: itemId !== "none" ? itemId : null,
        description: description.trim(),
        photos: photos.length > 0 ? photos : null,
        resolution_notes: resolutionNotes.trim() || null,
      };

      if (isEditing && editItem) {
        const { error } = await supabase
          .from("snagging")
          .update(data)
          .eq("id", editItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("snagging")
          .insert(data);

        if (error) throw error;
      }

      handleClose();
      router.refresh();
    } catch (error) {
      console.error("Failed to save snagging item:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Issue" : "Report Issue"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the details of this snagging item"
              : "Report a quality issue or defect"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe the issue in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Related Item */}
          <div className="space-y-2">
            <Label htmlFor="item">Related Scope Item</Label>
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger>
                <SelectValue placeholder="Select related item (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific item</SelectItem>
                {scopeItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    <span className="font-mono text-xs mr-2">{item.item_code}</span>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Photos */}
          <div className="space-y-2">
            <Label>Photos</Label>
            <div className="flex flex-wrap gap-2">
              {photos.map((url, index) => (
                <div key={url} className="relative size-20 rounded-md overflow-hidden group">
                  <Image
                    src={url}
                    alt={`Photo ${index + 1}`}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <XIcon className="size-4 text-white" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImages}
                className="size-20 rounded-md border-2 border-dashed flex items-center justify-center hover:bg-muted transition-colors"
              >
                {uploadingImages ? (
                  <Spinner className="size-4" />
                ) : (
                  <PlusIcon className="size-5 text-muted-foreground" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Add photos to document the issue
            </p>
          </div>

          {/* Resolution Notes (for editing resolved items) */}
          {isEditing && editItem?.is_resolved && (
            <div className="space-y-2">
              <Label htmlFor="resolution">Resolution Notes</Label>
              <Textarea
                id="resolution"
                placeholder="How was this issue resolved?"
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={2}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !description.trim()}>
            {isLoading && <Spinner className="size-4 mr-2" />}
            {isEditing ? "Save Changes" : "Report Issue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
