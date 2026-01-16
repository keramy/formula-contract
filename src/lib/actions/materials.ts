"use server";

/**
 * Materials Server Actions
 *
 * All material-related database operations should go through these server actions.
 * This ensures:
 * - Proper authentication checks
 * - Activity logging
 * - Consistent error handling
 * - Security (no client-side Supabase access)
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sanitizeText } from "@/lib/sanitize";
import { logActivity } from "@/lib/activity-log/actions";

// ============================================================================
// Types
// ============================================================================

export interface MaterialInput {
  material_code: string;
  name: string;
  specification?: string | null;
  supplier?: string | null;
  images?: string[] | null;
}

export interface MaterialAssignmentUpdate {
  scopeItemId: string;
  materialIds: string[];
}

export interface BulkMaterialImportItem {
  material_code: string;
  name: string;
  specification?: string | null;
  supplier?: string | null;
}

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// Material Query Operations
// ============================================================================

export interface Material {
  id: string;
  project_id: string;
  material_code: string;
  name: string;
  specification: string | null;
  supplier: string | null;
  status: "pending" | "approved" | "rejected";
  images: string[] | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface MaterialWithAssignments extends Material {
  item_materials: { item_id: string }[];
}

/**
 * Get all materials for a project
 */
export async function getMaterials(
  projectId: string
): Promise<ActionResult<MaterialWithAssignments[]>> {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("materials")
      .select(`
        id,
        project_id,
        material_code,
        name,
        specification,
        supplier,
        status,
        images,
        is_deleted,
        created_at,
        updated_at,
        item_materials(item_id)
      `)
      .eq("project_id", projectId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch materials:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as unknown as MaterialWithAssignments[] };
  } catch (error) {
    console.error("getMaterials error:", error);
    return { success: false, error: "Failed to fetch materials" };
  }
}

/**
 * Get a single material by ID
 */
export async function getMaterial(
  materialId: string
): Promise<ActionResult<MaterialWithAssignments>> {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("materials")
      .select(`
        id,
        project_id,
        material_code,
        name,
        specification,
        supplier,
        status,
        images,
        is_deleted,
        created_at,
        updated_at,
        item_materials(item_id)
      `)
      .eq("id", materialId)
      .eq("is_deleted", false)
      .single();

    if (error) {
      console.error("Failed to fetch material:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as unknown as MaterialWithAssignments };
  } catch (error) {
    console.error("getMaterial error:", error);
    return { success: false, error: "Failed to fetch material" };
  }
}

// ============================================================================
// Material CRUD Operations
// ============================================================================

/**
 * Create a new material for a project
 */
export async function createMaterial(
  projectId: string,
  input: MaterialInput,
  assignedItemIds?: string[]
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Sanitize inputs
    const sanitizedInput = {
      project_id: projectId,
      material_code: sanitizeText(input.material_code.trim()),
      name: sanitizeText(input.name.trim()),
      specification: input.specification ? sanitizeText(input.specification.trim()) : null,
      supplier: input.supplier ? sanitizeText(input.supplier.trim()) : null,
      images: input.images && input.images.length > 0 ? input.images : null,
      status: "pending" as const,
    };

    // Insert material
    const { data: newMaterial, error: insertError } = await supabase
      .from("materials")
      .insert(sanitizedInput)
      .select("id")
      .single();

    if (insertError) {
      console.error("Failed to create material:", insertError);
      return { success: false, error: insertError.message };
    }

    // Add item assignments if provided
    if (assignedItemIds && assignedItemIds.length > 0 && newMaterial) {
      const assignments = assignedItemIds.map((itemId) => ({
        item_id: itemId,
        material_id: newMaterial.id,
      }));

      const { error: assignmentError } = await supabase
        .from("item_materials")
        .insert(assignments);

      if (assignmentError) {
        console.error("Failed to assign material to items:", assignmentError);
        // Material was created, just log the assignment error
      }
    }

    // Log activity
    await logActivity({
      projectId: projectId,
      action: "material_created",
      entityType: "material",
      entityId: newMaterial.id,
      details: { material_code: sanitizedInput.material_code, name: sanitizedInput.name },
    });

    revalidatePath(`/projects/${projectId}`);

    return { success: true, data: { id: newMaterial.id } };
  } catch (error) {
    console.error("createMaterial error:", error);
    return { success: false, error: "Failed to create material" };
  }
}

/**
 * Update an existing material
 */
