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
  FactoryIcon,
  WrenchIcon,
  PencilIcon,
} from "lucide-react";

interface ProjectClient {
  id: string;
  company_name: string;
  contact_person: string | null;
}

interface ScopeItem {
  id: string;
  item_code: string;
  name: string;
  item_path: "production" | "procurement";
  production_percentage: number;
  is_installation_started: boolean;
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
  created_at: string | null;
  user: {
    name: string;
  } | null;
}

// Human-readable action descriptions for activity feed
const activityDescriptions: Record<string, string> = {
  project_created: "created the project",
  project_updated: "updated project details",
  project_status_changed: "changed project status",
  drawing_uploaded: "uploaded a drawing",
  drawing_sent_to_client: "sent drawing to client",
  drawing_approved: "approved a drawing",
  drawing_rejected: "rejected a drawing",
  drawing_pm_override: "overrode drawing status",
  material_created: "added a material",
  material_updated: "updated a material",
  material_sent_to_client: "sent material to client",
  material_approved: "approved a material",
  material_rejected: "rejected a material",
  item_created: "created a scope item",
  item_updated: "updated a scope item",
  item_deleted: "deleted a scope item",
  item_status_changed: "changed item status",
  user_assigned: "was assigned to project",
  user_unassigned: "was removed from project",
  report_created: "created a report",
  report_published: "published a report",
  snagging_created: "reported a snag",
  snagging_updated: "updated a snag",
  snagging_resolved: "resolved a snag",
};

