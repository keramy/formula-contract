"use server";

/**
 * Reports Server Actions
 *
 * Handles all report-related operations including:
 * - Report CRUD operations
 * - Report line management
 * - Publishing/unpublishing
 * - Sharing and photo uploads
 * - Email notifications on publish
 */

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity-log/actions";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/constants";
import { sanitizeText, sanitizeHTML } from "@/lib/sanitize";
import { createNotification } from "@/lib/notifications/actions";
import { Resend } from "resend";

// ============================================================================
// Types
// ============================================================================

export interface SharedUser {
  id: string;
  name: string;
  email: string;
}

export interface Report {
  id: string;
  project_id: string;
  report_type: string;
  is_published: boolean;
  published_at: string | null;
  share_with_client: boolean;
  share_internal: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  creator?: { name: string } | null;
  updater?: { name: string } | null;
  lines?: ReportLine[];
  shared_with?: SharedUser[];
}

export interface ReportLine {
  id: string;
  report_id: string;
  line_order: number;
  title: string;
  description: string | null;
  photos: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// Email Notification Helper
// ============================================================================

/**
 * Send notifications (in-app + email) to all project team members when a report is published
 */
async function sendReportPublishedNotification(
  projectId: string,
  reportId: string,
  projectName: string,
  projectCode: string,
  reportType: string,
  publisherName: string,
  publisherId: string
): Promise<{ sent: number; failed: number }> {
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // Get all users assigned to this project
  const { data: assignments, error } = await supabase
    .from("project_assignments")
    .select(`
      user:users!project_assignments_user_id_fkey(id, name, email, is_active)
    `)
    .eq("project_id", projectId);

  if (error || !assignments) {
    console.error("Error fetching project team for notifications:", error?.message);
    return { sent: 0, failed: 0 };
  }

  // Extract active users (exclude the publisher - they don't need to be notified about their own action)
  const users = assignments
    .filter(a => a.user && a.user.is_active && a.user.id !== publisherId)
    .map(a => a.user as { id: string; name: string; email: string });

  if (users.length === 0) {
    console.log("No other active users to notify for project:", projectId);
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  // Create in-app notifications and send emails to each team member
  for (const user of users) {
    try {
      // 1. Create in-app notification (bell icon)
      await createNotification({
        userId: user.id,
        type: "report_published",
        title: `New ${reportType} report published`,
        message: `${publisherName} published a new report for ${projectName}`,
        projectId: projectId,
        reportId: reportId,
      });

      // 2. Send email notification (if Resend is configured)
      const apiKey = process.env.RESEND_API_KEY;
      if (apiKey && user.email) {
        const resend = new Resend(apiKey);
        await resend.emails.send({
          from: "Formula Contract <onboarding@resend.dev>", // Use verified domain in production
          to: user.email,
          subject: `New Report Published: ${projectName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">📊 New Report Published</h1>
              </div>

              <div style="padding: 30px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                <p style="color: #374151; font-size: 16px; margin-top: 0;">Hi ${user.name},</p>

                <p style="color: #6b7280; font-size: 15px;">
                  A new <strong>${reportType}</strong> report has been published for your project.
                </p>

                <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 24px 0;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Project:</td>
                      <td style="padding: 8px 0; color: #111827; font-weight: 600; font-size: 14px;">${projectName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Project Code:</td>
                      <td style="padding: 8px 0; color: #111827; font-family: monospace; font-size: 14px;">${projectCode}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Report Type:</td>
                      <td style="padding: 8px 0; color: #111827; font-size: 14px; text-transform: capitalize;">${reportType}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Published By:</td>
                      <td style="padding: 8px 0; color: #111827; font-size: 14px;">${publisherName}</td>
                    </tr>
                  </table>
                </div>

                <a href="${siteUrl}/projects/${projectId}?tab=reports"
                   style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
                  View Report
                </a>

                <p style="color: #9ca3af; font-size: 13px; margin-top: 24px; margin-bottom: 0;">
                  You're receiving this because you're a team member on this project.
                </p>
              </div>

              <div style="padding: 16px; text-align: center; color: #9ca3af; font-size: 12px;">
                <p style="margin: 0;">Formula Contract • Project Management System</p>
              </div>
            </div>
          `,
        });
      }

      sent++;
    } catch (notifyError) {
      console.error(`Failed to send report notification to ${user.email}:`, notifyError);
      failed++;
    }
  }

  console.log(`Report notifications: ${sent} sent, ${failed} failed`);
  return { sent, failed };
}

// ============================================================================
// Query Operations
// ============================================================================

/**
 * Get all reports for a project
 * OPTIMIZED: Reduced from 5 queries to 2 queries using nested selects
 */
export async function getProjectReports(projectId: string): Promise<Report[]> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Check user role
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const isClient = profile?.role === "client";

  // OPTIMIZED: Single query with nested selects for lines and shares
  let query = supabase
    .from("reports")
    .select(`
      id, project_id, report_type, is_published, published_at,
      share_with_client, share_internal, created_by, updated_by, created_at, updated_at,
      creator:users!reports_created_by_fkey(name),
      updater:users!reports_updated_by_fkey(name),
      report_lines(id, report_id, line_order, title, description, photos, created_at, updated_at),
      report_shares(report_id, user:users(id, name, email))
    `)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  // Clients only see published reports
  if (isClient) {
    query = query.eq("is_published", true);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching reports:", error.message);
    return [];
  }

  // Transform data to expected format
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reports = (data || []).map((report: any) => {
    // Sort lines by line_order
    const lines = (report.report_lines || []).sort(
      (a: ReportLine, b: ReportLine) => a.line_order - b.line_order
    );

    // Extract shared users from report_shares
    const sharedWith = (report.report_shares || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((share: any) => share.user)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((share: any) => share.user as SharedUser);

    return {
      id: report.id,
      project_id: report.project_id,
      report_type: report.report_type,
      is_published: report.is_published,
      published_at: report.published_at,
      share_with_client: report.share_with_client,
      share_internal: report.share_internal,
      created_by: report.created_by,
      updated_by: report.updated_by,
      created_at: report.created_at,
      updated_at: report.updated_at,
      creator: report.creator,
      updater: report.updater,
      lines,
      shared_with: sharedWith,
    } as Report;
  });

  return reports;
}

/**
 * Get a single report with lines
 */
export async function getReportDetail(reportId: string): Promise<Report | null> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch report and lines in PARALLEL
  const [reportResult, linesResult] = await Promise.all([
    supabase
      .from("reports")
      .select(`
        id, project_id, report_type, is_published, published_at,
        share_with_client, share_internal, created_by, updated_by, created_at, updated_at,
        creator:users!reports_created_by_fkey(name),
        updater:users!reports_updated_by_fkey(name)
      `)
      .eq("id", reportId)
      .single(),
    supabase
      .from("report_lines")
      .select("id, report_id, line_order, title, description, photos, created_at, updated_at")
      .eq("report_id", reportId)
      .order("line_order", { ascending: true }),
  ]);

  const { data: report, error: reportError } = reportResult;
  const { data: lines, error: linesError } = linesResult;

  if (reportError || !report) {
    console.error("Error fetching report:", reportError?.message);
    return null;
  }

  if (linesError) {
    console.error("Error fetching report lines:", linesError.message);
  }

  return {
    ...(report as unknown as Report),
    lines: (lines || []) as unknown as ReportLine[],
  };
}

/**
 * Get all users for sharing picker (project team members)
 */
export async function getProjectTeamMembers(
  projectId: string
): Promise<Array<{ id: string; name: string; email: string; role: string }>> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get project team members from project_assignments
  // Include user_id for debugging and use explicit join
  const { data: teamData, error: assignmentError } = await supabase
    .from("project_assignments")
    .select(`
      user_id,
      user:users!project_assignments_user_id_fkey(id, name, email, role)
    `)
    .eq("project_id", projectId);

