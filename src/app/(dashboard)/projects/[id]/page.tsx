import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CalendarIcon,
  BuildingIcon,
  BanknoteIcon,
  ClipboardListIcon,
  PlusIcon,
  ActivityIcon,
  FileTextIcon,
} from "lucide-react";
import { format } from "date-fns";
import { ScopeItemsTable } from "./scope-items-table";
import { DrawingsOverview } from "./drawings-overview";
import { MaterialsOverview } from "./materials-overview";
import { SnaggingOverview } from "./snagging-overview";
import { MilestonesOverview } from "./milestones-overview";
import { TeamOverview } from "./team-overview";
import { ReportsOverview } from "./reports-overview";
import { ProjectDetailHeader } from "./project-detail-header";
import { getProjectAssignments } from "./actions";
import { getProjectReports } from "./reports/actions";
import { DownloadTemplateButton, ExcelImport, ExcelExport } from "@/components/scope-items";
import { ActivityFeed } from "@/components/activity-log/activity-feed";
import { GlassCard, GradientIcon } from "@/components/ui/ui-helpers";

interface ProjectClient {
  id: string;
  company_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
}

interface Project {
  id: string;
  project_code: string;
  name: string;
  description: string | null;
  status: string;
  installation_date: string | null;
  contract_value_manual: number | null;
  currency: string;
  client: ProjectClient | null;
}

interface ScopeItem {
  id: string;
  item_code: string;
  name: string;
  description: string | null;
  width: number | null;
  depth: number | null;
  height: number | null;
  item_path: "production" | "procurement";
  status: string;
  quantity: number;
  unit: string;
  unit_price: number | null;
  total_price: number | null;
  production_percentage: number;
  is_installed: boolean;
  notes: string | null;
  images: string[] | null;
}

interface Drawing {
  id: string;
  item_id: string;
  status: string;
  current_revision: string | null;
  sent_to_client_at: string | null;
}

interface Material {
  id: string;
  material_code: string;
  name: string;
  specification: string | null;
  supplier: string | null;
  images: string[] | null;
  status: string;
}

interface ItemMaterial {
  material_id: string;
  item_id: string;
}

interface Snagging {
  id: string;
  project_id: string;
  item_id: string | null;
  description: string;
  photos: string[] | null;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_by: string | null;
  created_at: string;
  item: {
    item_code: string;
    name: string;
  } | null;
  creator: {
    name: string;
  } | null;
  resolver: {
    name: string;
  } | null;
}

interface Milestone {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  due_date: string;
  is_completed: boolean;
  completed_at: string | null;
  alert_days_before: number | null;
}

