"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

interface Milestone {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  due_date: string;
  is_completed: boolean;
  alert_days_before: number | null;
}

interface MilestoneFormDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem: Milestone | null;
}

export function MilestoneFormDialog({
  projectId,
  open,
  onOpenChange,
  editItem,
}: MilestoneFormDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [alertDays, setAlertDays] = useState("7");

  const isEditing = !!editItem;

  // Sync form with editItem
  useEffect(() => {
    if (open) {
      if (editItem) {
        setName(editItem.name);
        setDescription(editItem.description || "");
        setDueDate(format(new Date(editItem.due_date), "yyyy-MM-dd"));
        setAlertDays(String(editItem.alert_days_before || 7));
      } else {
        setName("");
        setDescription("");
        setDueDate("");
        setAlertDays("7");
      }
    }
  }, [open, editItem]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !dueDate) return;

    setIsLoading(true);
    const supabase = createClient();

    try {
      const data = {
        project_id: projectId,
        name: name.trim(),
        description: description.trim() || null,
        due_date: dueDate,
        alert_days_before: parseInt(alertDays) || 7,
      };

      if (isEditing && editItem) {
        const { error } = await supabase
          .from("milestones")
          .update(data)
          .eq("id", editItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("milestones")
          .insert(data);

        if (error) throw error;
      }

      handleClose();
      router.refresh();
    } catch (error) {
      console.error("Failed to save milestone:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Milestone" : "Add Milestone"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the milestone details"
              : "Add a new milestone to track project progress"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Design Approval"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Additional details about this milestone..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="due_date">Due Date *</Label>
            <Input
              id="due_date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Alert Days */}
          <div className="space-y-2">
            <Label htmlFor="alert_days">Alert Before</Label>
            <Select value={alertDays} onValueChange={setAlertDays}>
              <SelectTrigger>
                <SelectValue placeholder="Select alert timing" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 days before</SelectItem>
                <SelectItem value="7">7 days before</SelectItem>
                <SelectItem value="14">14 days before</SelectItem>
                <SelectItem value="30">30 days before</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Milestone will show as "Due Soon" within this period
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !name.trim() || !dueDate}>
            {isLoading && <Spinner className="size-4 mr-2" />}
            {isEditing ? "Save Changes" : "Add Milestone"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
