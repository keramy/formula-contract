"use client";

import Link from "next/link";
import { format, isPast, differenceInDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { GlassCard, GradientIcon } from "@/components/ui/ui-helpers";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  PencilIcon,
  BuildingIcon,
  CalendarIcon,
  BanknoteIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  FlagIcon,
  PenToolIcon,
  PackageIcon,
  BugIcon,
  UsersIcon,
  ActivityIcon,
  ArrowRightIcon,
  ClockIcon,
} from "lucide-react";

interface ProjectClient {
  id: string;
  company_name: string;
  contact_person: string | null;
}

interface ScopeItem {
  id: string;
  item_path: "production" | "procurement";
  production_percentage: number;
  is_installed: boolean;
  total_sales_price: number | null;
}

interface Drawing {
  id: string;
  item_id: string;
  status: string;
  item_code?: string; // For tooltip display
}

interface Material {
  id: string;
  name?: string; // For tooltip display
  status: string;
}

interface Milestone {
  id: string;
  name: string;
  due_date: string;
  is_completed: boolean;
}

interface Snagging {
  id: string;
  is_resolved: boolean;
  description?: string; // For tooltip display
}

interface Assignment {
  id: string;
  user: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
}

interface Activity {
  id: string;
  action: string;
  entity_type: string;
  created_at: string;
  user: {
    name: string;
  } | null;
}

interface ProjectOverviewProps {
  projectId: string;
  projectUrlId: string;
  project: {
    name: string;
    project_code: string;
    description: string | null;
    status: string;
    installation_date: string | null;
    contract_value_manual: number | null;
    currency: string;
    client: ProjectClient | null;
  };
  scopeItems: ScopeItem[];
  drawings: Drawing[];
  materials: Material[];
  milestones: Milestone[];
  snaggingItems: Snagging[];
  assignments: Assignment[];
  recentActivities?: Activity[];
  canEdit: boolean;
  isClient: boolean;
}

