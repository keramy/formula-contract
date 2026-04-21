"use client";

import * as React from "react";
import Link from "next/link";
import { format, differenceInCalendarDays, parseISO } from "date-fns";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/ui-helpers";
import {
  SearchIcon,
  GanttChartIcon,
  CalendarIcon,
  FlagIcon,
  AlertTriangleIcon,
  ArrowRightIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PickerProject } from "./page";

type StatusVariant = "info" | "success" | "warning" | "default" | "danger";

const STATUS_LABELS: Record<string, { variant: StatusVariant; label: string }> = {
  tender: { variant: "info", label: "Tender" },
  active: { variant: "success", label: "Active" },
  on_hold: { variant: "warning", label: "On Hold" },
  completed: { variant: "default", label: "Completed" },
  cancelled: { variant: "danger", label: "Cancelled" },
  not_awarded: { variant: "danger", label: "Not Awarded" },
};

// Default visible statuses — these are the ones PMs care about day-to-day
const LIVE_STATUSES = new Set(["active", "tender"]);
const STATUS_SORT_ORDER: Record<string, number> = {
  active: 0,
  tender: 1,
  on_hold: 2,
  completed: 3,
  cancelled: 4,
  not_awarded: 5,
};

interface TimelinePickerClientProps {
  projects: PickerProject[];
}

export function TimelinePickerClient({ projects }: TimelinePickerClientProps) {
  const [search, setSearch] = React.useState("");
  const [showArchived, setShowArchived] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects
      .filter((p) => (showArchived ? true : LIVE_STATUSES.has(p.status)))
      .filter((p) => {
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          p.project_code.toLowerCase().includes(q) ||
          (p.client?.company_name || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const statusDiff =
          (STATUS_SORT_ORDER[a.status] ?? 99) -
          (STATUS_SORT_ORDER[b.status] ?? 99);
        if (statusDiff !== 0) return statusDiff;
        // Within same status: earliest installation date first
        const aDate = a.installation_date ? new Date(a.installation_date).getTime() : Infinity;
        const bDate = b.installation_date ? new Date(b.installation_date).getTime() : Infinity;
        return aDate - bDate;
      });
  }, [projects, search, showArchived]);

  const liveCount = projects.filter((p) => LIVE_STATUSES.has(p.status)).length;
  const archivedCount = projects.length - liveCount;

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <GanttChartIcon className="size-10 text-muted-foreground/50 mb-3" />
        <h3 className="font-medium">No projects available</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Ask an admin to add you to a project, or create one from the{" "}
          <Link href="/projects" className="text-primary hover:underline">
            Projects page
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search + archived toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name, code, or client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        {archivedCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowArchived((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground h-9"
          >
            {showArchived ? "Hide archived" : `Show archived (${archivedCount})`}
          </Button>
        )}
      </div>

      {/* Count summary */}
      <p className="text-xs text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? "project" : "projects"}
        {showArchived && ` (including archived)`}
      </p>

      {/* Empty filtered state */}
      {filtered.length === 0 && (
        <div className="text-center py-12 text-sm text-muted-foreground">
          No projects match that search.
        </div>
      )}

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((p) => (
          <TimelineCard key={p.id} project={p} />
        ))}
      </div>
    </div>
  );
}

function TimelineCard({ project }: { project: PickerProject }) {
  const cfg = STATUS_LABELS[project.status] ?? {
    variant: "default" as StatusVariant,
    label: project.status,
  };

  const installDate = project.installation_date
    ? parseISO(project.installation_date)
    : null;
  const timelineStart = project.timeline_start ? parseISO(project.timeline_start) : null;
  const timelineEnd = project.timeline_end ? parseISO(project.timeline_end) : null;
  const hasTimeline = project.timeline_task_count > 0 && timelineStart && timelineEnd;

  const daysUntilEnd = timelineEnd
    ? differenceInCalendarDays(timelineEnd, new Date())
    : null;

  // Slippage: timeline end is after the promised installation date
  const slipDays =
    timelineEnd && installDate
      ? differenceInCalendarDays(timelineEnd, installDate)
      : null;
  const isSlipping = slipDays !== null && slipDays > 0;

  const href = `/timeline/${project.slug || project.id}`;

  return (
    <Link
      href={href}
      prefetch={false}
      className={cn(
        "group relative rounded-lg border bg-card p-4 transition-all",
        "hover:border-primary/50 hover:shadow-md",
        "focus:outline-none focus:ring-2 focus:ring-primary/30",
        !hasTimeline && "border-dashed"
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-mono text-muted-foreground">{project.project_code}</p>
          <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
            {project.name}
          </h3>
        </div>
        <StatusBadge variant={cfg.variant} dot>
          {cfg.label}
        </StatusBadge>
      </div>

      {/* Client */}
      {project.client?.company_name && (
        <p className="text-xs text-muted-foreground mb-3 truncate">
          {project.client.company_name}
        </p>
      )}

      {!hasTimeline ? (
        /* Empty-timeline state */
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
          <GanttChartIcon className="size-3.5 shrink-0" />
          <span>No timeline yet</span>
          <ArrowRightIcon className="size-3 ml-auto text-primary opacity-70 group-hover:opacity-100 transition-opacity" />
        </div>
      ) : (
        <>
          {/* Timeline range + days-left badge */}
          <div className="flex items-center gap-2 text-xs mb-2">
            <CalendarIcon className="size-3.5 text-muted-foreground shrink-0" />
            <span className="tabular-nums truncate">
              {format(timelineStart!, "MMM d")} → {format(timelineEnd!, "MMM d, yyyy")}
            </span>
            {daysUntilEnd !== null && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] h-5 px-1.5 ml-auto shrink-0",
                  daysUntilEnd < 0 && "border-destructive/50 text-destructive",
                  daysUntilEnd >= 0 && daysUntilEnd <= 14 && "border-amber-500/50 text-amber-600"
                )}
              >
                {daysUntilEnd < 0
                  ? `${Math.abs(daysUntilEnd)}d overdue`
                  : daysUntilEnd === 0
                  ? "Today"
                  : `${daysUntilEnd}d left`}
              </Badge>
            )}
          </div>

          {/* Slippage warning: plan ends after promised delivery */}
          {isSlipping && installDate && (
            <div className="flex items-center gap-2 text-xs text-amber-600 mb-2">
              <AlertTriangleIcon className="size-3.5 shrink-0" />
              <span className="truncate">
                Ends {slipDays}d after target delivery ({format(installDate, "MMM d")})
              </span>
            </div>
          )}

          {/* Next milestone */}
          {project.next_milestone && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FlagIcon className="size-3.5 shrink-0" />
              <span className="truncate">Next: {project.next_milestone.name}</span>
              <span className="tabular-nums ml-auto shrink-0">
                {format(parseISO(project.next_milestone.start_date), "MMM d")}
              </span>
            </div>
          )}
        </>
      )}
    </Link>
  );
}