// Status colors/labels are now handled by ProjectDetailHeader component

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Get current user and role
  const { data: { user } } = await supabase.auth.getUser();
  let userRole = "pm";
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile) {
      userRole = profile.role;
    }
  }

  // For client users, verify they have access to this project
  if (userRole === "client" && user) {
    const { data: assignment } = await supabase
      .from("project_assignments")
      .select("id")
      .eq("project_id", id)
      .eq("user_id", user.id)
      .single();

    if (!assignment) {
      notFound(); // Client doesn't have access to this project
    }
  }

  // Role-based permissions
  const canEdit = ["admin", "pm"].includes(userRole);
  const canAddItems = ["admin", "pm"].includes(userRole);
  const canImportExcel = ["admin", "pm"].includes(userRole);
  const isClient = userRole === "client";

  // Fetch project
  const { data, error } = await supabase
    .from("projects")
    .select(`
      id, project_code, name, description, status, installation_date, contract_value_manual, currency,
      client:clients(id, company_name, contact_person, email, phone)
    `)
    .eq("id", id)
    .single();

  const project = data as Project | null;

  if (error || !project) {
    notFound();
  }

  // Fetch scope items
  const { data: scopeItemsData } = await supabase
    .from("scope_items")
    .select("id, item_code, name, description, width, depth, height, item_path, status, quantity, unit, unit_price, total_price, production_percentage, is_installed, notes, images")
    .eq("project_id", id)
    .eq("is_deleted", false)
    .order("item_code");

  const scopeItems = (scopeItemsData || []) as ScopeItem[];

  // Get production item IDs for drawings query
  const productionItemIds = scopeItems
    .filter((item) => item.item_path === "production")
    .map((item) => item.id);

  // Fetch drawings for production items
  let drawings: Drawing[] = [];
  if (productionItemIds.length > 0) {
    const { data: drawingsData } = await supabase
      .from("drawings")
      .select("id, item_id, status, current_revision, sent_to_client_at")
      .in("item_id", productionItemIds);
    drawings = (drawingsData || []) as Drawing[];
  }

  // Fetch materials for this project
  const { data: materialsData } = await supabase
    .from("materials")
    .select("id, material_code, name, specification, supplier, images, status")
    .eq("project_id", id)
    .eq("is_deleted", false)
    .order("material_code");

  const materials = (materialsData || []) as Material[];

  // Fetch item-material assignments
  const materialIds = materials.map((m) => m.id);
  let itemMaterials: ItemMaterial[] = [];
  if (materialIds.length > 0) {
    const { data: itemMaterialsData } = await supabase
      .from("item_materials")
      .select("material_id, item_id")
      .in("material_id", materialIds);
    itemMaterials = (itemMaterialsData || []) as ItemMaterial[];
  }

  // Combine materials with their assigned item counts
  const materialsWithAssignments = materials.map((material) => {
    const assignments = itemMaterials.filter((im) => im.material_id === material.id);
    return {
      ...material,
      assignedItemsCount: assignments.length,
      assignedItemIds: assignments.map((a) => a.item_id),
    };
  });

  // Fetch snagging items
  const { data: snaggingData } = await supabase
    .from("snagging")
    .select(`
      id, project_id, item_id, description, photos, is_resolved,
      resolved_at, resolved_by, resolution_notes, created_by, created_at,
      item:scope_items!snagging_item_id_fkey(item_code, name),
      creator:users!snagging_created_by_fkey(name),
      resolver:users!snagging_resolved_by_fkey(name)
    `)
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  const snaggingItems = (snaggingData || []) as unknown as Snagging[];
  const openSnaggingCount = snaggingItems.filter((s) => !s.is_resolved).length;

  // Fetch milestones
  const { data: milestonesData } = await supabase
    .from("milestones")
    .select("id, project_id, name, description, due_date, is_completed, completed_at, alert_days_before")
    .eq("project_id", id)
    .order("due_date");

  const milestones = (milestonesData || []) as Milestone[];

  // Fetch reports
  const reports = await getProjectReports(id);

  // Fetch project assignments (team members)
  const assignments = await getProjectAssignments(id);
  const canManageTeam = ["admin", "pm"].includes(userRole);

  const formatCurrency = (value: number | null, currency: string) => {
    if (!value) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(value);
  };

  // Calculate totals
  const totalValue = scopeItems.reduce((sum, item) => sum + (item.total_price || 0), 0);
  const productionItems = scopeItems.filter((item) => item.item_path === "production");
  const procurementItems = scopeItems.filter((item) => item.item_path === "procurement");

  return (
    <div className="p-6">
      {/* Header */}
      <ProjectDetailHeader
        projectId={id}
        projectName={project.name}
        projectCode={project.project_code}
        status={project.status}
        canEdit={canEdit}
      />

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-white/80 backdrop-blur border shadow-sm p-1 h-auto flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="scope">
            Scope Items
            {scopeItems.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {scopeItems.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="drawings">Drawings</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="snagging">
            Snagging
            {openSnaggingCount > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {openSnaggingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="milestones">
            Milestones
            {milestones.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {milestones.filter(m => !m.is_completed).length}/{milestones.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reports">
            <FileTextIcon className="size-4 mr-1.5" />
            Reports
            {reports.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {reports.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="team">
            Team
            {assignments.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {assignments.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="activity">
            <ActivityIcon className="size-4 mr-1.5" />
            Activity
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Client Info */}
            <GlassCard>
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <GradientIcon icon={<BuildingIcon className="size-4" />} size="sm" color="teal" />
                <CardTitle className="text-sm font-medium">Client</CardTitle>
              </CardHeader>
              <CardContent>
                {project.client ? (
                  <div className="space-y-1">
                    <p className="font-semibold text-lg">{project.client.company_name}</p>
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
                <p className="font-semibold text-lg">
                  {project.installation_date
                    ? format(new Date(project.installation_date), "MMM d, yyyy")
                    : "Not set"}
                </p>
              </CardContent>
            </GlassCard>

            {/* Contract Value */}
            <GlassCard>
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <GradientIcon icon={<BanknoteIcon className="size-4" />} size="sm" color="emerald" />
                <CardTitle className="text-sm font-medium">Contract Value</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold text-lg">
                  {formatCurrency(project.contract_value_manual, project.currency)}
                </p>
              </CardContent>
            </GlassCard>

            {/* Scope Summary */}
            <GlassCard>
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <GradientIcon icon={<ClipboardListIcon className="size-4" />} size="sm" color="violet" />
                <CardTitle className="text-sm font-medium">Scope Items</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold text-lg">{scopeItems.length} items</p>
                <p className="text-sm text-muted-foreground">
                  {productionItems.length} production, {procurementItems.length} procurement
                </p>
              </CardContent>
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
        </TabsContent>

        {/* Scope Items Tab */}
        <TabsContent value="scope" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Scope Items</h3>
              <p className="text-sm text-muted-foreground">
                {scopeItems.length} items totaling {formatCurrency(totalValue, project.currency)}
              </p>
            </div>
            <div className="flex gap-2">
              {canImportExcel && (
                <>
                  <DownloadTemplateButton projectCode={project.project_code} />
                  <ExcelImport projectId={id} projectCode={project.project_code} />
                </>
              )}
              <ExcelExport
                items={scopeItems}
                projectCode={project.project_code}
                projectName={project.name}
              />
              {canAddItems && (
                <Button asChild className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700">
                  <Link href={`/projects/${id}/scope/new`}>
                    <PlusIcon className="size-4" />
                    Add Item
                  </Link>
                </Button>
              )}
            </div>
          </div>
          <ScopeItemsTable
            projectId={id}
            items={scopeItems}
            materials={materials.map((m) => ({
              id: m.id,
              material_code: m.material_code,
              name: m.name,
            }))}
            currency={project.currency}
          />
        </TabsContent>

        {/* Drawings Tab */}
        <TabsContent value="drawings">
          <DrawingsOverview
            projectId={id}
            productionItems={productionItems.map((item) => ({
              id: item.id,
              item_code: item.item_code,
              name: item.name,
            }))}
            drawings={drawings}
          />
        </TabsContent>

        {/* Materials Tab */}
        <TabsContent value="materials">
          <MaterialsOverview
            projectId={id}
            projectCode={project.project_code}
            projectName={project.name}
            materials={materialsWithAssignments}
            scopeItems={scopeItems.map((item) => ({
              id: item.id,
              item_code: item.item_code,
              name: item.name,
            }))}
            userRole={userRole}
          />
        </TabsContent>

        {/* Snagging Tab */}
        <TabsContent value="snagging">
          <SnaggingOverview
            projectId={id}
            snaggingItems={snaggingItems}
            scopeItems={scopeItems.map((item) => ({
              id: item.id,
              item_code: item.item_code,
              name: item.name,
            }))}
          />
        </TabsContent>

        {/* Milestones Tab */}
        <TabsContent value="milestones">
          <MilestonesOverview
            projectId={id}
            milestones={milestones}
          />
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <ReportsOverview
            projectId={id}
            projectName={project.name}
            projectCode={project.project_code}
            reports={reports}
            userRole={userRole}
          />
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team">
          <TeamOverview
            projectId={id}
            assignments={assignments as any}
            canManageTeam={canManageTeam}
          />
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <ActivityFeed projectId={id} limit={50} maxHeight="600px" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
