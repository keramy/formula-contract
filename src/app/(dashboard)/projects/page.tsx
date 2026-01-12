import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { ProjectsTable } from "./projects-table";
import { ProjectsFilter } from "./projects-filter";
import type { ProjectStatus } from "@/types/database";

interface Project {
  id: string;
  project_code: string;
  name: string;
  status: string;
  installation_date: string | null;
  created_at: string;
  client: { id: string; company_name: string } | null;
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
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">My Projects</h1>
              <p className="text-muted-foreground">View your assigned projects</p>
            </div>
          </div>
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
  const projects = (data || []) as unknown as Project[];

  if (error) {
    console.error("Error fetching projects:", error);
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {userRole === "client" ? "My Projects" : "Projects"}
          </h1>
          <p className="text-muted-foreground">
            {userRole === "client"
              ? "View your assigned projects and track progress"
              : "Manage your furniture manufacturing projects"}
          </p>
        </div>
        {canCreateProject && (
          <Button asChild>
            <Link href="/projects/new">
              <PlusIcon className="size-4" />
              New Project
            </Link>
          </Button>
        )}
      </div>

      {/* Filters */}
      <ProjectsFilter />

      {/* Projects Table */}
      <Suspense fallback={<div className="py-8 text-center text-muted-foreground">Loading projects...</div>}>
        <ProjectsTable projects={projects} />
      </Suspense>
    </div>
  );
}
