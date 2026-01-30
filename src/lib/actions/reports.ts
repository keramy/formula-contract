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
import { ReportPublishedEmail } from "@/emails/report-published-email";

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
  report_code: string | null; // Human-readable code (RPT-YYYY-NNNN)
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
 * Debug function to see who would receive report notifications
 */
export async function debugReportNotificationRecipients(projectId: string, publisherId: string) {
  const supabase = await createClient();

  // Get all assignments
  const { data: assignments } = await supabase
    .from("project_assignments")
    .select("user_id")
    .eq("project_id", projectId);

  const allUserIds = assignments?.map(a => a.user_id) || [];
  const userIdsExcludingPublisher = allUserIds.filter(id => id !== publisherId);

  // Get all user details
  const { data: allUsers } = await supabase
    .from("users")
    .select("id, name, email, role, is_active")
    .in("id", allUserIds);

  // Categorize users
  const breakdown = {
    total_assigned: allUsers?.length || 0,
    publisher_excluded: allUsers?.find(u => u.id === publisherId),
    by_role: {} as Record<string, number>,
    by_status: { active: 0, inactive: 0 },
    would_receive_email: [] as string[],
    excluded_reasons: [] as { name: string; reason: string }[],
  };

  allUsers?.forEach(user => {
    // Count by role
    breakdown.by_role[user.role] = (breakdown.by_role[user.role] || 0) + 1;

    // Count by status
    if (user.is_active) breakdown.by_status.active++;
    else breakdown.by_status.inactive++;

    // Check if would receive email
    if (user.id === publisherId) {
      breakdown.excluded_reasons.push({ name: user.name, reason: "Is the publisher" });
    } else if (!user.is_active) {
      breakdown.excluded_reasons.push({ name: user.name, reason: "Inactive user" });
    } else if (user.role === "client") {
      breakdown.excluded_reasons.push({ name: user.name, reason: "Client role (excluded by default)" });
    } else if (!user.email) {
      breakdown.excluded_reasons.push({ name: user.name, reason: "No email address" });
    } else {
      breakdown.would_receive_email.push(`${user.name} (${user.email})`);
    }
  });

  console.log("[Debug Report Recipients]", JSON.stringify(breakdown, null, 2));
  return breakdown;
}

/**
 * Send notifications (in-app + email) to all project team members when a report is published
 * @param includeClients - Whether to send notifications to client users (default: false)
 * @param pdfUrl - Optional direct link to the PDF file in storage
 */
