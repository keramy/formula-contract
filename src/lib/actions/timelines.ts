"use server";

/**
 * Timeline Server Actions
 *
 * Handles project timeline CRUD operations for Gantt chart:
 * - Create/update/delete timeline items (phases and tasks)
 * - Link/unlink scope items and milestones
 * - Reorder timeline items
 */

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity-log/actions";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/constants";

// ============================================================================
// Temporary Type Helper
// Note: After applying migration 036, regenerate Supabase types to remove this
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

// ============================================================================
// Types
// ============================================================================

export type TimelineItemType = "phase" | "task";

export interface TimelineItem {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  item_type: TimelineItemType;
  start_date: string;
  end_date: string;
  color: string | null;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Hierarchy fields
  parent_id: string | null;
  hierarchy_level: number;
  // Joined data
  linked_scope_items?: LinkedScopeItem[];
  linked_milestones?: LinkedMilestone[];
  // Calculated fields
  progress?: number;
}

// Dependency type: 0=FS, 1=SS, 2=FF, 3=SF
export type DependencyType = 0 | 1 | 2 | 3;

export interface TimelineDependency {
  id: string;
  project_id: string;
  source_id: string;
  target_id: string;
  dependency_type: DependencyType;
  lag_days: number;
  created_at: string;
  created_by: string | null;
}

export interface TimelineDependencyInput {
  project_id: string;
  source_id: string;
  target_id: string;
  dependency_type?: DependencyType;
  lag_days?: number;
}

export interface LinkedScopeItem {
  id: string;
  scope_item_id: string;
  scope_item?: {
    id: string;
    item_code: string;
    name: string;
    production_percentage: number | null;
  };
}

export interface LinkedMilestone {
  id: string;
  milestone_id: string;
  milestone?: {
    id: string;
    name: string;
    due_date: string;
    is_completed: boolean;
  };
}

export interface TimelineItemInput {
  project_id: string;
  name: string;
  description?: string | null;
  item_type: TimelineItemType;
  start_date: string;
  end_date: string;
  color?: string | null;
  linked_scope_item_ids?: string[];
  linked_milestone_ids?: string[];
}

export interface ActionResult<T = void> {
  success: boolean;
  error?: string;
  data?: T;
}

// ============================================================================
// Get Timeline Items for a Project
// ============================================================================

export async function getTimelineItems(
  projectId: string
): Promise<TimelineItem[]> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get timeline items with linked entities
  const { data: timelines, error } = await (supabase as AnySupabaseClient)
    .from("project_timelines")
    .select(`
      *,
      linked_scope_items:timeline_scope_items(
        id,
        scope_item_id,
        scope_item:scope_items(id, item_code, name, production_percentage)
      ),
      linked_milestones:timeline_milestones(
        id,
        milestone_id,
        milestone:milestones(id, name, due_date, is_completed)
      )
    `)
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching timeline items:", error);
    return [];
  }

  // Calculate progress for each timeline item
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (timelines || []).map((item: any) => {
    const linkedItems = item.linked_scope_items || [];
    let progress = 0;

    if (linkedItems.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalPercentage = linkedItems.reduce((sum: number, link: any) => {
        const pct = link.scope_item?.production_percentage || 0;
        return sum + pct;
      }, 0);
      progress = Math.round(totalPercentage / linkedItems.length);
    }

    return {
      ...item,
      // Ensure hierarchy fields have defaults (for backward compatibility)
      parent_id: item.parent_id ?? null,
      hierarchy_level: item.hierarchy_level ?? 0,
      progress,
    };
  });
}

// ============================================================================
// Create Timeline Item
// ============================================================================

