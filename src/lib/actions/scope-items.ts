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
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
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
  | "unit_sales_price"
  | "initial_unit_cost"
  | "actual_unit_cost"
  | "quantity"
  | "is_shipped"
  | "is_installation_started"
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
  // Initial cost (budgeted, set once at creation, never changes)
  initial_unit_cost: number | null;
  initial_total_cost: number | null;
  // Actual cost (real cost, entered manually later)
  actual_unit_cost: number | null;
  actual_total_cost: number | null;
  // Sales price fields (what CLIENT pays)
  unit_sales_price: number | null;
  total_sales_price: number | null;
  production_percentage: number;
  is_shipped: boolean;
  shipped_at: string | null;
  is_installation_started: boolean;
  installation_started_at: string | null;
  is_installed: boolean;
  installed_at: string | null;
  images: string[] | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  parent_id: string | null; // References parent item when created via split
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

    // Fetch scope item and materials in PARALLEL
    const [scopeItemResult, itemMaterialsResult] = await Promise.all([
      supabase
        .from("scope_items")
        .select("*")
        .eq("id", itemId)
        .eq("is_deleted", false)
        .single(),
      supabase
        .from("item_materials")
        .select(`
          material_id,
          materials(id, material_code, name, status)
        `)
        .eq("item_id", itemId),
    ]);

    const { data: scopeItem, error: scopeError } = scopeItemResult;
    const { data: itemMaterials, error: materialsError } = itemMaterialsResult;

    if (scopeError) {
      console.error("Failed to fetch scope item:", scopeError);
      return { success: false, error: scopeError.message };
    }

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
      "unit_sales_price",
      "initial_unit_cost",
      "actual_unit_cost",
      "quantity",
      "is_shipped",
      "is_installation_started",
      "is_installed",
      "production_percentage",
    ];

    if (!allowedFields.includes(field)) {
      return { success: false, error: "Invalid field" };
    }

    // Build update data with timestamps for shipped/installed
    const updateData: Record<string, unknown> = { [field]: value };

    // Handle shipped_at timestamp
    if (field === "is_shipped") {
      updateData.shipped_at = value ? new Date().toISOString() : null;
    }

    // Handle installation_started_at timestamp
    if (field === "is_installation_started") {
      updateData.installation_started_at = value ? new Date().toISOString() : null;
    }

    // Handle installed_at timestamp
    if (field === "is_installed") {
      updateData.installed_at = value ? new Date().toISOString() : null;
    }

    // Perform the update
    const { error } = await supabase
      .from("scope_items")
      .update(updateData)
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
      "unit_sales_price",
      "initial_unit_cost",
      "actual_unit_cost",
      "quantity",
      "is_shipped",
      "is_installation_started",
      "is_installed",
      "production_percentage",
    ];

    if (!allowedFields.includes(field)) {
      return { success: false, error: "Invalid field" };
    }

    // Build update data with timestamps for status fields
    const updateData: Record<string, unknown> = { [field]: value };
    if (field === "is_shipped") {
      updateData.shipped_at = value ? new Date().toISOString() : null;
    }
    if (field === "is_installation_started") {
      updateData.installation_started_at = value ? new Date().toISOString() : null;
    }
    if (field === "is_installed") {
      updateData.installed_at = value ? new Date().toISOString() : null;
    }

    const { error } = await supabase
      .from("scope_items")
      .update(updateData)
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
 * Update shipped status for a scope item
 */
export async function updateShippedStatus(
  projectId: string,
  itemId: string,
  isShipped: boolean,
  shippedAt?: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const updateData: Record<string, unknown> = {
      is_shipped: isShipped,
    };

    // Handle shipped_at timestamp
    if (isShipped) {
      updateData.shipped_at = shippedAt || new Date().toISOString();
    } else {
      updateData.shipped_at = null;
    }

    const { error } = await supabase
      .from("scope_items")
      .update(updateData)
      .eq("id", itemId);

    if (error) {
      console.error("Update shipped status failed:", error);
      return { success: false, error: error.message };
    }

    // Log activity
    await logActivity({
      projectId: projectId,
      action: isShipped ? "scope_item_shipped" : "scope_item_unshipped",
      entityType: "scope_item",
      entityId: itemId,
    });

    revalidatePath(`/projects/${projectId}`);

    return { success: true };
  } catch (error) {
    console.error("updateShippedStatus error:", error);
    return { success: false, error: "Failed to update shipped status" };
  }
}

/**
 * Update installation started status for a scope item
 */
