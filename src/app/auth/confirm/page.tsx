"use client";

/**
 * Auth Confirm Page (Client-Side)
 *
 * Handles Supabase auth redirects from email links (password reset, invites, etc.)
 *
 * With custom SMTP, Supabase email links go through its /verify endpoint, which
 * redirects here with auth tokens. This page handles BOTH delivery methods:
 *
 * 1. PKCE flow: tokens arrive as ?code=xxx query parameter
 * 2. Implicit flow: tokens arrive as #access_token=xxx hash fragment
 *
 * A server-side Route Handler can't see hash fragments, and a client-side page
 * can exchange PKCE codes too — so this single client page covers both cases.
 */

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui/spinner";
import { Suspense } from "react";

function AuthConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let handled = false;

    async function handleAuth() {
      // Case 1: PKCE flow — code arrives as a query parameter
      const code = searchParams.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.error("Code exchange error:", exchangeError);
          setError("Authentication link is invalid or has expired. Please try again.");
          return;
        }
        // Check what type of auth event this was
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          handled = true;
          // For password recovery, the user's aud will be "authenticated"
          // and the recovery flow was just completed
          router.push("/reset-password");
          return;
        }
      }

      // Case 2: Implicit flow — tokens arrive as hash fragment
      // The Supabase client automatically detects hash fragments on page load
      // and fires onAuthStateChange events
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event) => {
          if (handled) return;
          handled = true;

          if (event === "PASSWORD_RECOVERY") {
            router.push("/reset-password");
          } else if (event === "SIGNED_IN") {
            router.push("/dashboard");
          }
        }
      );

      // Fallback: if nothing happens within 5 seconds, show error
      const timeout = setTimeout(() => {
        if (!handled) {
          setError("Authentication link may have expired. Please try again.");
        }
      }, 5000);

      return () => {
        subscription.unsubscribe();
        clearTimeout(timeout);
      };
    }

    handleAuth();
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 min-h-[50vh]">
        <p className="text-destructive text-sm">{error}</p>
        <a href="/forgot-password" className="text-primary text-sm underline">
          Request a new reset link
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 min-h-[50vh]">
      <Spinner className="size-8" />
      <p className="text-muted-foreground text-sm">Verifying your link...</p>
    </div>
  );
}

export default function AuthConfirmPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center gap-4 min-h-[50vh]">
        <Spinner className="size-8" />
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    }>
      <AuthConfirmContent />
    </Suspense>
  );
}
