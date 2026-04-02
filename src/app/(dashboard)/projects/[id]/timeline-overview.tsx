"use client";

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
    <div className="flex-1 h-full min-h-[500px]">
      <TimelineClient
        projectId={projectId}
        scopeItems={scopeItems}
        canEdit={canEdit}
        fullViewUrl={standaloneTimelineUrl}
      />
    </div>
  );
}
