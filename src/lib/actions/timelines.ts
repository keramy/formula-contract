"use server";

/**
 * Gantt Timeline Server Actions (Rewrite)
 *
 * - Fixed phases per project
 * - Tasks + milestones + nested tasks
 * - Dependencies (FS/SS/FF/SF)
 * - Scope item linking for progress calculation
 */

import { createClient } from "@/lib/supabase/server";
// NOTE: revalidatePath removed from timeline actions.
// React Query handles client-side cache invalidation via onSettled.
// revalidatePath was causing 5s full-page server re-renders on every action.

// ============================================================================
// Types
// ============================================================================

export type GanttItemType = "phase" | "task" | "milestone";
export type PhaseKey = "design" | "production" | "procurement" | "shipping" | "installation";
export type DependencyType = 0 | 1 | 2 | 3;
export type Priority = 1 | 2 | 3 | 4;

export interface GanttItem {
  id: string;
  project_id: string;
  name: string;
  item_type: GanttItemType;
  phase_key?: PhaseKey | null;
  parent_id: string | null;
  sort_order: number;
  start_date: string;
  end_date: string;
  priority: number;
  progress_override: number | null;
  is_completed: boolean | null;
  completed_at: string | null;
  color: string | null;
  description?: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Computed
  progress?: number;
  children?: GanttItem[];
  linked_scope_item_ids?: string[];
}

export interface GanttDependency {
  id: string;
  project_id: string;
  source_id: string;
  target_id: string;
  dependency_type: number;
  lag_days: number;
  created_at: string | null;
  created_by: string | null;
}

export interface GanttItemInput {
  project_id: string;
  name: string;
  item_type: GanttItemType;
  phase_key?: PhaseKey | null;
  parent_id?: string | null;
  start_date: string;
  end_date: string;
  color?: string | null;
  priority?: Priority;
  progress_override?: number | null;
  is_completed?: boolean;
  description?: string | null;
  linked_scope_item_ids?: string[];
}

export interface GanttDependencyInput {
  project_id: string;
  source_id: string;
  target_id: string;
  dependency_type?: DependencyType;
  lag_days?: number;
}

export interface ActionResult<T = void> {
  success: boolean;
  error?: string;
  data?: T;
}

// ============================================================================
// Helpers
// ============================================================================

const FIXED_PHASES: Array<{ key: PhaseKey; name: string; order: number; color: string }> = [
  { key: "design",       name: "Design/Shopdrawing", order: 1, color: "#0d9488" },
  { key: "production",   name: "Production",         order: 2, color: "#3b82f6" },
  { key: "procurement",  name: "Procurement",        order: 3, color: "#f97316" },
  { key: "shipping",     name: "Shipment",           order: 4, color: "#64748b" },
  { key: "installation", name: "Installation",       order: 5, color: "#16a34a" },
];

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

// ============================================================================
// Queries
// ============================================================================

