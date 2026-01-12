import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FolderKanbanIcon,
  FactoryIcon,
  PackageIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  TrendingUpIcon,
} from "lucide-react";
import { ProjectStatusChart } from "./project-status-chart";
import { ProductionProgressChart } from "./production-progress-chart";
import { MaterialsStatusChart } from "./materials-status-chart";

export default async function ReportsPage() {
  const supabase = await createClient();

  // Fetch projects summary
  const { data: projects } = await supabase
    .from("projects")
    .select("id, status, name")
    .eq("is_deleted", false);

  const projectStats = {
    total: projects?.length || 0,
    tender: projects?.filter(p => p.status === "tender").length || 0,
    active: projects?.filter(p => p.status === "active").length || 0,
    on_hold: projects?.filter(p => p.status === "on_hold").length || 0,
    completed: projects?.filter(p => p.status === "completed").length || 0,
    cancelled: projects?.filter(p => p.status === "cancelled").length || 0,
  };

  // Fetch scope items for production progress
  const { data: scopeItems } = await supabase
    .from("scope_items")
    .select("id, item_path, production_percentage, status, project_id")
    .eq("is_deleted", false);

  const productionItems = scopeItems?.filter(item => item.item_path === "production") || [];
  const avgProductionProgress = productionItems.length > 0
    ? Math.round(productionItems.reduce((sum, item) => sum + (item.production_percentage || 0), 0) / productionItems.length)
    : 0;

  const productionStats = {
    total: productionItems.length,
    notStarted: productionItems.filter(i => i.production_percentage === 0).length,
    inProgress: productionItems.filter(i => i.production_percentage > 0 && i.production_percentage < 100).length,
    completed: productionItems.filter(i => i.production_percentage === 100).length,
    avgProgress: avgProductionProgress,
  };

  // Fetch materials summary
  const { data: materials } = await supabase
    .from("materials")
    .select("id, status")
    .eq("is_deleted", false);

  const materialStats = {
    total: materials?.length || 0,
    pending: materials?.filter(m => m.status === "pending").length || 0,
    approved: materials?.filter(m => m.status === "approved").length || 0,
    rejected: materials?.filter(m => m.status === "rejected").length || 0,
  };

  // Fetch snagging summary
  const { data: snagging } = await supabase
    .from("snagging")
    .select("id, is_resolved");

  const snaggingStats = {
    total: snagging?.length || 0,
    open: snagging?.filter(s => !s.is_resolved).length || 0,
    resolved: snagging?.filter(s => s.is_resolved).length || 0,
  };

  // Fetch milestones summary
  const { data: milestones } = await supabase
    .from("milestones")
    .select("id, is_completed, due_date");

  const now = new Date();
  const milestoneStats = {
    total: milestones?.length || 0,
    completed: milestones?.filter(m => m.is_completed).length || 0,
    upcoming: milestones?.filter(m => !m.is_completed && new Date(m.due_date) >= now).length || 0,
    overdue: milestones?.filter(m => !m.is_completed && new Date(m.due_date) < now).length || 0,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Reports & Analytics</h1>
        <p className="text-muted-foreground">Overview of all projects and operations</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <FolderKanbanIcon className="size-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{projectStats.total}</p>
            <p className="text-xs text-muted-foreground">
              {projectStats.active} active, {projectStats.tender} in tender
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <FactoryIcon className="size-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Production Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{productionStats.avgProgress}%</p>
            <p className="text-xs text-muted-foreground">
              {productionStats.completed}/{productionStats.total} items complete
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <PackageIcon className="size-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Materials</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{materialStats.total}</p>
            <p className="text-xs text-muted-foreground">
              {materialStats.approved} approved, {materialStats.pending} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <AlertTriangleIcon className="size-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Open Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">{snaggingStats.open}</p>
            <p className="text-xs text-muted-foreground">
              {snaggingStats.resolved} resolved of {snaggingStats.total} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Project Status Chart */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Project Status</CardTitle>
            <CardDescription>Breakdown by status</CardDescription>
          </CardHeader>
          <CardContent>
            <ProjectStatusChart data={projectStats} />
          </CardContent>
        </Card>

        {/* Production Progress */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Production Items</CardTitle>
            <CardDescription>Progress breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ProductionProgressChart data={productionStats} />
          </CardContent>
        </Card>

        {/* Materials Status */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Materials Approval</CardTitle>
            <CardDescription>Status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <MaterialsStatusChart data={materialStats} />
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Milestones Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Milestones Overview</CardTitle>
            <CardDescription>Timeline tracking across all projects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="size-4 text-green-500" />
                  <span className="text-sm">Completed</span>
                </div>
                <span className="font-semibold">{milestoneStats.completed}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClockIcon className="size-4 text-blue-500" />
                  <span className="text-sm">Upcoming</span>
                </div>
                <span className="font-semibold">{milestoneStats.upcoming}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangleIcon className="size-4 text-red-500" />
                  <span className="text-sm">Overdue</span>
                </div>
                <span className="font-semibold text-red-600">{milestoneStats.overdue}</span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Milestones</span>
                  <span className="font-bold">{milestoneStats.total}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Key Metrics</CardTitle>
            <CardDescription>Important numbers at a glance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Total Scope Items</span>
                <span className="font-semibold">{scopeItems?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Production Items</span>
                <span className="font-semibold">{productionItems.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Procurement Items</span>
                <span className="font-semibold">{(scopeItems?.length || 0) - productionItems.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Approval Rate</span>
                <span className="font-semibold text-green-600">
                  {materialStats.total > 0
                    ? Math.round((materialStats.approved / materialStats.total) * 100)
                    : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Issue Resolution Rate</span>
                <span className="font-semibold text-green-600">
                  {snaggingStats.total > 0
                    ? Math.round((snaggingStats.resolved / snaggingStats.total) * 100)
                    : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
