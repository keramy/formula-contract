import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { logger } from "@/lib/platform/logger";

const AREA = "auth";

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

  // Log only redacted shape — the PKCE `code` is single-use auth material.
  logger.info("Auth confirm received", {
    area: AREA,
    action: "confirm_received",
    event: "auth.confirm.received",
    route: "/auth/confirm",
    hasCode: !!code,
    error_param,
    error_description,
  });

  if (error_param) {
    logger.warn("Supabase returned auth error to confirm", {
      area: AREA,
      event: "auth.confirm.failure",
      route: "/auth/confirm",
      error_param,
      error_description,
      errorClass: "authentication_error",
    });
    return NextResponse.redirect(`${origin}/login?error=auth_link_expired`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      logger.info("Auth confirm code exchange succeeded", {
        area: AREA,
        action: "code_exchange",
        event: "auth.confirm.success",
        route: "/auth/confirm",
      });
      return NextResponse.redirect(`${origin}/reset-password`);
    }

    logger.error("Auth confirm code exchange failed", {
      area: AREA,
      action: "code_exchange",
      event: "auth.confirm.failure",
      route: "/auth/confirm",
      err: error,
      errorClass: "authentication_error",
    });
    return NextResponse.redirect(`${origin}/login?error=auth_link_expired`);
  }

  logger.warn("Auth confirm received no params", {
    area: AREA,
    event: "auth.confirm.no_params",
    route: "/auth/confirm",
  });
  return NextResponse.redirect(`${origin}/forgot-password`);
}
