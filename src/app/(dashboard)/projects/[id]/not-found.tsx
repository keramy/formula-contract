import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FolderXIcon, ChevronLeftIcon, PlusIcon } from "lucide-react";

/**
 * Project Not Found Page
 *
 * Shown when navigating to a project ID that doesn't exist.
 * Triggered by calling notFound() from the page component.
 */
export default function ProjectNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md border-amber-200 bg-amber-50/30">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-amber-100">
              <FolderXIcon className="size-7 text-amber-600" />
            </div>

            <h2 className="mb-2 text-xl font-semibold text-foreground">
              Project not found
            </h2>

            <p className="mb-6 text-sm text-muted-foreground">
              This project doesn&apos;t exist, has been deleted, or you don&apos;t have
              access to view it.
            </p>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button asChild size="sm">
                <Link href="/projects">
                  <ChevronLeftIcon className="size-4" />
                  Back to Projects
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/projects/new">
                  <PlusIcon className="size-4" />
                  New Project
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