async function sendReportPublishedNotification(
  projectId: string,
  reportId: string,
  projectName: string,
  projectCode: string,
  reportType: string,
  publisherName: string,
  publisherId: string,
  includeClients: boolean = false,
  pdfUrl?: string
): Promise<{ sent: number; failed: number }> {
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  console.log("[Report Notification] Starting for project:", projectId, "publisher:", publisherId, "includeClients:", includeClients);

  // Get all user IDs assigned to this project
  const { data: assignments, error: assignmentsError } = await supabase
    .from("project_assignments")
    .select("user_id")
    .eq("project_id", projectId);

  if (assignmentsError || !assignments || assignments.length === 0) {
    console.error("[Report Notification] No assignments found:", assignmentsError?.message);
    return { sent: 0, failed: 0 };
  }

  console.log("[Report Notification] Found assignments:", assignments.length);

  // Get user details for assigned users (excluding publisher)
  const userIds = assignments.map(a => a.user_id).filter(id => id !== publisherId);

  if (userIds.length === 0) {
    console.log("[Report Notification] No OTHER users to notify (you are the only one assigned)");
    return { sent: 0, failed: 0 };
  }

  // Build query - filter by active status and optionally exclude clients
  let query = supabase
    .from("users")
    .select("id, name, email, role")
    .in("id", userIds)
    .eq("is_active", true);

  // Exclude clients unless explicitly included
  if (!includeClients) {
    query = query.neq("role", "client");
  }

  const { data: users, error: usersError } = await query;

  if (usersError || !users) {
    console.error("[Report Notification] Error fetching users:", usersError?.message);
    return { sent: 0, failed: 0 };
  }

  if (users.length === 0) {
    console.log("[Report Notification] No eligible users found to notify");
    return { sent: 0, failed: 0 };
  }

  console.log("[Report Notification] Will send to:", users.length, "users:", users.map(u => `${u.name} (${u.role})`));

  let sent = 0;
  let failed = 0;

  // 1. Create in-app notifications for all users (batch insert)
  // Note: No 'link' column - UI constructs link from project_id + report_id
  // Title includes WHO did the action for better context
  const notifications = users.map(user => ({
    user_id: user.id,
    type: "report_published",
    title: `${publisherName} shared a ${reportType} report`,
    message: `New ${reportType} report published for ${projectName}`,
    project_id: projectId,
    report_id: reportId,
  }));

  const { error: notifError } = await supabase.from("notifications").insert(notifications);
  if (notifError) {
    console.error("[Report Notification] Failed to create in-app notifications:", notifError.message);
  } else {
    console.log(`[Report Notification] Created ${notifications.length} in-app notifications`);
  }

  // 2. Send email notifications using Resend batch API (avoids rate limits)
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("[Report Notification] RESEND_API_KEY not configured, skipping emails");
    return { sent: users.length, failed: 0 };
  }

  // Filter users with valid emails
  const usersWithEmail = users.filter(u => u.email);
  if (usersWithEmail.length === 0) {
    console.log("[Report Notification] No users with email addresses");
    return { sent: users.length, failed: 0 };
  }

  // Build batch email requests
  // Use PDF URL if available, otherwise link to project reports page
  const reportUrl = pdfUrl || `${siteUrl}/projects/${projectId}?tab=reports`;

  const emailRequests = usersWithEmail.map(user => ({
    from: "Formula Contract <noreply@formulacontractpm.com>",
    to: user.email,
    subject: `New Report Published: ${projectName}`,
    react: ReportPublishedEmail({
      userName: user.name,
      projectName,
      projectCode,
      reportType,
      publisherName,
      reportUrl,
    }),
  }));

  try {
    const resend = new Resend(apiKey);
    // Batch send - single API call for up to 100 emails
    const { data, error: batchError } = await resend.batch.send(emailRequests);

    if (batchError) {
      console.error("[Report Notification] Batch email failed:", batchError);
      failed = usersWithEmail.length;
    } else {
      console.log(`[Report Notification] Batch sent ${data?.data?.length || usersWithEmail.length} emails`);
      sent = usersWithEmail.length;
    }
  } catch (emailError) {
    console.error("[Report Notification] Batch email error:", emailError);
    failed = usersWithEmail.length;
  }

  console.log(`Report notifications: ${sent} emails sent, ${failed} failed`);
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
      id, project_id, report_type, report_code, is_published, published_at,
      share_with_client, share_internal, created_by, updated_by, created_at, updated_at,
      creator:users!reports_created_by_fkey(name),
      updater:users!reports_updated_by_fkey(name),
      report_lines(id, report_id, line_order, title, description, photos, created_at, updated_at),
      report_shares(report_id, user:users(id, name, email))
    `)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  // Clients only see published reports that are explicitly shared with them
  if (isClient) {
    query = query
      .eq("is_published", true)
      .eq("share_with_client", true);
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
      report_code: report.report_code,
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
        id, project_id, report_type, report_code, is_published, published_at,
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
 * Upload a PDF file to Supabase Storage
 * @param reportId - The report ID (used for file naming)
 * @param pdfBlob - The PDF blob to upload
 * @param projectCode - Project code for file naming
 * @param reportType - Report type for file naming
 */
export async function uploadReportPdf(
  reportId: string,
  pdfBase64: string,
  projectCode: string,
  reportType: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Convert base64 to blob
  // jsPDF datauristring format: "data:application/pdf;filename=xxx.pdf;base64,<data>"
  // We need to strip everything before the actual base64 data
  const base64Data = pdfBase64.replace(/^data:application\/pdf;[^,]*,/, "");
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const pdfBlob = new Blob([bytes], { type: "application/pdf" });

  // Generate filename: {projectCode}_{reportType}_{date}_{reportId}.pdf
  const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const fileName = `${projectCode}_${reportType}_${dateStr}_${reportId.slice(0, 8)}.pdf`;
  const filePath = `pdfs/${fileName}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("reports")
    .upload(filePath, pdfBlob, {
      contentType: "application/pdf",
      upsert: true, // Overwrite if exists
    });

  if (uploadError) {
    console.error("Error uploading PDF:", uploadError.message);
    return { success: false, error: uploadError.message };
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from("reports")
    .getPublicUrl(filePath);

  return { success: true, url: publicUrl };
}