export async function updateInstallationStartedStatus(
  projectId: string,
  itemId: string,
  isStarted: boolean,
  startedAt?: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const updateData: Record<string, unknown> = {
      is_installation_started: isStarted,
    };

    // Handle installation_started_at timestamp
    if (isStarted) {
      updateData.installation_started_at = startedAt || new Date().toISOString();
    } else {
      updateData.installation_started_at = null;
    }

    const { error } = await supabase
      .from("scope_items")
      .update(updateData)
      .eq("id", itemId);

    if (error) {
      console.error("Update installation started status failed:", error);
      return { success: false, error: error.message };
    }

    // Log activity
    await logActivity({
      projectId: projectId,
      action: isStarted ? "scope_item_installation_started" : "scope_item_installation_not_started",
      entityType: "scope_item",
      entityId: itemId,
    });

    revalidatePath(`/projects/${projectId}`);

    return { success: true };
  } catch (error) {
    console.error("updateInstallationStartedStatus error:", error);
    return { success: false, error: "Failed to update installation started status" };
  }
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
 * Uses service role client to bypass RLS policy issues with UPDATE WITH CHECK
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

    // Verify user can access this item (RLS SELECT check)
    const { data: item, error: fetchError } = await supabase
      .from("scope_items")
      .select("item_code, name, project_id")
      .eq("id", itemId)
      .eq("project_id", projectId)
      .eq("is_deleted", false)
      .single();

    if (fetchError || !item) {
      console.error("Item not found or access denied:", fetchError);
      return { success: false, error: "Item not found or access denied" };
    }

    // Use service role client for soft delete to bypass RLS UPDATE policy issues
    // This is safe because we've already verified the user can access the item above
    const serviceClient = createServiceRoleClient();
    const { error } = await serviceClient
      .from("scope_items")
      .update({ is_deleted: true })
      .eq("id", itemId);

    if (error) {
      console.error("Delete scope item failed:", error);
      return { success: false, error: error.message };
    }

    // Log activity
    await logActivity({
      projectId: projectId,
      action: "scope_item_deleted",
      entityType: "scope_item",
      entityId: itemId,
      details: { item_code: item.item_code, name: item.name },
    });

    revalidatePath(`/projects/${projectId}`);

    return { success: true };
  } catch (error) {
    console.error("deleteScopeItem error:", error);
    return { success: false, error: "Failed to delete item" };
  }
}

/**
 * Clear all scope items for a project (soft delete)
 * Used by Excel import "Replace" mode
 */
export async function clearProjectScopeItems(
  projectId: string
): Promise<ActionResult<{ deletedCount: number }>> {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify user has access to this project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, name, project_code")
      .eq("id", projectId)
      .eq("is_deleted", false)
      .single();

    if (projectError || !project) {
      return { success: false, error: "Project not found or access denied" };
    }

    // Count ALL items (including soft-deleted) - we need to clear everything
    // because the unique constraint applies to ALL rows, not just active ones
    const { count } = await supabase
      .from("scope_items")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId);

    if (!count || count === 0) {
      return { success: true, data: { deletedCount: 0 } };
    }

    // Use service role client for hard delete to bypass RLS
    // Hard delete ALL items (including soft-deleted) because unique constraint
    // on (project_id, item_code) applies to entire table
    const serviceClient = createServiceRoleClient();
    const { error } = await serviceClient
      .from("scope_items")
      .delete()
      .eq("project_id", projectId);

    if (error) {
      console.error("Clear scope items failed:", error);
      return { success: false, error: error.message };
    }

    // Log activity
    await logActivity({
      projectId: projectId,
      action: "scope_items_cleared",
      entityType: "project",
      entityId: projectId,
      details: {
        project_code: project.project_code,
        items_deleted: count,
        reason: "Excel import replace mode"
      },
    });

    return { success: true, data: { deletedCount: count } };
  } catch (error) {
    console.error("clearProjectScopeItems error:", error);
    return { success: false, error: "Failed to clear items" };
  }
}

// ============================================================================
// Split Item Operation
// ============================================================================

export interface SplitItemParams {
  itemId: string;
  projectId: string;
  targetPath: "production" | "procurement";
  newQuantity: number;
  newName: string; // Custom name for the split item
}

/**
 * Split a scope item to create a related item with different path
 * Creates a new item with:
 * - New code: original.1, original.2, etc.
 * - Custom name (e.g., "Marble Supply" for a split from "Cabinet")
 * - Specified path (production or procurement)
 * - Specified quantity
 * Original item remains unchanged
 */
