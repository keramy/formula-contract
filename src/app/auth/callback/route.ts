import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const token_hash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = requestUrl.searchParams.get("next") || "/dashboard";
  const error_param = requestUrl.searchParams.get("error");
  const error_description = requestUrl.searchParams.get("error_description");
  const origin = requestUrl.origin;

  // Log all params for debugging
  console.log("Auth callback received:", {
    code: code ? "present" : "missing",
    token_hash: token_hash ? "present" : "missing",
    type,
    next,
    error_param,
    error_description,
    fullUrl: request.url,
  });

  // If Supabase returned an error directly
  if (error_param) {
    console.error("Supabase auth error:", error_param, error_description);
    return NextResponse.redirect(`${origin}/login?error=${error_param}`);
  }

  const supabase = await createClient();

  // Handle PKCE flow (code parameter)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("Code exchange error:", error);
  }

  // Handle token hash flow (for email invites/confirmations)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as "invite" | "email" | "recovery" | "signup",
      token_hash,
    });

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("Token verification error:", error);
  }

  // No valid auth params received
  console.error("No valid auth params received");
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
