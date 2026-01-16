"use server";

/**
 * Scope Items Server Actions
 *
 * All scope item-related database operations should go through these server actions.
 * This ensures:
 * - Proper authentication checks
 * - Activity logging
 * - Consistent error handling
 * - Security (no client-side Supabase access)
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-log/actions";

// ============================================================================
// Types
// ============================================================================

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export type ScopeItemField =
  | "status"
  | "item_path"
  | "unit"
  | "unit_price"
  | "quantity"
  | "is_installed"
  | "production_percentage";

export interface ScopeItem {
  id: string;
  project_id: string;
  item_code: string;
  name: string;
  description: string | null;
  item_path: "production" | "procurement";
  status: string;
  quantity: number;
  unit: string;
  unit_price: number | null;
  total_price: number | null;
  production_percentage: number;
  is_installed: boolean;
  installed_at: string | null;
  images: string[] | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScopeItemWithMaterials extends ScopeItem {
  item_materials: {
    material_id: string;
    material: {
      id: string;
      material_code: string;
      name: string;
      status: string;
    };
  }[];
}

// ============================================================================
// Query Operations
// ============================================================================

/**
 * Get all scope items for a project
 */
export async function getScopeItems(
  projectId: string
): Promise<ActionResult<ScopeItem[]>> {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("scope_items")
      .select("*")
      .eq("project_id", projectId)
      .eq("is_deleted", false)
      .order("item_code", { ascending: true });

    if (error) {
      console.error("Failed to fetch scope items:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as ScopeItem[] };
  } catch (error) {
    console.error("getScopeItems error:", error);
    return { success: false, error: "Failed to fetch scope items" };
  }
}

/**
 * Get a single scope item by ID with materials
 */
export async function getScopeItem(
  itemId: string
): Promise<ActionResult<ScopeItemWithMaterials>> {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // First get the scope item
    const { data: scopeItem, error: scopeError } = await supabase
      .from("scope_items")
      .select("*")
      .eq("id", itemId)
      .eq("is_deleted", false)
      .single();

    if (scopeError) {
      console.error("Failed to fetch scope item:", scopeError);
      return { success: false, error: scopeError.message };
    }

    // Then get the materials
    const { data: itemMaterials, error: materialsError } = await supabase
      .from("item_materials")
      .select(`
        material_id,
        materials(id, material_code, name, status)
      `)
      .eq("item_id", itemId);

    if (materialsError) {
      console.error("Failed to fetch item materials:", materialsError);
    }

    // Transform the data to match the expected type
    const result: ScopeItemWithMaterials = {
      ...scopeItem,
      item_materials: (itemMaterials || []).map((im) => ({
        material_id: im.material_id,
        material: im.materials as unknown as {
          id: string;
          material_code: string;
          name: string;
          status: string;
        },
      })),
    } as ScopeItemWithMaterials;

    return { success: true, data: result };
  } catch (error) {
    console.error("getScopeItem error:", error);
    return { success: false, error: "Failed to fetch scope item" };
  }
}

// ============================================================================
// Bulk Update Operations
// ============================================================================

/**
 * Bulk update a field for multiple scope items
 */
export async function bulkUpdateScopeItems(
  projectId: string,
  itemIds: string[],
  field: ScopeItemField,
  value: unknown
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    if (itemIds.length === 0) {
      return { success: false, error: "No items selected" };
    }

    // Validate field name to prevent SQL injection
    const allowedFields: ScopeItemField[] = [
      "status",
      "item_path",
      "unit",
      "unit_price",
      "quantity",
      "is_installed",
      "production_percentage",
    ];

    if (!allowedFields.includes(field)) {
      return { success: false, error: "Invalid field" };
    }

    // Perform the update
    const { error } = await supabase
      .from("scope_items")
      .update({ [field]: value })
      .in("id", itemIds);

    if (error) {
      console.error("Bulk update failed:", error);
      return { success: false, error: error.message };
    }

    // Log activity
    await logActivity({
      projectId: projectId,
      action: "scope_items_bulk_updated",
      entityType: "scope_item",
      details: {
        field,
        value,
        count: itemIds.length
      },
    });

    revalidatePath(`/projects/${projectId}`);

    return { success: true };
  } catch (error) {
    console.error("bulkUpdateScopeItems error:", error);
    return { success: false, error: "Failed to update items" };
  }
}

/**
 * Bulk assign materials to multiple scope items
 */
