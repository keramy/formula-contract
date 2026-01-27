"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangleIcon, RefreshCwIcon, LogInIcon } from "lucide-react";

/**
 * Auth Error Boundary
 *
 * Catches errors on authentication pages (login, etc.)
 */
export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Auth error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-violet-50 to-background">
      <Card className="w-full max-w-md border-red-200">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-red-100">
              <AlertTriangleIcon className="size-7 text-red-600" />
            </div>

            <h2 className="mb-2 text-xl font-semibold text-foreground">
              Authentication Error
            </h2>

            <p className="mb-4 text-sm text-muted-foreground">
              We encountered a problem with authentication. Please try again.
            </p>

            {error.digest && (
              <p className="mb-4 text-xs text-muted-foreground/70">
                Error ID: {error.digest}
              </p>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button onClick={() => reset()} size="sm">
                <RefreshCwIcon className="size-4" />
                Try Again
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/login">
                  <LogInIcon className="size-4" />
                  Back to Login
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
