"use server";

/**
 * Finance Shared Internals
 *
 * Auth guards, result type, and small lookup queries shared by every
 * finance module. Helpers are exported so sibling modules under
 * src/lib/actions/finance/ can import them; the public barrel
 * (./index.ts) does not re-export the guards, keeping them folder-private.
 *
 * Pattern: every privileged finance action MUST start with
 * requireFinanceAccess() (or requireAdmin() for whitelist management).
 */

import { createClient, getUserRoleFromJWT } from "@/lib/supabase/server";

// ============================================================================
// Types
// ============================================================================

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// Auth Helpers (folder-private — not re-exported from index.ts)
// ============================================================================

export async function requireFinanceAccess(requireApproval = false) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" as const, supabase: null, user: null };
  }

  const { data: access } = await supabase
    .from("finance_access")
    .select("can_approve")
    .eq("user_id", user.id)
    .single();

  if (!access) {
    return { error: "Not authorized" as const, supabase: null, user: null };
  }

  if (requireApproval && !access.can_approve) {
    return {
      error: "Approval permission required" as const,
      supabase: null,
      user: null,
    };
  }

  return { error: null, supabase, user };
}

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return {
      error: "Not authenticated" as const,
      supabase: null,
      user: null,
    };
  const role = await getUserRoleFromJWT(user, supabase);
  if (role !== "admin")
    return { error: "Admin required" as const, supabase: null, user: null };
  return { error: null, supabase, user };
}

// ============================================================================
// Lookup Queries (used by forms across all finance modules)
// ============================================================================

export async function getProjectsForFinance(): Promise<
  ActionResult<{ id: string; name: string; project_code: string }[]>
> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const { data, error: dbError } = await supabase
    .from("projects")
    .select("id, name, project_code")
    .eq("is_deleted", false)
    .not("status", "eq", "cancelled")
    .order("project_code");

  if (dbError) return { success: false, error: dbError.message };
  return { success: true, data: data || [] };
}

export async function getApprovers(): Promise<
  ActionResult<{ id: string; name: string }[]>
> {
  const { error, supabase } = await requireFinanceAccess();
  if (error) return { success: false, error };

  const { data, error: dbError } = await supabase
    .from("finance_access")
    .select("user_id, user:users!finance_access_user_id_fkey(id, name)")
    .eq("can_approve", true);

  if (dbError) return { success: false, error: dbError.message };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const approvers = (data || []).map((row: any) => ({
    id: row.user?.id || "",
    name: row.user?.name || "Unknown",
  })).filter((a: { id: string }) => a.id);

  return { success: true, data: approvers };
}

export async function getAvailableUsers(): Promise<
  ActionResult<{ id: string; name: string; email: string; role: string }[]>
> {
  const { error, supabase } = await requireAdmin();
  if (error) return { success: false, error };

  const { data, error: dbError } = await supabase
    .from("users")
    .select("id, name, email, role")
    .eq("is_active", true)
    .order("name");

  if (dbError) return { success: false, error: dbError.message };
  return { success: true, data: data || [] };
}

export async function checkFinanceAccess(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("finance_access")
    .select("id")
    .eq("user_id", user.id)
    .single();

  return !!data;
}