export async function bulkAssignMaterials(
  projectId: string,
  itemIds: string[],
  materialIds: string[]
): Promise<ActionResult<{ assigned: number }>> {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    if (itemIds.length === 0 || materialIds.length === 0) {
      return { success: false, error: "No items or materials selected" };
    }

    let assignedCount = 0;

    // Create assignments for all combinations
    for (const itemId of itemIds) {
      for (const materialId of materialIds) {
        // Check if assignment exists
        const { data: existing } = await supabase
          .from("item_materials")
          .select("id")
          .eq("item_id", itemId)
          .eq("material_id", materialId)
          .single();

        if (!existing) {
          const { error } = await supabase
            .from("item_materials")
            .insert({ item_id: itemId, material_id: materialId });

          if (!error) {
            assignedCount++;
          }
        }
      }
    }

    // Log activity
    await logActivity({
      projectId: projectId,
      action: "materials_bulk_assigned",
      entityType: "scope_item",
      details: {
        items: itemIds.length,
        materials: materialIds.length,
        assigned: assignedCount
      },
    });

    revalidatePath(`/projects/${projectId}`);

    return { success: true, data: { assigned: assignedCount } };
  } catch (error) {
    console.error("bulkAssignMaterials error:", error);
    return { success: false, error: "Failed to assign materials" };
  }
}

// ============================================================================
// Individual Scope Item Operations
// ============================================================================

/**
 * Update a single scope item field
 */
export async function updateScopeItemField(
  projectId: string,
  itemId: string,
  field: ScopeItemField,
  value: unknown
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Validate field name
    const allowedFields: ScopeItemField[] = [
      "status",
      "item_path",
      "unit",
      "unit_price",
      "quantity",
      "is_installed",
      "production_percentage",
    ];

    if (!allowedFields.includes(field)) {
      return { success: false, error: "Invalid field" };
    }

    const { error } = await supabase
      .from("scope_items")
      .update({ [field]: value })
      .eq("id", itemId);

    if (error) {
      console.error("Update scope item failed:", error);
      return { success: false, error: error.message };
    }

    // Log activity
    await logActivity({
      projectId: projectId,
      action: "scope_item_updated",
      entityType: "scope_item",
      entityId: itemId,
      details: { field, value },
    });

    revalidatePath(`/projects/${projectId}`);

    return { success: true };
  } catch (error) {
    console.error("updateScopeItemField error:", error);
    return { success: false, error: "Failed to update item" };
  }
}

/**
 * Update production percentage for a scope item
 */
export async function updateProductionPercentage(
  projectId: string,
  itemId: string,
  percentage: number
): Promise<ActionResult> {
  // Validate percentage
  if (percentage < 0 || percentage > 100) {
    return { success: false, error: "Percentage must be between 0 and 100" };
  }

  return updateScopeItemField(projectId, itemId, "production_percentage", percentage);
}

/**
 * Mark a scope item as installed/not installed
 */
export async function updateInstallationStatus(
  projectId: string,
  itemId: string,
  isInstalled: boolean
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const updateData: Record<string, unknown> = {
      is_installed: isInstalled,
    };

    // If marking as installed, also set installed_at timestamp
    if (isInstalled) {
      updateData.installed_at = new Date().toISOString();
    } else {
      updateData.installed_at = null;
    }

    const { error } = await supabase
      .from("scope_items")
      .update(updateData)
      .eq("id", itemId);

    if (error) {
      console.error("Update installation status failed:", error);
      return { success: false, error: error.message };
    }

    // Log activity
    await logActivity({
      projectId: projectId,
      action: isInstalled ? "scope_item_installed" : "scope_item_uninstalled",
      entityType: "scope_item",
      entityId: itemId,
    });

    revalidatePath(`/projects/${projectId}`);

    return { success: true };
  } catch (error) {
    console.error("updateInstallationStatus error:", error);
    return { success: false, error: "Failed to update installation status" };
  }
}

/**
 * Delete a scope item (soft delete)
 */
export async function deleteScopeItem(
  projectId: string,
  itemId: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get item info for logging
    const { data: item } = await supabase
      .from("scope_items")
      .select("item_code, name")
      .eq("id", itemId)
      .single();

    // Soft delete
    const { error } = await supabase
      .from("scope_items")
      .update({ is_deleted: true })
      .eq("id", itemId);

    if (error) {
      console.error("Delete scope item failed:", error);
      return { success: false, error: error.message };
    }

    // Log activity
    if (item) {
      await logActivity({
        projectId: projectId,
        action: "scope_item_deleted",
        entityType: "scope_item",
        entityId: itemId,
        details: { item_code: item.item_code, name: item.name },
      });
    }

    revalidatePath(`/projects/${projectId}`);

    return { success: true };
  } catch (error) {
    console.error("deleteScopeItem error:", error);
    return { success: false, error: "Failed to delete item" };
  }
}