export async function getTimelineItems(projectId: string): Promise<GanttItem[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Fixed phases are auto-created by DB trigger (create_default_gantt_phases)
  // and seeded for existing projects in migration 045. No need to check here.

  const { data: items, error } = await supabase
    .from("gantt_items")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

  if (error || !items) {
    console.error("Error fetching gantt items:", error);
    return [];
  }

  // Fetch linked scope items and their production percentage (exclude soft-deleted)
  const { data: links } = await supabase
    .from("gantt_item_scope_items")
    .select("gantt_item_id, scope_item_id, scope_items!inner(production_percentage, is_deleted)")
    .in("gantt_item_id", items.map((i) => i.id));

  const scopeMap = new Map<string, number[]>();
  const scopeIdsMap = new Map<string, string[]>();
  (links || []).forEach((l: {
    gantt_item_id: string;
    scope_item_id: string;
    scope_items: { production_percentage: number | null; is_deleted: boolean | null };
  }) => {
    // Skip soft-deleted scope items
    if (l.scope_items?.is_deleted) return;

    const pct = l.scope_items?.production_percentage ?? 0;
    const arr = scopeMap.get(l.gantt_item_id) || [];
    arr.push(pct);
    scopeMap.set(l.gantt_item_id, arr);
    const ids = scopeIdsMap.get(l.gantt_item_id) || [];
    ids.push(l.scope_item_id);
    scopeIdsMap.set(l.gantt_item_id, ids);
  });

  // Build children map
  const childrenMap = new Map<string, GanttItem[]>();
  items.forEach((item) => {
    if (item.parent_id) {
      const arr = childrenMap.get(item.parent_id) || [];
      arr.push(item as GanttItem);
      childrenMap.set(item.parent_id, arr);
    }
  });

  // Compute base progress for each item (milestones, linked scope, override)
  const baseProgress = new Map<string, number>();
  items.forEach((item) => {
    const linked = scopeMap.get(item.id) || [];
    let progress = 0;
    if (item.item_type === "milestone") {
      progress = item.is_completed ? 100 : 0;
    } else if (linked.length > 0) {
      progress = average(linked);
    } else if (item.progress_override !== null && item.progress_override !== undefined) {
      progress = item.progress_override;
    }
    baseProgress.set(item.id, progress);
  });

  const itemsById = new Map<string, GanttItem>();
  items.forEach((item) => {
    itemsById.set(item.id, {
      ...(item as GanttItem),
      linked_scope_item_ids: scopeIdsMap.get(item.id) || [],
      progress: baseProgress.get(item.id) || 0,
    });
  });

  // Compute progress from children when no linked scope items exist
  const computeProgress = (itemId: string): number => {
    const item = itemsById.get(itemId);
    if (!item) return 0;
    if (item.item_type === "milestone") return item.progress || 0;

    const linked = scopeMap.get(item.id) || [];
    const children = childrenMap.get(item.id) || [];
    if (children.length > 0 && linked.length === 0) {
      const childProgress = children.map((c) => computeProgress(c.id));
      const avg = average(childProgress);
      item.progress = avg;
      return avg;
    }
    return item.progress || 0;
  };

  items.forEach((item) => {
    computeProgress(item.id);
  });

  // Build phase_key → non-phase items map for label-based aggregation.
  // Phase is a LABEL, not a hierarchy, so a phase's date window = MIN/MAX
  // across every task with matching phase_key, regardless of parent_id.
  const tasksByPhaseKey = new Map<string, GanttItem[]>();
  itemsById.forEach((item) => {
    if (item.item_type === "phase") return;
    if (!item.phase_key) return;
    const arr = tasksByPhaseKey.get(item.phase_key) || [];
    arr.push(item);
    tasksByPhaseKey.set(item.phase_key, arr);
  });

  // Recompute dates:
  // - Phase items → from phase_key matches (label-based aggregation)
  // - Parent tasks (non-phase with children) → from direct parent_id children (hierarchy)
  itemsById.forEach((item) => {
    if (item.item_type === "phase") {
      const phaseTasks = item.phase_key ? (tasksByPhaseKey.get(item.phase_key) || []) : [];
      if (phaseTasks.length === 0) return;
      const minStart = phaseTasks.reduce(
        (min, c) => (c.start_date < min ? c.start_date : min),
        phaseTasks[0].start_date
      );
      const maxEnd = phaseTasks.reduce(
        (max, c) => (c.end_date > max ? c.end_date : max),
        phaseTasks[0].end_date
      );
      item.start_date = minStart;
      item.end_date = maxEnd;
      item.progress = average(phaseTasks.map((c) => c.progress || 0));
      return;
    }

    // Parent task: aggregate from hierarchical children (subtasks under this task)
    const children = (childrenMap.get(item.id) || [])
      .map((c) => itemsById.get(c.id))
      .filter(Boolean) as GanttItem[];
    if (children.length === 0) return;
    const minStart = children.reduce(
      (min, c) => (c.start_date < min ? c.start_date : min),
      children[0].start_date
    );
    const maxEnd = children.reduce(
      (max, c) => (c.end_date > max ? c.end_date : max),
      children[0].end_date
    );
    item.start_date = minStart;
    item.end_date = maxEnd;
  });

  // Build ordered list: phases (fixed order) -> their children -> milestones -> orphans
  const childrenByParent = new Map<string | null, GanttItem[]>();
  itemsById.forEach((item) => {
    const parentKey = item.parent_id || null;
    const arr = childrenByParent.get(parentKey) || [];
    arr.push(item);
    childrenByParent.set(parentKey, arr);
  });

  const sortByOrder = (list: GanttItem[]) =>
    list.sort((a, b) => (a.sort_order - b.sort_order) || a.name.localeCompare(b.name));

  const ordered: GanttItem[] = [];
  const pushed = new Set<string>();

  const pushWithChildren = (item: GanttItem) => {
    if (pushed.has(item.id)) return;
    ordered.push(item);
    pushed.add(item.id);
    const children = sortByOrder(childrenByParent.get(item.id) || []);
    children.forEach(pushWithChildren);
  };

  // Phases in fixed order
  FIXED_PHASES.forEach((phase) => {
    const phaseItem = Array.from(itemsById.values()).find(
      (i) => i.item_type === "phase" && i.phase_key === phase.key
    );
    if (phaseItem) {
      pushWithChildren(phaseItem);
    }
  });

  // Top-level milestones
  const topLevel = childrenByParent.get(null) || [];
  sortByOrder(topLevel.filter((i) => i.item_type === "milestone")).forEach(pushWithChildren);

  // Orphan tasks (should be rare)
  sortByOrder(topLevel.filter((i) => i.item_type === "task")).forEach(pushWithChildren);

  // Any remaining items (safety)
  Array.from(itemsById.values()).forEach((item) => pushWithChildren(item));

  return ordered;
}

