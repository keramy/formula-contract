import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ProjectsTable } from "./projects-table";
import { ProjectsFilter } from "./projects-filter";
import { ProjectsPageHeader } from "./projects-page-header";
import type { ProjectStatus } from "@/types/database";

interface Project {
  id: string;
  project_code: string;
  name: string;
  status: string;
  installation_date: string | null;
  created_at: string;
  client: { id: string; company_name: string } | null;
  progress?: number; // Percentage of completed items
  totalItems?: number;
  completedItems?: number;
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  // Get current user role
  const { data: { user } } = await supabase.auth.getUser();
  let userRole = "pm";
  let userId = "";
  if (user) {
    userId = user.id;
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile) {
      userRole = profile.role;
    }
  }

  // Check if user can create projects
  const canCreateProject = ["admin", "pm"].includes(userRole);

  // For client users, get their assigned project IDs first
  let assignedProjectIds: string[] = [];
  if (userRole === "client" && userId) {
    const { data: assignments } = await supabase
      .from("project_assignments")
      .select("project_id")
      .eq("user_id", userId);

    assignedProjectIds = (assignments || []).map(a => a.project_id);
  }

  // Build query
  let query = supabase
    .from("projects")
    .select(`
      *,
      client:clients(id, company_name)
    `)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  // For clients, filter to only assigned projects
  if (userRole === "client") {
    if (assignedProjectIds.length === 0) {
      // No assigned projects, return empty array
      return (
        <div className="p-6">
          <ProjectsPageHeader
            title="My Projects"
            subtitle="View your assigned projects"
            canCreateProject={false}
          />
          <div className="py-8 text-center text-muted-foreground">
            No projects assigned yet. Please contact your project manager.
          </div>
        </div>
      );
    }
    query = query.in("id", assignedProjectIds);
  }

  // Apply filters
  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status as ProjectStatus);
  }

  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,project_code.ilike.%${params.search}%`);
  }

  const { data, error } = await query;
  let projects = (data || []) as unknown as Project[];

  if (error) {
    console.error("Error fetching projects:", error);
  }

  // Fetch scope items to calculate progress for each project
  if (projects.length > 0) {
    const projectIds = projects.map(p => p.id);

    const { data: scopeItemsData } = await supabase
      .from("scope_items")
      .select("project_id, status")
      .in("project_id", projectIds)
      .eq("is_deleted", false);

    if (scopeItemsData) {
      // Group items by project and calculate progress
      const progressMap = new Map<string, { total: number; completed: number }>();

      for (const item of scopeItemsData) {
        const existing = progressMap.get(item.project_id) || { total: 0, completed: 0 };
        existing.total++;
        if (item.status === "complete") {
          existing.completed++;
        }
        progressMap.set(item.project_id, existing);
      }

      // Add progress data to projects
      projects = projects.map(project => {
        const stats = progressMap.get(project.id);
        if (stats && stats.total > 0) {
          return {
            ...project,
            progress: Math.round((stats.completed / stats.total) * 100),
            totalItems: stats.total,
            completedItems: stats.completed,
          };
        }
        return {
          ...project,
          progress: 0,
          totalItems: 0,
          completedItems: 0,
        };
      });
    }
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <ProjectsPageHeader
        title={userRole === "client" ? "My Projects" : "Projects"}
        subtitle={userRole === "client"
          ? "View your assigned projects and track progress"
          : "Manage your furniture manufacturing projects"}
        canCreateProject={canCreateProject}
      />

      {/* Filters */}
      <ProjectsFilter />

      {/* Projects Table */}
      <Suspense fallback={<div className="py-8 text-center text-muted-foreground">Loading projects...</div>}>
        <ProjectsTable projects={projects} />
      </Suspense>
    </div>
  );
}
