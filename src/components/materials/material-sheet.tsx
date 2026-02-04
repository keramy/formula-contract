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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GradientIcon } from "@/components/ui/ui-helpers";
import { PlusIcon, XIcon, PackageIcon, SaveIcon, ImageIcon, ChevronsUpDownIcon, CheckIcon, SearchIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { createMaterial, updateMaterial } from "@/lib/actions/materials";
import { toast } from "sonner";

interface ScopeItem {
  id: string;
  item_code: string;
  name: string;
}

interface MaterialSheetProps {
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

export function MaterialSheet({
  projectId,
  scopeItems,
  open,
  onOpenChange,
  editMaterial,
}: MaterialSheetProps) {
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
  const [scopeItemsOpen, setScopeItemsOpen] = useState(false);
  const [scopeItemsSearch, setScopeItemsSearch] = useState("");

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
    setTimeout(resetForm, 300);
  };

  // Image upload using client-side Supabase storage
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
      if (newImages.length > 0) {
        toast.success(`${newImages.length} image${newImages.length > 1 ? "s" : ""} uploaded`);
      }
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
    if (!materialCode.trim() || !name.trim()) {
      toast.error("Please fill in required fields");
      return;
    }

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

  // Sync form when editMaterial changes or sheet opens
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
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b bg-base-50">
          <div className="flex items-center gap-3">
            <GradientIcon icon={<PackageIcon className="size-5" />} color="amber" size="sm" />
            <div>
              <SheetTitle className="text-lg">
                {isEditing ? "Edit Material" : "Add Material"}
              </SheetTitle>
              <SheetDescription>
                {isEditing
                  ? "Update material details and assignments"
                  : "Add a new material to this project"}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-5 py-6">
            {/* Material Code & Name - Side by side on larger screens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="material_code" className="text-sm font-medium">
                  Material Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="material_code"
                  placeholder="e.g., MAT-001"
                  value={materialCode}
                  onChange={(e) => setMaterialCode(e.target.value)}
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Oak Wood"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            {/* Specification */}
            <div className="space-y-2">
              <Label htmlFor="specification" className="text-sm font-medium">
                Specification
              </Label>
              <Textarea
                id="specification"
                placeholder="e.g., Grade A, 20mm thickness, natural finish"
                value={specification}
                onChange={(e) => setSpecification(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Supplier */}
            <div className="space-y-2">
              <Label htmlFor="supplier" className="text-sm font-medium">
                Supplier
              </Label>
              <Input
                id="supplier"
                placeholder="e.g., ABC Wood Co."
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
              />
            </div>

            {/* Images */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <ImageIcon className="size-4" />
                Images
              </Label>
              <div className="flex flex-wrap gap-3">
                {images.map((url, index) => (
                  <div
                    key={url}
                    className="relative size-20 rounded-lg overflow-hidden group border shadow-sm"
                  >
                    <Image
                      src={url}
                      alt={`Material image ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <XIcon className="size-5 text-white" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImages}
                  className="size-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center hover:bg-muted/50 transition-colors gap-1"
                >
                  {uploadingImages ? (
                    <Spinner className="size-5" />
                  ) : (
                    <>
                      <PlusIcon className="size-5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Add</span>
                    </>
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

            {/* Assign to Items - Modal Multi-Select */}
            {scopeItems.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Assign to Scope Items</Label>
                  {selectedItemIds.size > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedItemIds(new Set())}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* Trigger Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setScopeItemsOpen(true)}
                  className="w-full justify-between h-auto min-h-10 py-2"
                >
                  <span className={selectedItemIds.size === 0 ? "text-muted-foreground" : ""}>
                    {selectedItemIds.size === 0
                      ? "Click to select items..."
                      : `${selectedItemIds.size} item${selectedItemIds.size > 1 ? "s" : ""} selected`}
                  </span>
                  <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>

                {/* Selection Modal */}
                <Dialog
                  open={scopeItemsOpen}
                  onOpenChange={(open) => {
                    setScopeItemsOpen(open);
                    if (!open) setScopeItemsSearch("");
                  }}
                >
                  <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col p-0">
                    <DialogHeader className="px-4 pt-4 pb-2">
                      <DialogTitle className="flex items-center gap-2">
                        <PackageIcon className="size-5 text-amber-500" />
                        Select Scope Items
                      </DialogTitle>
                    </DialogHeader>

                    <Command shouldFilter={false} className="flex-1 overflow-hidden">
                      {/* Search Input */}
                      <div className="flex items-center gap-2 border-y px-4 h-12 bg-muted/30">
                        <SearchIcon className="size-4 shrink-0 opacity-50" />
                        <input
                          value={scopeItemsSearch}
                          onChange={(e) => setScopeItemsSearch(e.target.value)}
                          placeholder="Search by code or name..."
                          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                          autoFocus
                        />
                        {scopeItemsSearch && (
                          <button
                            type="button"
                            onClick={() => setScopeItemsSearch("")}
                            className="p-1 rounded hover:bg-muted"
                          >
                            <XIcon className="size-4 text-muted-foreground" />
                          </button>
                        )}
                      </div>

                      {/* Items List */}
                      <CommandList className="flex-1 max-h-[400px] overflow-y-auto p-2">
                        <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                          No items found.
                        </CommandEmpty>
                        <CommandGroup>
                          {scopeItems
                            .filter((item) => {
                              if (!scopeItemsSearch) return true;
                              const search = scopeItemsSearch.toLowerCase();
                              return (
                                item.item_code.toLowerCase().includes(search) ||
                                item.name.toLowerCase().includes(search)
                              );
                            })
                            .map((item) => {
                              const isSelected = selectedItemIds.has(item.id);
                              return (
                                <CommandItem
                                  key={item.id}
                                  value={`${item.item_code} ${item.name}`}
                                  onSelect={() => toggleItem(item.id)}
                                  className="cursor-pointer py-3 px-3 rounded-lg mb-1"
                                >
                                  <div className={`mr-3 flex size-5 items-center justify-center rounded border-2 transition-colors ${isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                                    {isSelected && <CheckIcon className="size-3.5 text-primary-foreground" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                                        {item.item_code}
                                      </span>
                                      {isSelected && (
                                        <Badge variant="secondary" className="text-xs px-1.5 py-0 bg-primary/10 text-primary">
                                          Selected
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm mt-1">{item.name}</p>
                                  </div>
                                </CommandItem>
                              );
                            })}
                        </CommandGroup>
                      </CommandList>
                    </Command>

                    <DialogFooter className="px-4 py-3 border-t bg-muted/30">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-sm text-muted-foreground">
                          {selectedItemIds.size} item{selectedItemIds.size !== 1 ? "s" : ""} selected
                        </span>
                        <Button onClick={() => setScopeItemsOpen(false)}>
                          Done
                        </Button>
                      </div>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Selected Items as Badges */}
                {selectedItemIds.size > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {Array.from(selectedItemIds).map((id) => {
                      const item = scopeItems.find((i) => i.id === id);
                      if (!item) return null;
                      return (
                        <Badge
                          key={id}
                          variant="secondary"
                          className="pl-2 pr-1 py-1 gap-1 text-xs"
                        >
                          <span className="font-mono text-muted-foreground">{item.item_code}</span>
                          <span className="mx-1">-</span>
                          <span className="max-w-[120px] truncate">{item.name}</span>
                          <button
                            type="button"
                            onClick={() => toggleItem(id)}
                            className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                          >
                            <XIcon className="size-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        <SheetFooter className="px-6 py-4 border-t bg-muted/30">
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isPending}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending || !materialCode.trim() || !name.trim()}
              className="flex-1"
            >
              {isPending ? (
                <Spinner className="size-4 mr-2" />
              ) : (
                <SaveIcon className="size-4 mr-2" />
              )}
              {isEditing ? "Save Changes" : "Add Material"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
