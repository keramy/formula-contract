"use client";

import { memo } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ImageIcon,
  MoreHorizontalIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "lucide-react";

export interface Material {
  id: string;
  material_code: string;
  name: string;
  specification: string | null;
  supplier: string | null;
  images: string[] | null;
  status: string;
  assignedItemsCount: number;
}

interface MaterialCardProps {
  material: Material;
  onEdit?: (material: Material) => void;
  onDelete?: (materialId: string) => void;
  onApprove?: (materialId: string) => void;
  onReject?: (materialId: string) => void;
  disabled?: boolean;
}

const statusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  sent_to_client: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  sent_to_client: "Awaiting Client",
  approved: "Approved",
  rejected: "Rejected",
};

// ============================================================================
// PERFORMANCE: Wrapped with React.memo to prevent unnecessary re-renders
// Combined with useCallback handlers in parent, this ensures MaterialCard
// only re-renders when its specific props actually change
// ============================================================================
export const MaterialCard = memo(function MaterialCard({
  material,
  onEdit,
  onDelete,
  onApprove,
  onReject,
  disabled,
}: MaterialCardProps) {
  const images = material.images || [];
  const firstImage = images[0];

  return (
    <Card className="p-4">
      <div className="flex gap-4">
        {/* Image */}
        <div className="shrink-0">
          {firstImage ? (
            <div className="relative size-20 rounded-md overflow-hidden bg-muted">
              <Image
                src={firstImage}
                alt={material.name}
                fill
                className="object-cover"
              />
              {images.length > 1 && (
                <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1 rounded">
                  +{images.length - 1}
                </div>
              )}
            </div>
          ) : (
            <div className="size-20 rounded-md bg-muted flex items-center justify-center">
              <ImageIcon className="size-8 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{material.material_code}</span>
                <h4 className="font-medium truncate">{material.name}</h4>
              </div>
              {material.specification && (
                <p className="text-sm text-muted-foreground truncate">
                  {material.specification}
                </p>
              )}
              {material.supplier && (
                <p className="text-xs text-muted-foreground">
                  Supplier: {material.supplier}
                </p>
              )}
            </div>
            <Badge variant="secondary" className={statusColors[material.status]}>
              {statusLabels[material.status] || material.status}
            </Badge>
          </div>

          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-muted-foreground">
              Used in: {material.assignedItemsCount} item{material.assignedItemsCount !== 1 ? "s" : ""}
            </p>

            <div className="flex items-center gap-1">
              {/* Action buttons based on status - PM approval */}
              {(material.status === "pending" || material.status === "rejected") && onApprove && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onApprove(material.id)}
                    disabled={disabled}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    <CheckCircleIcon className="size-3 mr-1" />
                    Approve
                  </Button>
                  {material.status === "pending" && onReject && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onReject(material.id)}
                      disabled={disabled}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <XCircleIcon className="size-3 mr-1" />
                      Reject
                    </Button>
                  )}
                </>
              )}

              {/* More actions dropdown - only show if edit or delete handlers exist */}
              {(onEdit || onDelete) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" disabled={disabled}>
                      <MoreHorizontalIcon className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(material)}>
                        <PencilIcon className="size-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    {onEdit && onDelete && <DropdownMenuSeparator />}
                    {onDelete && (
                      <DropdownMenuItem
                        onClick={() => onDelete(material.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <TrashIcon className="size-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
});
