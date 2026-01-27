"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangleIcon, RefreshCwIcon, HomeIcon } from "lucide-react";

/**
 * Global Error Boundary
 *
 * Catches errors in the root layout. Must include <html> and <body> tags
 * since it replaces the entire document when triggered.
 *
 * This is the last line of defense for unhandled errors.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-red-100">
              <AlertTriangleIcon className="size-8 text-red-600" />
            </div>

            <h1 className="mb-2 text-2xl font-bold tracking-tight">
              Something went wrong
            </h1>

            <p className="mb-6 text-muted-foreground">
              An unexpected error occurred. Our team has been notified.
              {error.digest && (
                <span className="mt-2 block text-xs font-mono text-muted-foreground/70">
                  Error ID: {error.digest}
                </span>
              )}
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button onClick={() => reset()} variant="default">
                <RefreshCwIcon className="size-4" />
                Try Again
              </Button>
              <Button
                onClick={() => (window.location.href = "/")}
                variant="outline"
              >
                <HomeIcon className="size-4" />
                Go Home
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
