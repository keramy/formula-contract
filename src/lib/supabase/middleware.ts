import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { generateRequestId } from "@/lib/platform/request-context";

// Route permissions - which roles can access which routes.
// Keep this map covering EVERY top-level dashboard route group. New routes
// must be classified explicitly here, not inherited via the catch-all.
const routePermissions: Record<string, string[]> = {
  "/dashboard": ["admin", "pm", "production", "procurement", "management", "client"],
  "/projects": ["admin", "pm", "production", "procurement", "management", "client"], // Clients see assigned projects
  "/projects/new": ["admin", "pm"], // Only admin and PM can create projects
  "/clients": ["admin", "pm"],
  "/users": ["admin"],
  "/reports": ["admin", "pm", "management", "client"], // Clients see their project reports
  "/finance": ["admin", "management"], // Legacy project budgets dashboard (page also re-checks)
  "/payments": ["admin", "pm", "production", "procurement", "management"], // Whitelist-gated by finance_access RLS — block clients here
  "/timeline": ["admin", "pm", "production", "procurement", "management"], // Project-scoped Gantt — RLS gates per-project access
  "/settings": ["admin"],
  "/profile": ["admin", "pm", "production", "procurement", "management", "client"], // All users can access their profile
  "/notifications": ["admin", "pm", "production", "procurement", "management", "client"], // All users see their notifications
};

// Check if user role can access a path
function canAccessRoute(pathname: string, role: string): boolean {
  // Check exact match first
  if (routePermissions[pathname]) {
    return routePermissions[pathname].includes(role);
  }

  // Check parent paths (e.g., /projects/123 should check /projects)
  for (const route of Object.keys(routePermissions).sort((a, b) => b.length - a.length)) {
    if (pathname.startsWith(route + "/") || pathname === route) {
      return routePermissions[route].includes(role);
    }
  }

  // Default: allow if no specific rule
  return true;
}

export async function updateSession(request: NextRequest) {
  // Request correlation: reuse incoming x-request-id if a caller already set
  // one (rare — useful for cron / synthetic requests), otherwise generate.
  // Forward to downstream handlers via request headers, and echo on the
  // response so users can quote the ID in support requests.
  const incomingId = request.headers.get("x-request-id");
  const requestId = incomingId || generateRequestId();
  request.headers.set("x-request-id", requestId);

  let supabaseResponse = NextResponse.next({
    request,
  });
  supabaseResponse.headers.set("x-request-id", requestId);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          supabaseResponse.headers.set("x-request-id", requestId);
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes
  const pathname = request.nextUrl.pathname;
  const isAuthPage = pathname.startsWith("/login") ||
                     pathname.startsWith("/forgot-password") ||
                     pathname.startsWith("/reset-password") ||
                     pathname.startsWith("/setup-password") ||
                     pathname.startsWith("/change-password");
  const isAuthRoute = pathname.startsWith("/auth/callback") || pathname.startsWith("/auth/confirm");
  const isPublicPage = pathname === "/";
  const isSetupPassword = pathname.startsWith("/setup-password");
  const isChangePassword = pathname.startsWith("/change-password");

  // Allow auth callback/confirm routes to pass through
  if (isAuthRoute) {
    return supabaseResponse;
  }

  if (!user && !isAuthPage && !isPublicPage) {
    // No user, redirect to login
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return withRequestId(NextResponse.redirect(url), requestId);
  }

  if (user && (pathname === "/login" || pathname === "/forgot-password")) {
    // User is logged in, redirect to dashboard (but allow reset-password and setup-password)
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return withRequestId(NextResponse.redirect(url), requestId);
  }

  // Allow authenticated users to access setup-password (for new invited users)
  if (user && isSetupPassword) {
    return supabaseResponse;
  }

  // Allow authenticated users to access change-password page
  if (user && isChangePassword) {
    return supabaseResponse;
  }

  // Check if user needs to change password - redirect to change-password page
  if (user && !isAuthPage && !isPublicPage) {
    const mustChangePassword = user.user_metadata?.must_change_password;
    if (mustChangePassword) {
      const url = request.nextUrl.clone();
      url.pathname = "/change-password";
      return withRequestId(NextResponse.redirect(url), requestId);
    }
  }

  // ============================================================================
  // PERFORMANCE: Read role and is_active from JWT metadata instead of DB
  // This eliminates a ~3s database query on every request!
  //
  // The user_metadata is synced when:
  // - User is created (inviteUser)
  // - User role is updated (updateUser)
  // - User is activated/deactivated (toggleUserActive)
  // ============================================================================

  // ACTIVITY TRACKING: Removed — was causing write spikes on every middleware invocation.
  // Middleware runs on every request (pages, RSC payloads, prefetches).
  // The cookie-based throttle didn't protect against concurrent requests on initial page load.
  // TODO: Move last_active_at tracking to a dedicated server action called once per session.

  if (user && !isAuthPage && !isPublicPage) {
    const metadata = user.user_metadata || {};

    // Try to get role and is_active from JWT metadata first
    let role: string | undefined = metadata.role;
    let isActive: boolean | undefined = metadata.is_active;

    // Fallback to DB query ONLY if metadata is missing (legacy users before migration)
    if (role === undefined || isActive === undefined) {
      console.warn(`[Middleware] User ${user.email} missing JWT metadata, falling back to DB query`);
      const { data: profile } = await supabase
        .from("users")
        .select("is_active, role")
        .eq("id", user.id)
        .single();

      if (profile) {
        role = profile.role;
        isActive = profile.is_active;
      }
    }

    // Check if user is deactivated
    if (isActive === false) {
      // Sign out the deactivated user
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "account_deactivated");
      return withRequestId(NextResponse.redirect(url), requestId);
    }

    // Check role-based access
    if (role && !canAccessRoute(pathname, role)) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.searchParams.set("error", "unauthorized");
      return withRequestId(NextResponse.redirect(url), requestId);
    }
  }

  return supabaseResponse;
}

function withRequestId(resp: NextResponse, requestId: string): NextResponse {
  resp.headers.set("x-request-id", requestId);
  return resp;
}
