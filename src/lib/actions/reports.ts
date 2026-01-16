"use server";

/**
 * Reports Server Actions
 *
 * Handles all report-related operations including:
 * - Report CRUD operations
 * - Report line management
 * - Publishing/unpublishing
 * - Sharing and photo uploads
 */

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity-log/actions";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/constants";
import { sanitizeText, sanitizeHTML } from "@/lib/sanitize";

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

  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select(`
      id, project_id, report_type, is_published, published_at,
      share_with_client, share_internal, created_by, updated_by, created_at, updated_at,
      creator:users!reports_created_by_fkey(name),
      updater:users!reports_updated_by_fkey(name)
    `)
    .eq("id", reportId)
    .single();

  if (reportError || !report) {
    console.error("Error fetching report:", reportError?.message);
    return null;
  }

  // Fetch report lines
  const { data: lines, error: linesError } = await supabase
    .from("report_lines")
    .select("id, report_id, line_order, title, description, photos, created_at, updated_at")
    .eq("report_id", reportId)
    .order("line_order", { ascending: true });

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
  const { data: teamData } = await supabase
    .from("project_assignments")
    .select(`
      user:users(id, name, email, role)
    `)
    .eq("project_id", projectId);

  if (!teamData) return [];

  // Extract and return user data
  return teamData
    .filter(t => t.user)
    .map(t => t.user as unknown as { id: string; name: string; email: string; role: string });
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
 * Publish a report
 */
export async function publishReport(reportId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Get project ID for revalidation and logging
  const { data: report } = await supabase
    .from("reports")
    .select("project_id")
    .eq("id", reportId)
    .single();

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
  if (report?.project_id) {
    await logActivity({
      action: ACTIVITY_ACTIONS.REPORT_PUBLISHED,
      entityType: "report",
      entityId: reportId,
      projectId: report.project_id,
    });
    revalidatePath(`/projects/${report.project_id}`);
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