export async function splitScopeItem(
  params: SplitItemParams
): Promise<ActionResult<{ newItemId: string; newItemCode: string }>> {
  const { itemId, projectId, targetPath, newQuantity, newName } = params;

  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get the original item
    const { data: originalItem, error: fetchError } = await supabase
      .from("scope_items")
      .select("*")
      .eq("id", itemId)
      .eq("is_deleted", false)
      .single();

    if (fetchError || !originalItem) {
      console.error("Failed to fetch original item:", fetchError);
      return { success: false, error: "Failed to fetch original item" };
    }

    // Validate quantity
    if (newQuantity <= 0) {
      return {
        success: false,
        error: "Quantity must be at least 1",
      };
    }

    // Validate name
    if (!newName || !newName.trim()) {
      return {
        success: false,
        error: "Name is required",
      };
    }

    // Generate new item code with .1, .2, .3 suffix
    // Count existing children of this parent item using parent_id for accuracy
    const baseCode = originalItem.item_code;
    const { data: existingChildren, error: childrenError } = await supabase
      .from("scope_items")
      .select("item_code")
      .eq("parent_id", originalItem.id)
      .eq("is_deleted", false);

    if (childrenError) {
      console.error("Failed to count existing children:", childrenError);
    }

    // Find the next available number based on existing children
    let maxNumber = 0;
    if (existingChildren && existingChildren.length > 0) {
      for (const item of existingChildren) {
        // Extract the suffix number from item codes like "ITEM-001.2"
        const match = item.item_code.match(/\.(\d+)$/);
        if (match) {
          const num = parseInt(match[1]);
          if (num > maxNumber) maxNumber = num;
        }
      }
    }
    const newItemCode = `${baseCode}.${maxNumber + 1}`;

    // Create new item with split data
    // Set parent_id to the original item's ID for hierarchy tracking
    // Child items inherit the sales price but have their own cost (set later by user)
    const { data: newItem, error: insertError } = await supabase
      .from("scope_items")
      .insert({
        project_id: projectId,
        item_code: newItemCode,
        name: newName.trim(),
        description: `Related to ${originalItem.item_code} - ${originalItem.name}`,
        width: originalItem.width,
        depth: originalItem.depth,
        height: originalItem.height,
        unit: originalItem.unit,
        quantity: newQuantity,
        // Cost tracking: child starts with no cost (user will set), inherit sales price
        initial_unit_cost: null,
        initial_total_cost: null,
        unit_sales_price: originalItem.unit_sales_price,
        item_path: targetPath,
        status: "pending", // Reset status for new split item
        notes: `Split from ${originalItem.item_code}. ${originalItem.notes || ""}`.trim(),
        images: null, // Don't copy images - new item may be different
        production_percentage: 0,
        is_installed: false,
        parent_id: originalItem.id, // Link to parent for hierarchy
      })
      .select("id")
      .single();

    if (insertError || !newItem) {
      console.error("Failed to create split item:", insertError);
      return { success: false, error: "Failed to create split item" };
    }

    // Note: Original item quantity is NOT reduced
    // The split creates a related item, not a quantity split

    // Log activity
    await logActivity({
      projectId: projectId,
      action: "scope_item_split",
      entityType: "scope_item",
      entityId: itemId,
      details: {
        original_code: originalItem.item_code,
        original_name: originalItem.name,
        new_code: newItemCode,
        new_name: newName.trim(),
        new_path: targetPath,
        new_quantity: newQuantity,
      },
    });

    revalidatePath(`/projects/${projectId}`);

    return { success: true, data: { newItemId: newItem.id, newItemCode } };
  } catch (error) {
    console.error("splitScopeItem error:", error);
    return { success: false, error: "Failed to split item" };
  }
}

// ============================================================================
// Parent/Child Hierarchy Operations
// ============================================================================

/**
 * Get the parent item for a child scope item
 */
export async function getParentItem(
  itemId: string
): Promise<ActionResult<{ id: string; item_code: string; name: string } | null>> {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // First get the item to find its parent_id
    const { data: item, error: itemError } = await supabase
      .from("scope_items")
      .select("parent_id")
      .eq("id", itemId)
      .single();

    if (itemError || !item || !item.parent_id) {
      return { success: true, data: null }; // No parent
    }

    // Get the parent item details
    const { data: parent, error: parentError } = await supabase
      .from("scope_items")
      .select("id, item_code, name")
      .eq("id", item.parent_id)
      .eq("is_deleted", false)
      .single();

    if (parentError || !parent) {
      return { success: true, data: null };
    }

    return { success: true, data: parent };
  } catch (error) {
    console.error("getParentItem error:", error);
    return { success: false, error: "Failed to get parent item" };
  }
}

