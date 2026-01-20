import { createClient, getUserProfileFromJWT } from "@/lib/supabase/server";
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
import { getCachedDashboardStats, getCachedRecentProjects } from "@/lib/cache";
import { getMyTasks, getAtRiskProjects, getPendingApprovals, getClientProjectProgress } from "@/lib/actions/dashboard";
import { MyTasksWidget } from "@/components/dashboard/my-tasks-widget";
import { AtRiskProjects } from "@/components/dashboard/at-risk-projects";
import { PendingApprovalsWidget } from "@/components/dashboard/pending-approvals-widget";
import { ClientProjectProgressWidget } from "@/components/dashboard/client-project-progress";

// Status configuration for badges
const statusConfig: Record<string, { variant: "info" | "success" | "warning" | "default" | "danger"; label: string }> = {
  tender: { variant: "info", label: "Tender" },
  active: { variant: "success", label: "Active" },
  on_hold: { variant: "warning", label: "On Hold" },
  completed: { variant: "default", label: "Completed" },
  cancelled: { variant: "danger", label: "Cancelled" },
};

export default async function DashboardPage() {
  const pageStart = performance.now();
  console.log("\n📊 [PROFILE] Dashboard Data Fetch Starting...");

  // OPTIMIZED: Use cached data for stats (60s TTL)
  // This dramatically speeds up the slow COUNT queries
  const supabase = await createClient();

  // First get auth to determine role
  const { data: { user } } = await supabase.auth.getUser();

  // PERFORMANCE: Get user profile from JWT metadata (avoids ~3s DB query!)
  let userId = user?.id || "";
  let userName = "User";
  let userRole = "pm";

  if (user) {
    const profile = await getUserProfileFromJWT(user, supabase);
    userName = profile.name;
    userRole = profile.role;
  }

  const isClient = userRole === "client";
  const isPMOrAdmin = ["admin", "pm"].includes(userRole);

  // Run role-specific data fetches in parallel
  const [
    cachedStats,
    recentProjects,
    tasksData,
    atRiskData,
    pendingApprovalsData,
    clientProjectsData,
  ] = await Promise.all([
    // Cached dashboard stats (60s cache) - PM/Admin only
    isPMOrAdmin ? getCachedDashboardStats() : Promise.resolve({ projectCounts: { total: 0, tender: 0, active: 0, on_hold: 0, completed: 0, cancelled: 0 }, clientCount: 0, userCount: 0 }),
    // Cached recent projects (60s cache) - PM/Admin only
    isPMOrAdmin ? getCachedRecentProjects() : Promise.resolve([]),
    // My Tasks - PM/Admin only
    isPMOrAdmin ? getMyTasks() : Promise.resolve({ pendingMaterialApprovals: 0, rejectedDrawings: 0, draftReports: 0, overdueMilestones: 0, total: 0 }),
    // At-Risk Projects - PM/Admin only
    isPMOrAdmin ? getAtRiskProjects() : Promise.resolve([]),
    // Pending Approvals - Client only
    isClient ? getPendingApprovals(userId) : Promise.resolve([]),
    // Client Project Progress - Client only
    isClient ? getClientProjectProgress(userId) : Promise.resolve([]),
  ]);

  const { projectCounts, clientCount, userCount } = cachedStats;
  const projectsWithClients = recentProjects;

  console.log(`📊 [PROFILE] Dashboard Total: ${(performance.now() - pageStart).toFixed(0)}ms\n`);

  const canCreateProject = isPMOrAdmin;

  // ============================================================================
  // CLIENT DASHBOARD - Simplified view for clients
  // ============================================================================
  if (isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50/50 via-white to-gray-50/50">
        <div className="p-6 space-y-6">
          {/* Header */}
          <DashboardHeader userName={userName} />

          {/* Client Project Progress Cards */}
          <div className="grid gap-6">
            <ClientProjectProgressWidget projects={clientProjectsData} />
          </div>

          {/* Pending Approvals & Activity */}
          <div className="grid gap-6 lg:grid-cols-2">
            <PendingApprovalsWidget approvals={pendingApprovalsData} />
            <ActivityFeed limit={8} maxHeight="350px" />
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PM/ADMIN DASHBOARD - Full mission control view
  // ============================================================================
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

        {/* Tasks & At-Risk Projects Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          <MyTasksWidget tasks={tasksData} />
          <AtRiskProjects projects={atRiskData} />
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
