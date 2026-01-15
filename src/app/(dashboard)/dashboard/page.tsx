import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GlassCard, GradientIcon, StatusBadge } from "@/components/ui/ui-helpers";
import { ActivityFeed } from "@/components/activity-log/activity-feed";
import Link from "next/link";
import {
  FolderKanbanIcon,
  UsersIcon,
  BuildingIcon,
  ClipboardListIcon,
  ArrowRightIcon,
  TrendingUpIcon,
  PlusIcon,
} from "lucide-react";
import { DashboardHeader } from "./dashboard-header";

// Status configuration for badges
const statusConfig: Record<string, { variant: "info" | "success" | "warning" | "default" | "danger"; label: string }> = {
  tender: { variant: "info", label: "Tender" },
  active: { variant: "success", label: "Active" },
  on_hold: { variant: "warning", label: "On Hold" },
  completed: { variant: "default", label: "Completed" },
  cancelled: { variant: "danger", label: "Cancelled" },
};

export default async function DashboardPage() {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  let userName = "User";
  let userRole = "pm";

  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("name, role")
      .eq("id", user.id)
      .single();
    if (profile) {
      userName = profile.name || "User";
      userRole = profile.role;
    }
  }

  // Fetch project counts by status
  const { data: projects } = await supabase
    .from("projects")
    .select("id, status")
    .eq("is_deleted", false);

  const projectCounts = {
    total: projects?.length || 0,
    active: projects?.filter(p => p.status === "active").length || 0,
    tender: projects?.filter(p => p.status === "tender").length || 0,
    on_hold: projects?.filter(p => p.status === "on_hold").length || 0,
    completed: projects?.filter(p => p.status === "completed").length || 0,
    cancelled: projects?.filter(p => p.status === "cancelled").length || 0,
  };

  // Fetch client count
  const { count: clientCount } = await supabase
    .from("clients")
    .select("*", { count: "exact", head: true })
    .eq("is_deleted", false);

  // Fetch user count
  const { count: userCount } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  // Fetch recent projects (last 5)
  const { data: recentProjects } = await supabase
    .from("projects")
    .select(`
      id,
      project_code,
      name,
      status,
      client_id
    `)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(5);

  // Fetch client names for recent projects
  const clientIds = (recentProjects?.map(p => p.client_id).filter((id): id is string => id !== null)) || [];
  const { data: clients } = clientIds.length > 0
    ? await supabase
        .from("clients")
        .select("id, company_name")
        .in("id", clientIds)
    : { data: [] };

  // Create a map of client_id to company_name
  const clientMap = new Map(clients?.map(c => [c.id, c.company_name]) || []);

  // Merge client data into projects
  const projectsWithClients = recentProjects?.map(project => ({
    ...project,
    client: project.client_id ? { company_name: clientMap.get(project.client_id) || null } : null
  })) || [];

  const canCreateProject = ["admin", "pm"].includes(userRole);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50/50 via-white to-gray-50/50">
      <div className="p-6 space-y-6">
        {/* Header */}
        <DashboardHeader userName={userName} />

        {/* Stats Row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <GlassCard hover="lift">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Projects</p>
                  <p className="text-3xl font-bold mt-1">{projectCounts.total}</p>
                  <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                    <TrendingUpIcon className="size-3" />
                    {projectCounts.active} active
                  </p>
                </div>
                <GradientIcon icon={<FolderKanbanIcon className="size-5" />} color="violet" />
              </div>
            </CardContent>
          </GlassCard>

          <GlassCard hover="lift">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Clients</p>
                  <p className="text-3xl font-bold mt-1">{clientCount || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">Active clients</p>
                </div>
                <GradientIcon icon={<BuildingIcon className="size-5" />} color="teal" />
              </div>
            </CardContent>
          </GlassCard>

          <GlassCard hover="lift">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Team Members</p>
                  <p className="text-3xl font-bold mt-1">{userCount || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">Active users</p>
                </div>
                <GradientIcon icon={<UsersIcon className="size-5" />} color="coral" />
              </div>
            </CardContent>
          </GlassCard>

          <GlassCard hover="lift">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                  <p className="text-3xl font-bold mt-1">{projectCounts.active + projectCounts.tender}</p>
                  <p className="text-xs text-amber-600 mt-1">
                    {projectCounts.tender} in tender
                  </p>
                </div>
                <GradientIcon icon={<ClipboardListIcon className="size-5" />} color="amber" />
              </div>
            </CardContent>
          </GlassCard>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Projects */}
          <GlassCard>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GradientIcon icon={<FolderKanbanIcon className="size-4" />} color="violet" size="sm" />
                  <CardTitle className="text-base font-semibold">Recent Projects</CardTitle>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/projects">
                    View all
                    <ArrowRightIcon className="size-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {projectsWithClients && projectsWithClients.length > 0 ? (
                projectsWithClients.map((project) => {
                  const config = statusConfig[project.status] || { variant: "default" as const, label: project.status };
                  return (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="group block p-3 rounded-lg bg-gray-50/50 hover:bg-gray-100/70 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm group-hover:text-violet-700 transition-colors">
                            {project.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {project.project_code} • {project.client?.company_name || "No client"}
                          </p>
                        </div>
                        <StatusBadge variant={config.variant}>
                          {config.label}
                        </StatusBadge>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <FolderKanbanIcon className="size-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No projects yet</p>
                  {canCreateProject && (
                    <Button size="sm" className="mt-3" asChild>
                      <Link href="/projects/new">
                        <PlusIcon className="size-4 mr-1" />
                        Create Project
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </GlassCard>

          {/* Activity Feed */}
          <ActivityFeed limit={10} maxHeight="350px" />
        </div>

        {/* Project Status Overview */}
        <GlassCard>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <GradientIcon icon={<ClipboardListIcon className="size-4" />} color="amber" size="sm" />
              <CardTitle className="text-base font-semibold">Project Status Overview</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-5">
              {Object.entries(statusConfig).map(([status, config]) => (
                <div key={status} className="p-4 rounded-lg bg-gray-50/70 text-center">
                  <StatusBadge variant={config.variant} dot>
                    {config.label}
                  </StatusBadge>
                  <p className="text-2xl font-bold mt-2">
                    {projectCounts[status as keyof typeof projectCounts] || 0}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </GlassCard>
      </div>
    </div>
  );
}