export async function getTimelineDependencies(projectId: string): Promise<GanttDependency[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("gantt_dependencies")
    .select("*")
    .eq("project_id", projectId);

  if (error) {
    console.error("Error fetching gantt dependencies:", error);
    return [];
  }

  return data || [];
}

// ============================================================================
// Mutations
// ============================================================================

export async function createTimelineItem(input: GanttItemInput): Promise<ActionResult<GanttItem>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!userData || !["admin", "pm"].includes(userData.role)) {
    return { success: false, error: "Only PM and Admin can create timeline items" };
  }

  // Prevent creating phases (fixed)
  if (input.item_type === "phase") {
    return { success: false, error: "Phases are fixed and cannot be created manually" };
  }

  // Next sort order (scoped to parent)
  const parentId = input.parent_id || null;
  let orderQuery = supabase
    .from("gantt_items")
    .select("sort_order")
    .eq("project_id", input.project_id);
  orderQuery = parentId ? orderQuery.eq("parent_id", parentId) : orderQuery.is("parent_id", null);
  const { data: maxOrder } = await orderQuery
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (maxOrder?.sort_order || 0) + 1;

  const { data: created, error } = await (supabase
    .from("gantt_items") as any)
    .insert({
      project_id: input.project_id,
      name: input.name,
      item_type: input.item_type,
      phase_key: input.phase_key || null,
      parent_id: parentId,
      sort_order: nextOrder,
      start_date: input.start_date,
      end_date: input.end_date,
      priority: input.priority ?? 2,
      progress_override: input.progress_override ?? null,
      is_completed: input.is_completed ?? false,
      color: input.color || null,
      description: input.description || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error || !created) {
    console.error("Error creating gantt item:", error);
    return { success: false, error: error?.message || "Create failed" };
  }

  if (input.linked_scope_item_ids && input.linked_scope_item_ids.length > 0) {
    const links = input.linked_scope_item_ids.map((scopeId) => ({
      gantt_item_id: created.id,
      scope_item_id: scopeId,
    }));
    await supabase.from("gantt_item_scope_items").insert(links);
  }

  // revalidatePath removed — React Query handles cache
  return { success: true, data: created };
}