/**
 * Get all child items for a parent scope item
 */
export async function getChildItems(
  parentId: string
): Promise<ActionResult<Array<{ id: string; item_code: string; name: string; item_path: string; status: string }>>> {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data: children, error } = await supabase
      .from("scope_items")
      .select("id, item_code, name, item_path, status")
      .eq("parent_id", parentId)
      .eq("is_deleted", false)
      .order("item_code", { ascending: true });

    if (error) {
      console.error("Failed to fetch child items:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: children || [] };
  } catch (error) {
    console.error("getChildItems error:", error);
    return { success: false, error: "Failed to get child items" };
  }
}

// ============================================================================
// Cost Tracking Operations
// ============================================================================

/**
 * Calculate actual total cost for an item
 * - For items WITH children: Sum of all children's (unit_cost × quantity)
 * - For items WITHOUT children: The item's own (unit_cost × quantity)
 */
export async function getActualTotalCost(
  itemId: string
): Promise<ActionResult<{ actualCost: number; hasChildren: boolean }>> {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Fetch children AND own item in PARALLEL (we'll use one or the other)
    const [childrenResult, itemResult] = await Promise.all([
      supabase
        .from("scope_items")
        .select("actual_unit_cost, quantity")
        .eq("parent_id", itemId)
        .eq("is_deleted", false),
      supabase
        .from("scope_items")
        .select("actual_unit_cost, quantity")
        .eq("id", itemId)
        .single(),
    ]);

    const { data: children, error: childrenError } = childrenResult;
    const { data: item, error: itemError } = itemResult;

    if (childrenError) {
      console.error("Failed to fetch children for cost calculation:", childrenError);
      return { success: false, error: childrenError.message };
    }

    // If has children, aggregate their actual costs
    if (children && children.length > 0) {
      const totalCost = children.reduce((sum, child) => {
        const childCost = (child.actual_unit_cost || 0) * (child.quantity || 0);
        return sum + childCost;
      }, 0);
      return { success: true, data: { actualCost: totalCost, hasChildren: true } };
    }

    // No children - use own actual cost
    if (itemError || !item) {
      console.error("Failed to fetch item for cost calculation:", itemError);
      return { success: false, error: itemError?.message || "Item not found" };
    }

    const ownCost = (item.actual_unit_cost || 0) * (item.quantity || 0);
    return { success: true, data: { actualCost: ownCost, hasChildren: false } };
  } catch (error) {
    console.error("getActualTotalCost error:", error);
    return { success: false, error: "Failed to calculate actual cost" };
  }
}

/**
 * Get scope items with computed actual costs for a project
 * Returns all items with their actual costs (aggregated for parents)
 */
export async function getScopeItemsWithCosts(
  projectId: string
): Promise<ActionResult<Array<ScopeItem & { actual_total_cost: number; has_children: boolean }>>> {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get all items
    const { data: items, error } = await supabase
      .from("scope_items")
      .select("*")
      .eq("project_id", projectId)
      .eq("is_deleted", false)
      .order("item_code", { ascending: true });

    if (error) {
      console.error("Failed to fetch scope items:", error);
      return { success: false, error: error.message };
    }

    // Build parent-children map for efficient lookup
    const childrenByParent = new Map<string, typeof items>();
    for (const item of items || []) {
      if (item.parent_id) {
        const siblings = childrenByParent.get(item.parent_id) || [];
        siblings.push(item);
        childrenByParent.set(item.parent_id, siblings);
      }
    }

    // Compute actual costs
    const itemsWithCosts = (items || []).map(item => {
      const children = childrenByParent.get(item.id) || [];
      const hasChildren = children.length > 0;

      let computedActualCost: number;
      if (hasChildren) {
        // Sum children's actual costs
        computedActualCost = children.reduce((sum, child) => {
          return sum + ((child.actual_unit_cost || 0) * (child.quantity || 0));
        }, 0);
      } else {
        // Own actual cost
        computedActualCost = (item.actual_unit_cost || 0) * (item.quantity || 0);
      }

      return {
        ...item,
        actual_total_cost: computedActualCost,
        has_children: hasChildren,
      } as ScopeItem & { actual_total_cost: number; has_children: boolean };
    });

    return { success: true, data: itemsWithCosts };
  } catch (error) {
    console.error("getScopeItemsWithCosts error:", error);
    return { success: false, error: "Failed to fetch scope items with costs" };
  }
}
