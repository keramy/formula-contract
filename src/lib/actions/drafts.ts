"use server";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export type DraftEntityType = "project" | "report" | "scope_item";

export interface Draft {
  id: string;
  user_id: string;
  entity_type: DraftEntityType;
  entity_id: string | null;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Save or update a draft
 */
export async function saveDraft(
  entityType: DraftEntityType,
  data: Record<string, unknown>,
  entityId?: string | null
): Promise<ActionResult<Draft>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Use upsert to handle both insert and update
    const { data: draft, error } = await supabase
      .from("drafts")
      .upsert(
        {
          user_id: user.id,
          entity_type: entityType,
          entity_id: entityId || null,
          data: data as Json,
        },
        {
          onConflict: "user_id,entity_type,entity_id",
        }
      )
      .select()
      .single();

    if (error) {
      console.error("Failed to save draft:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: draft as Draft };
  } catch (error) {
    console.error("saveDraft error:", error);
    return { success: false, error: "Failed to save draft" };
  }
}

/**
 * Get a draft by entity type and optional entity ID
 */
export async function getDraft(
  entityType: DraftEntityType,
  entityId?: string | null
): Promise<ActionResult<Draft | null>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    let query = supabase
      .from("drafts")
      .select("*")
      .eq("user_id", user.id)
      .eq("entity_type", entityType);

    if (entityId) {
      query = query.eq("entity_id", entityId);
    } else {
      query = query.is("entity_id", null);
    }

    const { data: draft, error } = await query.maybeSingle();

    if (error) {
      console.error("Failed to get draft:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: draft as Draft | null };
  } catch (error) {
    console.error("getDraft error:", error);
    return { success: false, error: "Failed to get draft" };
  }
}

/**
 * Delete a draft
 */
export async function deleteDraft(
  entityType: DraftEntityType,
  entityId?: string | null
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    let query = supabase
      .from("drafts")
      .delete()
      .eq("user_id", user.id)
      .eq("entity_type", entityType);

    if (entityId) {
      query = query.eq("entity_id", entityId);
    } else {
      query = query.is("entity_id", null);
    }

    const { error } = await query;

    if (error) {
      console.error("Failed to delete draft:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("deleteDraft error:", error);
    return { success: false, error: "Failed to delete draft" };
  }
}

/**
 * Get all drafts for current user
 */
export async function getUserDrafts(): Promise<ActionResult<Draft[]>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data: drafts, error } = await supabase
      .from("drafts")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Failed to get user drafts:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: drafts as Draft[] };
  } catch (error) {
    console.error("getUserDrafts error:", error);
    return { success: false, error: "Failed to get drafts" };
  }
}

/**
 * Clear old drafts (older than 7 days)
 * Can be called from a cron job or manually
 */
export async function clearOldDrafts(): Promise<ActionResult<number>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await supabase
      .from("drafts")
      .delete()
      .eq("user_id", user.id)
      .lt("updated_at", sevenDaysAgo.toISOString())
      .select("id");

    if (error) {
      console.error("Failed to clear old drafts:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data?.length || 0 };
  } catch (error) {
    console.error("clearOldDrafts error:", error);
    return { success: false, error: "Failed to clear old drafts" };
  }
}
