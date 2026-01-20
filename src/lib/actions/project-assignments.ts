"use server";

/**
 * Project Assignments Server Actions
 *
 * Handles user-project assignment operations including:
 * - Listing project team members
 * - Finding available users to assign
 * - Assigning/removing users from projects
 */

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity-log/actions";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/constants";

// ============================================================================
// Types
// ============================================================================

export interface ProjectAssignment {
  id: string;
  assigned_at: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  assigned_by_user: { name: string } | null;
}

export interface AvailableUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface ActionResult {
  success: boolean;
  error?: string;
}

// ============================================================================
// Query Operations
// ============================================================================

/**
 * Get all users assigned to a project
 */
export async function getProjectAssignments(projectId: string): Promise<ProjectAssignment[]> {
  const supabase = await createClient();

  // OPTIMIZED: Single query with nested user select (was 2 queries)
  // Using explicit FK reference to avoid "more than one relationship" error
  // (project_assignments has both user_id and assigned_by pointing to users)
  const { data, error } = await supabase
    .from("project_assignments")
    .select(`
      id,
      assigned_at,
      user:users!project_assignments_user_id_fkey(id, name, email, role),
      assigned_by_user:users!project_assignments_assigned_by_fkey(name)
    `)
    .eq("project_id", projectId)
    .order("assigned_at", { ascending: false });

  if (error) {
    console.error("Error fetching assignments:", error.message);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Transform to expected format
  const assignments = data.map((item) => ({
    id: item.id,
    assigned_at: item.assigned_at,
    user: item.user || { id: "", name: "Unknown", email: "", role: "unknown" },
    assigned_by_user: item.assigned_by_user || null,
  }));

  return assignments as unknown as ProjectAssignment[];
}

/**
 * Get users who are not yet assigned to a project
 */
export async function getAvailableUsers(projectId: string): Promise<AvailableUser[]> {
  const supabase = await createClient();

  // Fetch assignments and all users in PARALLEL, then filter client-side
  const [assignmentsResult, usersResult] = await Promise.all([
    supabase
      .from("project_assignments")
      .select("user_id")
      .eq("project_id", projectId),
    supabase
      .from("users")
      .select("id, name, email, role")
      .eq("is_active", true)
      .order("name"),
  ]);

  const { data: assignments } = assignmentsResult;
  const { data: allUsers, error } = usersResult;

  if (error) {
    console.error("Error fetching available users:", error);
    return [];
  }

  // Filter out already assigned users (client-side - fast)
  const assignedUserIds = new Set((assignments || []).map((a) => a.user_id));
  const availableUsers = (allUsers || []).filter((user) => !assignedUserIds.has(user.id));

  return availableUsers;
}

// ============================================================================
// Mutation Operations
// ============================================================================

/**
 * Assign a user to a project
 */
export async function assignUserToProject(
  projectId: string,
  userId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  // Get current user for assigned_by
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Check if already assigned AND get user details in PARALLEL
  const [existingResult, assignedUserResult] = await Promise.all([
    supabase
      .from("project_assignments")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .single(),
    supabase
      .from("users")
      .select("name")
      .eq("id", userId)
      .single(),
  ]);

  const { data: existing } = existingResult;
  const { data: assignedUser } = assignedUserResult;

  if (existing) {
    return { success: false, error: "User is already assigned to this project" };
  }

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

/**
 * Remove a user from a project
 */
export async function removeUserFromProject(
  projectId: string,
  userId: string
): Promise<ActionResult> {
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