  if (assignmentError) {
    console.error("[getProjectTeamMembers] Assignment query error:", assignmentError.message);
    return [];
  }

  if (!teamData || teamData.length === 0) {
    console.log("[getProjectTeamMembers] No assignments found for project:", projectId);
    return [];
  }

  // Extract and return user data, filtering out any null users
  const members = teamData
    .filter(t => t.user !== null)
    .map(t => t.user as unknown as { id: string; name: string; email: string; role: string });

  // If we have assignments but no users, there might be an RLS or join issue
  if (members.length === 0 && teamData.length > 0) {
    console.warn("[getProjectTeamMembers] Assignments exist but user data is null. Check RLS policies on users table.");
    console.log("[getProjectTeamMembers] Assignment user_ids:", teamData.map(t => t.user_id));

    // Fallback: try to fetch users directly by their IDs
    const userIds = teamData.map(t => t.user_id).filter(Boolean);
    if (userIds.length > 0) {
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, name, email, role")
        .in("id", userIds);

      if (usersError) {
        console.error("[getProjectTeamMembers] Direct users query error:", usersError.message);
      } else if (usersData && usersData.length > 0) {
        console.log("[getProjectTeamMembers] Fallback query succeeded:", usersData.length, "users");
        return usersData;
      }
    }
  }

