import { createClient, getUserProfileFromJWT } from "@/lib/supabase/server";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GlassCard, GradientIcon, StatusBadge } from "@/components/ui/ui-helpers";
import { ActivityFeed } from "@/components/activity-log/activity-feed";
import Link from "next/link";
import {
  FolderKanbanIcon,
  UsersIcon,
  BuildingIcon,
  ArrowRightIcon,
  PlusIcon,
  CircleDotIcon,
} from "lucide-react";
import { DashboardHeader } from "./dashboard-header";
import { getCachedDashboardStats, getCachedRecentProjects } from "@/lib/cache";
import { getMyTasks, getAtRiskProjects, getPendingApprovals, getClientProjectProgress, getMyDashboardStats, getDashboardMilestones } from "@/lib/actions/dashboard";
import { MyTasksWidget } from "@/components/dashboard/my-tasks-widget";
import { AtRiskProjects } from "@/components/dashboard/at-risk-projects";
import { PendingApprovalsWidget } from "@/components/dashboard/pending-approvals-widget";
import { ClientProjectProgressWidget } from "@/components/dashboard/client-project-progress";
import { UpcomingMilestonesWidget } from "@/components/dashboard/upcoming-milestones-widget";

// Status configuration for compact pills
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

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get user profile from JWT metadata
  let userId = user?.id || "";
  let userName = "User";
  let userRole = "pm";

  if (user) {
    const profile = await getUserProfileFromJWT(user, supabase);
    userName = profile.name;
    userRole = profile.role;
  }

  const isClient = userRole === "client";
  const canSeeAllProjects = ["admin", "management"].includes(userRole);
  const isOperationalRole = ["pm", "production", "procurement"].includes(userRole);

  // Get assigned project IDs for operational roles
  let assignedProjectIds: string[] = [];
  if (!canSeeAllProjects && !isClient && user) {
    const { data: assignments } = await supabase
      .from("project_assignments")
      .select("project_id")
      .eq("user_id", user.id);
    assignedProjectIds = (assignments || []).map(a => a.project_id);
  }

  // Fetch data based on role
  let projectCounts = { total: 0, tender: 0, active: 0, on_hold: 0, completed: 0, cancelled: 0 };
  let recentProjects: Array<{ id: string; slug: string | null; project_code: string; name: string; status: string; client: { company_name: string | null } | null }> = [];
  let clientCount = 0;
  let userCount = 0;

  if (canSeeAllProjects) {
    // Admin/Management: See all projects (cached)
    const [cachedStats, cachedRecent] = await Promise.all([
      getCachedDashboardStats(),
      getCachedRecentProjects(),
    ]);
    projectCounts = cachedStats.projectCounts;
    clientCount = cachedStats.clientCount;
    userCount = cachedStats.userCount;
    recentProjects = cachedRecent;
  } else if (isOperationalRole) {
    // PM/Production/Procurement: Only assigned projects
    const myStats = await getMyDashboardStats(assignedProjectIds);
    projectCounts = myStats.projectCounts;
    recentProjects = myStats.recentProjects;
  }

  // Fetch other data in parallel
  const [
    tasksData,
    atRiskData,
    pendingApprovalsData,
    clientProjectsData,
    milestonesData,
  ] = await Promise.all([
    // My Tasks - operational roles only
    isOperationalRole || canSeeAllProjects
      ? getMyTasks()
      : Promise.resolve({ pendingMaterialApprovals: 0, rejectedDrawings: 0, draftReports: 0, overdueMilestones: 0, total: 0 }),
    // At-Risk Projects - admin/management/pm
    canSeeAllProjects || userRole === "pm"
      ? getAtRiskProjects()
      : Promise.resolve([]),
    // Pending Approvals - Client only
    isClient ? getPendingApprovals(userId) : Promise.resolve([]),
    // Client Project Progress - Client only
    isClient ? getClientProjectProgress(userId) : Promise.resolve([]),
    // Upcoming Milestones - non-client users
    !isClient ? getDashboardMilestones() : Promise.resolve([]),
  ]);

  console.log(`📊 [PROFILE] Dashboard Total: ${(performance.now() - pageStart).toFixed(0)}ms\n`);

  const canCreateProject = ["admin", "pm"].includes(userRole);

  // ============================================================================
  // CLIENT DASHBOARD - Simplified view for clients
  // ============================================================================
  if (isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50/50 via-white to-gray-50/50">
        <div className="p-6 space-y-5">
          <DashboardHeader userName={userName} />

          <div className="grid gap-5">
            <ClientProjectProgressWidget projects={clientProjectsData} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <PendingApprovalsWidget approvals={pendingApprovalsData} />
            <ActivityFeed limit={8} maxHeight="320px" />
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PM/ADMIN DASHBOARD - Compact mission control view
  // ============================================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50/50 via-white to-gray-50/50">
      <div className="p-6 space-y-5">
        <DashboardHeader userName={userName} />

        {/* Compact Stats Row - Status counts in one row */}
        <GlassCard className="py-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <GradientIcon icon={<FolderKanbanIcon className="size-4" />} color="violet" size="sm" />
                <span className="text-sm font-semibold">
                  {canSeeAllProjects ? "All Projects" : "My Projects"}
                </span>
                <span className="text-2xl font-bold ml-2">{projectCounts.total}</span>
              </div>
              {canCreateProject && (
                <Button size="sm" asChild className="h-8">
                  <Link href="/projects/new">
                    <PlusIcon className="size-3.5 mr-1" />
                    New Project
                  </Link>
                </Button>
              )}
            </div>

            {/* Status Pills */}
            <div className="flex flex-wrap gap-3">
              {Object.entries(statusConfig).map(([status, config]) => {
                const count = projectCounts[status as keyof typeof projectCounts] || 0;
                return (
                  <div
                    key={status}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border"
                  >
                    <CircleDotIcon className={`size-3 ${
                      config.variant === "success" ? "text-emerald-500" :
                      config.variant === "info" ? "text-sky-500" :
                      config.variant === "warning" ? "text-amber-500" :
                      config.variant === "danger" ? "text-rose-500" :
                      "text-gray-400"
                    }`} />
                    <span className="text-sm text-muted-foreground">{config.label}</span>
                    <span className="text-sm font-semibold">{count}</span>
                  </div>
                );
              })}
            </div>

            {/* Admin-only: Clients & Team counts */}
            {canSeeAllProjects && (
              <div className="flex gap-6 mt-4 pt-3 border-t">
                <div className="flex items-center gap-2">
                  <GradientIcon icon={<BuildingIcon className="size-3.5" />} color="teal" size="xs" />
                  <span className="text-sm text-muted-foreground">Clients</span>
                  <span className="text-sm font-semibold">{clientCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <GradientIcon icon={<UsersIcon className="size-3.5" />} color="coral" size="xs" />
                  <span className="text-sm text-muted-foreground">Team</span>
                  <span className="text-sm font-semibold">{userCount}</span>
                </div>
              </div>
            )}
          </CardContent>
        </GlassCard>

        {/* Tasks, At-Risk Projects & Milestones Row */}
        <div className="grid gap-5 lg:grid-cols-3">
          <MyTasksWidget tasks={tasksData} />
          <AtRiskProjects projects={atRiskData} />
          <UpcomingMilestonesWidget milestones={milestonesData} />
        </div>

        {/* Recent Projects & Activity Feed */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Recent Projects */}
          <GlassCard>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GradientIcon icon={<FolderKanbanIcon className="size-4" />} color="violet" size="sm" />
                  <CardTitle className="text-sm font-semibold">
                    {canSeeAllProjects ? "Recent Projects" : "My Recent Projects"}
                  </CardTitle>
                </div>
                <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                  <Link href="/projects">
                    View all
                    <ArrowRightIcon className="size-3 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {recentProjects && recentProjects.length > 0 ? (
                recentProjects.map((project) => {
                  const config = statusConfig[project.status] || { variant: "default" as const, label: project.status };
                  return (
                    <Link
                      key={project.id}
                      href={`/projects/${project.slug || project.id}`}
                      className="group block p-2.5 rounded-lg bg-gray-50/50 hover:bg-gray-100/70 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate group-hover:text-violet-700 transition-colors">
                            {project.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {project.project_code} • {project.client?.company_name || "No client"}
                          </p>
                        </div>
                        <StatusBadge variant={config.variant} className="shrink-0 text-xs">
                          {config.label}
                        </StatusBadge>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="py-6 text-center text-muted-foreground">
                  <FolderKanbanIcon className="size-6 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {canSeeAllProjects ? "No projects yet" : "No projects assigned yet"}
                  </p>
                  {canCreateProject && (
                    <Button size="sm" className="mt-2 h-7 text-xs" asChild>
                      <Link href="/projects/new">
                        <PlusIcon className="size-3 mr-1" />
                        Create Project
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </GlassCard>

          {/* Activity Feed */}
          <ActivityFeed limit={8} maxHeight="320px" />
        </div>
      </div>
    </div>
  );
}
