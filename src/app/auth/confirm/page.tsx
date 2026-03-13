"use client";

/**
 * Auth Confirm Page (Client-Side)
 *
 * Handles Supabase auth redirects that use hash fragments (#access_token=xxx).
 * This is needed because:
 * - Supabase password recovery uses the implicit flow by default
 * - Implicit flow puts tokens in the URL hash fragment
 * - Hash fragments are browser-only (never sent to the server)
 * - So a server-side Route Handler can't process them
 *
 * This client-side page extracts tokens from the hash and establishes the session.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui/spinner";

export default function AuthConfirmPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // Supabase client library automatically picks up hash fragment tokens
    // via onAuthStateChange when the page loads
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY") {
          // User came from a password reset link — redirect to reset-password page
          router.push("/reset-password");
        } else if (event === "SIGNED_IN") {
          // Generic sign-in (invite, magic link, etc.)
          router.push("/dashboard");
        }
      }
    );

    // Fallback: if no auth event fires within 5 seconds, something went wrong
    const timeout = setTimeout(() => {
      setError("Authentication link may have expired. Please try again.");
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

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