const getActivityDescription = (action: string): string => {
  return activityDescriptions[action] || action.replace(/_/g, " ");
};

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

  // Scope progress calculation
  // Production items: 90% from production_percentage + 5% for installation_started + 5% for installed
  // Procurement items: 100% when installed, 0% otherwise
  const productionItems = scopeItems.filter((i) => i.item_path === "production");
  const procurementItems = scopeItems.filter((i) => i.item_path === "procurement");

  // Calculate individual item progress and averages
  const productionItemProgresses = productionItems.map((i) => {
    const productionPart = i.production_percentage * 0.9;
    // Installation started = +5%, installed = +10% total (5% more after started)
    const installationPart = i.is_installed ? 10 : (i.is_installation_started ? 5 : 0);
    return Math.round(productionPart + installationPart);
  });

  const procurementItemProgresses = procurementItems.map((i): number =>
    i.is_installed ? 100 : 0
  );

  // Progress for display bars
  const productionProgress = productionItems.length > 0
    ? Math.round(productionItemProgresses.reduce((sum, p) => sum + p, 0) / productionItems.length)
    : 0;

  const procurementProgress = procurementItems.length > 0
    ? Math.round(procurementItemProgresses.reduce((sum, p) => sum + p, 0) / procurementItems.length)
    : 0;

  // Overall progress = average of all item progress values
  const allItemProgresses = [...productionItemProgresses, ...procurementItemProgresses];
  const overallProgress = allItemProgresses.length > 0
    ? Math.round(allItemProgresses.reduce((sum, p) => sum + p, 0) / allItemProgresses.length)
    : 0;

  // Drawing stats
  const productionItemIds = new Set(productionItems.map((i) => i.id));
  const drawingsForProduction = drawings.filter((d) => productionItemIds.has(d.item_id));
  const approvedDrawings = drawingsForProduction.filter((d) => d.status === "approved" || d.status === "approved_with_comments" || d.status === "not_required").length;
  const rejectedDrawings = drawingsForProduction.filter((d) => d.status === "rejected").length;
  const totalDrawingsNeeded = productionItems.length;

  // Installation stats
  const installingItems = scopeItems.filter((i) => i.is_installation_started && !i.is_installed).length;
  const installedItems = scopeItems.filter((i) => i.is_installed).length;
  const totalItems = scopeItems.length;

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

  // Check for MISSING items (not just broken ones)
  // Production items that have NO drawing uploaded at all
  const itemsWithDrawings = new Set(drawings.map((d) => d.item_id));
  const productionItemsWithoutDrawings = productionItems.filter((i) => !itemsWithDrawings.has(i.id));

  // Attention items with details for tooltips
  const attentionItems: { label: string; count: number; color: string; tab: string; details: string[] }[] = [];

  // === CRITICAL (Red) - Things that are broken or overdue ===
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

  // === WARNING (Amber) - Things that need action ===
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

  // === MISSING (Sky/Blue) - Things not started yet ===
  if (productionItemsWithoutDrawings.length > 0) {
    attentionItems.push({
      label: "item without drawing",
      count: productionItemsWithoutDrawings.length,
      color: "text-sky-600",
      tab: "drawings",
      details: productionItemsWithoutDrawings.map((i) => `${i.item_code} - ${i.name}`),
    });
  }
  if (scopeItems.length > 0 && materials.length === 0) {
    attentionItems.push({
      label: "no materials added",
      count: 1,
      color: "text-sky-600",
      tab: "materials",
      details: ["Add materials to track approvals"],
    });
  }
  if (milestones.length === 0) {
    attentionItems.push({
      label: "no milestones set",
      count: 1,
      color: "text-sky-600",
      tab: "milestones",
      details: ["Set milestones to track project timeline"],
    });
  }

  const currencySymbols: Record<string, string> = { TRY: "₺", USD: "$", EUR: "€" };
  const formatCurrency = (value: number | null, currency: string) => {
    if (value === null || value === undefined) return "-";
    const symbol = currencySymbols[currency] || currency;
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
    return `${symbol}${formatted}`;
  };

  // Progress ring SVG calculation
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallProgress / 100) * circumference;

  return (
    <div className="space-y-4 lg:space-y-5">
      {/* Main Dashboard Card - Progress + Info + Stats */}
      <GlassCard className="p-4 lg:p-5">
        <div className="grid gap-4 lg:gap-5 lg:grid-cols-3 lg:divide-x">
          {/* Left: Progress Ring + Status Bars */}
          <div className="flex flex-col items-center pb-4 lg:pb-0 lg:pr-5 border-b lg:border-b-0">
            {/* SVG Progress Ring */}
            <div className="relative size-32">
              <svg className="size-full -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-muted/20"
                />
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
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold">{overallProgress}%</span>
                <span className="text-[10px] text-muted-foreground">Complete</span>
              </div>
            </div>

            {/* Project Status Bars */}
            <div className="w-full mt-3 space-y-1.5">
              {/* Drawings */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <PenToolIcon className="size-3" />
                    Drawings
                  </span>
                  <span className="font-medium">{approvedDrawings}/{totalDrawingsNeeded}</span>
                </div>
                <Progress
                  value={totalDrawingsNeeded > 0 ? (approvedDrawings / totalDrawingsNeeded) * 100 : 0}
                  className="h-1.5 [&>div]:bg-teal-500"
                />
              </div>

              {/* Materials */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <PackageIcon className="size-3" />
                    Materials
                  </span>
                  <span className="font-medium">{approvedMaterials}/{totalMaterials}</span>
                </div>
                <Progress
                  value={totalMaterials > 0 ? (approvedMaterials / totalMaterials) * 100 : 0}
                  className="h-1.5 [&>div]:bg-amber-500"
                />
              </div>

              {/* Production */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <FactoryIcon className="size-3" />
                    Production
                  </span>
                  <span className="font-medium">{productionProgress}%</span>
                </div>
                <Progress value={productionProgress} className="h-1.5 [&>div]:bg-primary" />
              </div>

              {/* Installation */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <WrenchIcon className="size-3" />
                    Installation
                  </span>
                  <span className="font-medium">
                    {installingItems > 0 && (
                      <span className="text-primary">{installingItems} in progress · </span>
                    )}
                    {installedItems}/{totalItems}
                  </span>
                </div>
                <Progress
                  value={totalItems > 0 ? (installedItems / totalItems) * 100 : 0}
                  className="h-1.5 [&>div]:bg-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Right: Info Bar (top) + Quick Stats (bottom) */}
          <div className="lg:col-span-2 flex flex-col lg:pl-5 pt-4 lg:pt-0">
            {/* Info Bar - Aligned to Top */}
            <div className="flex flex-wrap gap-x-5 gap-y-2.5 pb-3 mb-3 border-b">
              {/* Client */}
              <div className="min-w-[100px]">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <BuildingIcon className="size-3" />
                  Client
                </div>
                <p className="font-medium text-sm truncate">
                  {project.client?.company_name || <span className="text-muted-foreground italic">Not set</span>}
                </p>
              </div>

              {/* Installation Date */}
              <div className="min-w-[100px] pl-6 border-l">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <CalendarIcon className="size-3" />
                  Installation
                </div>
                <p className="font-medium text-sm">
                  {project.installation_date
                    ? format(new Date(project.installation_date), "MMM d, yyyy")
                    : <span className="text-muted-foreground italic">Not set</span>}
                </p>
                {project.installation_date && (
                  <p className="text-xs text-muted-foreground">
                    {differenceInDays(new Date(project.installation_date), new Date()) > 0
                      ? `${differenceInDays(new Date(project.installation_date), new Date())} days`
                      : isPast(new Date(project.installation_date))
                      ? "Passed"
                      : "Today"}
                  </p>
                )}
              </div>

              {/* Contract Value - Hidden from clients */}
              {!isClient && (
                <div className="min-w-[100px] pl-6 border-l">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <BanknoteIcon className="size-3" />
                    Contract
                  </div>
                  <p className="font-medium text-sm">
                    {formatCurrency(project.contract_value_manual, project.currency)}
                  </p>
                </div>
              )}

              {/* Team + Edit */}
              <div className="min-w-[80px] pl-6 border-l">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <UsersIcon className="size-3" />
                  Team
                </div>
                <div className="flex items-center gap-3">
                  {assignments.length > 0 ? (
                    <TooltipProvider delayDuration={100}>
                      <div className="flex -space-x-1.5">
                        {assignments.slice(0, 4).map((a) => (
                          <Tooltip key={a.id}>
                            <TooltipTrigger asChild>
                              <div className="size-6 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 ring-1 ring-white flex items-center justify-center text-white text-[10px] font-medium cursor-default hover:z-10 hover:scale-110 transition-transform">
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
                              <div className="size-6 rounded-full bg-muted ring-1 ring-white flex items-center justify-center text-[10px] font-medium cursor-default">
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
                  ) : (
                    <p className="text-sm text-muted-foreground italic">None</p>
                  )}
                  {canEdit && (
                    <Button asChild size="sm" className="h-8 px-2.5 text-xs">
                      <Link href={`/projects/${projectUrlId}/edit`}>
                        <PencilIcon className="size-3.5" />
                        Edit Project
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Milestones + Snagging Stats */}
            <div className="flex flex-wrap gap-3">
              {/* Milestones */}
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        const tab = document.querySelector('[data-state][value="milestones"]') as HTMLElement;
                        tab?.click();
                      }}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-background/50 hover:bg-accent/50 transition-colors"
                    >
                      <FlagIcon className="size-4 text-primary" />
                      <span className="text-sm">
                        <span className="font-semibold">{completedMilestones}/{totalMilestones}</span>
                        <span className="text-muted-foreground ml-1">milestones</span>
                      </span>
                      {overdueMilestones > 0 && (
                        <span className="text-xs text-rose-600 font-medium">({overdueMilestones} overdue)</span>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Click to view Milestones tab</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Snagging */}
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        const tab = document.querySelector('[data-state][value="snagging"]') as HTMLElement;
                        tab?.click();
                      }}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-background/50 hover:bg-accent/50 transition-colors"
                    >
                      <BugIcon className="size-4 text-rose-600" />
                      <span className="text-sm">
                        <span className="font-semibold">{snaggingItems.length - openIssues}/{snaggingItems.length}</span>
                        <span className="text-muted-foreground ml-1">issues</span>
                      </span>
                      {openIssues > 0 && (
                        <span className="text-xs text-amber-600 font-medium">({openIssues} open)</span>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Click to view Snagging tab</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Attention Required Section - Compact with Tooltips */}
      {attentionItems.length > 0 && (
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-amber-200 bg-amber-50">
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
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-white/85 hover:bg-white transition-colors ${item.color}`}
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
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50">
          <CheckCircleIcon className="size-4 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-700">All Clear!</span>
          <span className="text-sm text-emerald-600">No items requiring attention</span>
        </div>
      )}

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
                  : "bg-primary-100"
              }`}>
                <FlagIcon className={`size-6 ${
                  daysUntilNext !== null && daysUntilNext < 0
                    ? "text-rose-600"
                    : daysUntilNext !== null && daysUntilNext <= 7
                    ? "text-amber-600"
                    : "text-primary"
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
                    : "text-primary"
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

        {/* Recent Activity - hidden from clients */}
        {!isClient && (
          <GlassCard className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <GradientIcon icon={<ActivityIcon className="size-4" />} size="sm" color="sky" />
                <span className="text-sm font-medium">Recent Activity</span>
              </div>
              <button
                onClick={() => {
                  // Find the activity tab trigger button and click it
                  const tab = document.querySelector('button[role="tab"][value="activity"]') as HTMLElement;
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
                        <span className="font-medium text-foreground">{activity.user?.name || "System"}</span>{" "}
                        {getActivityDescription(activity.action)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No recent activity</p>
            )}
          </GlassCard>
        )}
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