export async function updateTimelineItem(
  timelineId: string,
  input: Partial<GanttItemInput>
): Promise<ActionResult<GanttItem>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!userData || !["admin", "pm"].includes(userData.role)) {
    return { success: false, error: "Only PM and Admin can update timeline items" };
  }

  const { data: existing } = await supabase
    .from("gantt_items")
    .select("project_id")
    .eq("id", timelineId)
    .single();

  if (!existing) return { success: false, error: "Timeline item not found" };

  // Circular parent protection: walk ancestor chain to ensure no loops
  if (input.parent_id !== undefined && input.parent_id !== null) {
    const MAX_DEPTH = 5;
    let currentId: string | null = input.parent_id;
    let depth = 0;

    while (currentId && depth < MAX_DEPTH + 1) {
      if (currentId === timelineId) {
        return { success: false, error: "Circular parent reference detected" };
      }
      const { data: ancestor } = await supabase
        .from("gantt_items")
        .select("parent_id")
        .eq("id", currentId)
        .single() as { data: { parent_id: string | null } | null };
      currentId = ancestor?.parent_id ?? null;
      depth++;
    }

    if (depth > MAX_DEPTH) {
      return { success: false, error: `Maximum nesting depth (${MAX_DEPTH}) exceeded` };
    }
  }

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.item_type !== undefined) updateData.item_type = input.item_type;
  if (input.start_date !== undefined) updateData.start_date = input.start_date;
  if (input.end_date !== undefined) updateData.end_date = input.end_date;
  if (input.parent_id !== undefined) updateData.parent_id = input.parent_id;
  if (input.priority !== undefined) updateData.priority = input.priority;
  if (input.progress_override !== undefined) updateData.progress_override = input.progress_override;
  if (input.is_completed !== undefined) updateData.is_completed = input.is_completed;
  if (input.color !== undefined) updateData.color = input.color;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.phase_key !== undefined) updateData.phase_key = input.phase_key;

  const { data: updated, error } = await (supabase
    .from("gantt_items") as any)
    .update(updateData)
    .eq("id", timelineId)
    .select()
    .single();

  if (error || !updated) {
    console.error("Error updating gantt item:", error);
    return { success: false, error: error?.message || "Update failed" };
  }

  // If phase_key changed, cascade the label to all descendants (subtask tree).
  // This matches the right-click Set Phase behavior and keeps parent-selects-children
  // consistency regardless of which UI surface triggered the change.
  if (input.phase_key !== undefined) {
    const descendantIds: string[] = [];
    let frontier: string[] = [timelineId];
    while (frontier.length > 0) {
      const { data: children } = await supabase
        .from("gantt_items")
        .select("id")
        .in("parent_id", frontier);
      if (!children || children.length === 0) break;
      const ids = children.map((c) => c.id);
      descendantIds.push(...ids);
      frontier = ids;
    }
    if (descendantIds.length > 0) {
      await (supabase.from("gantt_items") as any)
        .update({ phase_key: input.phase_key })
        .in("id", descendantIds);
    }
  }

  if (input.linked_scope_item_ids !== undefined) {
    await supabase.from("gantt_item_scope_items").delete().eq("gantt_item_id", timelineId);
    if (input.linked_scope_item_ids.length > 0) {
      const links = input.linked_scope_item_ids.map((scopeId) => ({
        gantt_item_id: timelineId,
        scope_item_id: scopeId,
      }));
      await supabase.from("gantt_item_scope_items").insert(links);
    }
  }

  // revalidatePath removed — React Query handles cache
  return { success: true, data: updated };
}

export async function deleteTimelineItem(timelineId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!userData || !["admin", "pm"].includes(userData.role)) {
    return { success: false, error: "Only PM and Admin can delete timeline items" };
  }

  const { data: existing } = await supabase
    .from("gantt_items")
    .select("project_id, parent_id, item_type")
    .eq("id", timelineId)
    .single();
  if (!existing) return { success: false, error: "Timeline item not found" };

  // Prevent deleting fixed phases
  if (existing.item_type === "phase") {
    return { success: false, error: "Fixed phases cannot be deleted" };
  }

  // No manual reparent: the parent_id FK is ON DELETE SET NULL, so children
  // automatically become top-level when their parent is deleted. This avoids
  // RLS/UPDATE race conditions when bulk-deleting a parent + its children in
  // parallel. Dependencies and scope-item links cascade-delete via their own FKs.
  const { error } = await supabase.from("gantt_items").delete().eq("id", timelineId);
  if (error) {
    console.error("Error deleting gantt item:", error);
    return { success: false, error: error.message };
  }

  // revalidatePath removed — React Query handles cache
  return { success: true };
}

/**
 * Set a task's phase and cascade the label to all descendants.
 *
 * Phase is purely a LABEL, never a parent relationship. This function only
 * updates phase_key — it never touches parent_id. Hierarchy is preserved as-is.
 *
 * Aggregation (for overlap view): MIN(start), MAX(end) across every task whose
 * phase_key = X, regardless of where they sit in the parent_id tree.
 *
 * Cascade: when a parent's phase changes, all descendants inherit the new
 * phase_key automatically (same rule, parent_id untouched).
 */
export async function setTaskPhase(
  taskId: string,
  phaseKey: PhaseKey
): Promise<ActionResult<{ updatedCount: number }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!userData || !["admin", "pm"].includes(userData.role)) {
    return { success: false, error: "Only PM and Admin can change phase" };
  }

  const { data: task } = await supabase
    .from("gantt_items")
    .select("id, item_type")
    .eq("id", taskId)
    .single();
  if (!task) return { success: false, error: "Task not found" };
  if (task.item_type === "phase") {
    return { success: false, error: "Cannot change phase of a phase item" };
  }

  // Collect all descendants via BFS on parent_id
  const descendantIds: string[] = [];
  let frontier: string[] = [taskId];
  while (frontier.length > 0) {
    const { data: children } = await supabase
      .from("gantt_items")
      .select("id")
      .in("parent_id", frontier);
    if (!children || children.length === 0) break;
    const ids = children.map((c) => c.id);
    descendantIds.push(...ids);
    frontier = ids;
  }

  // Update target + descendants with the new phase_key in one go
  const allIds = [taskId, ...descendantIds];
  const { error } = await (supabase
    .from("gantt_items") as any)
    .update({ phase_key: phaseKey })
    .in("id", allIds);
  if (error) return { success: false, error: error.message };

  return { success: true, data: { updatedCount: allIds.length } };
}

