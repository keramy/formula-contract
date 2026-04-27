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
// Note: Radix Select doesn't work inside Dialog (z-index portal issue).
// Using native <select> instead. See CLAUDE.md gotcha #36.
import {
  type GanttItem,
  type GanttDependency,
  type DependencyType,
  DEPENDENCY_LABELS,
} from "./gantt-types";
import { ArrowRightIcon, LinkIcon, TrashIcon } from "lucide-react";

// ============================================================================
// GANTT DEPENDENCY DIALOG — Create/edit dependency links
// ============================================================================

export interface GanttDependencyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceItem?: GanttItem | null;
  targetItem?: GanttItem | null;
  existingDependency?: GanttDependency | null;
  getItemName?: (id: string) => string;
  onSave: (data: { type: DependencyType; lagDays: number }) => void;
  onDelete?: () => void;
}

export function GanttDependencyDialog({
  open,
  onOpenChange,
  sourceItem,
  targetItem,
  existingDependency,
  getItemName,
  onSave,
  onDelete,
}: GanttDependencyDialogProps) {
  const isEditing = !!existingDependency;

  const [dependencyType, setDependencyType] = React.useState<DependencyType>(
    existingDependency?.type ?? 0
  );
  const [lagDays, setLagDays] = React.useState<string>(
    existingDependency?.lagDays?.toString() ?? "0"
  );

  const sourceName =
    sourceItem?.name ??
    (existingDependency && getItemName
      ? getItemName(existingDependency.sourceId)
      : "Source Item");
  const targetName =
    targetItem?.name ??
    (existingDependency && getItemName
      ? getItemName(existingDependency.targetId)
      : "Target Item");

  const handleSave = () => {
    const parsed = parseInt(lagDays, 10);
    onSave({
      type: dependencyType,
      lagDays: isNaN(parsed) ? 0 : parsed,
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
              ? "Modify the dependency type and lag time."
              : "Link these timeline items with a dependency."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Source → Target */}
          <div className="flex items-center gap-3">
            <div className="flex-1 p-3 bg-muted/50 rounded-lg border">
              <div className="text-xs text-muted-foreground mb-1">Source</div>
              <div className="font-medium text-sm truncate">{sourceName}</div>
            </div>
            <ArrowRightIcon className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="flex-1 p-3 bg-muted/50 rounded-lg border">
              <div className="text-xs text-muted-foreground mb-1">Target</div>
              <div className="font-medium text-sm truncate">{targetName}</div>
            </div>
          </div>

          {/* Type — native select (Radix Select broken inside Dialog, gotcha #36) */}
          <div className="space-y-2">
            <Label>Dependency Type</Label>
            <select
              value={dependencyType.toString()}
              onChange={(e) => setDependencyType(parseInt(e.target.value, 10) as DependencyType)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {Object.entries(DEPENDENCY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {dependencyType === 0 && "Target starts after source finishes"}
              {dependencyType === 1 && "Target starts when source starts"}
              {dependencyType === 2 && "Target finishes when source finishes"}
              {dependencyType === 3 && "Target finishes when source starts"}
            </p>
          </div>

          {/* Lag days */}
          <div className="space-y-2">
            <Label>Lag Days</Label>
            <div className="flex items-center gap-2">
              <Input
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
              Positive = delay, negative = lead time (overlap).
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {isEditing && onDelete && (
            <Button
              variant="destructive"
              onClick={onDelete}
              className="sm:mr-auto"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Delete Link
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {isEditing ? "Update" : "Create Link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
