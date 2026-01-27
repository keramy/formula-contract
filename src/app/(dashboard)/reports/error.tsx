"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertTriangleIcon,
  RefreshCwIcon,
  FileTextIcon,
  HomeIcon,
} from "lucide-react";

/**
 * Reports Error Boundary
 *
 * Catches errors when loading the reports page.
 */
export default function ReportsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Reports error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md border-red-200 bg-red-50/50">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-red-100">
              <FileTextIcon className="size-7 text-red-600" />
            </div>

            <h2 className="mb-2 text-xl font-semibold text-foreground">
              Failed to load reports
            </h2>

            <p className="mb-4 text-sm text-muted-foreground">
              We couldn&apos;t load the reports data. Please try again.
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
