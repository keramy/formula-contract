"use server";

import { createClient } from "@/lib/supabase/server";

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  project_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  user?: { name: string; email: string } | null;
  project?: { name: string; project_code: string } | null;
}

export async function logActivity(data: {
  action: string;
  entityType: string;
  entityId?: string;
  projectId?: string;
  details?: Record<string, unknown>;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from("activity_log").insert({
    user_id: user?.id || null,
    action: data.action,
    entity_type: data.entityType,
    entity_id: data.entityId || null,
    project_id: data.projectId || null,
    details: data.details || null,
  });

  if (error) {
    console.error("Error logging activity:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function getActivityLogs(options?: {
  projectId?: string;
  entityType?: string;
  entityId?: string;
  limit?: number;
}): Promise<ActivityLog[]> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("activity_log")
    .select(`
      id, user_id, action, entity_type, entity_id, project_id, details, created_at,
      user:users(name, email),
      project:projects(name, project_code)
    `)
    .order("created_at", { ascending: false });

  if (options?.projectId) {
    query = query.eq("project_id", options.projectId);
  }

  if (options?.entityType) {
    query = query.eq("entity_type", options.entityType);
  }

  if (options?.entityId) {
    query = query.eq("entity_id", options.entityId);
  }

  query = query.limit(options?.limit || 50);

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching activity logs:", error.message);
    return [];
  }

  return (data || []) as ActivityLog[];
}

export async function getRecentActivityLogs(limit = 20): Promise<ActivityLog[]> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("activity_log")
    .select(`
      id, user_id, action, entity_type, entity_id, project_id, details, created_at,
      user:users(name, email),
      project:projects(name, project_code)
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching recent activity:", error.message);
    return [];
  }

  return (data || []) as ActivityLog[];
}
