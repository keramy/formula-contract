"use server";

import { createClient, getUserProfileFromJWT } from "@/lib/supabase/server";
import { ACTIVITY_ACTIONS } from "./constants";

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

// Actions that clients are allowed to see
// These are "client-facing" activities - things sent to them or their own responses
// NOTE: REPORT_PUBLISHED removed because clients should only see reports with share_with_client=true
// and we can't filter activity by report.share_with_client flag easily
const CLIENT_VISIBLE_ACTIONS = [
  ACTIVITY_ACTIONS.DRAWING_SENT_TO_CLIENT,
  ACTIVITY_ACTIONS.DRAWING_APPROVED,
  ACTIVITY_ACTIONS.DRAWING_REJECTED,
  ACTIVITY_ACTIONS.MATERIAL_SENT_TO_CLIENT,
  ACTIVITY_ACTIONS.MATERIAL_APPROVED,
  ACTIVITY_ACTIONS.MATERIAL_REJECTED,
  ACTIVITY_ACTIONS.PROJECT_STATUS_CHANGED,
];

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
    details: (data.details || null) as import("@/types/database").Json,
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

  // Get user role to determine filtering
  const profile = await getUserProfileFromJWT(user, supabase);
  const isClient = profile.role === "client";

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

  // For clients: filter to only show client-visible actions
  if (isClient) {
    query = query.in("action", CLIENT_VISIBLE_ACTIONS);
  }

  query = query.limit(options?.limit || 50);

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching activity logs:", error.message);
    return [];
  }

  return (data || []) as unknown as ActivityLog[];
}

export async function getRecentActivityLogs(limit = 20): Promise<ActivityLog[]> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get user role to determine filtering
  const profile = await getUserProfileFromJWT(user, supabase);
  const isClient = profile.role === "client";

  let query = supabase
    .from("activity_log")
    .select(`
      id, user_id, action, entity_type, entity_id, project_id, details, created_at,
      user:users(name, email),
      project:projects(name, project_code)
    `)
    .order("created_at", { ascending: false });

  // For clients: only show client-visible actions from their assigned projects
  if (isClient) {
    // First get the projects this client is assigned to
    const { data: assignments } = await supabase
      .from("project_assignments")
      .select("project_id")
      .eq("user_id", user.id);

    const assignedProjectIds = assignments?.map(a => a.project_id) || [];

    if (assignedProjectIds.length === 0) {
      // Client has no assigned projects - return empty
      return [];
    }

    // Filter to only assigned projects AND client-visible actions
    query = query
      .in("project_id", assignedProjectIds)
      .in("action", CLIENT_VISIBLE_ACTIONS);
  }

  query = query.limit(limit);

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching recent activity:", error.message);
    return [];
  }

  return (data || []) as unknown as ActivityLog[];
}
