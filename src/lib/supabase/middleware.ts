import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Route permissions - which roles can access which routes
const routePermissions: Record<string, string[]> = {
  "/dashboard": ["admin", "pm", "production", "procurement", "management", "client"],
  "/projects": ["admin", "pm", "production", "procurement", "management", "client"], // Clients see assigned projects
  "/projects/new": ["admin", "pm"], // Only admin and PM can create projects
  "/clients": ["admin", "pm"],
  "/users": ["admin"],
  "/reports": ["admin", "pm", "management", "client"], // Clients see their project reports
  "/settings": ["admin"],
  "/profile": ["admin", "pm", "production", "procurement", "management", "client"], // All users can access their profile
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
  let supabaseResponse = NextResponse.next({
    request,
  });

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
  const isAuthCallback = pathname.startsWith("/auth/callback");
  const isPublicPage = pathname === "/";
  const isSetupPassword = pathname.startsWith("/setup-password");
  const isChangePassword = pathname.startsWith("/change-password");

  // Allow auth callback to pass through
  if (isAuthCallback) {
    return supabaseResponse;
  }

  if (!user && !isAuthPage && !isPublicPage) {
    // No user, redirect to login
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/forgot-password")) {
    // User is logged in, redirect to dashboard (but allow reset-password and setup-password)
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
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
      return NextResponse.redirect(url);
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

  // ============================================================================
  // ACTIVITY TRACKING: Update last_active_at (throttled to every 5 minutes)
  // Uses a cookie to track last update time to avoid DB spam
  // ============================================================================
  if (user && !isAuthPage && !isPublicPage) {
    const ACTIVITY_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes in ms
    const lastActivityUpdate = request.cookies.get("last_activity_update")?.value;
    const now = Date.now();

    // Only update if cookie doesn't exist or is older than 5 minutes
    if (!lastActivityUpdate || (now - parseInt(lastActivityUpdate, 10)) > ACTIVITY_UPDATE_INTERVAL) {
      // Update last_active_at in background (don't await to avoid blocking)
      supabase
        .from("users")
        .update({ last_active_at: new Date().toISOString() })
        .eq("id", user.id)
        .then(() => {}, (err) => console.error("Failed to update last_active_at:", err));

      // Set cookie to track last update (expires in 1 day)
      supabaseResponse.cookies.set("last_activity_update", now.toString(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 1 day
      });
    }
  }

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
      return NextResponse.redirect(url);
    }

    // Check role-based access
    if (role && !canAccessRoute(pathname, role)) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
