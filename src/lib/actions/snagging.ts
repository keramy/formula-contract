"use server";

/**
 * Snagging Server Actions — query functions for project snagging items
 */

import { createClient } from "@/lib/supabase/server";

export interface Snagging {
  id: string;
  project_id: string;
  item_id: string | null;
  description: string;
  photos: string[] | null;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_by: string | null;
  created_at: string;
  item?: { item_code: string; name: string } | null;
  creator?: { name: string } | null;
  resolver?: { name: string } | null;
}

/** Get all snagging items for a project with joins */
export async function getSnaggingItems(projectId: string): Promise<Snagging[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("snagging")
    .select(`
      id, project_id, item_id, description, photos, is_resolved,
      resolved_at, resolved_by, resolution_notes, created_by, created_at,
      item:scope_items!snagging_item_id_fkey(item_code, name),
      creator:users!snagging_created_by_fkey(name),
      resolver:users!snagging_resolved_by_fkey(name)
    `)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching snagging items:", error.message);
    return [];
  }
  return (data || []) as unknown as Snagging[];
}
