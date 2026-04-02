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
export type PhaseKey = "design" | "production" | "shipping" | "installation";
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
  is_on_critical_path?: boolean;
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
  is_on_critical_path?: boolean;
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
  { key: "design", name: "Design", order: 1, color: "#64748b" },
  { key: "production", name: "Production", order: 2, color: "#3b82f6" },
  { key: "shipping", name: "Shipping", order: 3, color: "#f59e0b" },
  { key: "installation", name: "Installation", order: 4, color: "#8b5cf6" },
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

  // Recompute parent dates from children (phases and parent tasks)
  itemsById.forEach((item) => {
    const children = (childrenMap.get(item.id) || []).map((c) => itemsById.get(c.id)).filter(Boolean) as GanttItem[];
    if (children.length === 0) return;
    const minStart = children.reduce((min, c) => (c.start_date < min ? c.start_date : min), children[0].start_date);
    const maxEnd = children.reduce((max, c) => (c.end_date > max ? c.end_date : max), children[0].end_date);
    item.start_date = minStart;
    item.end_date = maxEnd;
    if (item.item_type === "phase") {
      item.progress = average(children.map((c) => c.progress || 0));
    }
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

  const { data: created, error } = await supabase
    .from("gantt_items")
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
      is_on_critical_path: input.is_on_critical_path ?? false,
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
  if (input.start_date !== undefined) updateData.start_date = input.start_date;
  if (input.end_date !== undefined) updateData.end_date = input.end_date;
  if (input.parent_id !== undefined) updateData.parent_id = input.parent_id;
  if (input.priority !== undefined) updateData.priority = input.priority;
  if (input.progress_override !== undefined) updateData.progress_override = input.progress_override;
  if (input.is_completed !== undefined) updateData.is_completed = input.is_completed;
  if (input.color !== undefined) updateData.color = input.color;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.is_on_critical_path !== undefined) updateData.is_on_critical_path = input.is_on_critical_path;

  const { data: updated, error } = await supabase
    .from("gantt_items")
    .update(updateData)
    .eq("id", timelineId)
    .select()
    .single();

  if (error || !updated) {
    console.error("Error updating gantt item:", error);
    return { success: false, error: error?.message || "Update failed" };
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

export async function updateTimelineItemDates(
  timelineId: string,
  startDate: string,
  endDate: string
): Promise<ActionResult> {
  const result = await updateTimelineItem(timelineId, { start_date: startDate, end_date: endDate });
  return { success: result.success, error: result.error };
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

  // Reparent children to the deleted item's parent (grandparent) before deleting
  const { error: reparentError } = await supabase
    .from("gantt_items")
    .update({ parent_id: existing.parent_id })
    .eq("parent_id", timelineId);

  if (reparentError) {
    console.error("Error reparenting children:", reparentError);
    return { success: false, error: "Failed to reparent children" };
  }

  const { error } = await supabase.from("gantt_items").delete().eq("id", timelineId);
  if (error) {
    console.error("Error deleting gantt item:", error);
    return { success: false, error: error.message };
  }

  // revalidatePath removed — React Query handles cache
  return { success: true };
}

export async function reorderTimelineItems(projectId: string, itemIds: string[]): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  if (itemIds.length === 0) return { success: true };

  // PERF: Batch updates in groups of 5 instead of N concurrent writes.
  // Before: 50 tasks = 50 simultaneous DB writes (caused IO budget depletion).
  // After: 50 tasks = 10 sequential batches of 5 writes each.
  const BATCH_SIZE = 5;
  for (let i = 0; i < itemIds.length; i += BATCH_SIZE) {
    const batch = itemIds.slice(i, i + BATCH_SIZE);
    const updates = batch.map((id, idx) =>
      supabase.from("gantt_items").update({ sort_order: i + idx + 1 }).eq("id", id).eq("project_id", projectId)
    );
    const results = await Promise.all(updates);
    if (results.some((r) => r.error)) {
      return { success: false, error: "Failed to reorder items" };
    }
  }

  // revalidatePath removed — React Query handles cache
  return { success: true };
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
// Baselines
// ============================================================================

export interface GanttBaseline {
  id: string;
  project_id: string;
  name: string;
  created_by: string | null;
  created_at: string;
}

export interface GanttBaselineItem {
  id: string;
  baseline_id: string;
  gantt_item_id: string;
  start_date: string;
  end_date: string;
  progress: number;
}

/** Save a baseline snapshot: copies all gantt_items dates for a project */
export async function saveBaseline(
  projectId: string,
  name: string
): Promise<ActionResult<GanttBaseline>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!userData || !["admin", "pm"].includes(userData.role)) {
    return { success: false, error: "Only PM and Admin can save baselines" };
  }

  // Create baseline header
  const { data: baselineRaw, error: baselineError } = await supabase
    .from("gantt_baselines" as any)
    .insert({ project_id: projectId, name, created_by: user.id })
    .select()
    .single();

  const baseline = baselineRaw as GanttBaseline | null;
  if (baselineError || !baseline) {
    return { success: false, error: baselineError?.message || "Failed to create baseline" };
  }

  // Copy all gantt items for this project
  const { data: items } = await supabase
    .from("gantt_items")
    .select("id, start_date, end_date, progress_override")
    .eq("project_id", projectId);

  if (items && items.length > 0) {
    const baselineItems = items.map((item) => ({
      baseline_id: baseline.id,
      gantt_item_id: item.id,
      start_date: item.start_date,
      end_date: item.end_date,
      progress: item.progress_override ?? 0,
    }));

    await supabase.from("gantt_baseline_items" as any).insert(baselineItems);
  }

  // revalidatePath removed — React Query handles cache
  return { success: true, data: baseline };
}

/** List all baselines for a project */
export async function getBaselines(projectId: string): Promise<GanttBaseline[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("gantt_baselines" as any)
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  return (data ?? []) as unknown as GanttBaseline[];
}

/** Get baseline items for a specific baseline */
export async function getBaselineItems(baselineId: string): Promise<GanttBaselineItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("gantt_baseline_items" as any)
    .select("*")
    .eq("baseline_id", baselineId);

  return (data ?? []) as unknown as GanttBaselineItem[];
}

/** Delete a baseline and its items (cascade) */
export async function deleteBaseline(baselineId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase.from("gantt_baselines" as any).delete().eq("id", baselineId);
  if (error) return { success: false, error: error.message };

  return { success: true };
}
