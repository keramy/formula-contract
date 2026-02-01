"use server";

/**
 * Milestone Server Actions
 *
 * Handles milestone CRUD operations with:
 * - Activity logging
 * - In-app notifications for team members
 * - Email notifications via Resend batch API
 */

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity-log/actions";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/constants";
import { Resend } from "resend";
import { MilestoneAlertEmail } from "@/emails/milestone-alert-email";

// ============================================================================
// Types
// ============================================================================

export interface Milestone {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  due_date: string;
  is_completed: boolean | null;
  completed_at: string | null;
  alert_days_before: number | null;
  alert_sent_at: string | null;
  milestone_code: string | null;
  created_at: string | null;
  updated_at: string | null;
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

  // Get user name for notification
  const { data: userData } = await supabase
    .from("users")
    .select("name")
    .eq("id", user.id)
    .single();

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

  // Create notifications for team members (in-app + email)
  await notifyTeamAboutMilestone(
    input.project_id,
    user.id,
    `New milestone "${input.name}" added`,
    milestone.id,
    {
      name: input.name,
      dueDate: input.due_date,
      isCompleted: false,
      actionByName: userData?.name || "A team member",
    }
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

  // Get milestone details (including due_date for email)
  const { data: milestone } = await supabase
    .from("milestones")
    .select("project_id, name, due_date")
    .eq("id", milestoneId)
    .single();

  if (!milestone) {
    return { success: false, error: "Milestone not found" };
  }

  // Get user name for notification
  const { data: userData } = await supabase
    .from("users")
    .select("name")
    .eq("id", user.id)
    .single();

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
        milestoneId,
        {
          name: milestone.name,
          dueDate: milestone.due_date,
          isCompleted: true,
          actionByName: userData?.name || "A team member",
        }
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
      is_completed, completed_at, alert_days_before, alert_sent_at,
      milestone_code, created_at, updated_at
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
      is_completed, completed_at, alert_days_before, alert_sent_at,
      milestone_code, created_at, updated_at
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
// Helper: Notify team about milestone (in-app + email via batch API)
// ============================================================================

async function notifyTeamAboutMilestone(
  projectId: string,
  excludeUserId: string,
  message: string,
  milestoneId: string,
  milestoneDetails?: {
    name: string;
    dueDate: string;
    isCompleted?: boolean;
    actionByName: string;
  }
) {
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

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

  const userIds = assignments.map((a) => a.user_id);

  // Get user details for email (active users, exclude clients)
  const { data: users } = await supabase
    .from("users")
    .select("id, name, email, role")
    .in("id", userIds)
    .eq("is_active", true)
    .neq("role", "client");

  if (!users || users.length === 0) return;

  // 1. Create in-app notifications (batch insert)
  const notifications = users.map((u) => ({
    user_id: u.id,
    type: "milestone_due",
    title: message,
    message: `Project: ${project.name}`,
    project_id: projectId,
  }));

  const { error: notifError } = await supabase.from("notifications").insert(notifications);
  if (notifError) {
    console.error("[Milestone Notification] Failed to create in-app notifications:", notifError.message);
  }

  // 2. Send email notifications using Resend batch API
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !milestoneDetails) {
    return;
  }

  const usersWithEmail = users.filter((u) => u.email);
  if (usersWithEmail.length === 0) return;

  const projectUrl = `${siteUrl}/projects/${projectId}?tab=milestones`;
  const daysUntilDue = milestoneDetails.isCompleted
    ? 0
    : Math.ceil((new Date(milestoneDetails.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  // Build batch email requests
  const emailRequests = usersWithEmail.map((user) => ({
    from: "Formula Contract <noreply@formulacontractpm.com>",
    to: user.email,
    subject: milestoneDetails.isCompleted
      ? `Milestone Completed: ${milestoneDetails.name}`
      : `New Milestone: ${milestoneDetails.name}`,
    react: MilestoneAlertEmail({
      userName: user.name,
      milestoneName: milestoneDetails.name,
      projectName: project.name,
      projectCode: project.project_code,
      dueDate: new Date(milestoneDetails.dueDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      daysUntilDue,
      projectUrl,
    }),
  }));

  try {
    const resend = new Resend(apiKey);
    const { error: batchError } = await resend.batch.send(emailRequests);

    if (batchError) {
      console.error("[Milestone Notification] Batch email failed:", batchError);
    } else {
      console.log(`[Milestone Notification] Batch sent ${usersWithEmail.length} emails`);
    }
  } catch (emailError) {
    console.error("[Milestone Notification] Batch email error:", emailError);
  }
}
