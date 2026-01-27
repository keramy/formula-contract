"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertTriangleIcon,
  RefreshCwIcon,
  FolderIcon,
  ChevronLeftIcon,
} from "lucide-react";

/**
 * Project Detail Error Boundary
 *
 * Catches errors when loading a specific project's details.
 * Provides context-specific error handling for project pages.
 */
export default function ProjectDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Project detail error:", error);
  }, [error]);

  // Check if this might be an access/permission error
  const isAccessError =
    error.message?.toLowerCase().includes("permission") ||
    error.message?.toLowerCase().includes("access") ||
    error.message?.toLowerCase().includes("unauthorized");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md border-red-200 bg-red-50/50">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-red-100">
              <AlertTriangleIcon className="size-7 text-red-600" />
            </div>

            <h2 className="mb-2 text-xl font-semibold text-foreground">
              {isAccessError ? "Access Denied" : "Failed to load project"}
            </h2>

            <p className="mb-4 text-sm text-muted-foreground">
              {isAccessError
                ? "You don't have permission to view this project."
                : "We couldn't load the project details. Please try again."}
            </p>

            {error.message && !isAccessError && (
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
              {!isAccessError && (
                <Button onClick={() => reset()} size="sm">
                  <RefreshCwIcon className="size-4" />
                  Try Again
                </Button>
              )}
              <Button asChild variant="outline" size="sm">
                <Link href="/projects">
                  <ChevronLeftIcon className="size-4" />
                  Back to Projects
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