export async function updateMaterial(
  materialId: string,
  projectId: string,
  input: MaterialInput,
  assignedItemIds?: string[]
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Sanitize inputs
    const sanitizedInput = {
      material_code: sanitizeText(input.material_code.trim()),
      name: sanitizeText(input.name.trim()),
      specification: input.specification ? sanitizeText(input.specification.trim()) : null,
      supplier: input.supplier ? sanitizeText(input.supplier.trim()) : null,
      images: input.images && input.images.length > 0 ? input.images : null,
    };

    // Update material
    const { error: updateError } = await supabase
      .from("materials")
      .update(sanitizedInput)
      .eq("id", materialId);

    if (updateError) {
      console.error("Failed to update material:", updateError);
      return { success: false, error: updateError.message };
    }

    // Update item assignments if provided
    if (assignedItemIds !== undefined) {
      // Remove all existing assignments
      await supabase
        .from("item_materials")
        .delete()
        .eq("material_id", materialId);

      // Add new assignments
      if (assignedItemIds.length > 0) {
        const assignments = assignedItemIds.map((itemId) => ({
          item_id: itemId,
          material_id: materialId,
        }));

        const { error: assignmentError } = await supabase
          .from("item_materials")
          .insert(assignments);

        if (assignmentError) {
          console.error("Failed to update material assignments:", assignmentError);
        }
      }
    }

    // Log activity
    await logActivity({
      projectId: projectId,
      action: "material_updated",
      entityType: "material",
      entityId: materialId,
      details: { material_code: sanitizedInput.material_code, name: sanitizedInput.name },
    });

    revalidatePath(`/projects/${projectId}`);

    return { success: true };
  } catch (error) {
    console.error("updateMaterial error:", error);
    return { success: false, error: "Failed to update material" };
  }
}

/**
 * Delete a material (soft delete)
 */
export async function deleteMaterial(
  materialId: string,
  projectId: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get material info for logging
    const { data: material } = await supabase
      .from("materials")
      .select("material_code, name")
      .eq("id", materialId)
      .single();

    // Soft delete
    const { error } = await supabase
      .from("materials")
      .update({ is_deleted: true })
      .eq("id", materialId);

    if (error) {
      console.error("Failed to delete material:", error);
      return { success: false, error: error.message };
    }

    // Log activity
    if (material) {
      await logActivity({
        projectId: projectId,
        action: "material_deleted",
        entityType: "material",
        entityId: materialId,
        details: { material_code: material.material_code, name: material.name },
      });
    }

    revalidatePath(`/projects/${projectId}`);

    return { success: true };
  } catch (error) {
    console.error("deleteMaterial error:", error);
    return { success: false, error: "Failed to delete material" };
  }
}

// ============================================================================
// Material-Item Assignment Operations
// ============================================================================

/**
 * Update material assignments for a scope item
 * Handles both adding and removing assignments in one operation
 */
export async function updateItemMaterialAssignments(
  scopeItemId: string,
  projectId: string,
  currentMaterialIds: string[],
  selectedMaterialIds: string[]
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const currentSet = new Set(currentMaterialIds);
    const selectedSet = new Set(selectedMaterialIds);

    // Find materials to add and remove
    const toAdd = selectedMaterialIds.filter((id) => !currentSet.has(id));
    const toRemove = currentMaterialIds.filter((id) => !selectedSet.has(id));

    // Remove assignments
    if (toRemove.length > 0) {
      const { error: removeError } = await supabase
        .from("item_materials")
        .delete()
        .eq("item_id", scopeItemId)
        .in("material_id", toRemove);

      if (removeError) {
        console.error("Failed to remove material assignments:", removeError);
        return { success: false, error: removeError.message };
      }
    }

    // Add new assignments
    if (toAdd.length > 0) {
      const newAssignments = toAdd.map((materialId) => ({
        item_id: scopeItemId,
        material_id: materialId,
      }));

      const { error: addError } = await supabase
        .from("item_materials")
        .insert(newAssignments);

      if (addError) {
        console.error("Failed to add material assignments:", addError);
        return { success: false, error: addError.message };
      }
    }

    // Log activity if there were changes
    if (toAdd.length > 0 || toRemove.length > 0) {
      await logActivity({
        projectId: projectId,
        action: "item_materials_updated",
        entityType: "scope_item",
        entityId: scopeItemId,
        details: { added: toAdd.length, removed: toRemove.length },
      });
    }

    revalidatePath(`/projects/${projectId}`);

    return { success: true };
  } catch (error) {
    console.error("updateItemMaterialAssignments error:", error);
    return { success: false, error: "Failed to update material assignments" };
  }
}

/**
 * Remove a single material assignment from a scope item
 */