  return members;
}

// ============================================================================
// Report CRUD Operations
// ============================================================================

/**
 * Create a new report
 */
export async function createReport(
  projectId: string,
  reportType: string = "progress"
): Promise<ActionResult<{ reportId: string }>> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("reports")
    .insert({
      project_id: projectId,
      report_type: reportType,
      created_by: user.id,
      is_published: false,
      share_with_client: false,
      share_internal: true,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating report:", error.message);
    return { success: false, error: error.message };
  }

  // Log activity
  await logActivity({
    action: ACTIVITY_ACTIONS.REPORT_CREATED,
    entityType: "report",
    entityId: data.id,
    projectId,
    details: { report_type: reportType },
  });

  revalidatePath(`/projects/${projectId}`);
  return { success: true, data: { reportId: data.id } };
}

/**
 * Update report metadata
 */
export async function updateReport(
  reportId: string,
  data: {
    report_type?: string;
    share_with_client?: boolean;
    share_internal?: boolean;
  }
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Get project ID for revalidation
  const { data: report } = await supabase
    .from("reports")
    .select("project_id")
    .eq("id", reportId)
    .single();

  const { error } = await supabase
    .from("reports")
    .update({
      ...data,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  if (error) {
    console.error("Error updating report:", error.message);
    return { success: false, error: error.message };
  }

  if (report?.project_id) {
    revalidatePath(`/projects/${report.project_id}`);
  }

  return { success: true };
}

/**
 * Delete a report
 */
export async function deleteReport(reportId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Get project ID for revalidation
  const { data: report } = await supabase
    .from("reports")
    .select("project_id")
    .eq("id", reportId)
    .single();

  const { error } = await supabase
    .from("reports")
    .delete()
    .eq("id", reportId);

  if (error) {
    console.error("Error deleting report:", error.message);
    return { success: false, error: error.message };
  }

  if (report?.project_id) {
    revalidatePath(`/projects/${report.project_id}`);
  }

  return { success: true };
}

// ============================================================================
// Report Publishing Operations
// ============================================================================

/**
 * Publish a report and notify all project team members via email
 */
export async function publishReport(reportId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Get report details including project info for notifications
  const { data: report } = await supabase
    .from("reports")
    .select(`
      project_id,
      report_type,
      project:projects!reports_project_id_fkey(name, project_code)
    `)
    .eq("id", reportId)
    .single();

  if (!report) {
    return { success: false, error: "Report not found" };
  }

  // Get the publisher's name
  const { data: publisher } = await supabase
    .from("users")
    .select("name")
    .eq("id", user.id)
    .single();

  const publisherName = publisher?.name || "A team member";

  const { error } = await supabase
    .from("reports")
    .update({
      is_published: true,
      published_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  if (error) {
    console.error("Error publishing report:", error.message);
    return { success: false, error: error.message };
  }

  // Log activity
  if (report.project_id) {
    await logActivity({
      action: ACTIVITY_ACTIONS.REPORT_PUBLISHED,
      entityType: "report",
      entityId: reportId,
      projectId: report.project_id,
    });
    revalidatePath(`/projects/${report.project_id}`);

    // Send in-app + email notifications to all project team members
    // This runs async and doesn't block the response
    const project = report.project as { name: string; project_code: string } | null;
    if (project) {
      sendReportPublishedNotification(
        report.project_id,
        reportId,
        project.name,
        project.project_code,
        report.report_type,
        publisherName,
        user.id
      ).catch(err => {
        console.error("Error sending report notifications:", err);
      });
    }
  }

  return { success: true };
}

/**
 * Unpublish a report
 */
export async function unpublishReport(reportId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Get project ID for revalidation
  const { data: report } = await supabase
    .from("reports")
    .select("project_id")
    .eq("id", reportId)
    .single();

  const { error } = await supabase
    .from("reports")
    .update({
      is_published: false,
      published_at: null,
    })
    .eq("id", reportId);

  if (error) {
    console.error("Error unpublishing report:", error.message);
    return { success: false, error: error.message };
  }

  if (report?.project_id) {
    revalidatePath(`/projects/${report.project_id}`);
  }

  return { success: true };
}

// ============================================================================
// Report Line Operations
// ============================================================================

/**
 * Add a report line
 */
export async function addReportLine(
  reportId: string,
  data: {
    title: string;
    description?: string;
    photos?: string[];
  }
): Promise<ActionResult<{ lineId: string }>> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Get the current max line_order
  const { data: existingLines } = await supabase
    .from("report_lines")
    .select("line_order")
    .eq("report_id", reportId)
    .order("line_order", { ascending: false })
    .limit(1);

  const nextOrder = existingLines && existingLines.length > 0
    ? existingLines[0].line_order + 1
    : 1;

  // Sanitize user inputs
  const sanitizedTitle = sanitizeText(data.title);
  const sanitizedDescription = data.description ? sanitizeHTML(data.description) : null;

  const { data: newLine, error } = await supabase
    .from("report_lines")
    .insert({
      report_id: reportId,
      line_order: nextOrder,
      title: sanitizedTitle,
      description: sanitizedDescription,
      photos: data.photos || [],
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error adding report line:", error.message);
    return { success: false, error: error.message };
  }

  // Get project ID for revalidation
  const { data: report } = await supabase
    .from("reports")
    .select("project_id")
    .eq("id", reportId)
    .single();

  if (report?.project_id) {
    revalidatePath(`/projects/${report.project_id}`);
  }

  return { success: true, data: { lineId: newLine.id } };
}

/**
 * Update a report line
 */
export async function updateReportLine(
  lineId: string,
  data: {
    title?: string;
    description?: string;
    photos?: string[];
  }
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Sanitize user inputs
  const sanitizedData: { title?: string; description?: string; photos?: string[] } = {};
  if (data.title !== undefined) {
    sanitizedData.title = sanitizeText(data.title);
  }
  if (data.description !== undefined) {
    sanitizedData.description = sanitizeHTML(data.description);
  }
  if (data.photos !== undefined) {
    sanitizedData.photos = data.photos;
  }

  const { error } = await supabase
    .from("report_lines")
    .update(sanitizedData)
    .eq("id", lineId);

  if (error) {
    console.error("Error updating report line:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Delete a report line
 */
export async function deleteReportLine(lineId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("report_lines")
    .delete()
    .eq("id", lineId);

  if (error) {
    console.error("Error deleting report line:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Reorder report lines
 */
export async function reorderReportLines(
  reportId: string,
  lineIds: string[]
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Update each line with its new order
  const updates = lineIds.map((id, index) =>
    supabase
      .from("report_lines")
      .update({ line_order: index + 1 })
      .eq("id", id)
      .eq("report_id", reportId)
  );

  const results = await Promise.all(updates);
  const hasError = results.some(r => r.error);

  if (hasError) {
    console.error("Error reordering report lines");
    return { success: false, error: "Failed to reorder lines" };
  }

  // Get project ID for revalidation
  const { data: report } = await supabase
    .from("reports")
    .select("project_id")
    .eq("id", reportId)
    .single();

  if (report?.project_id) {
    revalidatePath(`/projects/${report.project_id}`);
  }

  return { success: true };
}

// ============================================================================
// Report Photo & Sharing Operations
// ============================================================================

/**
 * Upload photo for report line
 */
export async function uploadReportPhoto(
  projectId: string,
  reportId: string,
  file: File
): Promise<ActionResult<{ url: string }>> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const fileExt = file.name.split(".").pop();
  const fileName = `${projectId}/${reportId}/${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from("reports")
    .upload(fileName, file);

  if (error) {
    console.error("Error uploading photo:", error.message);
    return { success: false, error: error.message };
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from("reports")
    .getPublicUrl(data.path);

  return { success: true, data: { url: publicUrl } };
}

/**
 * Update report shares (replace all shares with new list)
 */
export async function updateReportShares(
  reportId: string,
  userIds: string[]
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Get project ID for revalidation
  const { data: report } = await supabase
    .from("reports")
    .select("project_id")
    .eq("id", reportId)
    .single();

  // Delete existing shares
  const { error: deleteError } = await supabase
    .from("report_shares")
    .delete()
    .eq("report_id", reportId);

  if (deleteError) {
    console.error("Error deleting existing shares:", deleteError.message);
    return { success: false, error: deleteError.message };
  }

  // Insert new shares if any
  if (userIds.length > 0) {
    const sharesToInsert = userIds.map(userId => ({
      report_id: reportId,
      user_id: userId,
    }));

    const { error: insertError } = await supabase
      .from("report_shares")
      .insert(sharesToInsert);

    if (insertError) {
      console.error("Error inserting shares:", insertError.message);
      return { success: false, error: insertError.message };
    }
  }

  if (report?.project_id) {
    revalidatePath(`/projects/${report.project_id}`);
  }

  return { success: true };
}