/**
 * Publish a report and notify all project team members via email
 * @param includeClients - Whether to send notifications to client users (default: false)
 * @param pdfUrl - Optional URL of the generated PDF stored in Supabase Storage
 */
export async function publishReport(
  reportId: string,
  includeClients: boolean = false,
  pdfUrl?: string
): Promise<ActionResult> {
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
      ...(pdfUrl && { pdf_url: pdfUrl }),
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
          user.id,
          includeClients,
          pdfUrl // Pass PDF URL for direct download link in email
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

// ============================================================================
// Report Activity Tracking (Admin Only)
// ============================================================================

export interface ReportActivity {
  id: string;
  report_id: string;
  user_id: string | null;
  action: "viewed" | "downloaded";
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user?: { name: string; email: string } | null;
}

/**
 * Log when a user views or downloads a report
 */
export async function logReportActivity(
  reportId: string,
  action: "viewed" | "downloaded",
  metadata?: { ip_address?: string; user_agent?: string }
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase.from("report_activity").insert({
    report_id: reportId,
    user_id: user.id,
    action,
    ip_address: metadata?.ip_address || null,
    user_agent: metadata?.user_agent || null,
  });

  if (error) {
    console.error("Error logging report activity:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get activity log for a report (Admin only - enforced by RLS)
 */
export async function getReportActivity(
  reportId: string,
  limit = 50
): Promise<ReportActivity[]> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("report_activity")
    .select(`
      id,
      report_id,
      user_id,
      action,
      ip_address,
      user_agent,
      created_at,
      user:users(name, email)
    `)
    .eq("report_id", reportId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    // RLS will return empty if not admin, not an error
    console.error("Error fetching report activity:", error.message);
    return [];
  }

  return (data || []) as unknown as ReportActivity[];
}

/**
 * Get activity summary for a report (Admin only)
 * Returns view count, download count, unique viewers, last viewed
 */
export async function getReportActivitySummary(reportId: string): Promise<{
  viewCount: number;
  downloadCount: number;
  uniqueViewers: number;
  lastViewed: string | null;
  lastViewedBy: string | null;
} | null> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Get all activity for this report
  const { data, error } = await supabase
    .from("report_activity")
    .select(`
      action,
      user_id,
      created_at,
      user:users(name)
    `)
    .eq("report_id", reportId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return null;
  }

  const viewCount = data.filter((a) => a.action === "viewed").length;
  const downloadCount = data.filter((a) => a.action === "downloaded").length;
  const uniqueViewers = new Set(data.map((a) => a.user_id).filter(Boolean)).size;
  const lastView = data.find((a) => a.action === "viewed");

  return {
    viewCount,
    downloadCount,
    uniqueViewers,
    lastViewed: lastView?.created_at || null,
    lastViewedBy: (lastView?.user as { name: string } | null)?.name || null,
  };
}
