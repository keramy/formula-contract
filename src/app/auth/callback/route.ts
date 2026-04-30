import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { logger } from "@/lib/platform/logger";

const AREA = "auth";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const token_hash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = requestUrl.searchParams.get("next") || "/dashboard";
  const error_param = requestUrl.searchParams.get("error");
  const error_description = requestUrl.searchParams.get("error_description");
  const origin = requestUrl.origin;

  // Log only redacted shape — `code`, `token_hash`, and the raw URL contain
  // single-use auth material that must not land in log aggregators.
  logger.info("Auth callback received", {
    area: AREA,
    action: "callback_received",
    event: "auth.callback.received",
    route: "/auth/callback",
    hasCode: !!code,
    hasTokenHash: !!token_hash,
    type,
    next,
    error_param,
    error_description,
  });

  if (error_param) {
    logger.warn("Supabase returned auth error to callback", {
      area: AREA,
      action: "callback_error_param",
      event: "auth.callback.failure",
      route: "/auth/callback",
      error_param,
      error_description,
      errorClass: "authentication_error",
    });
    return NextResponse.redirect(`${origin}/login?error=${error_param}`);
  }

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      logger.info("Auth callback code exchange succeeded", {
        area: AREA,
        action: "code_exchange",
        event: "auth.callback.success",
        route: "/auth/callback",
      });
      return NextResponse.redirect(`${origin}${next}`);
    }
    logger.error("Auth callback code exchange failed", {
      area: AREA,
      action: "code_exchange",
      event: "auth.callback.failure",
      route: "/auth/callback",
      err: error,
      errorClass: "authentication_error",
    });
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as "invite" | "email" | "recovery" | "signup",
      token_hash,
    });

    if (!error) {
      logger.info("Auth callback token verification succeeded", {
        area: AREA,
        action: "token_verify",
        event: "auth.callback.success",
        route: "/auth/callback",
        type,
      });
      return NextResponse.redirect(`${origin}${next}`);
    }
    logger.error("Auth callback token verification failed", {
      area: AREA,
      action: "token_verify",
      event: "auth.callback.failure",
      route: "/auth/callback",
      type,
      err: error,
      errorClass: "authentication_error",
    });
  }

  logger.warn("Auth callback received no valid params", {
    area: AREA,
    event: "auth.callback.no_params",
    route: "/auth/callback",
  });
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
