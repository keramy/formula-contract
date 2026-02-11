"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ExternalLinkIcon } from "lucide-react";
import { TimelineClient } from "./timeline/timeline-client";

interface ScopeItem {
  id: string;
  item_code: string;
  name: string;
  production_percentage: number | null;
}

interface TimelineOverviewProps {
  projectId: string;
  projectUrlId: string;
  scopeItems: ScopeItem[];
  canEdit?: boolean;
}

export function TimelineOverview({
  projectId,
  projectUrlId,
  scopeItems,
  canEdit = false,
}: TimelineOverviewProps) {
  const standaloneTimelineUrl = `/projects/${projectUrlId}/timeline`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-medium">Project Timeline</h3>
          <p className="text-sm text-muted-foreground">
            Visualize phases, tasks, and milestones for this project.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={standaloneTimelineUrl}>
            <Button variant="outline" size="sm">
              <ExternalLinkIcon className="size-4 mr-1.5" />
              Open Full View
            </Button>
          </Link>
        </div>
      </div>

      <div className="h-[500px]">
        <TimelineClient
          projectId={projectId}
          scopeItems={scopeItems}
          canEdit={canEdit}
          showHeader={false}
          showFullscreenToggle={false}
        />
      </div>
    </div>
  );
}

export default TimelineOverview;