// ============================================================================
// Dependency Date Propagation
// ============================================================================

/**
 * Detect if adding an edge source→target would create a cycle.
 * Walks forward from target through all outgoing dependencies.
 * If we reach source, it's a cycle.
 */
function detectCycle(
  sourceId: string,
  targetId: string,
  deps: { source_id: string; target_id: string }[]
): boolean {
  // Build adjacency list: source → [targets]
  // Exclude the exact edge we're testing (it may already exist as a duplicate attempt)
  const adj = new Map<string, string[]>();
  for (const d of deps) {
    if (d.source_id === sourceId && d.target_id === targetId) continue;
    const existing = adj.get(d.source_id) || [];
    existing.push(d.target_id);
    adj.set(d.source_id, existing);
  }

  // BFS from targetId — if we can reach sourceId, adding source→target creates a cycle
  const visited = new Set<string>();
  const queue = [targetId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === sourceId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const next of adj.get(current) || []) {
      queue.push(next);
    }
  }
  return false;
}

/**
 * Topological sort of task IDs based on dependencies.
 * Returns ordered list where every source comes before its target.
 * Only includes IDs that are downstream of changedIds.
 */
function topologicalSort(
  allItemIds: string[],
  deps: { source_id: string; target_id: string }[]
): string[] {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const id of allItemIds) {
    inDegree.set(id, 0);
    adj.set(id, []);
  }

  for (const d of deps) {
    if (inDegree.has(d.source_id) && inDegree.has(d.target_id)) {
      adj.get(d.source_id)!.push(d.target_id);
      inDegree.set(d.target_id, (inDegree.get(d.target_id) || 0) + 1);
    }
  }

  // Kahn's algorithm
  const queue = allItemIds.filter((id) => inDegree.get(id) === 0);
  const sorted: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    for (const next of adj.get(current) || []) {
      const newDeg = (inDegree.get(next) || 1) - 1;
      inDegree.set(next, newDeg);
      if (newDeg === 0) queue.push(next);
    }
  }

  return sorted;
}

/**
 * Advance a date by N WORKING days under the given bitmask.
 * Mirrors `addWorkingDays` from gantt-types.ts — duplicated here because this
 * file is "use server" and can't import client-side modules freely.
 */
function addWorkingDaysServer(date: Date, days: number, mask: number): Date {
  const result = new Date(date);
  const fullMask = 127;
  if (days === 0) return result;
  if ((mask & fullMask) === fullMask) {
    result.setDate(result.getDate() + days);
    return result;
  }
  const direction = days > 0 ? 1 : -1;
  let remaining = Math.abs(days);
  while (remaining > 0) {
    result.setDate(result.getDate() + direction);
    if ((mask & (1 << result.getDay())) !== 0) remaining--;
  }
  return result;
}

