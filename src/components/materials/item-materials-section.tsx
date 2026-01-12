"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  PackageIcon,
  PlusIcon,
  ImageIcon,
  XIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from "lucide-react";

interface Material {
  id: string;
  material_code: string;
  name: string;
  specification: string | null;
  supplier: string | null;
  images: string[] | null;
  status: string;
}

interface ItemMaterialsSectionProps {
  scopeItemId: string;
  assignedMaterials: Material[];
  availableMaterials: Material[];
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <ClockIcon className="size-3" />,
  approved: <CheckCircleIcon className="size-3" />,
  rejected: <XCircleIcon className="size-3" />,
};

export function ItemMaterialsSection({
  scopeItemId,
  assignedMaterials,
  availableMaterials,
}: ItemMaterialsSectionProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(assignedMaterials.map((m) => m.id))
  );

  const handleOpenDialog = () => {
    setSelectedIds(new Set(assignedMaterials.map((m) => m.id)));
    setDialogOpen(true);
  };

  const toggleMaterial = (materialId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(materialId)) {
      newSelected.delete(materialId);
    } else {
      newSelected.add(materialId);
    }
    setSelectedIds(newSelected);
  };

  const handleSave = async () => {
    setIsLoading(true);
    const supabase = createClient();

    try {
      // Get current assignments
      const currentIds = new Set(assignedMaterials.map((m) => m.id));

      // Find materials to add and remove
      const toAdd = Array.from(selectedIds).filter((id) => !currentIds.has(id));
      const toRemove = Array.from(currentIds).filter((id) => !selectedIds.has(id));

      // Remove assignments
      if (toRemove.length > 0) {
        await supabase
          .from("item_materials")
          .delete()
          .eq("item_id", scopeItemId)
          .in("material_id", toRemove);
      }

      // Add new assignments
      if (toAdd.length > 0) {
        const newAssignments = toAdd.map((materialId) => ({
          item_id: scopeItemId,
          material_id: materialId,
        }));
        await supabase.from("item_materials").insert(newAssignments);
      }

      setDialogOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to update material assignments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMaterial = async (materialId: string) => {
    setIsLoading(true);
    const supabase = createClient();

    try {
      await supabase
        .from("item_materials")
        .delete()
        .eq("item_id", scopeItemId)
        .eq("material_id", materialId);

      router.refresh();
    } catch (error) {
      console.error("Failed to remove material:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // All materials that could be assigned (both assigned and available)
  const allMaterials = [...availableMaterials, ...assignedMaterials.filter(
    (m) => !availableMaterials.some((am) => am.id === m.id)
  )];

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackageIcon className="size-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Materials</CardTitle>
            {assignedMaterials.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {assignedMaterials.length}
              </Badge>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={handleOpenDialog} disabled={isLoading}>
            <PlusIcon className="size-3" />
            {assignedMaterials.length > 0 ? "Manage" : "Assign"}
          </Button>
        </div>
        <CardDescription className="text-xs">
          Materials used for this item
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        {assignedMaterials.length > 0 ? (
          <div className="space-y-2">
            {assignedMaterials.map((material) => (
              <div
                key={material.id}
                className="flex items-center gap-3 p-2 rounded-md border bg-muted/30"
              >
                {/* Image */}
                {material.images && material.images[0] ? (
                  <div className="relative size-10 rounded overflow-hidden shrink-0">
                    <Image
                      src={material.images[0]}
                      alt={material.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="size-10 rounded bg-muted flex items-center justify-center shrink-0">
                    <ImageIcon className="size-4 text-muted-foreground" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{material.material_code}</span>
                    <p className="text-sm font-medium truncate">{material.name}</p>
                  </div>
                  {material.supplier && (
                    <p className="text-xs text-muted-foreground truncate">
                      {material.supplier}
                    </p>
                  )}
                </div>

                {/* Status */}
                <Badge variant="secondary" className={`text-xs ${statusColors[material.status]}`}>
                  <span className="mr-1">{statusIcons[material.status]}</span>
                  {material.status}
                </Badge>

                {/* Remove */}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleRemoveMaterial(material.id)}
                  disabled={isLoading}
                  className="shrink-0"
                >
                  <XIcon className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-2">
            No materials assigned to this item yet.
          </p>
        )}
      </CardContent>

      {/* Assignment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Materials</DialogTitle>
            <DialogDescription>
              Select which materials are used for this item
            </DialogDescription>
          </DialogHeader>

          {allMaterials.length > 0 ? (
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-1 pr-4">
                {allMaterials.map((material) => (
                  <label
                    key={material.id}
                    className="flex items-center gap-3 p-2 hover:bg-muted rounded cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedIds.has(material.id)}
                      onCheckedChange={() => toggleMaterial(material.id)}
                    />

                    {/* Image */}
                    {material.images && material.images[0] ? (
                      <div className="relative size-8 rounded overflow-hidden shrink-0">
                        <Image
                          src={material.images[0]}
                          alt={material.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="size-8 rounded bg-muted flex items-center justify-center shrink-0">
                        <ImageIcon className="size-3 text-muted-foreground" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{material.material_code}</span>
                        <p className="text-sm font-medium truncate">{material.name}</p>
                      </div>
                      {material.specification && (
                        <p className="text-xs text-muted-foreground truncate">
                          {material.specification}
                        </p>
                      )}
                    </div>

                    <Badge variant="secondary" className={`text-xs ${statusColors[material.status]}`}>
                      {material.status}
                    </Badge>
                  </label>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No materials available in this project. Add materials from the Materials tab first.
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading || allMaterials.length === 0}>
              {isLoading && <Spinner className="size-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
