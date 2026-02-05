"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type GanttItem,
  type GanttDependency,
  type DependencyType,
  DEPENDENCY_LABELS,
  DEPENDENCY_TYPES,
} from "./types";
import { ArrowRightIcon, LinkIcon, TrashIcon } from "lucide-react";

// ============================================================================
// DEPENDENCY DIALOG - Create/Edit dependency links between timeline items
// ============================================================================

export interface DependencyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // For creating new dependency
  sourceItem?: GanttItem | null;
  targetItem?: GanttItem | null;
  // For editing existing dependency
  existingDependency?: GanttDependency | null;
  // Item lookup for displaying names
  getItemName?: (id: string) => string;
  // Callbacks
  onSave: (data: { type: DependencyType; lagDays: number }) => void;
  onDelete?: () => void;
}

export function DependencyDialog({
  open,
  onOpenChange,
  sourceItem,
  targetItem,
  existingDependency,
  getItemName,
  onSave,
  onDelete,
}: DependencyDialogProps) {
  const isEditing = !!existingDependency;

  // Form state
  const [dependencyType, setDependencyType] = React.useState<DependencyType>(
    existingDependency?.type ?? DEPENDENCY_TYPES.FINISH_TO_START
  );
  const [lagDays, setLagDays] = React.useState<string>(
    existingDependency?.lagDays?.toString() ?? "0"
  );

  // Reset form when dialog opens/closes or dependency changes
  React.useEffect(() => {
    if (open) {
      setDependencyType(existingDependency?.type ?? DEPENDENCY_TYPES.FINISH_TO_START);
      setLagDays(existingDependency?.lagDays?.toString() ?? "0");
    }
  }, [open, existingDependency]);

  // Get display names
  const sourceName = sourceItem?.name ??
    (existingDependency && getItemName ? getItemName(existingDependency.sourceId) : "Source Item");
  const targetName = targetItem?.name ??
    (existingDependency && getItemName ? getItemName(existingDependency.targetId) : "Target Item");

  // Handle save
  const handleSave = () => {
    const parsedLag = parseInt(lagDays, 10);
    onSave({
      type: dependencyType,
      lagDays: isNaN(parsedLag) ? 0 : parsedLag,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-primary" />
            {isEditing ? "Edit Dependency" : "Create Dependency"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modify the dependency type and lag time between these items."
              : "Link these timeline items with a dependency relationship."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Source and Target Items */}
          <div className="flex items-center gap-3">
            <div className="flex-1 p-3 bg-base-50 rounded-lg border border-base-200">
              <div className="text-xs text-muted-foreground mb-1">Source</div>
              <div className="font-medium text-sm truncate">{sourceName}</div>
            </div>

            <ArrowRightIcon className="h-5 w-5 text-muted-foreground shrink-0" />

            <div className="flex-1 p-3 bg-base-50 rounded-lg border border-base-200">
              <div className="text-xs text-muted-foreground mb-1">Target</div>
              <div className="font-medium text-sm truncate">{targetName}</div>
            </div>
          </div>

          {/* Dependency Type */}
          <div className="space-y-2">
            <Label htmlFor="dependency-type">Dependency Type</Label>
            <Select
              value={dependencyType.toString()}
              onValueChange={(value) => setDependencyType(parseInt(value, 10) as DependencyType)}
            >
              <SelectTrigger id="dependency-type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DEPENDENCY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {dependencyType === 0 && "Target starts after source finishes (most common)"}
              {dependencyType === 1 && "Target starts when source starts"}
              {dependencyType === 2 && "Target finishes when source finishes"}
              {dependencyType === 3 && "Target finishes when source starts (rare)"}
            </p>
          </div>

          {/* Lag Days */}
          <div className="space-y-2">
            <Label htmlFor="lag-days">Lag Days</Label>
            <div className="flex items-center gap-2">
              <Input
                id="lag-days"
                type="number"
                value={lagDays}
                onChange={(e) => setLagDays(e.target.value)}
                className="w-24"
                min={-365}
                max={365}
              />
              <span className="text-sm text-muted-foreground">days</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Positive values add delay, negative values create lead time (overlap).
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {isEditing && onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={onDelete}
              className="sm:mr-auto"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Delete Link
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            {isEditing ? "Update" : "Create Link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DependencyDialog;
