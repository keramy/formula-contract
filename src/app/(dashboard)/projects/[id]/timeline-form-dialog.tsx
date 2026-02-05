"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  createTimelineItem,
  updateTimelineItem,
  type TimelineItem,
  type TimelineItemType,
} from "@/lib/actions/timelines";
import {
  LayersIcon,
  ListTodoIcon,
  LinkIcon,
  SearchIcon,
} from "lucide-react";

// ============================================================================
// Constants
// ============================================================================

const TIMELINE_COLORS = {
  phase: "#64748b", // Slate
  task: "#3b82f6", // Blue
} as const;

// ============================================================================
// Types
// ============================================================================

interface ScopeItem {
  id: string;
  item_code: string;
  name: string;
  production_percentage: number | null;
}

interface Milestone {
  id: string;
  name: string;
  due_date: string;
  is_completed: boolean;
}

interface TimelineFormDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem: TimelineItem | null;
  scopeItems: ScopeItem[];
  milestones: Milestone[];
}

// ============================================================================
// Component
// ============================================================================

export function TimelineFormDialog({
  projectId,
  open,
  onOpenChange,
  editItem,
  scopeItems,
  milestones,
}: TimelineFormDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [itemType, setItemType] = useState<TimelineItemType>("task");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [linkedScopeItemIds, setLinkedScopeItemIds] = useState<string[]>([]);
  const [linkedMilestoneIds, setLinkedMilestoneIds] = useState<string[]>([]);

  // Duration mode state
  const [useDuration, setUseDuration] = useState(false);
  const [duration, setDuration] = useState<number>(7);
  const [durationUnit, setDurationUnit] = useState<"days" | "weeks">("days");

  // Search state
  const [scopeSearch, setScopeSearch] = useState("");
  const [milestoneSearch, setMilestoneSearch] = useState("");

  // Calculate end date when duration changes
  useEffect(() => {
    if (useDuration && startDate && duration > 0) {
      const start = new Date(startDate);
      const daysToAdd = durationUnit === "weeks" ? duration * 7 : duration;
      const end = new Date(start);
      end.setDate(end.getDate() + daysToAdd - 1); // -1 because start day counts
      setEndDate(format(end, "yyyy-MM-dd"));
    }
  }, [useDuration, startDate, duration, durationUnit]);

  const isEditing = !!editItem;

  // Filter scope items by search
  const filteredScopeItems = useMemo(() => {
    if (!scopeSearch) return scopeItems;
    const search = scopeSearch.toLowerCase();
    return scopeItems.filter(
      (item) =>
        item.name.toLowerCase().includes(search) ||
        item.item_code.toLowerCase().includes(search)
    );
  }, [scopeItems, scopeSearch]);

  // Filter milestones by search
  const filteredMilestones = useMemo(() => {
    if (!milestoneSearch) return milestones;
    const search = milestoneSearch.toLowerCase();
    return milestones.filter((m) => m.name.toLowerCase().includes(search));
  }, [milestones, milestoneSearch]);

  // Sync form with editItem
  useEffect(() => {
    if (open) {
      if (editItem) {
        setName(editItem.name);
        setDescription(editItem.description || "");
        setItemType(editItem.item_type);
        setStartDate(format(new Date(editItem.start_date), "yyyy-MM-dd"));
        setEndDate(format(new Date(editItem.end_date), "yyyy-MM-dd"));
        setLinkedScopeItemIds(
          editItem.linked_scope_items?.map((l) => l.scope_item_id) || []
        );
        setLinkedMilestoneIds(
          editItem.linked_milestones?.map((l) => l.milestone_id) || []
        );
        setUseDuration(false); // Edit mode uses direct dates
      } else {
        // Reset form for new item
        setName("");
        setDescription("");
        setItemType("task");
        setStartDate("");
        setEndDate("");
        setLinkedScopeItemIds([]);
        setLinkedMilestoneIds([]);
        setUseDuration(false);
        setDuration(7);
        setDurationUnit("days");
      }
      setScopeSearch("");
      setMilestoneSearch("");
    }
  }, [open, editItem]);

  // Auto-set end date when start date changes (for new items)
  useEffect(() => {
    if (!isEditing && startDate && !endDate) {
      setEndDate(startDate);
    }
  }, [startDate, endDate, isEditing]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const toggleScopeItem = (id: string) => {
    setLinkedScopeItemIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleMilestone = (id: string) => {
    setLinkedMilestoneIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim() || !startDate || !endDate) return;

    // Validate date range
    if (new Date(endDate) < new Date(startDate)) {
      toast.error("End date must be on or after start date");
      return;
    }

    setIsLoading(true);

    try {
      const data = {
        project_id: projectId,
        name: name.trim(),
        description: description.trim() || null,
        item_type: itemType,
        start_date: startDate,
        end_date: endDate,
        linked_scope_item_ids: linkedScopeItemIds,
        linked_milestone_ids: linkedMilestoneIds,
      };

      let result;
      if (isEditing && editItem) {
        result = await updateTimelineItem(editItem.id, data);
      } else {
        result = await createTimelineItem(data);
      }

      if (!result.success) {
        toast.error(result.error || "Failed to save timeline item");
        return;
      }

      toast.success(isEditing ? "Timeline item updated" : "Timeline item created");
      handleClose();
      router.refresh();
    } catch (error) {
      console.error("Failed to save timeline item:", error);
      toast.error("Failed to save timeline item");
    } finally {
      setIsLoading(false);
    }
  };

  // Get type color preview
  const typeColor = TIMELINE_COLORS[itemType];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Timeline Item" : "Add Timeline Item"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the timeline item details and linked items"
              : "Create a new phase or task for your project timeline"}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="links" className="gap-1.5">
              <LinkIcon className="size-3.5" />
              Links
              {(linkedScopeItemIds.length > 0 || linkedMilestoneIds.length > 0) && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {linkedScopeItemIds.length + linkedMilestoneIds.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4 mt-4">
            {/* Type Selection */}
            <div className="space-y-2">
              <Label>Type *</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={itemType === "phase" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setItemType("phase")}
                >
                  <LayersIcon className="size-4 mr-2" />
                  Phase
                </Button>
                <Button
                  type="button"
                  variant={itemType === "task" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setItemType("task")}
                >
                  <ListTodoIcon className="size-4 mr-2" />
                  Task
                </Button>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div
                  className="size-3 rounded"
                  style={{ backgroundColor: typeColor }}
                />
                <span>
                  {itemType === "phase"
                    ? "Phases are broader time periods (e.g., Design Phase)"
                    : "Tasks are specific activities (e.g., Order materials)"}
                </span>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder={
                  itemType === "phase"
                    ? "e.g., Production Phase"
                    : "e.g., Factory inspection"
                }
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Additional details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            {/* Date Range */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="end_date">
                      {useDuration ? "Duration *" : "End Date *"}
                    </Label>
                    <button
                      type="button"
                      onClick={() => setUseDuration(!useDuration)}
                      className="text-xs text-primary hover:underline"
                    >
                      {useDuration ? "Use end date" : "Use duration"}
                    </button>
                  </div>
                  {useDuration ? (
                    <div className="flex gap-2">
                      <Input
                        id="duration"
                        type="number"
                        min={1}
                        value={duration}
                        onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
                        className="w-20"
                      />
                      <Select
                        value={durationUnit}
                        onValueChange={(v) => setDurationUnit(v as "days" | "weeks")}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="days">Days</SelectItem>
                          <SelectItem value="weeks">Weeks</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <Input
                      id="end_date"
                      type="date"
                      value={endDate}
                      min={startDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  )}
                </div>
              </div>
              {/* Show calculated end date when using duration */}
              {useDuration && endDate && (
                <p className="text-xs text-muted-foreground">
                  End date: {format(new Date(endDate), "MMM d, yyyy")}
                </p>
              )}
            </div>
          </TabsContent>

          {/* Links Tab */}
          <TabsContent value="links" className="space-y-4 mt-4">
            {/* Scope Items Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Linked Scope Items</Label>
                <span className="text-xs text-muted-foreground">
                  {linkedScopeItemIds.length} selected
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Progress will be calculated from linked items' production percentage
              </p>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search scope items..."
                  value={scopeSearch}
                  onChange={(e) => setScopeSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <ScrollArea className="h-32 rounded-md border p-2">
                {filteredScopeItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {scopeSearch ? "No matches found" : "No scope items available"}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {filteredScopeItems.map((item) => (
                      <label
                        key={item.id}
                        className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                      >
                        <Checkbox
                          checked={linkedScopeItemIds.includes(item.id)}
                          onCheckedChange={() => toggleScopeItem(item.id)}
                        />
                        <span className="text-xs font-mono text-muted-foreground">
                          {item.item_code}
                        </span>
                        <span className="text-sm truncate flex-1">{item.name}</span>
                        {item.production_percentage !== null && (
                          <Badge variant="outline" className="text-xs">
                            {item.production_percentage}%
                          </Badge>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Milestones Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Linked Milestones</Label>
                <span className="text-xs text-muted-foreground">
                  {linkedMilestoneIds.length} selected
                </span>
              </div>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search milestones..."
                  value={milestoneSearch}
                  onChange={(e) => setMilestoneSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <ScrollArea className="h-32 rounded-md border p-2">
                {filteredMilestones.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {milestoneSearch ? "No matches found" : "No milestones available"}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {filteredMilestones.map((milestone) => (
                      <label
                        key={milestone.id}
                        className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                      >
                        <Checkbox
                          checked={linkedMilestoneIds.includes(milestone.id)}
                          onCheckedChange={() => toggleMilestone(milestone.id)}
                        />
                        <span className="text-sm truncate flex-1">
                          {milestone.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(milestone.due_date), "MMM d")}
                        </span>
                        {milestone.is_completed && (
                          <Badge
                            variant="outline"
                            className="text-xs text-emerald-600"
                          >
                            Done
                          </Badge>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !name.trim() || !startDate || !endDate}
          >
            {isLoading && <Spinner className="size-4 mr-2" />}
            {isEditing ? "Save Changes" : "Add to Timeline"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