export async function createTimelineItem(
  input: TimelineItemInput
): Promise<ActionResult<TimelineItem>> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Check user role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData || !["admin", "pm"].includes(userData.role)) {
    return { success: false, error: "Only PM and Admin can create timeline items" };
  }

  // Get max sort_order for project
  const { data: maxOrder } = await (supabase as AnySupabaseClient)
    .from("project_timelines")
    .select("sort_order")
    .eq("project_id", input.project_id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (maxOrder?.sort_order || 0) + 1;

  // Insert timeline item
  const { data: timeline, error } = await (supabase as AnySupabaseClient)
    .from("project_timelines")
    .insert({
      project_id: input.project_id,
      name: input.name,
      description: input.description || null,
      item_type: input.item_type,
      start_date: input.start_date,
      end_date: input.end_date,
      color: input.color || null,
      sort_order: nextOrder,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating timeline item:", error);
    return { success: false, error: error.message };
  }

  // Link scope items if provided
  if (input.linked_scope_item_ids && input.linked_scope_item_ids.length > 0) {
    const scopeLinks = input.linked_scope_item_ids.map((scopeItemId) => ({
      timeline_id: timeline.id,
      scope_item_id: scopeItemId,
    }));

    const { error: linkError } = await (supabase as AnySupabaseClient)
      .from("timeline_scope_items")
      .insert(scopeLinks);

    if (linkError) {
      console.error("Error linking scope items:", linkError);
    }
  }

  // Link milestones if provided
  if (input.linked_milestone_ids && input.linked_milestone_ids.length > 0) {
    const milestoneLinks = input.linked_milestone_ids.map((milestoneId) => ({
      timeline_id: timeline.id,
      milestone_id: milestoneId,
    }));

    const { error: linkError } = await (supabase as AnySupabaseClient)
      .from("timeline_milestones")
      .insert(milestoneLinks);

    if (linkError) {
      console.error("Error linking milestones:", linkError);
    }
  }

  // Log activity
  await logActivity({
    action: ACTIVITY_ACTIONS.MILESTONE_CREATED, // Reuse for now
    entityType: "timeline",
    entityId: timeline.id,
    projectId: input.project_id,
    details: {
      name: input.name,
      item_type: input.item_type,
      start_date: input.start_date,
      end_date: input.end_date,
    },
  });

  revalidatePath(`/projects/${input.project_id}`);
  return { success: true, data: timeline };
}

// ============================================================================
// Update Timeline Item
// ============================================================================

export async function updateTimelineItem(
  timelineId: string,
  input: Partial<TimelineItemInput>
): Promise<ActionResult<TimelineItem>> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Check user role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData || !["admin", "pm"].includes(userData.role)) {
    return { success: false, error: "Only PM and Admin can update timeline items" };
  }

  // Get existing item for project_id
  const { data: existing } = await (supabase as AnySupabaseClient)
    .from("project_timelines")
    .select("project_id, name")
    .eq("id", timelineId)
    .single();

  if (!existing) {
    return { success: false, error: "Timeline item not found" };
  }

  // Build update object (only include provided fields)
  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.item_type !== undefined) updateData.item_type = input.item_type;
  if (input.start_date !== undefined) updateData.start_date = input.start_date;
  if (input.end_date !== undefined) updateData.end_date = input.end_date;
  if (input.color !== undefined) updateData.color = input.color;

  // Update timeline item
  const { data: timeline, error } = await (supabase as AnySupabaseClient)
    .from("project_timelines")
    .update(updateData)
    .eq("id", timelineId)
    .select()
    .single();

  if (error) {
    console.error("Error updating timeline item:", error);
    return { success: false, error: error.message };
  }

  // Update scope item links if provided
  if (input.linked_scope_item_ids !== undefined) {
    // Remove existing links
    await (supabase as AnySupabaseClient)
      .from("timeline_scope_items")
      .delete()
      .eq("timeline_id", timelineId);

    // Add new links
    if (input.linked_scope_item_ids.length > 0) {
      const scopeLinks = input.linked_scope_item_ids.map((scopeItemId) => ({
        timeline_id: timelineId,
        scope_item_id: scopeItemId,
      }));

      await (supabase as AnySupabaseClient).from("timeline_scope_items").insert(scopeLinks);
    }
  }

  // Update milestone links if provided
  if (input.linked_milestone_ids !== undefined) {
    // Remove existing links
    await (supabase as AnySupabaseClient)
      .from("timeline_milestones")
      .delete()
      .eq("timeline_id", timelineId);

    // Add new links
    if (input.linked_milestone_ids.length > 0) {
      const milestoneLinks = input.linked_milestone_ids.map((milestoneId) => ({
        timeline_id: timelineId,
        milestone_id: milestoneId,
      }));

      await (supabase as AnySupabaseClient).from("timeline_milestones").insert(milestoneLinks);
    }
  }

  // Log activity
  await logActivity({
    action: ACTIVITY_ACTIONS.MILESTONE_UPDATED,
    entityType: "timeline",
    entityId: timelineId,
    projectId: existing.project_id,
    details: {
      name: input.name || existing.name,
    },
  });

  revalidatePath(`/projects/${existing.project_id}`);
  return { success: true, data: timeline };
}

