"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertTriangleIcon,
  RefreshCwIcon,
  HomeIcon,
  ChevronLeftIcon,
} from "lucide-react";

/**
 * Dashboard Error Boundary
 *
 * Catches errors within the dashboard layout. Displays a user-friendly
 * error message with options to retry or navigate away.
 *
 * Error boundaries must be Client Components to use the reset function.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error for debugging
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md border-red-200 bg-red-50/50">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-red-100">
              <AlertTriangleIcon className="size-7 text-red-600" />
            </div>

            <h2 className="mb-2 text-xl font-semibold text-foreground">
              Something went wrong
            </h2>

            <p className="mb-1 text-sm text-muted-foreground">
              We encountered an error while loading this page.
            </p>

            {error.message && (
              <p className="mb-4 rounded-md bg-red-100/50 px-3 py-2 text-xs font-mono text-red-700">
                {error.message}
              </p>
            )}

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
                <Link href="/dashboard">
                  <HomeIcon className="size-4" />
                  Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
