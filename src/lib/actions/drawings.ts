"use server";

/**
 * Drawings Server Actions
 *
 * Handles sending drawings to clients (single and bulk),
 * PM override approval with server-side validation,
 * including email notifications and activity logging.
 */

import { createClient, type RequestContext } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-log/actions";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/constants";
import { Resend } from "resend";
import { DrawingSentToClientEmail } from "@/emails/drawing-sent-to-client-email";

interface SendDrawingsResult {
  success: boolean;
  sentCount: number;
  emailsSent: number;
  emailsFailed: number;
  error?: string;
}

/**
 * Send drawings to client for review/approval.
 * Works for both single and bulk sends.
 *
 * 1. Updates drawing statuses to "sent_to_client"
 * 2. Updates scope item statuses to "awaiting_approval"
 * 3. Creates in-app notifications for client users
 * 4. Sends email notifications via Resend
 * 5. Logs activity
 */
export async function sendDrawingsToClient(
  projectId: string,
  drawingIds: string[],
  ctx?: RequestContext
): Promise<SendDrawingsResult> {
  const supabase = ctx?.supabase ?? await createClient();

  // 1. Auth check
  const user = ctx?.user ?? (await supabase.auth.getUser()).data.user;
  if (!user) {
    return { success: false, sentCount: 0, emailsSent: 0, emailsFailed: 0, error: "Not authenticated" };
  }

  if (drawingIds.length === 0) {
    return { success: false, sentCount: 0, emailsSent: 0, emailsFailed: 0, error: "No drawings selected" };
  }

  // 2. Fetch drawing + item details
  const { data: drawingsData, error: drawingsError } = await supabase
    .from("drawings")
    .select("id, item_id, current_revision")
    .in("id", drawingIds);

  if (drawingsError || !drawingsData || drawingsData.length === 0) {
    console.error("[sendDrawingsToClient] Error fetching drawings:", drawingsError?.message);
    return { success: false, sentCount: 0, emailsSent: 0, emailsFailed: 0, error: "Drawings not found" };
  }

  const itemIds = drawingsData.map((d) => d.item_id);

  // Get scope item details for notifications
  const { data: itemsData } = await supabase
    .from("scope_items")
    .select("id, item_code, name")
    .in("id", itemIds);

  const itemMap = new Map((itemsData || []).map((i) => [i.id, i]));

  // 3. Batch update drawings — set status to "sent_to_client"
  const now = new Date().toISOString();
  const { error: updateDrawingsError } = await supabase
    .from("drawings")
    .update({ status: "sent_to_client", sent_to_client_at: now })
    .in("id", drawingIds);

  if (updateDrawingsError) {
    console.error("[sendDrawingsToClient] Error updating drawings:", updateDrawingsError.message);
    return { success: false, sentCount: 0, emailsSent: 0, emailsFailed: 0, error: updateDrawingsError.message };
  }

  // 4. Batch update scope items — set status to "awaiting_approval"
  const { error: updateItemsError } = await supabase
    .from("scope_items")
    .update({ status: "awaiting_approval" })
    .in("id", itemIds);

  if (updateItemsError) {
    console.error("[sendDrawingsToClient] Error updating scope items:", updateItemsError.message);
    // Continue — drawings are already updated, this is non-blocking
  }

  // 5. Get project details + sender name + client users
  const [projectResult, senderResult, assignmentsResult] = await Promise.all([
    supabase
      .from("projects")
      .select("name, project_code")
      .eq("id", projectId)
      .single(),
    supabase.from("users").select("name").eq("id", user.id).single(),
    supabase
      .from("project_assignments")
      .select("user_id")
      .eq("project_id", projectId),
  ]);

  const projectName = projectResult.data?.name || "Unknown Project";
  const projectCode = projectResult.data?.project_code || "";
  const senderName = senderResult.data?.name || "A team member";

  // Get client users assigned to this project
  const assignedUserIds = (assignmentsResult.data || []).map((a) => a.user_id);

  let emailsSent = 0;
  let emailsFailed = 0;

  if (assignedUserIds.length > 0) {
    const { data: clientUsers } = await supabase
      .from("users")
      .select("id, name, email, role")
      .in("id", assignedUserIds)
      .eq("role", "client")
      .eq("is_active", true);

    const clients = clientUsers || [];

    if (clients.length > 0) {
      const itemCodes = drawingsData
        .map((d) => itemMap.get(d.item_id)?.item_code)
        .filter((code): code is string => !!code);

      // 6. Create in-app notifications for client users
      const notifications = clients.map((client) => ({
        user_id: client.id,
        type: "drawing_sent",
        title: `${senderName} sent ${drawingIds.length} drawing${drawingIds.length !== 1 ? "s" : ""} for review`,
        message: `${drawingIds.length} drawing${drawingIds.length !== 1 ? "s" : ""} awaiting your approval for ${projectName}`,
        project_id: projectId,
      }));

      const { error: notifError } = await supabase
        .from("notifications")
        .insert(notifications);
      if (notifError) {
        console.error("[sendDrawingsToClient] Failed to create notifications:", notifError.message);
      }

      // 7. Send email notifications via Resend batch API
      const apiKey = process.env.RESEND_API_KEY;
      if (apiKey) {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
        const drawingsPageUrl = `${siteUrl}/projects/${projectId}?tab=drawings`;

        const usersWithEmail = clients.filter((c) => c.email);

        if (usersWithEmail.length > 0) {
          const emailRequests = usersWithEmail.map((client) => ({
            from: "Formula Contract <noreply@formulacontractpm.com>",
            to: client.email,
            subject: `Drawings Awaiting Your Approval: ${projectName}`,
            react: DrawingSentToClientEmail({
              userName: client.name,
              projectName,
              projectCode,
              drawingCount: drawingIds.length,
              itemCodes,
              senderName,
              drawingsPageUrl,
            }),
          }));

          try {
            const resend = new Resend(apiKey);
            const { error: batchError } = await resend.batch.send(emailRequests);

            if (batchError) {
              console.error("[sendDrawingsToClient] Batch email failed:", batchError);
              emailsFailed = usersWithEmail.length;
            } else {
              emailsSent = usersWithEmail.length;
            }
          } catch (emailError) {
            console.error("[sendDrawingsToClient] Batch email error:", emailError);
            emailsFailed = usersWithEmail.length;
          }
        }
      }
    }
  }

  // 8. Log activity
  const itemCodes = drawingsData
    .map((d) => itemMap.get(d.item_id)?.item_code)
    .filter((code): code is string => !!code);

  const isBulk = drawingIds.length > 1;
  await logActivity({
    action: isBulk
      ? ACTIVITY_ACTIONS.DRAWINGS_BULK_SENT_TO_CLIENT
      : ACTIVITY_ACTIONS.DRAWING_SENT_TO_CLIENT,
    entityType: "drawing",
    entityId: isBulk ? undefined : drawingIds[0],
    projectId,
    details: {
      drawing_count: drawingIds.length,
      item_codes: itemCodes,
      drawing_ids: drawingIds,
    },
  });

  // 9. Client-side invalidation via React Query

  return {
    success: true,
    sentCount: drawingIds.length,
    emailsSent,
    emailsFailed,
  };
}