export async function removeItemMaterial(
  scopeItemId: string,
  materialId: string,
  projectId: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { error } = await supabase
      .from("item_materials")
      .delete()
      .eq("item_id", scopeItemId)
      .eq("material_id", materialId);

    if (error) {
      console.error("Failed to remove material assignment:", error);
      return { success: false, error: error.message };
    }

    await logActivity({
      projectId: projectId,
      action: "item_material_removed",
      entityType: "scope_item",
      entityId: scopeItemId,
      details: { material_id: materialId },
    });

    revalidatePath(`/projects/${projectId}`);

    return { success: true };
  } catch (error) {
    console.error("removeItemMaterial error:", error);
    return { success: false, error: "Failed to remove material" };
  }
}

// ============================================================================
// Bulk Import Operations
// ============================================================================

/**
 * Bulk import materials from Excel
 * Uses upsert logic: existing materials (by code) are updated, new ones are inserted
 */
export async function bulkImportMaterials(
  projectId: string,
  materials: BulkMaterialImportItem[]
): Promise<ActionResult<{ inserted: number; updated: number }>> {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const results = { inserted: 0, updated: 0 };

    for (const material of materials) {
      // Sanitize inputs
      const sanitizedMaterial = {
        material_code: sanitizeText(material.material_code.trim()),
        name: sanitizeText(material.name.trim()),
        specification: material.specification ? sanitizeText(material.specification.trim()) : null,
        supplier: material.supplier ? sanitizeText(material.supplier.trim()) : null,
      };

      // Check if material with same code exists
      const { data: existing } = await supabase
        .from("materials")
        .select("id")
        .eq("project_id", projectId)
        .eq("material_code", sanitizedMaterial.material_code)
        .eq("is_deleted", false)
        .single();

      if (existing) {
        // Update existing material (preserve status, images)
        const { error: updateError } = await supabase
          .from("materials")
          .update({
            name: sanitizedMaterial.name,
            specification: sanitizedMaterial.specification,
            supplier: sanitizedMaterial.supplier,
          })
          .eq("id", existing.id);

        if (!updateError) {
          results.updated++;
        }
      } else {
        // Insert new material
        const { error: insertError } = await supabase
          .from("materials")
          .insert({
            project_id: projectId,
            ...sanitizedMaterial,
            status: "pending",
          });

        if (!insertError) {
          results.inserted++;
        }
      }
    }

    // Log activity
    await logActivity({
      projectId: projectId,
      action: "materials_imported",
      entityType: "project",
      entityId: projectId,
      details: { inserted: results.inserted, updated: results.updated },
    });

    revalidatePath(`/projects/${projectId}`);

    return { success: true, data: results };
  } catch (error) {
    console.error("bulkImportMaterials error:", error);
    return { success: false, error: "Failed to import materials" };
  }
}

// ============================================================================
// Material Status Operations
// ============================================================================

/**
 * Update material status (pending/approved/rejected)
 */
export async function updateMaterialStatus(
  materialId: string,
  projectId: string,
  status: "pending" | "approved" | "rejected"
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { error } = await supabase
      .from("materials")
      .update({ status })
      .eq("id", materialId);

    if (error) {
      console.error("Failed to update material status:", error);
      return { success: false, error: error.message };
    }

    await logActivity({
      projectId: projectId,
      action: "material_status_updated",
      entityType: "material",
      entityId: materialId,
      details: { status },
    });

    revalidatePath(`/projects/${projectId}`);

    return { success: true };
  } catch (error) {
    console.error("updateMaterialStatus error:", error);
    return { success: false, error: "Failed to update material status" };
  }
}

// ============================================================================
// Image Upload Operations
// ============================================================================

/**
 * Upload material images to storage
 * Returns the public URLs of uploaded images
 */
export async function uploadMaterialImages(
  projectId: string,
  files: { name: string; type: string; data: string }[] // base64 data
): Promise<ActionResult<string[]>> {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const uploadedUrls: string[] = [];

    for (const file of files) {
      // Convert base64 to buffer
      const base64Data = file.data.split(",")[1] || file.data;
      const buffer = Buffer.from(base64Data, "base64");

      // Generate unique filename
      const fileExt = file.name.split(".").pop() || "jpg";
      const fileName = `${projectId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("materials")
        .upload(fileName, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Failed to upload image:", uploadError);
        continue;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("materials")
        .getPublicUrl(fileName);

      if (urlData?.publicUrl) {
        uploadedUrls.push(urlData.publicUrl);
      }
    }

    return { success: true, data: uploadedUrls };
  } catch (error) {
    console.error("uploadMaterialImages error:", error);
    return { success: false, error: "Failed to upload images" };
  }
}