// ============================================================================
// Update Timeline Item Dates (for drag operations)
// ============================================================================

export async function updateTimelineItemDates(
  timelineId: string,
  startDate: string,
  endDate: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Check user role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData || !["admin", "pm"].includes(userData.role)) {
    return { success: false, error: "Only PM and Admin can update timeline items" };
  }

  // Get existing for project_id
  const { data: existing } = await (supabase as AnySupabaseClient)
    .from("project_timelines")
    .select("project_id")
    .eq("id", timelineId)
    .single();

  if (!existing) {
    return { success: false, error: "Timeline item not found" };
  }

  // Update dates
  const { error } = await (supabase as AnySupabaseClient)
    .from("project_timelines")
    .update({
      start_date: startDate,
      end_date: endDate,
    })
    .eq("id", timelineId);

  if (error) {
    console.error("Error updating timeline dates:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/projects/${existing.project_id}`);
  return { success: true };
}

// ============================================================================
// Delete Timeline Item
// ============================================================================

export async function deleteTimelineItem(
  timelineId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Check user role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData || !["admin", "pm"].includes(userData.role)) {
    return { success: false, error: "Only PM and Admin can delete timeline items" };
  }

  // Get timeline details for logging
  const { data: timeline } = await (supabase as AnySupabaseClient)
    .from("project_timelines")
    .select("project_id, name")
    .eq("id", timelineId)
    .single();

  if (!timeline) {
    return { success: false, error: "Timeline item not found" };
  }

  // Delete timeline item (cascade deletes links)
  const { error } = await (supabase as AnySupabaseClient)
    .from("project_timelines")
    .delete()
    .eq("id", timelineId);

  if (error) {
    console.error("Error deleting timeline item:", error);
    return { success: false, error: error.message };
  }

  // Log activity
  await logActivity({
    action: ACTIVITY_ACTIONS.MILESTONE_DELETED,
    entityType: "timeline",
    entityId: timelineId,
    projectId: timeline.project_id,
    details: { name: timeline.name },
  });

  revalidatePath(`/projects/${timeline.project_id}`);
  return { success: true };
}

// ============================================================================
// Reorder Timeline Items
// ============================================================================

export async function reorderTimelineItems(
  projectId: string,
  itemIds: string[]
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Update sort_order for each item
  const updates = itemIds.map((id, index) =>
    (supabase as AnySupabaseClient)
      .from("project_timelines")
      .update({ sort_order: index })
      .eq("id", id)
      .eq("project_id", projectId)
  );

  const results = await Promise.all(updates);
  const hasError = results.some((r) => r.error);

  if (hasError) {
    return { success: false, error: "Failed to reorder items" };
  }

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

// ============================================================================
// Duplicate Timeline Item
// ============================================================================

export async function duplicateTimelineItem(
  timelineId: string
): Promise<ActionResult<TimelineItem>> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Get original item with links
  const { data: original } = await (supabase as AnySupabaseClient)
    .from("project_timelines")
    .select(`
      *,
      linked_scope_items:timeline_scope_items(scope_item_id),
      linked_milestones:timeline_milestones(milestone_id)
    `)
    .eq("id", timelineId)
    .single();

  if (!original) {
    return { success: false, error: "Timeline item not found" };
  }

  // Create duplicate with "(Copy)" suffix
  return createTimelineItem({
    project_id: original.project_id,
    name: `${original.name} (Copy)`,
    description: original.description,
    item_type: original.item_type,
    start_date: original.start_date,
    end_date: original.end_date,
    color: original.color,
    linked_scope_item_ids: original.linked_scope_items?.map((l: { scope_item_id: string }) => l.scope_item_id) || [],
    linked_milestone_ids: original.linked_milestones?.map((l: { milestone_id: string }) => l.milestone_id) || [],
  });
}

// ============================================================================
// DEPENDENCY MANAGEMENT
// ============================================================================

/**
 * Get all dependencies for a project
 */
export async function getTimelineDependencies(
  projectId: string
): Promise<TimelineDependency[]> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: dependencies, error } = await (supabase as AnySupabaseClient)
    .from("timeline_dependencies")
    .select("*")
    .eq("project_id", projectId);

  if (error) {
    console.error("Error fetching timeline dependencies:", error);
    return [];
  }

  return dependencies || [];
}

