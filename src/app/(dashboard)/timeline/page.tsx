import { redirect } from "next/navigation";
import { getRequestContext } from "@/lib/supabase/server";
import { TimelinePickerClient } from "./timeline-picker-client";
import { TimelinePickerHeader } from "./timeline-picker-header";

export interface PickerProject {
  id: string;
  slug: string | null;
  project_code: string;
  name: string;
  status: string;
  installation_date: string | null;
  created_at: string;
  client: { company_name: string } | null;
  next_milestone: { name: string; start_date: string } | null;
  // Timeline aggregate — excludes phase rows; counts real tasks + milestones
  timeline_task_count: number;
  timeline_start: string | null;
  timeline_end: string | null;
}

export default async function TimelinePickerPage() {
  const ctx = await getRequestContext();
  if (!ctx) redirect("/login");

  const { supabase, user, role: userRole } = ctx;

  // Clients don't have access to the timeline section
  if (userRole === "client") redirect("/dashboard");

  const [
    { data: assignments },
    { data: allProjects, error },
  ] = await Promise.all([
    supabase.from("project_assignments").select("project_id").eq("user_id", user.id),
    supabase
      .from("projects")
      .select(`id, slug, project_code, name, status, installation_date, created_at, client:clients(company_name)`)
      .eq("is_deleted", false)
      .order("installation_date", { ascending: true, nullsFirst: false }),
  ]);

  if (error) {
    return (
      <div className="p-6">
        <TimelinePickerHeader />
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6 text-center">
          <h3 className="font-medium text-destructive">Failed to load projects</h3>
          <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  const canSeeAll = ["admin", "management"].includes(userRole);
  const assignedIds = new Set((assignments || []).map((a) => a.project_id));

  let visibleProjects = (allProjects || []) as unknown as Omit<PickerProject, "next_milestone">[];
  if (!canSeeAll) {
    visibleProjects = visibleProjects.filter((p) => assignedIds.has(p.id));
  }

  // Batch-load timeline aggregate + next upcoming milestone per project
  const visibleIds = visibleProjects.map((p) => p.id);
  const milestoneMap = new Map<string, { name: string; start_date: string }>();
  const aggregateMap = new Map<string, { count: number; start: string; end: string }>();

  if (visibleIds.length > 0) {
    const today = new Date().toISOString().split("T")[0];

    const [milestonesResult, itemsResult] = await Promise.all([
      // Next upcoming milestone per project
      supabase
        .from("gantt_items")
        .select("project_id, name, start_date, is_completed")
        .in("project_id", visibleIds)
        .eq("item_type", "milestone")
        .eq("is_completed", false)
        .gte("start_date", today)
        .order("start_date", { ascending: true }),
      // Aggregate: count non-phase items + compute min start / max end per project
      supabase
        .from("gantt_items")
        .select("project_id, start_date, end_date, item_type")
        .in("project_id", visibleIds)
        .neq("item_type", "phase"),
    ]);

    for (const m of milestonesResult.data || []) {
      if (!milestoneMap.has(m.project_id)) {
        milestoneMap.set(m.project_id, { name: m.name, start_date: m.start_date });
      }
    }

    for (const item of itemsResult.data || []) {
      const existing = aggregateMap.get(item.project_id);
      if (!existing) {
        aggregateMap.set(item.project_id, {
          count: 1,
          start: item.start_date,
          end: item.end_date,
        });
      } else {
        existing.count += 1;
        if (item.start_date < existing.start) existing.start = item.start_date;
        if (item.end_date > existing.end) existing.end = item.end_date;
      }
    }
  }

  const projects: PickerProject[] = visibleProjects.map((p) => {
    const agg = aggregateMap.get(p.id);
    return {
      ...p,
      next_milestone: milestoneMap.get(p.id) ?? null,
      timeline_task_count: agg?.count ?? 0,
      timeline_start: agg?.start ?? null,
      timeline_end: agg?.end ?? null,
    };
  });

  return (
    <div className="flex flex-col h-full">
      <TimelinePickerHeader />
      <div className="flex-1 overflow-auto px-6 py-4">
        <TimelinePickerClient projects={projects} />
      </div>
    </div>
  );
}
