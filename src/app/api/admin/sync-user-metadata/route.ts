/**
 * Admin API: Sync User Metadata to JWT
 *
 * POST /api/admin/sync-user-metadata
 *
 * This endpoint syncs all users' role and is_active status from the users table
 * to Supabase Auth user_metadata (JWT claims).
 *
 * After running this once, the middleware can read role/is_active from JWT
 * instead of querying the database on every request.
 *
 * SECURITY: Admin-only endpoint
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncAllUsersMetadata } from "@/lib/actions/users";

export async function POST() {
  try {
    // Verify the user is an admin
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - not logged in" },
        { status: 401 }
      );
    }

    // Check admin role from metadata (or fallback to DB for this endpoint)
    let isAdmin = user.user_metadata?.role === "admin";

    // Fallback to DB check if metadata not set
    if (!isAdmin) {
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      isAdmin = profile?.role === "admin";
    }

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden - admin access required" },
        { status: 403 }
      );
    }

    // Run the sync
    console.log("[Admin API] Starting user metadata sync...");
    const result = await syncAllUsersMetadata();

    console.log(`[Admin API] Sync complete: ${result.synced} synced, ${result.failed} failed`);

    if (result.errors.length > 0) {
      console.error("[Admin API] Sync errors:", result.errors);
    }

    return NextResponse.json({
      success: result.success,
      synced: result.synced,
      failed: result.failed,
      errors: result.errors.slice(0, 10), // Limit errors in response
      message: result.success
        ? `Successfully synced ${result.synced} users`
        : `Synced ${result.synced} users with ${result.failed} failures`,
    });
  } catch (error) {
    console.error("[Admin API] Sync user metadata error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
