import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Auth Confirm Route (Server-Side)
 *
 * Handles Supabase auth redirects from password reset email links.
 * After custom SMTP (Resend), Supabase email links go through its /verify
 * endpoint which redirects here with a PKCE `code` query param.
 *
 * This route exchanges the code for a session (server-side, so cookies
 * are properly set) and redirects to /reset-password.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error_param = requestUrl.searchParams.get("error");
  const error_description = requestUrl.searchParams.get("error_description");
  const origin = requestUrl.origin;

  console.log("Auth confirm received:", {
    code: code ? "present" : "missing",
    error_param,
    error_description,
    fullUrl: request.url,
  });

  // If Supabase returned an error directly
  if (error_param) {
    console.error("Supabase auth error:", error_param, error_description);
    return NextResponse.redirect(
      `${origin}/login?error=auth_link_expired`
    );
  }

  // Handle PKCE flow (code parameter from Supabase /verify redirect)
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Code exchanged successfully — session cookies are set
      // Redirect to reset-password page
      return NextResponse.redirect(`${origin}/reset-password`);
    }

    console.error("Auth confirm code exchange error:", error);
    return NextResponse.redirect(
      `${origin}/login?error=auth_link_expired`
    );
  }

  // No valid params — redirect to forgot-password to try again
  console.error("Auth confirm: no code or error params received");
  return NextResponse.redirect(`${origin}/forgot-password`);
}