/**
 * Create a dependency link between two timeline items
 */
export async function createTimelineDependency(
  input: TimelineDependencyInput
): Promise<ActionResult<TimelineDependency>> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Check user role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData || !["admin", "pm"].includes(userData.role)) {
    return { success: false, error: "Only PM and Admin can create dependencies" };
  }

  // Validate that source and target are different
  if (input.source_id === input.target_id) {
    return { success: false, error: "Cannot create a dependency to itself" };
  }

  // Check for circular dependency (simple check: target cannot already link to source)
  const { data: existingReverse } = await (supabase as AnySupabaseClient)
    .from("timeline_dependencies")
    .select("id")
    .eq("source_id", input.target_id)
    .eq("target_id", input.source_id)
    .single();

  if (existingReverse) {
    return { success: false, error: "Circular dependency detected: target already links to source" };
  }

  // Insert dependency
  const { data: dependency, error } = await (supabase as AnySupabaseClient)
    .from("timeline_dependencies")
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

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Dependency already exists between these items" };
    }
    console.error("Error creating dependency:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/projects/${input.project_id}`);
  return { success: true, data: dependency };
}

/**
 * Update an existing dependency
 */
export async function updateTimelineDependency(
  dependencyId: string,
  updates: { dependency_type?: DependencyType; lag_days?: number }
): Promise<ActionResult<TimelineDependency>> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Check user role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData || !["admin", "pm"].includes(userData.role)) {
    return { success: false, error: "Only PM and Admin can update dependencies" };
  }

  // Get existing dependency for project_id
  const { data: existing } = await (supabase as AnySupabaseClient)
    .from("timeline_dependencies")
    .select("project_id")
    .eq("id", dependencyId)
    .single();

  if (!existing) {
    return { success: false, error: "Dependency not found" };
  }

  // Build update object
  const updateData: Record<string, unknown> = {};
  if (updates.dependency_type !== undefined) updateData.dependency_type = updates.dependency_type;
  if (updates.lag_days !== undefined) updateData.lag_days = updates.lag_days;

  // Update
  const { data: dependency, error } = await (supabase as AnySupabaseClient)
    .from("timeline_dependencies")
    .update(updateData)
    .eq("id", dependencyId)
    .select()
    .single();

  if (error) {
    console.error("Error updating dependency:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/projects/${existing.project_id}`);
  return { success: true, data: dependency };
}

/**
 * Delete a dependency link
 */
export async function deleteTimelineDependency(
  dependencyId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Check user role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData || !["admin", "pm"].includes(userData.role)) {
    return { success: false, error: "Only PM and Admin can delete dependencies" };
  }

  // Get dependency for project_id
  const { data: dependency } = await (supabase as AnySupabaseClient)
    .from("timeline_dependencies")
    .select("project_id")
    .eq("id", dependencyId)
    .single();

  if (!dependency) {
    return { success: false, error: "Dependency not found" };
  }

  // Delete
  const { error } = await (supabase as AnySupabaseClient)
    .from("timeline_dependencies")
    .delete()
    .eq("id", dependencyId);

  if (error) {
    console.error("Error deleting dependency:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/projects/${dependency.project_id}`);
  return { success: true };
}

// ============================================================================
// HIERARCHY MANAGEMENT (Indent/Outdent)
// ============================================================================

/**
 * Indent a timeline item (make it a child of the previous sibling)
 */
export async function indentTimelineItem(
  timelineId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Check user role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData || !["admin", "pm"].includes(userData.role)) {
    return { success: false, error: "Only PM and Admin can modify hierarchy" };
  }

  // Get the item and its siblings
  const { data: item } = await (supabase as AnySupabaseClient)
    .from("project_timelines")
    .select("id, project_id, parent_id, hierarchy_level, sort_order")
    .eq("id", timelineId)
    .single();

  if (!item) {
    return { success: false, error: "Timeline item not found" };
  }

  // Find the previous sibling (same parent, lower sort_order)
  const { data: siblings } = await (supabase as AnySupabaseClient)
    .from("project_timelines")
    .select("id, sort_order")
    .eq("project_id", item.project_id)
    .eq("parent_id", item.parent_id)
    .lt("sort_order", item.sort_order)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (!siblings || siblings.length === 0) {
    return { success: false, error: "No previous sibling to indent under" };
  }

  const newParentId = siblings[0].id;

  // Update the item's parent and hierarchy level
  const { error } = await (supabase as AnySupabaseClient)
    .from("project_timelines")
    .update({
      parent_id: newParentId,
      hierarchy_level: item.hierarchy_level + 1,
    })
    .eq("id", timelineId);

  if (error) {
    console.error("Error indenting timeline item:", error);
    return { success: false, error: error.message };
  }

  // Also update any children to increment their hierarchy level
  await incrementChildrenHierarchy(supabase, timelineId);

  revalidatePath(`/projects/${item.project_id}`);
  return { success: true };
}

/**
 * Outdent a timeline item (move it up one level in hierarchy)
 */
export async function outdentTimelineItem(
  timelineId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Check user role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData || !["admin", "pm"].includes(userData.role)) {
    return { success: false, error: "Only PM and Admin can modify hierarchy" };
  }

  // Get the item
  const { data: item } = await (supabase as AnySupabaseClient)
    .from("project_timelines")
    .select("id, project_id, parent_id, hierarchy_level")
    .eq("id", timelineId)
    .single();

  if (!item) {
    return { success: false, error: "Timeline item not found" };
  }

  if (item.hierarchy_level === 0 || !item.parent_id) {
    return { success: false, error: "Item is already at top level" };
  }

  // Get the parent to find the grandparent
  const { data: parent } = await (supabase as AnySupabaseClient)
    .from("project_timelines")
    .select("parent_id")
    .eq("id", item.parent_id)
    .single();

  const newParentId = parent?.parent_id || null;
  const newLevel = Math.max(0, item.hierarchy_level - 1);

  // Update the item's parent and hierarchy level
  const { error } = await (supabase as AnySupabaseClient)
    .from("project_timelines")
    .update({
      parent_id: newParentId,
      hierarchy_level: newLevel,
    })
    .eq("id", timelineId);

  if (error) {
    console.error("Error outdenting timeline item:", error);
    return { success: false, error: error.message };
  }

  // Also update any children to decrement their hierarchy level
  await decrementChildrenHierarchy(supabase, timelineId);

  revalidatePath(`/projects/${item.project_id}`);
  return { success: true };
}

