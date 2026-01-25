"use server";

/**
 * Project Assignments Server Actions
 *
 * Handles user-project assignment operations including:
 * - Listing project team members
 * - Finding available users to assign
 * - Assigning/removing users from projects
 * - Email and in-app notifications
 */

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity-log/actions";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/constants";
import { Resend } from "resend";
import { ProjectAssignmentEmail } from "@/emails/project-assignment-email";

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

  // Check if already assigned AND get user/project details in PARALLEL
  const [existingResult, assignedUserResult, projectResult, assignerResult] = await Promise.all([
    supabase
      .from("project_assignments")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .single(),
    supabase
      .from("users")
      .select("name, email")
      .eq("id", userId)
      .single(),
    supabase
      .from("projects")
      .select("name, project_code")
      .eq("id", projectId)
      .single(),
    supabase
      .from("users")
      .select("name")
      .eq("id", user.id)
      .single(),
  ]);

  const { data: existing } = existingResult;
  const { data: assignedUser } = assignedUserResult;
  const { data: project } = projectResult;
  const { data: assigner } = assignerResult;

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

  // Create in-app notification for the assigned user
  if (project) {
    await supabase.from("notifications").insert({
      user_id: userId,
      type: "project_assigned",
      title: `You've been assigned to ${project.name}`,
      message: `${assigner?.name || "Someone"} added you to project ${project.project_code}`,
      link: `/projects/${projectId}`,
      project_id: projectId,
    });

    // Send email notification
    await sendAssignmentEmail(
      assignedUser?.email,
      assignedUser?.name || "Team Member",
      project.name,
      project.project_code,
      assigner?.name || "A team member",
      projectId
    );
  }

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

// ============================================================================
// Email Helper
// ============================================================================

async function sendAssignmentEmail(
  email: string | undefined,
  userName: string,
  projectName: string,
  projectCode: string,
  assignerName: string,
  projectId: string
) {
  if (!email) return;

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.warn("RESEND_API_KEY not configured, skipping assignment email");
    return;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://formula-contract.vercel.app";
  const projectUrl = `${siteUrl}/projects/${projectId}`;

  try {
    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: "Formula Contract <notifications@updates.formulacontract.com>",
      to: email,
      subject: `You've been assigned to ${projectName}`,
      react: ProjectAssignmentEmail({
        userName,
        assignerName,
        projectName,
        projectCode,
        projectUrl,
      }),
    });
  } catch (error) {
    console.error("Error sending assignment email:", error);
  }
}
