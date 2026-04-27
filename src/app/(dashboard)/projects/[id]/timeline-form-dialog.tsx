"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  useCreateTimelineDependency,
  useUpdateTimelineDependency,
  useDeleteTimelineDependency,
} from "@/lib/react-query/timelines";
import {
  type GanttItem as TimelineItem,
  type GanttItemType,
  type Priority,
  type DependencyType,
  type GanttDependency as TimelineDependency,
  type PhaseKey,
} from "@/lib/actions/timelines";
import { PHASE_ORDER, PHASE_LABELS, PHASE_COLORS } from "@/components/gantt/gantt-types";
import {
  ListTodoIcon,
  LinkIcon,
  SearchIcon,
  FlagIcon,
  GitBranchIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
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

const EMPTY_DEPENDENCIES: TimelineDependency[] = [];

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
  dependencies?: TimelineDependency[];
}

const DEP_TYPE_LABEL: Record<DependencyType, string> = {
  0: "FS",
  1: "SS",
  2: "FF",
  3: "SF",
};

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
  dependencies = EMPTY_DEPENDENCIES,
}: TimelineFormDialogProps) {
  // React Query mutations
  const createMutation = useCreateTimelineItem(projectId);
  const updateMutation = useUpdateTimelineItem(projectId);
  const createDepMutation = useCreateTimelineDependency(projectId);
  const updateDepMutation = useUpdateTimelineDependency(projectId);
  const deleteDepMutation = useDeleteTimelineDependency(projectId);

  const isLoading = createMutation.isPending || updateMutation.isPending;

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [itemType, setItemType] = useState<GanttItemType>("task");
  const [priority, setPriority] = useState<Priority>(2); // Default to Normal
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [linkedScopeItemIds, setLinkedScopeItemIds] = useState<string[]>([]);
  // Phase is a LABEL (phase_key), not a parent relationship. A task keeps its
  // parent_id hierarchy independent of phase labeling.
  const [phaseKey, setPhaseKey] = useState<PhaseKey | "">("");
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

  const itemById = useMemo(() => {
    return new Map(timelineItems.map((i) => [i.id, i]));
  }, [timelineItems]);

  // Backward-compat: derive phase_key from ancestor phase item if not set on the task itself
  const derivePhaseKey = (task: TimelineItem): PhaseKey | "" => {
    if (task.phase_key) return task.phase_key as PhaseKey;
    let currentParentId = task.parent_id;
    while (currentParentId) {
      const parent = itemById.get(currentParentId);
      if (!parent) break;
      if (parent.item_type === "phase" && parent.phase_key) return parent.phase_key as PhaseKey;
      currentParentId = parent.parent_id || null;
    }
    return "";
  };

  // Parent-task dropdown candidates: any task that isn't the current item nor a phase.
  // We no longer filter by phase because phase is a label, not hierarchy — a task can
  // be nested under any parent regardless of its phase label.
  const parentTaskCandidates = useMemo(() => {
    return timelineItems.filter(
      (i) => i.item_type === "task" && i.id !== editItem?.id
    );
  }, [timelineItems, editItem]);

  // Dependencies — incoming (predecessors) and outgoing (successors)
  const incomingDeps = useMemo(() => {
    if (!editItem) return [];
    return dependencies.filter((d) => d.target_id === editItem.id);
  }, [dependencies, editItem]);

  const outgoingDeps = useMemo(() => {
    if (!editItem) return [];
    return dependencies.filter((d) => d.source_id === editItem.id);
  }, [dependencies, editItem]);

  // Tasks that have children (parents/summary tasks). Dependencies should
  // connect leaf tasks only — parent dates come from aggregation, so a dep
  // pointing at a parent silently has no effect.
  const tasksWithChildren = useMemo(() => {
    const set = new Set<string>();
    timelineItems.forEach((t) => {
      if (t.parent_id) set.add(t.parent_id);
    });
    return set;
  }, [timelineItems]);

  // Available tasks to link via dependency: non-phase leaves only (no children)
  const otherTasks = useMemo(() => {
    if (!editItem) return [];
    return timelineItems.filter(
      (t) =>
        t.id !== editItem.id &&
        t.item_type !== "phase" &&
        !tasksWithChildren.has(t.id)
    );
  }, [timelineItems, editItem, tasksWithChildren]);

  const taskNameById = useMemo(() => {
    const map = new Map<string, string>();
    timelineItems.forEach((t) => map.set(t.id, t.name));
    return map;
  }, [timelineItems]);

  const depCount = incomingDeps.length + outgoingDeps.length;
  // If the task being edited is itself a parent, disable dep management
  // (its dates are derived from children — adding/editing deps wouldn't
  // have any visible effect).
  const editItemIsParent = editItem ? tasksWithChildren.has(editItem.id) : false;

  // Sync form with editItem
  useEffect(() => {
    if (open) {
      if (editItem) {
        setName(editItem.name);
        setDescription(editItem.description || "");
        setItemType(editItem.item_type);
        setPriority((editItem.priority || 2) as Priority);
        setStartDate(format(new Date(editItem.start_date), "yyyy-MM-dd"));
        setEndDate(format(new Date(editItem.end_date), "yyyy-MM-dd"));
        setLinkedScopeItemIds(
          editItem.linked_scope_item_ids || []
        );
        if (editItem.item_type === "task") {
          const directParent = editItem.parent_id ? itemById.get(editItem.parent_id) : null;
          setPhaseKey(derivePhaseKey(editItem));
          setParentTaskId(directParent?.item_type === "task" ? directParent.id : "");
        } else {
          setPhaseKey("");
          setParentTaskId("");
        }
        setUseDuration(false); // Edit mode uses direct dates
      } else {
        // Reset form for new item
        setName("");
        setDescription("");
        setItemType("task");
        setPriority(2); // Normal
        setStartDate("");
        setEndDate("");
        setLinkedScopeItemIds([]);
        setPhaseKey("");
        setParentTaskId("");
        setUseDuration(false);
        setDuration(7);
        setDurationUnit("days");
      }
      setScopeSearch("");
    }
    // itemById is used via derivePhaseKey; exhaustive-deps isn't enforced here,
    // and re-running on itemById changes is fine (idempotent reset).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editItem, itemById]);

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
      description: description.trim() || null,
      item_type: itemType,
      priority,
      start_date: startDate,
      end_date: itemType === "milestone" ? startDate : endDate,
      // Parent is strictly hierarchical — never the phase item.
      parent_id: itemType === "task" ? (parentTaskId || null) : null,
      // Phase is a label — completely independent of parent_id.
      phase_key: itemType === "task" ? (phaseKey || null) : null,
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
      <SheetContent side="right" className="w-full sm:max-w-xl lg:max-w-2xl p-0 gap-0 flex flex-col">
        <SheetHeader className="px-6 pt-5 pb-2 shrink-0">
          <SheetTitle className="text-base">
            {isEditing ? "Edit Timeline Item" : "Add Timeline Item"}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {isEditing
              ? "Update the timeline item details and linked items"
              : "Create a new task or milestone for your project timeline"}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="details" className="flex flex-col flex-1 min-h-0 overflow-hidden w-full">
          <TabsList className="mx-6 shrink-0 grid grid-cols-3">
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
            <TabsTrigger value="dependencies" className="gap-1.5">
              <GitBranchIcon className="size-3.5" />
              Dependencies
              {depCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {depCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto px-6 py-4">

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-3 mt-0">
            {/* Type Selection */}
            <div className="space-y-1.5">
              <Label>Type *</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={itemType === "task" ? "default" : "outline"}
                  className="flex-1 h-8"
                  onClick={() => setItemType("task")}
                >
                  <ListTodoIcon className="size-3.5 mr-1.5" />
                  Task
                </Button>
                <Button
                  type="button"
                  variant={itemType === "milestone" ? "default" : "outline"}
                  className="flex-1 h-8"
                  onClick={() => setItemType("milestone")}
                >
                  <FlagIcon className="size-3.5 mr-1.5" />
                  Milestone
                </Button>
              </div>
            </div>

            {/* Phase / Parent / Priority — 3-col grid for tasks, Priority alone for milestones */}
            {itemType === "task" ? (
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Phase</Label>
                  <Select
                    value={phaseKey || NO_PARENT_VALUE}
                    onValueChange={(v) => setPhaseKey(v === NO_PARENT_VALUE ? "" : (v as PhaseKey))}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="No phase" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_PARENT_VALUE}>No phase</SelectItem>
                      {PHASE_ORDER.map((key) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <div
                              className="size-2.5 rounded-full"
                              style={{ backgroundColor: PHASE_COLORS[key] }}
                            />
                            {PHASE_LABELS[key]}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Parent</Label>
                  <Select
                    value={parentTaskId || NO_PARENT_VALUE}
                    onValueChange={(value) =>
                      setParentTaskId(value === NO_PARENT_VALUE ? "" : value)
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="No parent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_PARENT_VALUE}>No parent</SelectItem>
                      {parentTaskCandidates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Priority</Label>
                  <Select
                    value={priority.toString()}
                    onValueChange={(v) => setPriority(parseInt(v, 10) as Priority)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
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
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs">Priority</Label>
                <Select
                  value={priority.toString()}
                  onValueChange={(v) => setPriority(parseInt(v, 10) as Priority)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
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
            )}

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                className="h-8"
                placeholder={
                  itemType === "milestone"
                    ? "e.g., Client Approval"
                    : "e.g., Factory inspection"
                }
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional notes, context, or blockers"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="start_date">{itemType === "milestone" ? "Date *" : "Start Date *"}</Label>
                  <Input
                    id="start_date"
                    type="date"
                    className="h-8"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
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
                        className="w-20 h-8"
                      />
                      <Select
                        value={durationUnit}
                        onValueChange={(v) => setDurationUnit(v as "days" | "weeks")}
                      >
                        <SelectTrigger className="flex-1 h-8">
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
                      className="h-8"
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
          <TabsContent value="links" className="space-y-4 mt-0">
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

          {/* Dependencies Tab */}
          <TabsContent value="dependencies" className="space-y-5 mt-0">
            {!editItem ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Save this item first to add dependencies.
              </div>
            ) : editItemIsParent ? (
              <div className="text-center py-8 text-sm text-muted-foreground space-y-2">
                <p className="font-medium">This task has subtasks.</p>
                <p className="text-xs max-w-sm mx-auto">
                  Dependencies should connect individual work tasks, not summary parents.
                  Open one of the subtasks to link it to another task.
                </p>
              </div>
            ) : otherTasks.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Create at least one other leaf task to add a dependency.
              </div>
            ) : (
              <>
                <DepSection
                  title="Predecessors"
                  subtitle="Tasks this one depends on"
                  emptyText="Click + Add to link a task that must happen before this one."
                  deps={incomingDeps}
                  getOtherTaskId={(d) => d.source_id}
                  otherTasks={otherTasks}
                  taskNameById={taskNameById}
                  direction="incoming"
                  onCreate={(otherId, type, lag) => {
                    createDepMutation.mutate({
                      project_id: projectId,
                      source_id: otherId,
                      target_id: editItem.id,
                      dependency_type: type,
                      lag_days: lag,
                    });
                  }}
                  onUpdate={(depId, updates) => {
                    updateDepMutation.mutate({ dependencyId: depId, updates });
                  }}
                  onDelete={(depId) => deleteDepMutation.mutate(depId)}
                />

                <DepSection
                  title="Successors"
                  subtitle="Tasks that depend on this one"
                  emptyText="Click + Add to link a task that depends on this one."
                  deps={outgoingDeps}
                  getOtherTaskId={(d) => d.target_id}
                  otherTasks={otherTasks}
                  taskNameById={taskNameById}
                  direction="outgoing"
                  onCreate={(otherId, type, lag) => {
                    createDepMutation.mutate({
                      project_id: projectId,
                      source_id: editItem.id,
                      target_id: otherId,
                      dependency_type: type,
                      lag_days: lag,
                    });
                  }}
                  onUpdate={(depId, updates) => {
                    updateDepMutation.mutate({ dependencyId: depId, updates });
                  }}
                  onDelete={(depId) => deleteDepMutation.mutate(depId)}
                />
              </>
            )}
          </TabsContent>
          </div>
        </Tabs>

        <SheetFooter className="px-6 py-4 border-t shrink-0 gap-2">
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

// ============================================================================
// Dependency sub-components
// ============================================================================

function DepSection({
  title,
  subtitle,
  emptyText,
  deps,
  getOtherTaskId,
  otherTasks,
  taskNameById,
  direction,
  onCreate,
  onUpdate,
  onDelete,
}: {
  title: string;
  subtitle: string;
  emptyText: string;
  deps: TimelineDependency[];
  getOtherTaskId: (d: TimelineDependency) => string;
  otherTasks: TimelineItem[];
  taskNameById: Map<string, string>;
  direction: "incoming" | "outgoing";
  onCreate: (otherId: string, type: DependencyType, lag: number) => void;
  onUpdate: (depId: string, updates: { dependency_type?: DependencyType; lag_days?: number }) => void;
  onDelete: (depId: string) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [addTaskId, setAddTaskId] = useState("");
  const [addType, setAddType] = useState<DependencyType>(0);
  const [addLag, setAddLag] = useState(0);

  const usedIds = new Set(deps.map(getOtherTaskId));
  const availableTasks = otherTasks.filter((t) => !usedIds.has(t.id));

  const resetAddForm = () => {
    setIsAdding(false);
    setAddTaskId("");
    setAddType(0);
    setAddLag(0);
  };

  const handleSubmitAdd = () => {
    if (!addTaskId) return;
    onCreate(addTaskId, addType, addLag);
    resetAddForm();
  };

  return (
    <div className="space-y-2">
      <div>
        <Label>{title}</Label>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>

      {deps.length === 0 && !isAdding && (
        <p className="text-xs text-muted-foreground italic px-2">{emptyText}</p>
      )}

      {deps.map((dep) => (
        <DepRow
          key={dep.id}
          dep={dep}
          otherTaskName={taskNameById.get(getOtherTaskId(dep)) || "(deleted task)"}
          onUpdateType={(type) => onUpdate(dep.id, { dependency_type: type })}
          onUpdateLag={(lag) => onUpdate(dep.id, { lag_days: lag })}
          onDelete={() => onDelete(dep.id)}
        />
      ))}

      {isAdding ? (
        <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/30">
          <Select value={addTaskId} onValueChange={setAddTaskId}>
            <SelectTrigger className="flex-1 h-8 text-xs">
              <SelectValue placeholder="Pick task..." />
            </SelectTrigger>
            <SelectContent>
              {availableTasks.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(addType)}
            onValueChange={(v) => setAddType(Number(v) as DependencyType)}
          >
            <SelectTrigger className="w-[72px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">FS</SelectItem>
              <SelectItem value="1">SS</SelectItem>
              <SelectItem value="2">FF</SelectItem>
              <SelectItem value="3">SF</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            value={addLag}
            onChange={(e) => setAddLag(parseInt(e.target.value) || 0)}
            className="w-16 h-8 text-xs"
            placeholder="Lag"
          />
          <Button
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={handleSubmitAdd}
            disabled={!addTaskId}
          >
            Add
          </Button>
          <Button size="icon" variant="ghost" className="size-8" onClick={resetAddForm}>
            <XIcon className="size-3.5" />
          </Button>
        </div>
      ) : (
        availableTasks.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5 text-xs"
            onClick={() => setIsAdding(true)}
          >
            <PlusIcon className="size-3.5" />
            Add {direction === "incoming" ? "predecessor" : "successor"}
          </Button>
        )
      )}
    </div>
  );
}

function DepRow({
  dep,
  otherTaskName,
  onUpdateType,
  onUpdateLag,
  onDelete,
}: {
  dep: TimelineDependency;
  otherTaskName: string;
  onUpdateType: (type: DependencyType) => void;
  onUpdateLag: (lag: number) => void;
  onDelete: () => void;
}) {
  const [localLag, setLocalLag] = useState(dep.lag_days);
  useEffect(() => {
    setLocalLag(dep.lag_days);
  }, [dep.lag_days]);

  const commitLag = () => {
    if (localLag !== dep.lag_days) onUpdateLag(localLag);
  };

  return (
    <div className="flex items-center gap-2 p-2 rounded-md border bg-background">
      <span className="text-sm flex-1 truncate">{otherTaskName}</span>
      <Select
        value={String(dep.dependency_type)}
        onValueChange={(v) => onUpdateType(Number(v) as DependencyType)}
      >
        <SelectTrigger className="w-[72px] h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="0">FS</SelectItem>
          <SelectItem value="1">SS</SelectItem>
          <SelectItem value="2">FF</SelectItem>
          <SelectItem value="3">SF</SelectItem>
        </SelectContent>
      </Select>
      <Input
        type="number"
        value={localLag}
        onChange={(e) => setLocalLag(parseInt(e.target.value) || 0)}
        onBlur={commitLag}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="w-16 h-7 text-xs"
        title="Lag days"
      />
      <Button size="icon" variant="ghost" onClick={onDelete} className="size-7">
        <TrashIcon className="size-3.5" />
      </Button>
    </div>
  );
}
