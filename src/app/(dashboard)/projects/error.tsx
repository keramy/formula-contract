"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertTriangleIcon,
  RefreshCwIcon,
  FolderIcon,
  HomeIcon,
} from "lucide-react";

/**
 * Projects List Error Boundary
 *
 * Catches errors when loading the projects list page.
 * Provides options to retry or navigate to dashboard.
 */
export default function ProjectsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Projects list error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md border-amber-200 bg-amber-50/50">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-amber-100">
              <FolderIcon className="size-7 text-amber-600" />
            </div>

            <h2 className="mb-2 text-xl font-semibold text-foreground">
              Failed to load projects
            </h2>

            <p className="mb-4 text-sm text-muted-foreground">
              We couldn&apos;t load your projects. This might be a temporary issue.
            </p>

            {error.digest && (
              <p className="mb-4 text-xs text-muted-foreground/70">
                Error ID: {error.digest}
              </p>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button onClick={() => reset()} size="sm">
                <RefreshCwIcon className="size-4" />
                Retry
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
