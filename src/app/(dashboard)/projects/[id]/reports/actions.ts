"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity-log/actions";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/constants";

export interface Report {
  id: string;
  project_id: string;
  report_type: string;
  is_published: boolean;
  published_at: string | null;
  share_with_client: boolean;
  share_internal: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  creator?: { name: string } | null;
  lines?: ReportLine[];
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

// Get all reports for a project
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

  let query = supabase
    .from("reports")
    .select(`
      id, project_id, report_type, is_published, published_at,
      share_with_client, share_internal, created_by, created_at, updated_at,
      creator:users!reports_created_by_fkey(name)
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

  // Fetch lines for each report
  const reports = (data || []) as unknown as Report[];

  if (reports.length > 0) {
    const reportIds = reports.map(r => r.id);
    const { data: linesData } = await supabase
      .from("report_lines")
      .select("id, report_id, line_order, title, description, photos, created_at, updated_at")
      .in("report_id", reportIds)
      .order("line_order", { ascending: true });

    // Group lines by report_id
    const lines = (linesData || []) as unknown as ReportLine[];
    const linesByReport = lines.reduce((acc, line) => {
      if (!acc[line.report_id]) {
        acc[line.report_id] = [];
      }
      acc[line.report_id].push(line);
      return acc;
    }, {} as Record<string, ReportLine[]>);

    // Attach lines to reports
    reports.forEach(report => {
      report.lines = linesByReport[report.id] || [];
    });
  }

  return reports;
}

// Get a single report with lines
export async function getReportDetail(reportId: string): Promise<Report | null> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select(`
      id, project_id, report_type, is_published, published_at,
      share_with_client, share_internal, created_by, created_at, updated_at,
      creator:users!reports_created_by_fkey(name)
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

// Create a new report
export async function createReport(
  projectId: string,
  reportType: string = "progress"
): Promise<{ success: boolean; reportId?: string; error?: string }> {
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
  return { success: true, reportId: data.id };
}

// Update report metadata
export async function updateReport(
  reportId: string,
  data: {
    report_type?: string;
    share_with_client?: boolean;
    share_internal?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
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
    .update(data)
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

// Delete a report
export async function deleteReport(reportId: string): Promise<{ success: boolean; error?: string }> {
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

// Publish a report
export async function publishReport(reportId: string): Promise<{ success: boolean; error?: string }> {
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

// Unpublish a report
export async function unpublishReport(reportId: string): Promise<{ success: boolean; error?: string }> {
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

// Add a report line
export async function addReportLine(
  reportId: string,
  data: {
    title: string;
    description?: string;
    photos?: string[];
  }
): Promise<{ success: boolean; lineId?: string; error?: string }> {
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

  const { data: newLine, error } = await supabase
    .from("report_lines")
    .insert({
      report_id: reportId,
      line_order: nextOrder,
      title: data.title,
      description: data.description || null,
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

  return { success: true, lineId: newLine.id };
}

// Update a report line
export async function updateReportLine(
  lineId: string,
  data: {
    title?: string;
    description?: string;
    photos?: string[];
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("report_lines")
    .update(data)
    .eq("id", lineId);

  if (error) {
    console.error("Error updating report line:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Delete a report line
export async function deleteReportLine(lineId: string): Promise<{ success: boolean; error?: string }> {
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

// Reorder report lines
export async function reorderReportLines(
  reportId: string,
  lineIds: string[]
): Promise<{ success: boolean; error?: string }> {
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

// Upload photo for report line
export async function uploadReportPhoto(
  projectId: string,
  reportId: string,
  file: File
): Promise<{ success: boolean; url?: string; error?: string }> {
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

  return { success: true, url: publicUrl };
}
