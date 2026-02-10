"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  useCreateTimelineItem,
  useUpdateTimelineItem,
} from "@/lib/react-query/timelines";
import {
  type GanttItem as TimelineItem,
  type GanttItemType,
  type Priority,
} from "@/lib/actions/timelines";
import {
  ListTodoIcon,
  LinkIcon,
  SearchIcon,
  FlagIcon,
} from "lucide-react";

// ============================================================================
// Constants
// ============================================================================

const TIMELINE_COLORS = {
  phase: "#64748b", // Slate
  task: "#3b82f6", // Blue
  milestone: "#f59e0b", // Amber
} as const;

const NO_PARENT_VALUE = "__none__";

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: 1, label: "Low", color: "#94a3b8" },
  { value: 2, label: "Normal", color: "#3b82f6" },
  { value: 3, label: "High", color: "#f59e0b" },
  { value: 4, label: "Critical", color: "#ef4444" },
];

// ============================================================================
// Types
// ============================================================================

interface ScopeItem {
  id: string;
  item_code: string;
  name: string;
  production_percentage: number | null;
}

interface TimelineFormDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem: TimelineItem | null;
  scopeItems: ScopeItem[];
  timelineItems: TimelineItem[];
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
  timelineItems,
}: TimelineFormDialogProps) {
  // React Query mutations
  const createMutation = useCreateTimelineItem(projectId);
  const updateMutation = useUpdateTimelineItem(projectId);

  const isLoading = createMutation.isPending || updateMutation.isPending;

  // Form state
  const [name, setName] = useState("");
  const [itemType, setItemType] = useState<GanttItemType>("task");
  const [priority, setPriority] = useState<Priority>(2); // Default to Normal
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [linkedScopeItemIds, setLinkedScopeItemIds] = useState<string[]>([]);
  const [phaseId, setPhaseId] = useState<string>("");
  const [parentTaskId, setParentTaskId] = useState<string>("");

  // Duration mode state
  const [useDuration, setUseDuration] = useState(false);
  const [duration, setDuration] = useState<number>(7);
  const [durationUnit, setDurationUnit] = useState<"days" | "weeks">("days");

  // Calculate duration from dates when switching to duration mode
  const handleToggleDuration = () => {
    if (!useDuration && startDate && endDate) {
      // Switching TO duration mode - calculate from existing dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 because start day counts
      setDuration(diffDays);
      setDurationUnit("days");
    }
    setUseDuration(!useDuration);
  };

  // Search state
  const [scopeSearch, setScopeSearch] = useState("");

  // Calculate end date when duration changes
  useEffect(() => {
    if (useDuration && startDate && duration > 0 && itemType !== "milestone") {
      const start = new Date(startDate);
      const daysToAdd = durationUnit === "weeks" ? duration * 7 : duration;
      const end = new Date(start);
      end.setDate(end.getDate() + daysToAdd - 1); // -1 because start day counts
      setEndDate(format(end, "yyyy-MM-dd"));
    }
  }, [useDuration, startDate, duration, durationUnit, itemType]);

  // Milestones are single-day items
  useEffect(() => {
    if (itemType === "milestone" && startDate) {
      setUseDuration(false);
      setEndDate(startDate);
    }
  }, [itemType, startDate]);

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

  const phases = useMemo(() => {
    return timelineItems.filter((i) => i.item_type === "phase");
  }, [timelineItems]);

  const itemById = useMemo(() => {
    return new Map(timelineItems.map((i) => [i.id, i]));
  }, [timelineItems]);

  const getPhaseIdForTask = (task: TimelineItem): string => {
    let currentParentId = task.parent_id;
    while (currentParentId) {
      const parent = itemById.get(currentParentId);
      if (!parent) break;
      if (parent.item_type === "phase") return parent.id;
      currentParentId = parent.parent_id || null;
    }
    return "";
  };

  const tasksByPhase = useMemo(() => {
    if (phaseId) {
      return timelineItems.filter(
        (i) => i.item_type === "task" && i.parent_id === phaseId && i.id !== editItem?.id
      );
    }

    // No phase selected: only show top-level tasks as potential parents
    return timelineItems.filter(
      (i) => i.item_type === "task" && !i.parent_id && i.id !== editItem?.id
    );
  }, [timelineItems, phaseId, editItem]);

  // Sync form with editItem
  useEffect(() => {
    if (open) {
      if (editItem) {
        setName(editItem.name);
        setItemType(editItem.item_type);
        setPriority((editItem.priority || 2) as Priority);
        setStartDate(format(new Date(editItem.start_date), "yyyy-MM-dd"));
        setEndDate(format(new Date(editItem.end_date), "yyyy-MM-dd"));
        setLinkedScopeItemIds(
          editItem.linked_scope_item_ids || []
        );
        if (editItem.item_type === "task") {
          const directParent = editItem.parent_id ? itemById.get(editItem.parent_id) : null;
          const phaseForTask = getPhaseIdForTask(editItem);
          setPhaseId(phaseForTask || phases[0]?.id || "");
          setParentTaskId(directParent?.item_type === "task" ? directParent.id : "");
        } else {
          setPhaseId("");
          setParentTaskId("");
        }
        setUseDuration(false); // Edit mode uses direct dates
      } else {
        // Reset form for new item
        setName("");
        setItemType("task");
        setPriority(2); // Normal
        setStartDate("");
        setEndDate("");
        setLinkedScopeItemIds([]);
        setPhaseId("");
        setParentTaskId("");
        setUseDuration(false);
        setDuration(7);
        setDurationUnit("days");
      }
      setScopeSearch("");
    }
  }, [open, editItem, phases, itemById]);

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

  const handleSubmit = async () => {
    if (!name.trim() || !startDate || !endDate) return;

    // Validate date range
    if (new Date(endDate) < new Date(startDate)) {
      toast.error("End date must be on or after start date");
      return;
    }

    const data = {
      project_id: projectId,
      name: name.trim(),
      item_type: itemType,
      priority,
      start_date: startDate,
      end_date: itemType === "milestone" ? startDate : endDate,
      parent_id: itemType === "task" ? (parentTaskId || phaseId || null) : null,
      linked_scope_item_ids: itemType === "task" ? linkedScopeItemIds : [],
      is_completed: itemType === "milestone" ? false : undefined,
    };

    if (isEditing && editItem) {
      updateMutation.mutate(
        { timelineId: editItem.id, input: data },
        { onSuccess: () => handleClose() }
      );
    } else {
      createMutation.mutate(data, { onSuccess: () => handleClose() });
    }
  };

  // Get type color preview
  const typeColor = TIMELINE_COLORS[itemType] || "#64748b";

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-xl lg:max-w-2xl p-6">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? "Edit Timeline Item" : "Add Timeline Item"}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update the timeline item details and linked items"
              : "Create a new task or milestone for your project timeline"}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="details" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="links" className="gap-1.5">
              <LinkIcon className="size-3.5" />
              Links
              {linkedScopeItemIds.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {linkedScopeItemIds.length}
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
                  variant={itemType === "task" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setItemType("task")}
                >
                  <ListTodoIcon className="size-4 mr-2" />
                  Task
                </Button>
                <Button
                  type="button"
                  variant={itemType === "milestone" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setItemType("milestone")}
                >
                  <FlagIcon className="size-4 mr-2" />
                  Milestone
                </Button>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div
                  className="size-3 rounded"
                  style={{ backgroundColor: typeColor }}
                />
                <span>
                  {itemType === "milestone"
                    ? "Milestones are single dates (e.g., Client Approval)"
                    : "Tasks belong under fixed phases (Design/Production/Shipping/Installation)"}
                </span>
              </div>
            </div>

            {/* Phase selection (tasks only) */}
            {itemType === "task" && (
              <div className="space-y-2">
                <Label>Phase (optional)</Label>
                <Select value={phaseId || NO_PARENT_VALUE} onValueChange={(v) => setPhaseId(v === NO_PARENT_VALUE ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="No phase (ungrouped)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PARENT_VALUE}>No phase</SelectItem>
                    {phases.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Parent task (optional, tasks only) */}
            {itemType === "task" && (
              <div className="space-y-2">
                <Label>Parent Task (optional)</Label>
                <Select
                  value={parentTaskId || NO_PARENT_VALUE}
                  onValueChange={(value) =>
                    setParentTaskId(value === NO_PARENT_VALUE ? "" : value)
                  }
                >
                  <SelectTrigger>
                  <SelectValue placeholder="No parent (top-level task)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PARENT_VALUE}>No parent</SelectItem>
                  {tasksByPhase.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Priority */}
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={priority.toString()}
                onValueChange={(v) => setPriority(parseInt(v, 10) as Priority)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>
                      <div className="flex items-center gap-2">
                        <div
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: opt.color }}
                        />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder={
                  itemType === "milestone"
                    ? "e.g., Client Approval"
                    : "e.g., Factory inspection"
                }
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Date Range */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">{itemType === "milestone" ? "Date *" : "Start Date *"}</Label>
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
                    {itemType !== "milestone" && (
                      <button
                        type="button"
                        onClick={handleToggleDuration}
                        className="text-xs text-primary hover:underline"
                      >
                        {useDuration ? "Use end date" : "Use duration"}
                      </button>
                    )}
                  </div>
                  {useDuration && itemType !== "milestone" ? (
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
            {itemType === "task" && (
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
            )}
          </TabsContent>
        </Tabs>

        <SheetFooter className="mt-6 gap-2">
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
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
