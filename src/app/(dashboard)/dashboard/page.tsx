import { createClient, getUserProfileFromJWT } from "@/lib/supabase/server";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GlassCard, GradientIcon, StatusBadge } from "@/components/ui/ui-helpers";
import { ActivityFeed } from "@/components/activity-log/activity-feed";
import Link from "next/link";
import {
  FolderKanbanIcon,
  ArrowRightIcon,
  CalendarIcon,
  AlertTriangleIcon,
} from "lucide-react";
import { DashboardHeader } from "./dashboard-header";
import { getCachedDashboardStats, getCachedRecentProjects } from "@/lib/cache";
import { getMyTasks, getAtRiskProjects, getPendingApprovals, getClientProjectProgress, getMyDashboardStats, getDashboardMilestones, getProductionQueue, getProcurementQueue, getFinancialOverview, getThisWeekSummary, getProjectsByStatus } from "@/lib/actions/dashboard";
import { MyTasksWidget } from "@/components/dashboard/my-tasks-widget";
import { AtRiskProjects } from "@/components/dashboard/at-risk-projects";
import { PendingApprovalsWidget } from "@/components/dashboard/pending-approvals-widget";
import { ClientProjectProgressWidget } from "@/components/dashboard/client-project-progress";
import { UpcomingMilestonesWidget } from "@/components/dashboard/upcoming-milestones-widget";
import { ProductionQueueWidget } from "@/components/dashboard/production-queue-widget";
import { ProcurementQueueWidget } from "@/components/dashboard/procurement-queue-widget";
import { FinancialOverviewWidget } from "@/components/dashboard/financial-overview-widget";
import { ThisWeekWidget } from "@/components/dashboard/this-week-widget";
import { ProjectsStatusChart } from "@/components/dashboard/projects-status-chart";
import { ScrollIndicator } from "@/components/dashboard/scroll-indicator";

// Status configuration for display
const statusConfig: Record<string, { variant: "info" | "success" | "warning" | "default" | "danger"; label: string }> = {
  tender: { variant: "info", label: "Tender" },
  active: { variant: "success", label: "Active" },
  on_hold: { variant: "warning", label: "On Hold" },
  completed: { variant: "default", label: "Completed" },
  cancelled: { variant: "danger", label: "Cancelled" },
  not_awarded: { variant: "danger", label: "Not Awarded" },
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
    thisWeekData,
    projectsStatusData,
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
    // This Week Summary - Admin/Management/PM (not production/procurement/client)
    (canSeeAllProjects || userRole === "pm")
      ? getThisWeekSummary()
      : Promise.resolve({ itemsCompletedThisWeek: 0, reportsPublishedThisWeek: 0, upcomingMilestones: 0, milestonesOverdue: 0 }),
    // Projects by Status Chart - Admin/Management only
    canSeeAllProjects
      ? getProjectsByStatus()
      : Promise.resolve({ tender: 0, active: 0, on_hold: 0, completed: 0, cancelled: 0, not_awarded: 0, total: 0 }),
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

  // Process milestones for compact display
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdueMilestones = milestonesData.filter(m => {
    const dueDate = new Date(m.due_date);
    return dueDate < today && !m.is_completed;
  });
  const upcomingMilestonesList = milestonesData.filter(m => {
    const dueDate = new Date(m.due_date);
    return dueDate >= today && !m.is_completed;
  }).slice(0, 4);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50/50 via-white to-gray-50/50 relative">
      <div className="p-6 space-y-5 pb-16">
        <DashboardHeader userName={userName} />

        {/* This Week Summary & Charts - At the TOP for visibility */}
        {(canSeeAllProjects || userRole === "pm") && (
          <div className="grid gap-5 lg:grid-cols-2">
            <ThisWeekWidget summary={thisWeekData} />
            {canSeeAllProjects && <ProjectsStatusChart data={projectsStatusData} />}
          </div>
        )}

        {/* Role-Specific Widgets */}
        {isProduction ? (
          <ProductionQueueWidget queue={productionQueueData} />
        ) : isProcurement ? (
          <ProcurementQueueWidget queue={procurementQueueData} />
        ) : (
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

        {/* Recent Projects & Activity Feed */}
        <div className="grid gap-5 lg:grid-cols-2">
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
                <div className="py-6 text-center">
                  <FolderKanbanIcon className="size-6 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-sm font-medium text-muted-foreground">
                    {canSeeAllProjects ? "No projects yet" : "No projects assigned"}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {canSeeAllProjects
                      ? "Create your first project to get started"
                      : "Projects will appear here when assigned to you"}
                  </p>
                </div>
              )}
            </CardContent>
          </GlassCard>

          <ActivityFeed limit={8} maxHeight="320px" />
        </div>

        {/* Compact Milestones - Horizontal layout for admin/management */}
        {canSeeAllProjects && milestonesData.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white/80 backdrop-blur p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="size-4 text-amber-600" />
                <span className="text-sm font-semibold">Upcoming Milestones</span>
                {overdueMilestones.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                    <AlertTriangleIcon className="size-3" />
                    {overdueMilestones.length} overdue
                  </span>
                )}
              </div>
              <Link href="/projects" className="text-xs text-violet-600 hover:text-violet-700 font-medium">
                View all →
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
              {[...overdueMilestones.slice(0, 2), ...upcomingMilestonesList].slice(0, 5).map((milestone) => {
                const dueDate = new Date(milestone.due_date);
                const isOverdue = dueDate < today && !milestone.is_completed;
                const isDueSoon = !isOverdue && dueDate <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                const projectUrl = milestone.project?.slug || milestone.project_id;

                return (
                  <Link
                    key={milestone.id}
                    href={`/projects/${projectUrl}?tab=milestones`}
                    className={`flex-shrink-0 w-48 p-3 rounded-lg border transition-colors ${
                      isOverdue
                        ? "bg-red-50 border-red-200 hover:bg-red-100"
                        : isDueSoon
                        ? "bg-amber-50 border-amber-200 hover:bg-amber-100"
                        : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    <p className="font-medium text-sm truncate">{milestone.name}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {milestone.project?.name}
                    </p>
                    <p className={`text-xs mt-1 font-medium ${
                      isOverdue ? "text-red-600" : isDueSoon ? "text-amber-600" : "text-gray-500"
                    }`}>
                      {dueDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </p>
                  </Link>
                );
              })}
              {milestonesData.length === 0 && (
                <p className="text-sm text-muted-foreground py-2">No upcoming milestones</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Smart Scroll Indicator - Hides when at bottom */}
      <ScrollIndicator />
    </div>
  );
}