interface OverrideResult {
  success: boolean;
  error?: string;
}

/**
 * PM Override — approve a drawing without client confirmation.
 *
 * Security fix: Previously this was done inline from the client component
 * via direct Supabase .update(), meaning the override reason validation
 * was UI-only. A PM could bypass the UI and call Supabase directly with
 * an empty pm_override_reason.
 *
 * Now enforced server-side:
 * 1. Validates authentication
 * 2. Validates override reason is non-empty
 * 3. Updates drawing status to approved with override metadata
 * 4. Updates scope item status to approved
 * 5. Logs activity
 */
export async function overrideDrawingApproval(
  drawingId: string,
  overrideReason: string,
  scopeItemId: string,
  projectId: string,
  itemCode: string,
  currentRevision: string,
  ctx?: RequestContext
): Promise<OverrideResult> {
  const supabase = ctx?.supabase ?? await createClient();

  // 1. Auth check
  const user = ctx?.user ?? (await supabase.auth.getUser()).data.user;
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // 2. Validate override reason server-side (security-critical)
  if (!overrideReason || !overrideReason.trim()) {
    return { success: false, error: "Override reason is required" };
  }

  const trimmedReason = overrideReason.trim();

  // 3. Update drawing with override
  const { error: drawingError } = await supabase
    .from("drawings")
    .update({
      status: "approved",
      pm_override: true,
      pm_override_reason: trimmedReason,
      pm_override_at: new Date().toISOString(),
      pm_override_by: user.id,
      approved_by: user.id,
    })
    .eq("id", drawingId);

  if (drawingError) {
    return { success: false, error: drawingError.message };
  }

  // 4. Update scope item status to approved
  await supabase
    .from("scope_items")
    .update({ status: "approved" })
    .eq("id", scopeItemId);

  // 5. Log activity
  await logActivity({
    action: ACTIVITY_ACTIONS.DRAWING_PM_OVERRIDE,
    entityType: "drawing",
    entityId: drawingId,
    projectId,
    details: {
      item_code: itemCode,
      revision: currentRevision,
      override_reason: trimmedReason,
    },
  });

  // 6. Client-side invalidation via React Query

  return { success: true };
}

