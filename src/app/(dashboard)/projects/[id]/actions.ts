"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity-log/actions";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/constants";

export async function getProjectAssignments(projectId: string) {
  const supabase = await createClient();

  // Get assignments
  const { data: assignmentsData, error: assignmentsError } = await supabase
    .from("project_assignments")
    .select("id, assigned_at, user_id")
    .eq("project_id", projectId)
    .order("assigned_at", { ascending: false });

  if (assignmentsError) {
    console.error("Error fetching assignments:", assignmentsError.message);
    return [];
  }

  if (!assignmentsData || assignmentsData.length === 0) {
    return [];
  }

  // Get user details for assigned users
  const userIds = assignmentsData.map((a) => a.user_id);
  const { data: usersData, error: usersError } = await supabase
    .from("users")
    .select("id, name, email, role")
    .in("id", userIds);

  if (usersError) {
    console.error("Error fetching users:", usersError.message);
    return [];
  }

  // Map users by id
  const usersMap = new Map((usersData || []).map((u) => [u.id, u]));

  // Combine data
  const assignments = assignmentsData.map((item) => ({
    id: item.id,
    assigned_at: item.assigned_at,
    user: usersMap.get(item.user_id) || { id: item.user_id, name: "Unknown", email: "", role: "unknown" },
    assigned_by_user: null,
  }));

  return assignments;
}

export async function getAvailableUsers(projectId: string) {
  const supabase = await createClient();

  // Get users who are not already assigned to this project
  const { data: assignments } = await supabase
    .from("project_assignments")
    .select("user_id")
    .eq("project_id", projectId);

  const assignedUserIds = (assignments || []).map((a) => a.user_id);

  // Get all active users except those already assigned
  let query = supabase
    .from("users")
    .select("id, name, email, role")
    .eq("is_active", true)
    .order("name");

  if (assignedUserIds.length > 0) {
    query = query.not("id", "in", `(${assignedUserIds.join(",")})`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching available users:", error);
    return [];
  }

  return data || [];
}

export async function assignUserToProject(
  projectId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get current user for assigned_by
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Check if already assigned
  const { data: existing } = await supabase
    .from("project_assignments")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .single();

  if (existing) {
    return { success: false, error: "User is already assigned to this project" };
  }

  // Get user details for logging
  const { data: assignedUser } = await supabase
    .from("users")
    .select("name")
    .eq("id", userId)
    .single();

  const { error } = await supabase
    .from("project_assignments")
    .insert({
      project_id: projectId,
      user_id: userId,
      assigned_by: user.id,
    });

  if (error) {
    console.error("Error assigning user:", error);
    return { success: false, error: error.message };
  }

  // Log activity
  await logActivity({
    action: ACTIVITY_ACTIONS.USER_ASSIGNED,
    entityType: "user",
    entityId: userId,
    projectId,
    details: { name: assignedUser?.name || "Unknown user" },
  });

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

export async function removeUserFromProject(
  projectId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get user details for logging
  const { data: removedUser } = await supabase
    .from("users")
    .select("name")
    .eq("id", userId)
    .single();

  const { error } = await supabase
    .from("project_assignments")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error removing user:", error);
    return { success: false, error: error.message };
  }

  // Log activity
  await logActivity({
    action: ACTIVITY_ACTIONS.USER_UNASSIGNED,
    entityType: "user",
    entityId: userId,
    projectId,
    details: { name: removedUser?.name || "Unknown user" },
  });

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}
