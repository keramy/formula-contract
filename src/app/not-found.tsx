import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestionIcon, HomeIcon, ArrowLeftIcon } from "lucide-react";

/**
 * Global Not Found Page
 *
 * Shown when navigating to a route that doesn't exist at the app level.
 * This is a Server Component (no 'use client' needed).
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-violet-100">
          <FileQuestionIcon className="size-10 text-violet-600" />
        </div>

        <h1 className="mb-2 text-4xl font-bold tracking-tight">404</h1>
        <h2 className="mb-4 text-xl font-semibold text-muted-foreground">
          Page not found
        </h2>

        <p className="mb-8 text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/dashboard">
              <HomeIcon className="size-4" />
              Go to Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/projects">
              <ArrowLeftIcon className="size-4" />
              View Projects
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
