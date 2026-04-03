import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getRequestContext } from "@/lib/supabase/server";
import { ProjectsListClient } from "./projects-list-client";
import { ProjectsPageHeader } from "./projects-page-header";
import { AlertTriangleIcon } from "lucide-react";

interface Project {
  id: string;
  slug: string | null;
  project_code: string;
  name: string;
  status: string;
  installation_date: string | null;
  created_at: string;
  client: { id: string; company_name: string } | null;
  progress?: number;
  totalItems?: number;
  completedItems?: number;
  hasAttention?: boolean;
  attentionCount?: number;
}

export default async function ProjectsPage() {
  const ctx = await getRequestContext();
  if (!ctx) redirect("/login");

  const { supabase, user, role: userRole } = ctx;

  // ============================================================================
  // Only 2 queries: projects + assignments (for role filtering)
  // Progress & attention data will be fetched client-side via React Query
  // ============================================================================
  const [
    { data: assignments },
    { data: allProjects, error },
  ] = await Promise.all([
    // Project assignments (for role-based filtering)
    supabase.from("project_assignments").select("project_id").eq("user_id", user.id),
    // All projects with client info
    supabase
      .from("projects")
      .select(`*, client:clients(id, company_name)`)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false }),
  ]);

  const canCreateProject = ["admin", "pm"].includes(userRole);
  const assignedProjectIds = (assignments || []).map(a => a.project_id);

  if (error) {
    console.error("Error fetching projects:", error);
    return (
      <div className="p-6">
        <ProjectsPageHeader
          title="Projects"
          subtitle="Manage your furniture manufacturing projects"
          canCreateProject={canCreateProject}
        />
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6 text-center">
          <AlertTriangleIcon className="size-8 text-destructive mx-auto mb-2" />
          <h3 className="font-medium text-destructive">Failed to load projects</h3>
          <p className="text-sm text-muted-foreground mt-1">{error.message || "An unexpected error occurred"}</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Filter by role: admin/management see all, others see only assigned
  // ============================================================================
  let projects = (allProjects || []) as unknown as Project[];
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
    projects = projects.filter(p => assignedProjectIds.includes(p.id));
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
        <ProjectsListClient projects={projects} canCreateProject={canCreateProject} />
      </Suspense>
    </div>
  );
}
