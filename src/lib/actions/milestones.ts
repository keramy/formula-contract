"use server";

/**
 * Milestone Server Actions
 *
 * Handles milestone CRUD operations with:
 * - Activity logging
 * - In-app notifications for team members
 */

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity-log/actions";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/constants";

// ============================================================================
// Types
// ============================================================================

export interface Milestone {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  due_date: string;
  is_completed: boolean;
  alert_days_before: number | null;
  alert_sent_at: string | null;
  created_at: string;
}

export interface MilestoneInput {
  project_id: string;
  name: string;
  description?: string | null;
  due_date: string;
  alert_days_before?: number;
}

export interface ActionResult<T = void> {
  success: boolean;
  error?: string;
  data?: T;
}

// ============================================================================
// Create Milestone
// ============================================================================

export async function createMilestone(
  input: MilestoneInput
): Promise<ActionResult<Milestone>> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Insert milestone
  const { data: milestone, error } = await supabase
    .from("milestones")
    .insert({
      project_id: input.project_id,
      name: input.name,
      description: input.description || null,
      due_date: input.due_date,
      alert_days_before: input.alert_days_before || 7,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating milestone:", error);
    return { success: false, error: error.message };
  }

  // Log activity
  await logActivity({
    action: ACTIVITY_ACTIONS.MILESTONE_CREATED,
    entityType: "milestone",
    entityId: milestone.id,
    projectId: input.project_id,
    details: {
      name: input.name,
      due_date: input.due_date,
    },
  });

  // Create notifications for team members
  await notifyTeamAboutMilestone(
    input.project_id,
    user.id,
    `New milestone "${input.name}" added`,
    milestone.id
  );

  revalidatePath(`/projects/${input.project_id}`);
  return { success: true, data: milestone };
}

// ============================================================================
// Update Milestone
// ============================================================================

export async function updateMilestone(
  milestoneId: string,
  input: Partial<MilestoneInput>
): Promise<ActionResult<Milestone>> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Get existing milestone for project_id
  const { data: existing } = await supabase
    .from("milestones")
    .select("project_id, name")
    .eq("id", milestoneId)
    .single();

  if (!existing) {
    return { success: false, error: "Milestone not found" };
  }

  // Update milestone
  const { data: milestone, error } = await supabase
    .from("milestones")
    .update({
      name: input.name,
      description: input.description,
      due_date: input.due_date,
      alert_days_before: input.alert_days_before,
    })
    .eq("id", milestoneId)
    .select()
    .single();

  if (error) {
    console.error("Error updating milestone:", error);
    return { success: false, error: error.message };
  }

  // Log activity
  await logActivity({
    action: ACTIVITY_ACTIONS.MILESTONE_UPDATED,
    entityType: "milestone",
    entityId: milestoneId,
    projectId: existing.project_id,
    details: {
      name: input.name || existing.name,
    },
  });

  revalidatePath(`/projects/${existing.project_id}`);
  return { success: true, data: milestone };
}

// ============================================================================
// Complete Milestone
// ============================================================================

export async function completeMilestone(
  milestoneId: string,
  isCompleted: boolean = true
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Get milestone details
  const { data: milestone } = await supabase
    .from("milestones")
    .select("project_id, name")
    .eq("id", milestoneId)
    .single();

  if (!milestone) {
    return { success: false, error: "Milestone not found" };
  }

  // Update completion status with timestamp
  const { error } = await supabase
    .from("milestones")
    .update({
      is_completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : null,
    })
    .eq("id", milestoneId);

  if (error) {
    console.error("Error completing milestone:", error);
    return { success: false, error: error.message };
  }

  // Log activity and notify team (fire and forget - don't block the response)
  if (isCompleted) {
    // Run these in parallel and don't wait
    Promise.all([
      logActivity({
        action: ACTIVITY_ACTIONS.MILESTONE_COMPLETED,
        entityType: "milestone",
        entityId: milestoneId,
        projectId: milestone.project_id,
        details: { name: milestone.name },
      }),
      notifyTeamAboutMilestone(
        milestone.project_id,
        user.id,
        `Milestone "${milestone.name}" completed! 🎉`,
        milestoneId
      ),
    ]).catch(err => console.error("Background task error:", err));
  }

  revalidatePath(`/projects/${milestone.project_id}`);
  return { success: true };
}

// ============================================================================
// Delete Milestone
// ============================================================================

export async function deleteMilestone(
  milestoneId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Get milestone details for logging
  const { data: milestone } = await supabase
    .from("milestones")
    .select("project_id, name")
    .eq("id", milestoneId)
    .single();

  if (!milestone) {
    return { success: false, error: "Milestone not found" };
  }

  // Delete milestone
  const { error } = await supabase
    .from("milestones")
    .delete()
    .eq("id", milestoneId);

  if (error) {
    console.error("Error deleting milestone:", error);
    return { success: false, error: error.message };
  }

  // Log activity
  await logActivity({
    action: ACTIVITY_ACTIONS.MILESTONE_DELETED,
    entityType: "milestone",
    entityId: milestoneId,
    projectId: milestone.project_id,
    details: { name: milestone.name },
  });

  revalidatePath(`/projects/${milestone.project_id}`);
  return { success: true };
}

// ============================================================================
// Get Upcoming Milestones (for dashboard)
// ============================================================================

export async function getUpcomingMilestones(options?: {
  limit?: number;
  projectId?: string;
}): Promise<Milestone[]> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("milestones")
    .select(`
      id, project_id, name, description, due_date,
      is_completed, alert_days_before, alert_sent_at, created_at
    `)
    .eq("is_completed", false)
    .gte("due_date", new Date().toISOString().split("T")[0])
    .order("due_date", { ascending: true });

  if (options?.projectId) {
    query = query.eq("project_id", options.projectId);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching upcoming milestones:", error);
    return [];
  }

  return data || [];
}

// ============================================================================
// Get Overdue Milestones (for alerts)
// ============================================================================

export async function getOverdueMilestones(options?: {
  projectId?: string;
}): Promise<Milestone[]> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const today = new Date().toISOString().split("T")[0];

  let query = supabase
    .from("milestones")
    .select(`
      id, project_id, name, description, due_date,
      is_completed, alert_days_before, alert_sent_at, created_at
    `)
    .eq("is_completed", false)
    .lt("due_date", today)
    .order("due_date", { ascending: true });

  if (options?.projectId) {
    query = query.eq("project_id", options.projectId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching overdue milestones:", error);
    return [];
  }

  return data || [];
}

// ============================================================================
// Helper: Notify team about milestone
// ============================================================================

async function notifyTeamAboutMilestone(
  projectId: string,
  excludeUserId: string,
  message: string,
  milestoneId: string
) {
  const supabase = await createClient();

  // Get project details
  const { data: project } = await supabase
    .from("projects")
    .select("name, project_code")
    .eq("id", projectId)
    .single();

  if (!project) return;

  // Get team members (excluding the user who created/completed the milestone)
  const { data: assignments } = await supabase
    .from("project_assignments")
    .select("user_id")
    .eq("project_id", projectId)
    .neq("user_id", excludeUserId);

  if (!assignments || assignments.length === 0) return;

  // Create notifications for each team member
  const notifications = assignments.map((a) => ({
    user_id: a.user_id,
    type: "milestone_due",
    title: message,
    message: `Project: ${project.name}`,
    link: `/projects/${projectId}?tab=milestones`,
    project_id: projectId,
  }));

  const { error } = await supabase.from("notifications").insert(notifications);

  if (error) {
    console.error("Error creating milestone notifications:", error);
  }
}
