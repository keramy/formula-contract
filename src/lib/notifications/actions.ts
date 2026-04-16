"use server";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  project_id: string | null;
  item_id: string | null;
  drawing_id: string | null;
  material_id: string | null;
  report_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  project?: { name: string; project_code: string } | null;
}

export async function getNotifications(limit = 20): Promise<Notification[]> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select(`
      id, user_id, type, title, message, project_id, item_id,
      drawing_id, material_id, report_id, is_read, read_at, created_at,
      project:projects(name, project_code)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching notifications:", error.message);
    return [];
  }

  return (data || []) as unknown as Notification[];
}

/**
 * Get notifications with filters and pagination for the /notifications page.
 */
export async function getFilteredNotifications(filters?: {
  unreadOnly?: boolean;
  type?: string;
  projectId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ notifications: Notification[]; total: number }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { notifications: [], total: 0 };

  const pageLimit = filters?.limit || 30;
  const pageOffset = filters?.offset || 0;

  let query = supabase
    .from("notifications")
    .select(`
      id, user_id, type, title, message, project_id, item_id,
      drawing_id, material_id, report_id, is_read, read_at, created_at,
      project:projects(name, project_code)
    `, { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (filters?.unreadOnly) query = query.eq("is_read", false);
  if (filters?.type) query = query.eq("type", filters.type);
  if (filters?.projectId) query = query.eq("project_id", filters.projectId);

  const { data, count, error } = await query.range(pageOffset, pageOffset + pageLimit - 1);

  if (error) {
    console.error("Error fetching filtered notifications:", error.message);
    return { notifications: [], total: 0 };
  }

  return {
    notifications: (data || []) as unknown as Notification[],
    total: count || 0,
  };
}

export async function getUnreadCount(): Promise<number> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) {
    console.error("Error fetching unread count:", error.message);
    return 0;
  }

  return count || 0;
}

export async function markAsRead(notificationId: string): Promise<{ success: boolean }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error marking notification as read:", error.message);
    return { success: false };
  }

  return { success: true };
}

export async function markAllAsRead(): Promise<{ success: boolean }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) {
    console.error("Error marking all as read:", error.message);
    return { success: false };
  }

  return { success: true };
}

// Helper function to create a notification (for use in other parts of the app)
export async function createNotification(data: {
  userId: string;
  type: string;
  title: string;
  message?: string;
  projectId?: string;
  itemId?: string;
  drawingId?: string;
  materialId?: string;
  reportId?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from("notifications").insert({
    user_id: data.userId,
    type: data.type,
    title: data.title,
    message: data.message || null,
    project_id: data.projectId || null,
    item_id: data.itemId || null,
    drawing_id: data.drawingId || null,
    material_id: data.materialId || null,
    report_id: data.reportId || null,
    is_read: false,
    email_sent: false,
  });

  if (error) {
    console.error("Error creating notification:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Notify all PMs assigned to a project (optionally excluding a specific user).
 * Used for drawing/material approval notifications, upload notifications, etc.
 */
export async function notifyProjectPMs(data: {
  projectId: string;
  excludeUserId?: string;
  type: string;
  title: string;
  message?: string;
  itemId?: string;
  drawingId?: string;
  materialId?: string;
}): Promise<void> {
  // Use service role to bypass RLS — client users can't query project_assignments
  // for PM users, and we need to insert notifications for other users (not self)
  const supabase = createServiceRoleClient();

  // Get all PM/admin users assigned to this project
  const { data: assignments } = await supabase
    .from("project_assignments")
    .select("user_id")
    .eq("project_id", data.projectId);

  if (!assignments || assignments.length === 0) return;

  // Get roles for these users
  const userIds = assignments.map((a) => a.user_id);
  const { data: users } = await supabase
    .from("users")
    .select("id, role")
    .in("id", userIds)
    .in("role", ["pm", "admin"]);

  const pmUserIds = (users || [])
    .map((u) => u.id)
    .filter((id) => id !== data.excludeUserId);

  if (pmUserIds.length === 0) return;

  const notifications = pmUserIds.map((userId) => ({
    user_id: userId,
    type: data.type,
    title: data.title,
    message: data.message || null,
    project_id: data.projectId,
    item_id: data.itemId || null,
    drawing_id: data.drawingId || null,
    material_id: data.materialId || null,
    is_read: false,
  }));

  const { error } = await supabase.from("notifications").insert(notifications);

  if (error) {
    console.error("[notifyProjectPMs] Failed to create notifications:", error.message);
  }
}
