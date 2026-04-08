"use server";

/**
 * Project Areas Server Actions
 *
 * CRUD for project areas (floor → room registry) plus bulk upsert for Excel import.
 * Auth: admin/pm can write, client/management can read.
 */

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-log/actions";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/constants";
import type { ActionResult } from "./scope-items";

// ============================================================================
// Types
// ============================================================================

export interface ProjectArea {
  id: string;
  project_id: string;
  floor: string;
  name: string;
  area_code: string;
  sort_order: number | null;
  is_deleted: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AreaInput {
  floor: string;
  name: string;
  area_code: string;
  sort_order?: number;
}

export interface BulkAreaInput {
  area_code: string;
  area_name: string;
  floor: string;
}

// ============================================================================
// Helpers
// ============================================================================

async function requireWriteAccess(): Promise<{ supabase: Awaited<ReturnType<typeof createClient>>; userId: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData || !["admin", "pm"].includes(userData.role)) {
    throw new Error("Insufficient permissions");
  }

  return { supabase, userId: user.id };
}

// ============================================================================
// CRUD Actions
// ============================================================================

/**
 * Fetch all areas for a project, ordered by floor → sort_order → name
 */
export async function getProjectAreas(projectId: string): Promise<ProjectArea[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("project_areas")
    .select("*")
    .eq("project_id", projectId)
    .eq("is_deleted", false)
    .order("floor")
    .order("sort_order")
    .order("name");

  if (error) {
    console.error("Error fetching project areas:", error);
    return [];
  }

  return data as ProjectArea[];
}

/**
 * Create a new project area
 */
export async function createProjectArea(
  projectId: string,
  input: AreaInput
): Promise<ActionResult<ProjectArea>> {
  try {
    const { supabase, userId } = await requireWriteAccess();

    const { data, error } = await supabase
      .from("project_areas")
      .insert({
        project_id: projectId,
        floor: input.floor.trim(),
        name: input.name.trim(),
        area_code: input.area_code.trim().toUpperCase(),
        sort_order: input.sort_order ?? 0,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: `Area code "${input.area_code}" already exists in this project` };
      }
      return { success: false, error: error.message };
    }

    await logActivity({
      action: ACTIVITY_ACTIONS.AREA_CREATED,
      entityType: "project_area",
      entityId: data.id,
      projectId,
      details: { area_code: data.area_code, name: data.name, floor: data.floor },
    });

    return { success: true, data: data as ProjectArea };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Update an existing project area
 */
export async function updateProjectArea(
  areaId: string,
  input: Partial<AreaInput>
): Promise<ActionResult<ProjectArea>> {
  try {
    const { supabase } = await requireWriteAccess();

    const updateData: Record<string, unknown> = {};
    if (input.floor !== undefined) updateData.floor = input.floor.trim();
    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.area_code !== undefined) updateData.area_code = input.area_code.trim().toUpperCase();
    if (input.sort_order !== undefined) updateData.sort_order = input.sort_order;

    const { data, error } = await supabase
      .from("project_areas")
      .update(updateData)
      .eq("id", areaId)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: `Area code "${input.area_code}" already exists in this project` };
      }
      return { success: false, error: error.message };
    }

    await logActivity({
      action: ACTIVITY_ACTIONS.AREA_UPDATED,
      entityType: "project_area",
      entityId: data.id,
      projectId: data.project_id,
      details: { area_code: data.area_code, updated_fields: Object.keys(updateData) },
    });

    return { success: true, data: data as ProjectArea };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Soft-delete a project area (scope items keep existing, lose area link via ON DELETE SET NULL behavior on soft-delete refresh)
 */
