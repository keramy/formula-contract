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
} from "lucide-react";
import { DashboardHeader } from "./dashboard-header";
import { getCachedDashboardStats, getCachedRecentProjects } from "@/lib/cache";
import { getMyTasks, getAtRiskProjects, getPendingApprovals, getClientProjectProgress, getMyDashboardStats, getDashboardMilestones, getProductionQueue, getProcurementQueue, getFinancialOverview } from "@/lib/actions/dashboard";
import { MyTasksWidget } from "@/components/dashboard/my-tasks-widget";
import { AtRiskProjects } from "@/components/dashboard/at-risk-projects";
import { PendingApprovalsWidget } from "@/components/dashboard/pending-approvals-widget";
import { ClientProjectProgressWidget } from "@/components/dashboard/client-project-progress";
import { UpcomingMilestonesWidget } from "@/components/dashboard/upcoming-milestones-widget";
import { ProductionQueueWidget } from "@/components/dashboard/production-queue-widget";
import { ProcurementQueueWidget } from "@/components/dashboard/procurement-queue-widget";
import { FinancialOverviewWidget } from "@/components/dashboard/financial-overview-widget";

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

  // Fetch other data in parallel based on role
  const isProduction = userRole === "production";
  const isProcurement = userRole === "procurement";

  const [
    tasksData,
    atRiskData,
    pendingApprovalsData,
    clientProjectsData,
    milestonesData,
    productionQueueData,
    procurementQueueData,
    financialData,
  ] = await Promise.all([
    // My Tasks - PM and Admin only (not production/procurement)
    (userRole === "pm" || canSeeAllProjects)
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
    // Production Queue - Production role
    isProduction ? getProductionQueue() : Promise.resolve({ inProduction: [], readyForProduction: [], pendingInstallation: [], totalInProduction: 0, totalReady: 0, totalPendingInstall: 0 }),
    // Procurement Queue - Procurement role
    isProcurement ? getProcurementQueue() : Promise.resolve({ needsMaterials: [], pendingApproval: [], totalNeedsMaterials: 0, totalPendingApproval: 0 }),
    // Financial Overview - Admin/Management only
    canSeeAllProjects ? getFinancialOverview() : Promise.resolve({ totalContractValue: 0, byStatus: { tender: 0, active: 0, completed: 0 }, currency: "TRY", projectCount: 0 }),
  ]);

  console.log(`📊 [PROFILE] Dashboard Total: ${(performance.now() - pageStart).toFixed(0)}ms\n`);

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

        {/* Stats Overview - Clean horizontal layout */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Total Projects */}
          <Link
            href="/projects"
            className="group p-4 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white hover:shadow-lg hover:scale-[1.02] transition-all"
          >
            <div className="flex items-center gap-2 mb-1">
              <FolderKanbanIcon className="size-4 opacity-80" />
              <span className="text-xs font-medium opacity-90">
                {canSeeAllProjects ? "All Projects" : "My Projects"}
              </span>
            </div>
            <p className="text-2xl font-bold">{projectCounts.total}</p>
          </Link>

          {/* Status Cards */}
          <Link
            href="/projects?status=active"
            className="group p-4 rounded-xl bg-white border border-gray-100 hover:border-emerald-200 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="size-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-muted-foreground">Active</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{projectCounts.active}</p>
          </Link>

          <Link
            href="/projects?status=tender"
            className="group p-4 rounded-xl bg-white border border-gray-100 hover:border-sky-200 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="size-2 rounded-full bg-sky-500" />
              <span className="text-xs text-muted-foreground">Tender</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{projectCounts.tender}</p>
          </Link>

          <Link
            href="/projects?status=on_hold"
            className="group p-4 rounded-xl bg-white border border-gray-100 hover:border-amber-200 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="size-2 rounded-full bg-amber-500" />
              <span className="text-xs text-muted-foreground">On Hold</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{projectCounts.on_hold}</p>
          </Link>

          <Link
            href="/projects?status=completed"
            className="group p-4 rounded-xl bg-white border border-gray-100 hover:border-gray-300 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="size-2 rounded-full bg-gray-400" />
              <span className="text-xs text-muted-foreground">Completed</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{projectCounts.completed}</p>
          </Link>

          {/* Admin: Clients & Team OR Cancelled for others */}
          {canSeeAllProjects ? (
            <div className="p-4 rounded-xl bg-white border border-gray-100 flex flex-col justify-center">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BuildingIcon className="size-3.5 text-teal-600" />
                  <span className="text-xs text-muted-foreground">Clients</span>
                </div>
                <span className="text-sm font-bold">{clientCount}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <UsersIcon className="size-3.5 text-orange-600" />
                  <span className="text-xs text-muted-foreground">Team</span>
                </div>
                <span className="text-sm font-bold">{userCount}</span>
              </div>
            </div>
          ) : (
            <Link
              href="/projects?status=cancelled"
              className="group p-4 rounded-xl bg-white border border-gray-100 hover:border-rose-200 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="size-2 rounded-full bg-rose-500" />
                <span className="text-xs text-muted-foreground">Cancelled</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{projectCounts.cancelled}</p>
            </Link>
          )}
        </div>

        {/* Role-Specific Widgets */}
        {isProduction ? (
          // PRODUCTION ROLE - Show production queue
          <ProductionQueueWidget queue={productionQueueData} />
        ) : isProcurement ? (
          // PROCUREMENT ROLE - Show procurement queue
          <ProcurementQueueWidget queue={procurementQueueData} />
        ) : (
          // PM/ADMIN/MANAGEMENT - Show tasks, at-risk, milestones
          <div className="grid gap-5 lg:grid-cols-3">
            <MyTasksWidget tasks={tasksData} />
            <AtRiskProjects projects={atRiskData} />
            {canSeeAllProjects ? (
              <FinancialOverviewWidget financial={financialData} />
            ) : (
              <UpcomingMilestonesWidget milestones={milestonesData} />
            )}
          </div>
        )}

        {/* Milestones for Admin/Management (shown separately) */}
        {canSeeAllProjects && (
          <UpcomingMilestonesWidget milestones={milestonesData} />
        )}

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
