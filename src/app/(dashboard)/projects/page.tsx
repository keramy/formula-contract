import { Suspense } from "react";
import { createClient, getUserRoleFromJWT } from "@/lib/supabase/server";
import { ProjectsListClient } from "./projects-list-client";
import { ProjectsPageHeader } from "./projects-page-header";

interface Project {
  id: string;
  slug: string | null;
  project_code: string;
  name: string;
  status: string;
  installation_date: string | null;
  created_at: string;
  client: { id: string; company_name: string } | null;
  progress?: number; // Percentage of completed items
  totalItems?: number;
  completedItems?: number;
  hasAttention?: boolean;
  attentionCount?: number;
}

export default async function ProjectsPage() {
  const supabase = await createClient();

  // ============================================================================
  // PHASE 1: Get auth user and role from JWT (avoids ~3s DB query!)
  // ============================================================================
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || "";

  // PERFORMANCE: Get role from JWT metadata instead of DB
  const userRole = user ? await getUserRoleFromJWT(user, supabase) : "pm";

  // ============================================================================
  // PHASE 2: Fetch assignments, projects, scope items, and clients in PARALLEL
  // (Note: removed profile query - now using JWT metadata above)
  // ============================================================================
  const [
    { data: assignments },
    { data: allProjects, error },
    { data: allScopeItems },
    { data: allClients },
    { data: overdueMilestones },
    { data: openSnagging },
  ] = await Promise.all([
    // Project assignments (for client filtering)
    user
      ? supabase.from("project_assignments").select("project_id").eq("user_id", user.id)
      : Promise.resolve({ data: null }),
    // All projects with client info
    supabase
      .from("projects")
      .select(`*, client:clients(id, company_name)`)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false }),
    // All scope items for progress calculation
    supabase
      .from("scope_items")
      .select("project_id, status")
      .eq("is_deleted", false),
    // All clients for filter dropdown
    supabase
      .from("clients")
      .select("id, company_name")
      .order("company_name", { ascending: true }),
    // Overdue milestones for attention indicator
    supabase
      .from("milestones")
      .select("project_id")
      .eq("is_completed", false)
      .lt("due_date", new Date().toISOString()),
    // Open snagging issues for attention indicator
    supabase
      .from("snagging")
      .select("project_id")
      .eq("is_resolved", false),
  ]);

  const canCreateProject = ["admin", "pm"].includes(userRole);
  const assignedProjectIds = (assignments || []).map(a => a.project_id);

  if (error) {
    console.error("Error fetching projects:", error);
  }

  // ============================================================================
  // Filter and process data (client-side - fast)
  // ============================================================================

  // Admin and Management see ALL projects
  // Everyone else (PM, production, procurement, client) sees only assigned projects
  let projectsData = (allProjects || []) as unknown as Project[];
  const canSeeAllProjects = ["admin", "management"].includes(userRole);

  if (!canSeeAllProjects) {
    if (assignedProjectIds.length === 0) {
      return (
        <div className="p-6">
          <ProjectsPageHeader
            title="My Projects"
            subtitle="View your assigned projects"
            canCreateProject={canCreateProject}
          />
          <div className="py-8 text-center text-muted-foreground">
            No projects assigned yet. Please contact your administrator.
          </div>
        </div>
      );
    }
    projectsData = projectsData.filter(p => assignedProjectIds.includes(p.id));
  }

  // Calculate progress for each project from scope items
  let projects = projectsData;

  // Build attention map from overdue milestones and open snagging
  const attentionMap = new Map<string, number>();
  if (overdueMilestones) {
    for (const m of overdueMilestones) {
      attentionMap.set(m.project_id, (attentionMap.get(m.project_id) || 0) + 1);
    }
  }
  if (openSnagging) {
    for (const s of openSnagging) {
      attentionMap.set(s.project_id, (attentionMap.get(s.project_id) || 0) + 1);
    }
  }

  if (allScopeItems && projects.length > 0) {
    const projectIds = new Set(projects.map(p => p.id));

    // Group items by project and calculate progress
    const progressMap = new Map<string, { total: number; completed: number }>();

    for (const item of allScopeItems) {
      if (!projectIds.has(item.project_id)) continue; // Skip items from other projects

      const existing = progressMap.get(item.project_id) || { total: 0, completed: 0 };
      existing.total++;
      if (item.status === "complete") {
        existing.completed++;
      }
      progressMap.set(item.project_id, existing);
    }

    // Add progress and attention data to projects
    projects = projects.map(project => {
      const stats = progressMap.get(project.id);
      const attentionCount = attentionMap.get(project.id) || 0;

      if (stats && stats.total > 0) {
        return {
          ...project,
          progress: Math.round((stats.completed / stats.total) * 100),
          totalItems: stats.total,
          completedItems: stats.completed,
          hasAttention: attentionCount > 0,
          attentionCount,
        };
      }
      return {
        ...project,
        progress: 0,
        totalItems: 0,
        completedItems: 0,
        hasAttention: attentionCount > 0,
        attentionCount,
      };
    });
  } else {
    // Still add attention data even if no scope items
    projects = projects.map(project => {
      const attentionCount = attentionMap.get(project.id) || 0;
      return {
        ...project,
        progress: 0,
        totalItems: 0,
        completedItems: 0,
        hasAttention: attentionCount > 0,
        attentionCount,
      };
    });
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <ProjectsPageHeader
        title={canSeeAllProjects ? "Projects" : "My Projects"}
        subtitle={canSeeAllProjects
          ? "Manage your furniture manufacturing projects"
          : "View your assigned projects and track progress"}
        canCreateProject={canCreateProject}
      />

      {/* Client-side filtering for instant response */}
      <Suspense fallback={<div className="py-8 text-center text-muted-foreground">Loading projects...</div>}>
        <ProjectsListClient projects={projects} clients={allClients || []} canCreateProject={canCreateProject} />
      </Suspense>
    </div>
  );
}
