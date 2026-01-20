import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import type { User } from "@supabase/supabase-js";

/**
 * Creates a Supabase client for Server Components with user authentication.
 * Uses cookies for session management - NOT safe for use inside unstable_cache.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

/**
 * Get user role from JWT metadata (fast) with DB fallback (slow)
 *
 * PERFORMANCE: Reading from JWT avoids a ~3s database query!
 * The role is synced to JWT metadata when:
 * - User is created (inviteUser)
 * - User role is updated (updateUser)
 *
 * @param user - The authenticated user from supabase.auth.getUser()
 * @param supabase - Optional Supabase client for DB fallback
 * @returns The user's role (defaults to "pm" if not found)
 */
export async function getUserRoleFromJWT(
  user: User,
  supabase?: Awaited<ReturnType<typeof createClient>>
): Promise<string> {
  // Try to get role from JWT metadata first (instant, no DB query)
  const metadataRole = user.user_metadata?.role;
  if (metadataRole) {
    return metadataRole;
  }

  // Fallback to DB query if JWT metadata missing (legacy users)
  console.warn(`[getUserRoleFromJWT] User ${user.email} missing role in JWT, falling back to DB`);

  if (!supabase) {
    supabase = await createClient();
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role || "pm";
}

/**
 * Get user profile info from JWT metadata (fast) with optional DB fallback
 *
 * @param user - The authenticated user from supabase.auth.getUser()
 * @param supabase - Optional Supabase client for DB fallback
 * @returns Object with role, name, and is_active
 */
export async function getUserProfileFromJWT(
  user: User,
  supabase?: Awaited<ReturnType<typeof createClient>>
): Promise<{ role: string; name: string; isActive: boolean }> {
  const metadata = user.user_metadata || {};

  // Check if we have complete metadata
  if (metadata.role !== undefined && metadata.is_active !== undefined) {
    return {
      role: metadata.role,
      name: metadata.name || user.email?.split("@")[0] || "User",
      isActive: metadata.is_active,
    };
  }

  // Fallback to DB query if metadata incomplete
  console.warn(`[getUserProfileFromJWT] User ${user.email} has incomplete JWT metadata, falling back to DB`);

  if (!supabase) {
    supabase = await createClient();
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role, name, is_active")
    .eq("id", user.id)
    .single();

  return {
    role: profile?.role || "pm",
    name: profile?.name || user.email?.split("@")[0] || "User",
    isActive: profile?.is_active ?? true,
  };
}

/**
 * Creates a Supabase service role client for server-side operations.
 * This client bypasses RLS and doesn't use cookies - SAFE for use inside unstable_cache.
 *
 * ⚠️ WARNING: This client has full database access. Only use for:
 * - Cached aggregate queries (counts, stats)
 * - Background jobs
 * - Admin operations
 *
 * NEVER expose this client to the browser or use for user-specific data.
 */
export function createServiceRoleClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for service role client");
  }

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