export function ProjectOverview({
  projectId,
  projectUrlId,
  project,
  scopeItems,
  drawings,
  materials,
  milestones,
  snaggingItems,
  assignments,
  recentActivities = [],
  canEdit,
  isClient,
}: ProjectOverviewProps) {
  // ============================================================================
  // CALCULATIONS
  // ============================================================================

  // Scope progress
  const productionItems = scopeItems.filter((i) => i.item_path === "production");
  const procurementItems = scopeItems.filter((i) => i.item_path === "procurement");

  const productionProgress = productionItems.length > 0
    ? Math.round(productionItems.reduce((sum, i) => sum + i.production_percentage, 0) / productionItems.length)
    : 0;

  const procurementProgress = procurementItems.length > 0
    ? Math.round((procurementItems.filter((i) => i.is_installed).length / procurementItems.length) * 100)
    : 0;

  const overallProgress = scopeItems.length > 0
    ? Math.round((productionProgress * productionItems.length + procurementProgress * procurementItems.length) / scopeItems.length)
    : 0;

  // Drawing stats
  const productionItemIds = new Set(productionItems.map((i) => i.id));
  const drawingsForProduction = drawings.filter((d) => productionItemIds.has(d.item_id));
  const approvedDrawings = drawingsForProduction.filter((d) => d.status === "approved" || d.status === "approved_with_comments").length;
  const rejectedDrawings = drawingsForProduction.filter((d) => d.status === "rejected").length;
  const totalDrawingsNeeded = productionItems.length;

  // Material stats
  const approvedMaterials = materials.filter((m) => m.status === "approved").length;
  const pendingMaterials = materials.filter((m) => m.status === "pending").length;
  const totalMaterials = materials.length;

  // Milestone stats
  const completedMilestones = milestones.filter((m) => m.is_completed).length;
  const overdueMilestones = milestones.filter((m) => !m.is_completed && isPast(new Date(m.due_date))).length;
  const totalMilestones = milestones.length;

  // Next milestone
  const upcomingMilestones = milestones
    .filter((m) => !m.is_completed)
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  const nextMilestone = upcomingMilestones[0];
  const daysUntilNext = nextMilestone
    ? differenceInDays(new Date(nextMilestone.due_date), new Date())
    : null;

  // Snagging stats
  const openIssues = snaggingItems.filter((s) => !s.is_resolved).length;
  const openSnaggingList = snaggingItems.filter((s) => !s.is_resolved);

  // Get specific items for tooltips
  const overdueMilestonesList = milestones.filter((m) => !m.is_completed && isPast(new Date(m.due_date)));
  const rejectedDrawingsList = drawingsForProduction.filter((d) => d.status === "rejected");
  const pendingMaterialsList = materials.filter((m) => m.status === "pending");

  // Attention items with details for tooltips
  const attentionItems: { label: string; count: number; color: string; tab: string; details: string[] }[] = [];
  if (overdueMilestonesList.length > 0) {
    attentionItems.push({
      label: "overdue milestone",
      count: overdueMilestonesList.length,
      color: "text-rose-600",
      tab: "milestones",
      details: overdueMilestonesList.map((m) => m.name),
    });
  }
  if (rejectedDrawingsList.length > 0) {
    attentionItems.push({
      label: "rejected drawing",
      count: rejectedDrawingsList.length,
      color: "text-rose-600",
      tab: "drawings",
      details: rejectedDrawingsList.map((d) => d.item_code || d.item_id),
    });
  }
  if (pendingMaterialsList.length > 0) {
    attentionItems.push({
      label: "pending material",
      count: pendingMaterialsList.length,
      color: "text-amber-600",
      tab: "materials",
      details: pendingMaterialsList.map((m) => m.name || m.id),
    });
  }
  if (openSnaggingList.length > 0) {
    attentionItems.push({
      label: "open issue",
      count: openSnaggingList.length,
      color: "text-amber-600",
      tab: "snagging",
      details: openSnaggingList.slice(0, 5).map((s) => s.description?.slice(0, 40) || "Issue"),
    });
  }

  const formatCurrency = (value: number | null, currency: string) => {
    if (!value) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Progress ring SVG calculation
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallProgress / 100) * circumference;

  return (
    <div className="space-y-6">
      {/* Edit Project Button */}
      {canEdit && (
        <div className="flex justify-end">
          <Button asChild className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700">
            <Link href={`/projects/${projectUrlId}/edit`}>
              <PencilIcon className="size-4" />
              Edit Project
            </Link>
          </Button>
        </div>
      )}

      {/* Top Section: Progress Ring + Project Info */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Progress Ring Card */}
        <GlassCard className="lg:col-span-1 p-6">
          <div className="flex flex-col items-center">
            {/* SVG Progress Ring */}
            <div className="relative size-36">
              <svg className="size-full -rotate-90" viewBox="0 0 120 120">
                {/* Background circle */}
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-muted/20"
                />
                {/* Progress circle */}
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke="url(#progressGradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-1000 ease-out"
                />
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </svg>
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold">{overallProgress}%</span>
                <span className="text-xs text-muted-foreground">Complete</span>
              </div>
            </div>

            {/* Sub-progress bars */}
            <div className="w-full mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Production</span>
                <span className="font-medium">{productionProgress}%</span>
              </div>
              <Progress value={productionProgress} className="h-1.5 [&>div]:bg-violet-500" />

              <div className="flex items-center justify-between text-xs mt-2">
                <span className="text-muted-foreground">Procurement</span>
                <span className="font-medium">{procurementProgress}%</span>
              </div>
              <Progress value={procurementProgress} className="h-1.5 [&>div]:bg-cyan-500" />
            </div>
          </div>
        </GlassCard>

        {/* Project Info Cards */}
        <div className="lg:col-span-2 grid gap-4 sm:grid-cols-2">
          {/* Client */}
          <GlassCard>
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <GradientIcon icon={<BuildingIcon className="size-4" />} size="sm" color="teal" />
              <CardTitle className="text-sm font-medium">Client</CardTitle>
            </CardHeader>
            <CardContent>
              {project.client ? (
                <div>
                  <p className="font-semibold">{project.client.company_name}</p>
                  {project.client.contact_person && (
                    <p className="text-sm text-muted-foreground">{project.client.contact_person}</p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground italic">No client assigned</p>
              )}
            </CardContent>
          </GlassCard>

          {/* Installation Date */}
          <GlassCard>
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <GradientIcon icon={<CalendarIcon className="size-4" />} size="sm" color="coral" />
              <CardTitle className="text-sm font-medium">Installation Date</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">
                {project.installation_date
                  ? format(new Date(project.installation_date), "MMM d, yyyy")
                  : "Not set"}
              </p>
              {project.installation_date && (
                <p className="text-sm text-muted-foreground">
                  {differenceInDays(new Date(project.installation_date), new Date()) > 0
                    ? `${differenceInDays(new Date(project.installation_date), new Date())} days away`
                    : isPast(new Date(project.installation_date))
                    ? "Passed"
                    : "Today"}
                </p>
              )}
            </CardContent>
          </GlassCard>

          {/* Contract Value - Hidden from clients */}
          {!isClient && (
            <GlassCard>
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <GradientIcon icon={<BanknoteIcon className="size-4" />} size="sm" color="emerald" />
                <CardTitle className="text-sm font-medium">Contract Value</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold">
                  {formatCurrency(project.contract_value_manual, project.currency)}
                </p>
              </CardContent>
            </GlassCard>
          )}

          {/* Team Preview */}
          <GlassCard>
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <GradientIcon icon={<UsersIcon className="size-4" />} size="sm" color="violet" />
              <CardTitle className="text-sm font-medium">Team</CardTitle>
            </CardHeader>
            <CardContent>
              {assignments.length > 0 ? (
                <div className="flex items-center gap-2">
                  {/* Avatar stack with tooltips */}
                  <TooltipProvider delayDuration={100}>
                    <div className="flex -space-x-2">
                      {assignments.slice(0, 4).map((a) => (
                        <Tooltip key={a.id}>
                          <TooltipTrigger asChild>
                            <div className="size-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 ring-2 ring-white flex items-center justify-center text-white text-xs font-medium cursor-default hover:z-10 hover:scale-110 transition-transform">
                              {a.user.name.charAt(0).toUpperCase()}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs">
                            {a.user.name}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                      {assignments.length > 4 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="size-8 rounded-full bg-muted ring-2 ring-white flex items-center justify-center text-xs font-medium cursor-default hover:z-10 hover:scale-110 transition-transform">
                              +{assignments.length - 4}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs">
                            {assignments.slice(4).map((a) => a.user.name).join(", ")}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TooltipProvider>
                  <span className="text-sm text-muted-foreground">
                    {assignments.length} member{assignments.length !== 1 ? "s" : ""}
                  </span>
                </div>
              ) : (
                <p className="text-muted-foreground italic">No team assigned</p>
              )}
            </CardContent>
          </GlassCard>
        </div>
      </div>

      {/* Attention Required Section - Compact with Tooltips */}
      {attentionItems.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50/80 to-orange-50/80">
          <div className="flex items-center gap-2 shrink-0">
            <AlertTriangleIcon className="size-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">Needs Attention</span>
          </div>
          <TooltipProvider delayDuration={200}>
            <div className="flex flex-wrap items-center gap-2">
              {attentionItems.map((item, idx) => (
                <Tooltip key={idx}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        const tab = document.querySelector(`[data-state][value="${item.tab}"]`) as HTMLElement;
                        tab?.click();
                      }}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white/80 hover:bg-white transition-colors ${item.color}`}
                    >
                      <span className="font-bold">{item.count}</span>
                      {item.label}{item.count !== 1 ? "s" : ""}
                      <ArrowRightIcon className="size-2.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <div className="text-xs space-y-1">
                      <p className="font-medium border-b pb-1 mb-1">
                        {item.count} {item.label}{item.count !== 1 ? "s" : ""}:
                      </p>
                      <ul className="space-y-0.5">
                        {item.details.slice(0, 5).map((detail, i) => (
                          <li key={i} className="truncate">• {detail}</li>
                        ))}
                        {item.details.length > 5 && (
                          <li className="text-muted-foreground">+{item.details.length - 5} more...</li>
                        )}
                      </ul>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        </div>
      )}

      {/* All Clear Message - Compact */}
      {attentionItems.length === 0 && scopeItems.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50/80 to-teal-50/80">
          <CheckCircleIcon className="size-4 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-700">All Clear!</span>
          <span className="text-sm text-emerald-600">No items requiring attention</span>
        </div>
      )}

      {/* Quick Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Drawings */}
        <GlassCard className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <GradientIcon icon={<PenToolIcon className="size-4" />} size="sm" color="teal" />
            <span className="text-sm font-medium">Drawings</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Approved</span>
              <span className="font-medium">{approvedDrawings}/{totalDrawingsNeeded}</span>
            </div>
            <Progress
              value={totalDrawingsNeeded > 0 ? (approvedDrawings / totalDrawingsNeeded) * 100 : 0}
              className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-teal-500 [&>div]:to-emerald-500"
            />
            {rejectedDrawings > 0 && (
              <p className="text-xs text-rose-600">{rejectedDrawings} rejected</p>
            )}
          </div>
        </GlassCard>

        {/* Materials */}
        <GlassCard className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <GradientIcon icon={<PackageIcon className="size-4" />} size="sm" color="amber" />
            <span className="text-sm font-medium">Materials</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Approved</span>
              <span className="font-medium">{approvedMaterials}/{totalMaterials}</span>
            </div>
            <Progress
              value={totalMaterials > 0 ? (approvedMaterials / totalMaterials) * 100 : 0}
              className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-amber-500 [&>div]:to-orange-500"
            />
            {pendingMaterials > 0 && (
              <p className="text-xs text-amber-600">{pendingMaterials} pending</p>
            )}
          </div>
        </GlassCard>

        {/* Milestones */}
        <GlassCard className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <GradientIcon icon={<FlagIcon className="size-4" />} size="sm" color="violet" />
            <span className="text-sm font-medium">Milestones</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Completed</span>
              <span className="font-medium">{completedMilestones}/{totalMilestones}</span>
            </div>
            <Progress
              value={totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0}
              className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-violet-500 [&>div]:to-purple-500"
            />
            {overdueMilestones > 0 && (
              <p className="text-xs text-rose-600">{overdueMilestones} overdue</p>
            )}
          </div>
        </GlassCard>

        {/* Snagging */}
        <GlassCard className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <GradientIcon icon={<BugIcon className="size-4" />} size="sm" color="rose" />
            <span className="text-sm font-medium">Snagging</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Resolved</span>
              <span className="font-medium">
                {snaggingItems.length - openIssues}/{snaggingItems.length}
              </span>
            </div>
            <Progress
              value={snaggingItems.length > 0 ? ((snaggingItems.length - openIssues) / snaggingItems.length) * 100 : 100}
              className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-rose-500 [&>div]:to-orange-500"
            />
            {openIssues > 0 && (
              <p className="text-xs text-amber-600">{openIssues} open</p>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Bottom Row: Next Milestone + Recent Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Next Milestone */}
        {nextMilestone ? (
          <GlassCard className={`p-4 ${daysUntilNext !== null && daysUntilNext < 0 ? "border-rose-200 bg-rose-50/50" : daysUntilNext !== null && daysUntilNext <= 7 ? "border-amber-200 bg-amber-50/50" : ""}`}>
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${
                daysUntilNext !== null && daysUntilNext < 0
                  ? "bg-rose-100"
                  : daysUntilNext !== null && daysUntilNext <= 7
                  ? "bg-amber-100"
                  : "bg-violet-100"
              }`}>
                <FlagIcon className={`size-6 ${
                  daysUntilNext !== null && daysUntilNext < 0
                    ? "text-rose-600"
                    : daysUntilNext !== null && daysUntilNext <= 7
                    ? "text-amber-600"
                    : "text-violet-600"
                }`} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Next Milestone
                </p>
                <h4 className="font-semibold text-lg mt-0.5">{nextMilestone.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <CalendarIcon className="size-3.5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(nextMilestone.due_date), "MMM d, yyyy")}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-bold ${
                  daysUntilNext !== null && daysUntilNext < 0
                    ? "text-rose-600"
                    : daysUntilNext !== null && daysUntilNext <= 7
                    ? "text-amber-600"
                    : "text-violet-600"
                }`}>
                  {daysUntilNext !== null && daysUntilNext < 0
                    ? Math.abs(daysUntilNext)
                    : daysUntilNext === 0
                    ? "Today"
                    : daysUntilNext}
                </p>
                {daysUntilNext !== 0 && (
                  <p className="text-xs text-muted-foreground">
                    {daysUntilNext !== null && daysUntilNext < 0 ? "days overdue" : "days left"}
                  </p>
                )}
              </div>
            </div>
          </GlassCard>
        ) : milestones.length > 0 ? (
          <GlassCard className="p-4 border-emerald-200 bg-emerald-50/50">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-100">
                <CheckCircleIcon className="size-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Milestones
                </p>
                <h4 className="font-semibold text-lg text-emerald-700">All Complete!</h4>
              </div>
            </div>
          </GlassCard>
        ) : (
          <GlassCard className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-muted">
                <FlagIcon className="size-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Next Milestone
                </p>
                <h4 className="font-medium text-muted-foreground">No milestones set</h4>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Recent Activity */}
        <GlassCard className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <GradientIcon icon={<ActivityIcon className="size-4" />} size="sm" color="sky" />
              <span className="text-sm font-medium">Recent Activity</span>
            </div>
            <button
              onClick={() => {
                const tab = document.querySelector(`[data-state][value="activity"]`) as HTMLElement;
                tab?.click();
              }}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              View All <ArrowRightIcon className="size-3" />
            </button>
          </div>
          {recentActivities.length > 0 ? (
            <div className="space-y-2">
              {recentActivities.slice(0, 4).map((activity) => (
                <div key={activity.id} className="flex items-start gap-2 text-sm">
                  <ClockIcon className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-muted-foreground">
                      {activity.user?.name || "System"}{" "}
                      <span className="text-foreground">{activity.action}</span>{" "}
                      {activity.entity_type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No recent activity</p>
          )}
        </GlassCard>
      </div>

      {/* Description */}
      {project.description && (
        <GlassCard>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{project.description}</p>
          </CardContent>
        </GlassCard>
      )}
    </div>
  );
}
