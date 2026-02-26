"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GradientIcon } from "@/components/ui/ui-helpers";
import { PlusIcon, XIcon, PackageIcon } from "lucide-react";
import { createMaterial, updateMaterial } from "@/lib/actions/materials";
import { toast } from "sonner";

interface ScopeItem {
  id: string;
  item_code: string;
  name: string;
}

interface MaterialFormDialogProps {
  projectId: string;
  scopeItems: ScopeItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editMaterial?: {
    id: string;
    material_code: string;
    name: string;
    specification: string | null;
    supplier: string | null;
    images: string[] | null;
    assignedItemIds: string[];
  } | null;
}

export function MaterialFormDialog({
  projectId,
  scopeItems,
  open,
  onOpenChange,
  editMaterial,
}: MaterialFormDialogProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const [materialCode, setMaterialCode] = useState(editMaterial?.material_code || "");
  const [name, setName] = useState(editMaterial?.name || "");
  const [specification, setSpecification] = useState(editMaterial?.specification || "");
  const [supplier, setSupplier] = useState(editMaterial?.supplier || "");
  const [images, setImages] = useState<string[]>(editMaterial?.images || []);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
    new Set(editMaterial?.assignedItemIds || [])
  );
  const [uploadingImages, setUploadingImages] = useState(false);

  const isEditing = !!editMaterial;

  const resetForm = () => {
    setMaterialCode("");
    setName("");
    setSpecification("");
    setSupplier("");
    setImages([]);
    setSelectedItemIds(new Set());
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(resetForm, 200);
  };

  // Image upload still uses client-side Supabase storage (required for file picker)
  // But the metadata is saved through server actions
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    const supabase = createClient();
    const newImages: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${projectId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("materials")
          .upload(fileName, file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from("materials")
          .getPublicUrl(fileName);

        if (urlData?.publicUrl) {
          newImages.push(urlData.publicUrl);
        }
      }

      setImages([...images, ...newImages]);
    } catch (error) {
      console.error("Failed to upload images:", error);
      toast.error("Failed to upload images");
    } finally {
      setUploadingImages(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const toggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItemIds);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItemIds(newSelected);
  };

  const handleSubmit = async () => {
    if (!materialCode.trim() || !name.trim()) return;

    startTransition(async () => {
      const input = {
        material_code: materialCode.trim(),
        name: name.trim(),
        specification: specification.trim() || null,
        supplier: supplier.trim() || null,
        images: images.length > 0 ? images : null,
      };

      const assignedItems = Array.from(selectedItemIds);

      let result;
      if (isEditing && editMaterial) {
        result = await updateMaterial(editMaterial.id, projectId, input, assignedItems);
      } else {
        result = await createMaterial(projectId, input, assignedItems);
      }

      if (result.success) {
        handleClose();
        router.refresh();
        toast.success(isEditing ? "Material updated" : "Material created");
      } else {
        toast.error(result.error || "Failed to save material");
      }
    });
  };

  // Sync form when editMaterial changes or dialog opens
  useEffect(() => {
    if (open) {
      if (editMaterial) {
        setMaterialCode(editMaterial.material_code);
        setName(editMaterial.name);
        setSpecification(editMaterial.specification || "");
        setSupplier(editMaterial.supplier || "");
        setImages(editMaterial.images || []);
        setSelectedItemIds(new Set(editMaterial.assignedItemIds));
      } else {
        resetForm();
      }
    }
  }, [open, editMaterial]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <GradientIcon icon={<PackageIcon className="size-4" />} color="amber" size="sm" />
            <DialogTitle>{isEditing ? "Edit Material" : "Add Material"}</DialogTitle>
          </div>
          <DialogDescription>
            {isEditing
              ? "Update material details and assignments"
              : "Add a new material to this project"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4 py-2">
            {/* Material Code */}
            <div className="space-y-2">
              <Label htmlFor="material_code">Material Code *</Label>
              <Input
                id="material_code"
                placeholder="e.g., MAT-001"
                value={materialCode}
                onChange={(e) => setMaterialCode(e.target.value)}
                className="font-mono"
              />
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Oak Wood - Natural Finish"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Specification */}
            <div className="space-y-2">
              <Label htmlFor="specification">Specification</Label>
              <Textarea
                id="specification"
                placeholder="e.g., Grade A, 20mm thickness"
                value={specification}
                onChange={(e) => setSpecification(e.target.value)}
                rows={2}
              />
            </div>

            {/* Supplier */}
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                placeholder="e.g., ABC Wood Co."
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
              />
            </div>

            {/* Images */}
            <div className="space-y-2">
              <Label>Images</Label>
              <div className="flex flex-wrap gap-2">
                {images.map((url, index) => (
                  <div key={url} className="relative size-16 rounded-md overflow-hidden group">
                    <Image
                      src={url}
                      alt={`Material image ${index + 1}`}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
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
                  className="size-16 rounded-md border-2 border-dashed flex items-center justify-center hover:bg-muted transition-colors"
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
            </div>

            {/* Assign to Items */}
            {scopeItems.length > 0 && (
              <div className="space-y-2">
                <Label>Assign to Items</Label>
                <div className="border rounded-md p-2 space-y-1 max-h-[150px] overflow-y-auto">
                  {scopeItems.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-2 p-1 hover:bg-muted rounded cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedItemIds.has(item.id)}
                        onCheckedChange={() => toggleItem(item.id)}
                      />
                      <span className="font-mono text-xs text-muted-foreground">
                        {item.item_code}
                      </span>
                      <span className="text-sm truncate">{item.name}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedItemIds.size} item{selectedItemIds.size !== 1 ? "s" : ""} selected
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !materialCode.trim() || !name.trim()}
          >
            {isPending && <Spinner className="size-4 mr-2" />}
            {isEditing ? "Save Changes" : "Add Material"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
