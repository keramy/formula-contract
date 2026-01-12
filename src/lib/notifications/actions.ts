"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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

  return (data || []) as Notification[];
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

  revalidatePath("/");
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

  revalidatePath("/");
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