/** Count working days between two dates (inclusive) under the given mask. */
function workingDaysBetweenServer(start: Date, end: Date, mask: number): number {
  const fullMask = 127;
  const a = new Date(start); a.setHours(0, 0, 0, 0);
  const b = new Date(end); b.setHours(0, 0, 0, 0);
  if (a > b) return 0;
  if ((mask & fullMask) === fullMask) {
    return Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
  }
  let count = 0;
  const cursor = new Date(a);
  while (cursor <= b) {
    if ((mask & (1 << cursor.getDay())) !== 0) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

/**
 * Calculate the constrained date for a target based on dependency type + lag.
 * Returns the earliest allowed start or end date for the target.
 *
 * `lagDays` is interpreted as WORKING days under the given mask — this matches
 * how users think about dependency lag ("2-day buffer" = two working days).
 */
function calculateConstrainedDate(
  depType: number,
  lagDays: number,
  sourceStart: Date,
  sourceEnd: Date,
  mask: number
): { constrainedStart?: Date; constrainedEnd?: Date } {
  switch (depType) {
    case 0: // FS: target starts after source finishes
      return { constrainedStart: addWorkingDaysServer(sourceEnd, lagDays, mask) };
    case 1: // SS: target starts when source starts
      return { constrainedStart: addWorkingDaysServer(sourceStart, lagDays, mask) };
    case 2: // FF: target finishes when source finishes
      return { constrainedEnd: addWorkingDaysServer(sourceEnd, lagDays, mask) };
    case 3: // SF: target finishes when source starts
      return { constrainedEnd: addWorkingDaysServer(sourceStart, lagDays, mask) };
    default:
      return {};
  }
}

/**
 * Propagate dependency dates for a project.
 * Loads all items + deps, computes new dates via topological sort,
 * batch-updates changed items. 3 queries total.
 */
export async function propagateDependencyDates(
  projectId: string
): Promise<ActionResult<{ updatedCount: number }>> {
  const supabase = await createClient();

  // Query 0: project working-days mask (defaults to Mon-Fri = 62 if column absent)
  const { data: projectRow } = await (supabase as any)
    .from("projects")
    .select("gantt_working_days")
    .eq("id", projectId)
    .maybeSingle();
  const mask: number = projectRow?.gantt_working_days ?? 62;

  // Query 1: all items for this project
  const { data: items, error: itemsError } = await supabase
    .from("gantt_items")
    .select("id, start_date, end_date, item_type")
    .eq("project_id", projectId);

  if (itemsError || !items) {
    return { success: false, error: itemsError?.message || "Failed to load items" };
  }

  // Query 2: all dependencies for this project
  const { data: deps, error: depsError } = await supabase
    .from("gantt_dependencies")
    .select("source_id, target_id, dependency_type, lag_days")
    .eq("project_id", projectId);

  if (depsError || !deps) {
    return { success: false, error: depsError?.message || "Failed to load dependencies" };
  }

  if (deps.length === 0) return { success: true, data: { updatedCount: 0 } };

  // Build item lookup
  const itemMap = new Map<string, { start: Date; end: Date; type: string }>();
  for (const item of items) {
    itemMap.set(item.id, {
      start: new Date(item.start_date),
      end: new Date(item.end_date),
      type: item.item_type,
    });
  }

  // Topological sort — process sources before targets
  const sorted = topologicalSort(
    items.map((i) => i.id),
    deps
  );

  // Build reverse dep lookup: targetId → [deps pointing to it]
  const incomingDeps = new Map<string, typeof deps>();
  for (const dep of deps) {
    const existing = incomingDeps.get(dep.target_id) || [];
    existing.push(dep);
    incomingDeps.set(dep.target_id, existing);
  }

  // Propagate in topological order
  const updates: { id: string; start_date: string; end_date: string }[] = [];

  for (const itemId of sorted) {
    const item = itemMap.get(itemId);
    if (!item) continue;

    // Skip phases — they don't get auto-scheduled
    if (item.type === "phase") continue;

    const incoming = incomingDeps.get(itemId);
    if (!incoming || incoming.length === 0) continue;

    // Preserve working-day duration under the active mask. If mask was set
    // after the task was created, we honor the original intent (how many
    // working days the task spans), not the raw calendar gap.
    const workingDuration = Math.max(
      1,
      workingDaysBetweenServer(item.start, item.end, mask)
    );
    let newStart = item.start;
    let newEnd = item.end;

    // Align semantics: target snaps exactly to the tightest constraint across
    // all incoming dependencies. For multi-source conflicts, the most
    // restrictive (latest) constraint wins. Start-based constraints win over
    // end-based when both are present — duration is fixed, so setting the
    // start determines the end.
    let tightestStart: Date | null = null;
    let tightestEnd: Date | null = null;

    for (const dep of incoming) {
      const source = itemMap.get(dep.source_id);
      if (!source) continue;

      const constraint = calculateConstrainedDate(
        dep.dependency_type,
        dep.lag_days,
        source.start,
        source.end,
        mask
      );

      if (constraint.constrainedStart) {
        if (!tightestStart || constraint.constrainedStart > tightestStart) {
          tightestStart = constraint.constrainedStart;
        }
      }
      if (constraint.constrainedEnd) {
        if (!tightestEnd || constraint.constrainedEnd > tightestEnd) {
          tightestEnd = constraint.constrainedEnd;
        }
      }
    }

    if (tightestStart) {
      newStart = tightestStart;
      // End = start + (workingDuration - 1) working days, so end inclusive
      // matches the original working-day count.
      newEnd = addWorkingDaysServer(newStart, workingDuration - 1, mask);
    } else if (tightestEnd) {
      newEnd = tightestEnd;
      newStart = addWorkingDaysServer(newEnd, -(workingDuration - 1), mask);
    }

    // Only record if dates actually changed
    if (newStart.getTime() !== item.start.getTime() || newEnd.getTime() !== item.end.getTime()) {
      const startStr = newStart.toISOString().split("T")[0];
      const endStr = newEnd.toISOString().split("T")[0];
      updates.push({ id: itemId, start_date: startStr, end_date: endStr });

      // Update in-memory map so downstream tasks see the new dates
      itemMap.set(itemId, { start: newStart, end: newEnd, type: item.type });
    }
  }

  // Query 3: batch update all changed items
  if (updates.length > 0) {
    // Supabase doesn't support batch update with different values per row,
    // so we do individual updates in parallel (still one round-trip via Promise.all)
    const updatePromises = updates.map((u) =>
      supabase
        .from("gantt_items")
        .update({ start_date: u.start_date, end_date: u.end_date })
        .eq("id", u.id)
    );

    const results = await Promise.all(updatePromises);
    const failed = results.filter((r) => r.error);
    if (failed.length > 0) {
      console.error("Some date updates failed:", failed.map((f) => f.error));
    }
  }

  return { success: true, data: { updatedCount: updates.length } };
}

// Dependencies
export async function createTimelineDependency(
  input: GanttDependencyInput
): Promise<ActionResult<GanttDependency>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!userData || !["admin", "pm"].includes(userData.role)) {
    return { success: false, error: "Only PM and Admin can create dependencies" };
  }

  if (input.source_id === input.target_id) {
    return { success: false, error: "Cannot create a dependency to itself" };
  }

  // Validate endpoints: must be leaf tasks (no children) and not phase items.
  // Parent tasks have dates derived from their children via aggregation, so a
  // dependency pointing at them would be silently overridden. Enforcing this
  // here surfaces the issue instead of letting it fail invisibly.
  const [
    { data: sourceItem },
    { data: targetItem },
    { data: sourceChildren },
    { data: targetChildren },
  ] = await Promise.all([
    supabase.from("gantt_items").select("id, item_type").eq("id", input.source_id).single(),
    supabase.from("gantt_items").select("id, item_type").eq("id", input.target_id).single(),
    supabase.from("gantt_items").select("id").eq("parent_id", input.source_id).limit(1),
    supabase.from("gantt_items").select("id").eq("parent_id", input.target_id).limit(1),
  ]);

  if (!sourceItem || !targetItem) {
    return { success: false, error: "One or both tasks no longer exist" };
  }
  if (sourceItem.item_type === "phase" || targetItem.item_type === "phase") {
    return { success: false, error: "Dependencies cannot connect phase items" };
  }
  if ((sourceChildren && sourceChildren.length > 0) || (targetChildren && targetChildren.length > 0)) {
    return {
      success: false,
      error: "Dependencies must connect individual work tasks, not summary/parent tasks. Link specific subtasks instead.",
    };
  }

  // Cycle detection: load existing deps and check if this would create a loop
  const { data: existingDeps } = await supabase
    .from("gantt_dependencies")
    .select("source_id, target_id")
    .eq("project_id", input.project_id);

  if (existingDeps && detectCycle(input.source_id, input.target_id, existingDeps)) {
    return { success: false, error: "This would create a circular dependency" };
  }

  const { data: created, error } = await supabase
    .from("gantt_dependencies")
    .insert({
      project_id: input.project_id,
      source_id: input.source_id,
      target_id: input.target_id,
      dependency_type: input.dependency_type ?? 0,
      lag_days: input.lag_days ?? 0,
      created_by: user.id,
    })
    .select()
    .single();

  if (error || !created) {
    return { success: false, error: error?.message || "Failed to create dependency" };
  }

  // revalidatePath removed — React Query handles cache
  return { success: true, data: created };
}