/**
 * Update hierarchy level for timeline item and optionally its parent
 */
export async function updateTimelineHierarchy(
  timelineId: string,
  parentId: string | null,
  hierarchyLevel: number
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Get existing item
  const { data: item } = await (supabase as AnySupabaseClient)
    .from("project_timelines")
    .select("project_id")
    .eq("id", timelineId)
    .single();

  if (!item) {
    return { success: false, error: "Timeline item not found" };
  }

  // Update
  const { error } = await (supabase as AnySupabaseClient)
    .from("project_timelines")
    .update({
      parent_id: parentId,
      hierarchy_level: hierarchyLevel,
    })
    .eq("id", timelineId);

  if (error) {
    console.error("Error updating hierarchy:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/projects/${item.project_id}`);
  return { success: true };
}

// Helper function to recursively increment children's hierarchy levels
async function incrementChildrenHierarchy(
  supabase: AnySupabaseClient,
  parentId: string
): Promise<void> {
  // Get direct children
  const { data: children } = await supabase
    .from("project_timelines")
    .select("id, hierarchy_level")
    .eq("parent_id", parentId);

  if (!children || children.length === 0) return;

  // Update each child and recurse
  for (const child of children) {
    await supabase
      .from("project_timelines")
      .update({ hierarchy_level: child.hierarchy_level + 1 })
      .eq("id", child.id);

    await incrementChildrenHierarchy(supabase, child.id);
  }
}

// Helper function to recursively decrement children's hierarchy levels
async function decrementChildrenHierarchy(
  supabase: AnySupabaseClient,
  parentId: string
): Promise<void> {
  // Get direct children
  const { data: children } = await supabase
    .from("project_timelines")
    .select("id, hierarchy_level")
    .eq("parent_id", parentId);

  if (!children || children.length === 0) return;

  // Update each child and recurse
  for (const child of children) {
    await supabase
      .from("project_timelines")
      .update({ hierarchy_level: Math.max(0, child.hierarchy_level - 1) })
      .eq("id", child.id);

    await decrementChildrenHierarchy(supabase, child.id);
  }
}