export async function deleteProjectArea(areaId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireWriteAccess();

    // Get area info for logging
    const { data: area } = await supabase
      .from("project_areas")
      .select("id, project_id, area_code, name")
      .eq("id", areaId)
      .single();

    if (!area) {
      return { success: false, error: "Area not found" };
    }

    // Soft delete the area
    const { error } = await supabase
      .from("project_areas")
      .update({ is_deleted: true })
      .eq("id", areaId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Unlink scope items from deleted area
    await supabase
      .from("scope_items")
      .update({ area_id: null })
      .eq("area_id", areaId);

    await logActivity({
      action: ACTIVITY_ACTIONS.AREA_DELETED,
      entityType: "project_area",
      entityId: area.id,
      projectId: area.project_id,
      details: { area_code: area.area_code, name: area.name },
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// ============================================================================
// Bulk Upsert for Excel Import
// ============================================================================

/**
 * Bulk get-or-create areas from Excel import data.
 * Looks up existing areas by (project_id, area_code), creates missing ones.
 * Returns a Map<area_code, area_id> for linking scope items.
 */
export async function bulkGetOrCreateAreas(
  projectId: string,
  areas: BulkAreaInput[]
): Promise<ActionResult<Map<string, string>>> {
  try {
    const { supabase } = await requireWriteAccess();

    if (areas.length === 0) {
      return { success: true, data: new Map() };
    }

    // Deduplicate by area_code (take first occurrence)
    const uniqueAreas = new Map<string, BulkAreaInput>();
    for (const area of areas) {
      const code = area.area_code.trim().toUpperCase();
      if (!uniqueAreas.has(code)) {
        uniqueAreas.set(code, { ...area, area_code: code });
      }
    }

    const areaCodes = Array.from(uniqueAreas.keys());

    // Fetch existing areas for this project (including soft-deleted to avoid unique constraint conflicts)
    const { data: existing, error: fetchError } = await supabase
      .from("project_areas")
      .select("id, area_code, is_deleted")
      .eq("project_id", projectId)
      .in("area_code", areaCodes);

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }

    // Build result map with existing areas + update their names/floors
    const resultMap = new Map<string, string>();
    const existingCodes = new Set<string>();

    for (const area of existing || []) {
      if (!area.is_deleted) {
        resultMap.set(area.area_code, area.id);
        existingCodes.add(area.area_code);

        // Update name/floor if Excel provides new values
        const input = uniqueAreas.get(area.area_code);
        if (input && input.area_name) {
          await supabase
            .from("project_areas")
            .update({
              name: input.area_name.trim(),
              floor: input.floor.trim(),
            })
            .eq("id", area.id);
        }
      }
    }

    // Identify areas that need to be un-deleted (were soft-deleted)
    const toUndelete = (existing || []).filter(
      (a) => a.is_deleted && !existingCodes.has(a.area_code)
    );

    // Un-delete previously soft-deleted areas and update their names/floors
    for (const area of toUndelete) {
      const input = uniqueAreas.get(area.area_code);
      if (input) {
        const { data: updated } = await supabase
          .from("project_areas")
          .update({
            is_deleted: false,
            floor: input.floor.trim(),
            name: input.area_name.trim(),
          })
          .eq("id", area.id)
          .select("id, area_code")
          .single();

        if (updated) {
          resultMap.set(updated.area_code, updated.id);
          existingCodes.add(updated.area_code);
        }
      }
    }

    // Create new areas that don't exist at all
    const toCreate = areaCodes
      .filter((code) => !existingCodes.has(code))
      .map((code) => {
        const input = uniqueAreas.get(code)!;
        return {
          project_id: projectId,
          floor: input.floor.trim(),
          name: input.area_name.trim(),
          area_code: code,
          sort_order: 0,
        };
      });

    if (toCreate.length > 0) {
      const { data: created, error: insertError } = await supabase
        .from("project_areas")
        .insert(toCreate)
        .select("id, area_code");

      if (insertError) {
        return { success: false, error: insertError.message };
      }

      for (const area of created || []) {
        resultMap.set(area.area_code, area.id);
      }
    }

    return { success: true, data: resultMap };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
