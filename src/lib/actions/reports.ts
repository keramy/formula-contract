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

  console.log("[Report Notification] Starting for project:", projectId, "publisher:", publisherId);

  // Get all user IDs assigned to this project
  const { data: assignments, error: assignmentsError } = await supabase
    .from("project_assignments")
    .select("user_id")
    .eq("project_id", projectId);

  if (assignmentsError || !assignments || assignments.length === 0) {
    console.error("[Report Notification] No assignments found:", assignmentsError?.message);
    return { sent: 0, failed: 0 };
  }

  console.log("[Report Notification] Found assignments:", assignments.length, "users:", assignments.map(a => a.user_id));

  // Get user details for assigned users (excluding publisher, only active users)
  const userIds = assignments.map(a => a.user_id).filter(id => id !== publisherId);

  if (userIds.length === 0) {
    console.log("[Report Notification] No OTHER users to notify (you are the only one assigned)");
    return { sent: 0, failed: 0 };
  }

  console.log("[Report Notification] Users to notify (excluding publisher):", userIds);

  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, name, email")
    .in("id", userIds)
    .eq("is_active", true);

  if (usersError || !users) {
    console.error("[Report Notification] Error fetching users:", usersError?.message);
    return { sent: 0, failed: 0 };
  }

  if (users.length === 0) {
    console.log("[Report Notification] No active users found to notify");
    return { sent: 0, failed: 0 };
  }

  console.log("[Report Notification] Will send to:", users.map(u => u.email));

  let sent = 0;
  let failed = 0;

  // Create in-app notifications and send emails to each team member
  for (const user of users) {
    try {
      // 1. Create in-app notification (bell icon) - use direct insert like assignment flow
      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "report_published",
        title: `New ${reportType} report published`,
        message: `${publisherName} published a new report for ${projectName}`,
        project_id: projectId,
        report_id: reportId,
        link: `/projects/${projectId}?tab=reports`,
      });

      // 2. Send email notification (if Resend is configured)
      const apiKey = process.env.RESEND_API_KEY;
      console.log("[Report Notification] Checking email for:", user.email, "API key exists:", !!apiKey);

      if (apiKey && user.email) {
        console.log("[Report Notification] Sending email to:", user.email);
        const resend = new Resend(apiKey);
        await resend.emails.send({
          from: "Formula Contract <noreply@formulacontractpm.com>",
          to: user.email,
          subject: `📊 New Report Published: ${projectName}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
              <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #5b21b6 100%); padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0;">
                  <div style="display: inline-block; background: rgba(255,255,255,0.15); padding: 12px 24px; border-radius: 50px; margin-bottom: 16px;">
                    <span style="color: white; font-size: 14px; font-weight: 600; letter-spacing: 1px;">FORMULA CONTRACT</span>
                  </div>
                  <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">📊 New Report Published</h1>
                  <p style="margin: 12px 0 0 0; color: rgba(255,255,255,0.85); font-size: 16px;">A new report is ready for your review</p>
                </div>

                <!-- Main Content -->
                <div style="background-color: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                  <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                    Hi <strong>${user.name}</strong>,
                  </p>
                  <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                    A new <strong style="color: #7c3aed;">${reportType}</strong> report has been published for your project. Click below to view the details.
                  </p>

                  <!-- Report Details Box -->
                  <div style="background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%); border: 1px solid #ddd6fe; border-radius: 12px; padding: 24px; margin: 24px 0;">
                    <div style="display: flex; margin-bottom: 16px; border-bottom: 1px solid #ddd6fe; padding-bottom: 16px;">
                      <div style="flex: 1;">
                        <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Project</p>
                        <p style="margin: 0; color: #111827; font-size: 16px; font-weight: 600;">${projectName}</p>
                      </div>
                      <div>
                        <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Code</p>
                        <code style="display: inline-block; background: white; color: #7c3aed; padding: 4px 12px; border-radius: 4px; font-size: 14px; font-weight: 600;">${projectCode}</code>
                      </div>
                    </div>
                    <div style="display: flex;">
                      <div style="flex: 1;">
                        <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Report Type</p>
                        <p style="margin: 0; color: #111827; font-size: 15px; font-weight: 500; text-transform: capitalize;">${reportType}</p>
                      </div>
                      <div style="flex: 1;">
                        <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Published By</p>
                        <p style="margin: 0; color: #111827; font-size: 15px; font-weight: 500;">${publisherName}</p>
                      </div>
                    </div>
                  </div>

                  <!-- CTA Button -->
                  <div style="text-align: center; margin-top: 32px;">
                    <a href="${siteUrl}/projects/${projectId}?tab=reports"
                       style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.4);">
                      View Report →
                    </a>
                  </div>

                  <!-- Info Notice -->
                  <p style="color: #9ca3af; font-size: 13px; margin-top: 32px; margin-bottom: 0; text-align: center;">
                    You're receiving this because you're a team member on this project.
                  </p>
                </div>

                <!-- Footer -->
                <div style="text-align: center; padding: 32px 20px;">
                  <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Formula Contract</p>
                  <p style="margin: 0 0 16px 0; color: #9ca3af; font-size: 13px;">Project Management for Furniture Manufacturing</p>
                  <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                    <a href="https://formulacontractpm.com" style="color: #7c3aed; text-decoration: none;">formulacontractpm.com</a>
                  </p>
                </div>
              </div>
            </body>
            </html>
          `,
        });
        console.log("[Report Notification] Email sent successfully to:", user.email);
      }

      sent++;
    } catch (notifyError) {
      console.error(`[Report Notification] FAILED for ${user.email}:`, notifyError);
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
    .select("project_id, report_type")
    .eq("id", reportId)
    .single();

  if (!report) {
    return { success: false, error: "Report not found" };
  }

  // Get project details and publisher name in parallel
  const [projectResult, publisherResult] = await Promise.all([
    report.project_id
      ? supabase.from("projects").select("name, project_code").eq("id", report.project_id).single()
      : Promise.resolve({ data: null }),
    supabase.from("users").select("name").eq("id", user.id).single(),
  ]);

  const project = projectResult.data;
  const publisherName = publisherResult.data?.name || "A team member";

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
    if (project) {
      try {
        await sendReportPublishedNotification(
          report.project_id,
          reportId,
          project.name,
          project.project_code,
          report.report_type,
          publisherName,
          user.id
        );
      } catch (err) {
        // Log but don't fail the publish operation
        console.error("Error sending report notifications:", err);
      }
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