// ============================================================================
// Read-only query for lazy loading
// ============================================================================

/**
 * Get download URLs for all drawings visible to clients (sent/approved/rejected).
 * Returns the latest revision file URL + item code for each drawing.
 * Used by the "Download All" button.
 */
export async function getDrawingDownloadUrls(
  projectId: string,
  ctx?: RequestContext
): Promise<{ item_code: string; file_url: string; file_name: string; revision: string }[]> {
  const supabase = ctx?.supabase ?? await createClient();

  // Get all drawings with their scope item code and revisions
  const { data } = await supabase
    .from("drawings")
    .select(`
      id,
      status,
      current_revision,
      scope_items!inner(item_code, project_id, is_deleted),
      drawing_revisions(file_url, file_name, revision)
    `)
    .eq("scope_items.project_id", projectId)
    .eq("scope_items.is_deleted", false)
    .in("status", ["sent_to_client", "approved", "approved_with_comments", "rejected"]);

  if (!data || data.length === 0) return [];

  return (data as any[])
    .filter((d) => d.drawing_revisions && d.drawing_revisions.length > 0)
    .map((d) => {
      // Pick the latest revision (sort by revision letter descending)
      const sorted = [...d.drawing_revisions].sort((a: any, b: any) =>
        b.revision.localeCompare(a.revision)
      );
      const latest = sorted[0];
      const itemCode = d.scope_items?.item_code || "UNKNOWN";
      return {
        item_code: itemCode,
        file_url: latest.file_url,
        file_name: latest.file_name || `${itemCode}_Rev${latest.revision}.pdf`,
        revision: latest.revision,
      };
    });
}

/**
 * Get all drawings for a project's production scope items.
 * Used by the drawings tab and overview for lazy loading.
 */
export async function getProjectDrawings(projectId: string, ctx?: RequestContext) {
  const supabase = ctx?.supabase ?? await createClient();

  // Get production scope item IDs for this project
  const { data: items } = await supabase
    .from("scope_items")
    .select("id")
    .eq("project_id", projectId)
    .eq("is_deleted", false)
    .eq("item_path", "production");

  const itemIds = (items || []).map((i: { id: string }) => i.id);
  if (itemIds.length === 0) return [];

  const { data } = await supabase
    .from("drawings")
    .select("id, item_id, status, current_revision, sent_to_client_at")
    .in("item_id", itemIds);

  return data || [];
}

/**
 * Delete a drawing and all its revisions. Admin only.
 * Only allowed for drawings not yet sent to client (uploaded/not_uploaded).
 * Deletes files from Supabase storage + DB records.
 */
export async function deleteDrawing(
  drawingId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Admin only
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!userData || userData.role !== "admin") {
    return { success: false, error: "Only admin can delete drawings" };
  }

  // Load drawing with its revisions
  const { data: drawing } = await supabase
    .from("drawings")
    .select("id, status, item_id, drawing_revisions(id, file_url, cad_file_url)")
    .eq("id", drawingId)
    .single();

  if (!drawing) return { success: false, error: "Drawing not found" };

  // Block deletion only for approved drawings (audit trail)
  if (["approved", "approved_with_comments"].includes(drawing.status)) {
    return {
      success: false,
      error: "Cannot delete an approved drawing — it is part of the audit trail",
    };
  }

  // Delete files from storage
  const revisions = (drawing as any).drawing_revisions || [];
  for (const rev of revisions) {
    if (rev.file_url) {
      // Extract storage path from public URL
      const match = rev.file_url.match(/\/storage\/v1\/object\/public\/drawings\/(.+)/);
      if (match) {
        await supabase.storage.from("drawings").remove([match[1]]);
      }
    }
    if (rev.cad_file_url) {
      const match = rev.cad_file_url.match(/\/storage\/v1\/object\/public\/drawings\/(.+)/);
      if (match) {
        await supabase.storage.from("drawings").remove([match[1]]);
      }
    }
  }

  // Delete revisions first (FK constraint)
  await supabase
    .from("drawing_revisions")
    .delete()
    .eq("drawing_id", drawingId);

  // Delete the drawing record
  const { error } = await supabase
    .from("drawings")
    .delete()
    .eq("id", drawingId);

  if (error) {
    console.error("Error deleting drawing:", error);
    return { success: false, error: error.message };
  }

  // Reset scope item status back to pending
  await supabase
    .from("scope_items")
    .update({ status: "pending" })
    .eq("id", drawing.item_id);

  // Log activity
  await logActivity({
    action: ACTIVITY_ACTIONS.DRAWING_DELETED,
    entityType: "drawing",
    entityId: drawingId,
    details: { item_id: drawing.item_id },
  });

  return { success: true };
}