export async function updateTimelineDependency(
  dependencyId: string,
  updates: { dependency_type?: DependencyType; lag_days?: number }
): Promise<ActionResult<GanttDependency>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!userData || !["admin", "pm"].includes(userData.role)) {
    return { success: false, error: "Only PM and Admin can update dependencies" };
  }

  const { data: existing } = await supabase
    .from("gantt_dependencies")
    .select("project_id")
    .eq("id", dependencyId)
    .single();

  if (!existing) return { success: false, error: "Dependency not found" };

  const { data: updated, error } = await supabase
    .from("gantt_dependencies")
    .update({
      dependency_type: updates.dependency_type,
      lag_days: updates.lag_days,
    })
    .eq("id", dependencyId)
    .select()
    .single();

  if (error || !updated) {
    return { success: false, error: error?.message || "Failed to update dependency" };
  }

  // revalidatePath removed — React Query handles cache
  return { success: true, data: updated };
}

export async function deleteTimelineDependency(dependencyId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!userData || !["admin", "pm"].includes(userData.role)) {
    return { success: false, error: "Only PM and Admin can delete dependencies" };
  }

  const { data: existing } = await supabase
    .from("gantt_dependencies")
    .select("project_id")
    .eq("id", dependencyId)
    .single();

  if (!existing) return { success: false, error: "Dependency not found" };

  const { error } = await supabase.from("gantt_dependencies").delete().eq("id", dependencyId);
  if (error) {
    return { success: false, error: error.message };
  }

  // revalidatePath removed — React Query handles cache
  return { success: true };
}

