"use server";

/**
 * Activity Log Query Actions — read-only queries for recent project activities
 */

import { createClient } from "@/lib/supabase/server";

export interface ActivityWithUser {
  id: string;
  action: string;
  entity_type: string;
  created_at: string | null;
  user: { name: string } | null;
}

/** Get recent activities for a project (last 5) with user names */
export async function getRecentActivities(projectId: string): Promise<ActivityWithUser[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("activity_log")
    .select("id, action, entity_type, created_at, user_id")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (!data || data.length === 0) return [];

  // Get unique user IDs and fetch their names
  const userIds = [...new Set(data.map((a) => a.user_id).filter((id): id is string => id !== null))];
  let userMap: Record<string, string> = {};

  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id, name")
      .in("id", userIds);
    userMap = (users || []).reduce((acc, u) => ({ ...acc, [u.id]: u.name }), {} as Record<string, string>);
  }

  return data.map((a) => ({
    id: a.id,
    action: a.action,
    entity_type: a.entity_type,
    created_at: a.created_at,
    user: a.user_id ? { name: userMap[a.user_id] || "Unknown" } : null,
  }));
}
