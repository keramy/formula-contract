import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileQuestionIcon, HomeIcon, FolderIcon } from "lucide-react";

/**
 * Dashboard Not Found Page
 *
 * Shown when navigating to a route that doesn't exist within the dashboard.
 */
export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md border-primary-200 bg-primary-50/30">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary-100">
              <FileQuestionIcon className="size-7 text-primary" />
            </div>

            <h2 className="mb-2 text-xl font-semibold text-foreground">
              Page not found
            </h2>

            <p className="mb-6 text-sm text-muted-foreground">
              The page you&apos;re looking for doesn&apos;t exist in the dashboard.
            </p>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button asChild size="sm">
                <Link href="/dashboard">
                  <HomeIcon className="size-4" />
                  Dashboard
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/projects">
                  <FolderIcon className="size-4" />
                  Projects
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