// ============================================================================
// Project Working Days (per-day bitmask)
//
// Stored in projects.gantt_working_days as SMALLINT bitmask.
// Bit index matches JS Date.getDay(): bit 0 = Sun, 1 = Mon, ..., 6 = Sat.
// Default 62 (0b0111110) = Mon-Fri.
// ============================================================================

export async function getProjectWorkingDays(projectId: string): Promise<number> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 62;

  const { data } = await (supabase as any)
    .from("projects")
    .select("gantt_working_days")
    .eq("id", projectId)
    .maybeSingle();

  return data?.gantt_working_days ?? 62;
}

/**
 * Update the per-project working-days bitmask and auto-adjust each task's
 * end_date so that its working-day duration (under the OLD mask) is preserved
 * under the NEW mask.
 *
 * Example: a 5-working-day task (Mon→Fri under Mon-Fri mask). If Sat becomes a
 * working day, the 5-day count is recomputed under the new mask — task still
 * spans 5 working days, but may now finish earlier on the calendar.
 */
export async function setProjectWorkingDays(
  projectId: string,
  newMask: number
): Promise<ActionResult<{ updatedCount: number }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!userData || !["admin", "pm"].includes(userData.role)) {
    return { success: false, error: "Only PM and Admin can change working days" };
  }

  // Sanitize: 7-bit range, non-zero (all-off would make every task zero-length)
  const clamped = newMask & 127;
  if (clamped === 0) {
    return { success: false, error: "At least one day must be a working day" };
  }

  // Load current mask so we can compute each task's pre-existing working-day count
  const { data: projectRow } = await (supabase as any)
    .from("projects")
    .select("gantt_working_days")
    .eq("id", projectId)
    .maybeSingle();
  const oldMask: number = projectRow?.gantt_working_days ?? 62;

  // Load all non-phase items (phases are derived, don't auto-adjust)
  const { data: items, error: itemsError } = await supabase
    .from("gantt_items")
    .select("id, start_date, end_date, item_type")
    .eq("project_id", projectId)
    .neq("item_type", "phase");

  if (itemsError) {
    return { success: false, error: itemsError.message };
  }

  // Compute new end_date for each task. Milestones are zero-width (start==end),
  // so we skip them — no duration to preserve.
  const updates: { id: string; end_date: string }[] = [];
  for (const item of items || []) {
    if (item.item_type === "milestone") continue;

    const start = new Date(item.start_date);
    const end = new Date(item.end_date);
    const oldDuration = workingDaysBetweenServer(start, end, oldMask);
    if (oldDuration <= 0) continue;

    const newEnd = addWorkingDaysServer(start, oldDuration - 1, clamped);
    const newEndStr = newEnd.toISOString().split("T")[0];
    if (newEndStr !== item.end_date) {
      updates.push({ id: item.id, end_date: newEndStr });
    }
  }

  // Persist the new mask first so subsequent dependency propagation sees it
  const { error: updErr } = await (supabase as any)
    .from("projects")
    .update({ gantt_working_days: clamped })
    .eq("id", projectId);

  if (updErr) {
    return { success: false, error: updErr.message };
  }

  // Apply date adjustments in parallel
  if (updates.length > 0) {
    const results = await Promise.all(
      updates.map((u) =>
        supabase.from("gantt_items").update({ end_date: u.end_date }).eq("id", u.id)
      )
    );
    const failed = results.filter((r) => r.error);
    if (failed.length > 0) {
      console.error("Working-days adjust: some updates failed", failed.map((f) => f.error));
    }
  }

  return { success: true, data: { updatedCount: updates.length } };
}

