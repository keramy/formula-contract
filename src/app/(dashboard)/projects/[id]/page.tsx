import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { createClient, getUserRoleFromJWT } from "@/lib/supabase/server";
import { TabsContent } from "@/components/ui/tabs";
import { ProjectTabs } from "./project-tabs";
import { ScopeItemsTable } from "./scope-items-table";
import { DrawingsOverview } from "./drawings-overview";
import { MaterialsOverview } from "./materials-overview";
import { SnaggingOverview } from "./snagging-overview";
import { MilestonesOverview } from "./milestones-overview";
import { TeamOverview } from "./team-overview";
import { ReportsOverview } from "./reports-overview";
import { FinancialsOverview } from "./financials-overview";
import { TimelineOverview } from "./timeline-overview";
import { ProjectDetailHeader } from "./project-detail-header";
import { ProjectOverview } from "./project-overview";
import { getProjectAssignments } from "@/lib/actions/project-assignments";
import { getProjectReports } from "@/lib/actions/reports";
import { DownloadTemplateButton, ExcelImport, ExcelExport, ScopeItemAddButton } from "@/components/scope-items";
import { ActivityFeed } from "@/components/activity-log/activity-feed";
import { isUUID } from "@/lib/slug";

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
  slug: string | null;
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
  // Initial cost (budgeted, set once at creation)
  initial_unit_cost: number | null;
  initial_total_cost: number | null;
  // Actual cost (entered manually later)
  actual_unit_cost: number | null;
  actual_total_cost: number | null;
  // Sales price fields (what CLIENT pays)
  unit_sales_price: number | null;
  total_sales_price: number | null;
  production_percentage: number;
  is_shipped: boolean;
  is_installation_started: boolean;
  is_installed: boolean;
  notes: string | null;
  images: string[] | null;
  parent_id: string | null; // References parent item when created via split
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
  // Opt out of static caching to ensure fresh data after mutations (split, delete, etc.)
  noStore();

  const pageStart = performance.now();
  const { id } = await params;
  const supabase = await createClient();

  console.log("\n📊 [PROFILE] Project Detail Data Fetch Starting...");

  // OPTIMIZED: Get user and role in single auth call
  const authStart = performance.now();
  const { data: { user } } = await supabase.auth.getUser();
  console.log(`  🔐 auth.getUser: ${(performance.now() - authStart).toFixed(0)}ms`);

  if (!user) {
    notFound();
  }

  // PERFORMANCE: Get user role from JWT metadata (avoids ~3s DB query!)
  const userRole = await getUserRoleFromJWT(user, supabase);

  // Determine if the parameter is a UUID or slug
  const isIdUUID = isUUID(id);

  // Lookup project ID by slug if needed (for access checks)
  let projectId = id;
  if (!isIdUUID) {
    const { data: projectBySlug } = await supabase
      .from("projects")
      .select("id")
      .eq("slug", id)
      .single();

    if (!projectBySlug) {
      notFound();
    }
    projectId = projectBySlug.id;
  }

  // For client users, verify they have access to this project
  if (userRole === "client") {
    const { data: assignment } = await supabase
      .from("project_assignments")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .single();

    if (!assignment) {
      notFound();
    }
  }

  // Role-based permissions
  const canEdit = ["admin", "pm"].includes(userRole);
  const canAddItems = ["admin", "pm"].includes(userRole);
  const canImportExcel = ["admin", "pm"].includes(userRole);
  const isClient = userRole === "client";

  // OPTIMIZED: Run all main queries in PARALLEL with profiling
  const parallelStart = performance.now();
  const [
    projectResult,
    scopeItemsResult,
    materialsResult,
    snaggingResult,
    milestonesResult,
    reportsResult,
    assignmentsResult,
    activitiesResult,
  ] = await Promise.all([
    // 1. Project with Client (includes slug for URL generation)
    (async () => {
      const start = performance.now();
      const result = await supabase
        .from("projects")
        .select(`
          id, project_code, name, slug, description, status, installation_date, contract_value_manual, currency,
          client:clients(id, company_name, contact_person, email, phone)
        `)
        .eq("id", projectId)
        .single();
      console.log(`  📁 Project with Client: ${(performance.now() - start).toFixed(0)}ms`);
      return result;
    })(),
    // 2. Scope Items - ordered by created_at to preserve Excel import order
    // Include parent_id for hierarchical display (split items)
    // NOTE: Cost columns are hidden from clients in ScopeItemsTable component via isClient prop
    (async () => {
      const start = performance.now();
      const result = await supabase
        .from("scope_items")
        .select("id, item_code, name, description, width, depth, height, item_path, status, quantity, unit, initial_unit_cost, initial_total_cost, actual_unit_cost, actual_total_cost, unit_sales_price, total_sales_price, production_percentage, is_shipped, is_installation_started, is_installed, notes, images, created_at, parent_id")
        .eq("project_id", projectId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: true });
      console.log(`  📋 Scope Items: ${(performance.now() - start).toFixed(0)}ms`);
      return result;
    })(),
    // 3. Materials with Item Materials
    (async () => {
      const start = performance.now();
      const result = await supabase
        .from("materials")
        .select(`
          id, material_code, name, specification, supplier, images, status,
          item_materials(item_id, material_id)
        `)
        .eq("project_id", projectId)
        .eq("is_deleted", false)
        .order("material_code");
      console.log(`  📦 Materials: ${(performance.now() - start).toFixed(0)}ms`);
      return result;
    })(),
    // 4. Snagging with Joins
    (async () => {
      const start = performance.now();
      const result = await supabase
        .from("snagging")
        .select(`
          id, project_id, item_id, description, photos, is_resolved,
          resolved_at, resolved_by, resolution_notes, created_by, created_at,
          item:scope_items!snagging_item_id_fkey(item_code, name),
          creator:users!snagging_created_by_fkey(name),
          resolver:users!snagging_resolved_by_fkey(name)
        `)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      console.log(`  🔧 Snagging: ${(performance.now() - start).toFixed(0)}ms`);
      return result;
    })(),
    // 5. Milestones
    (async () => {
      const start = performance.now();
      const result = await supabase
        .from("milestones")
        .select("id, project_id, name, description, due_date, is_completed, completed_at, alert_days_before")
        .eq("project_id", projectId)
        .order("due_date");
      console.log(`  🎯 Milestones: ${(performance.now() - start).toFixed(0)}ms`);
      return result;
    })(),
    // 6. Reports
    (async () => {
      const start = performance.now();
      const result = await getProjectReports(projectId);
      console.log(`  📄 Reports: ${(performance.now() - start).toFixed(0)}ms`);
      return result;
    })(),
    // 7. Assignments
    (async () => {
      const start = performance.now();
      const result = await getProjectAssignments(projectId);
      console.log(`  👥 Assignments: ${(performance.now() - start).toFixed(0)}ms`);
      return result;
    })(),
    // 8. Recent Activities (for Overview dashboard)
    (async () => {
      const start = performance.now();
      const { data } = await supabase
        .from("activity_log")
        .select("id, action, entity_type, created_at, user_id")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(5);

      // Get unique user IDs and fetch their names
      const userIds = [...new Set((data || []).map((a) => a.user_id).filter((id): id is string => id !== null))];
      let userMap: Record<string, string> = {};

      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("id, name")
          .in("id", userIds);
        userMap = (users || []).reduce((acc, u) => ({ ...acc, [u.id]: u.name }), {} as Record<string, string>);
      }

      // Map activities with user names
      const activitiesWithUsers = (data || []).map((a) => ({
        id: a.id,
        action: a.action,
        entity_type: a.entity_type,
        created_at: a.created_at,
        user: a.user_id ? { name: userMap[a.user_id] || "Unknown" } : null,
      }));

      console.log(`  📝 Recent Activities: ${(performance.now() - start).toFixed(0)}ms`);
      return { data: activitiesWithUsers };
    })(),
  ]);
  console.log(`  ⏱️ Parallel queries total: ${(performance.now() - parallelStart).toFixed(0)}ms`);
  console.log(`📊 [PROFILE] Project Detail Total: ${(performance.now() - pageStart).toFixed(0)}ms\n`);

  // Extract project data
  const project = projectResult.data as Project | null;
  if (projectResult.error || !project) {
    notFound();
  }

  // Use slug for URLs (with fallback to id for backwards compatibility)
  const projectUrlId = project.slug || project.id;

  // Extract scope items
  const scopeItems = (scopeItemsResult.data || []) as ScopeItem[];

  // Get production item IDs and fetch drawings if needed
  const productionItemIds = scopeItems
    .filter((item) => item.item_path === "production")
    .map((item) => item.id);

  let drawings: Drawing[] = [];
  if (productionItemIds.length > 0) {
    const { data: drawingsData } = await supabase
      .from("drawings")
      .select("id, item_id, status, current_revision, sent_to_client_at")
      .in("item_id", productionItemIds);
    drawings = (drawingsData || []) as Drawing[];
  }

  // Process materials with their item assignments (now in single query)
  const materialsWithAssignments = ((materialsResult.data || []) as any[]).map((material) => {
    const itemMaterialsData = material.item_materials || [];
    return {
      id: material.id,
      material_code: material.material_code,
      name: material.name,
      specification: material.specification,
      supplier: material.supplier,
      images: material.images,
      status: material.status,
      assignedItemsCount: itemMaterialsData.length,
      assignedItemIds: itemMaterialsData.map((im: ItemMaterial) => im.item_id),
    };
  });

  // For the ScopeItemsTable we need plain materials without assignments
  const materials = ((materialsResult.data || []) as any[]).map((m) => ({
    id: m.id,
    material_code: m.material_code,
    name: m.name,
    specification: m.specification,
    supplier: m.supplier,
    images: m.images,
    status: m.status,
  })) as Material[];

  // Extract snagging data
  const snaggingItems = (snaggingResult.data || []) as unknown as Snagging[];
  const openSnaggingCount = snaggingItems.filter((s) => !s.is_resolved).length;

  // Extract milestones
  const milestones = (milestonesResult.data || []) as Milestone[];


  // Reports, assignments, and activities are already extracted from Promise.all
  const reports = reportsResult;
  const assignments = assignmentsResult;
  const recentActivities = activitiesResult.data || [];
  const canManageTeam = ["admin", "pm"].includes(userRole);

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

  // Calculate totals
  const totalValue = scopeItems.reduce((sum, item) => sum + (item.total_sales_price || 0), 0);
  const productionItems = scopeItems.filter((item) => item.item_path === "production");
  const procurementItems = scopeItems.filter((item) => item.item_path === "procurement");

  // Count drawings with "uploaded" status (ready to send to client)
  const drawingsReadyCount = drawings.filter((d) => d.status === "uploaded").length;

  return (
    <div className="px-4 md:px-6 pt-2 pb-6">
      {/* Header - renders into the App Header bar via context */}
      <ProjectDetailHeader
        projectId={projectUrlId}
        projectName={project.name}
        projectCode={project.project_code}
        status={project.status}
      />

      {/* Tabs - responsive with "More" dropdown on mobile */}
      <ProjectTabs
        scopeItemsCount={scopeItems.length}
        openSnaggingCount={openSnaggingCount}
        milestonesCount={milestones.length}
        incompleteMilestonesCount={milestones.filter(m => !m.is_completed).length}
        reportsCount={reports.length}
        assignmentsCount={assignments.length}
        drawingsReadyCount={drawingsReadyCount}
        isClient={isClient}
      >

        {/* Overview Tab */}
        <TabsContent value="overview">
          <ProjectOverview
            projectId={projectId}
            projectUrlId={projectUrlId}
            project={{
              name: project.name,
              project_code: project.project_code,
              description: project.description,
              status: project.status,
              installation_date: project.installation_date,
              contract_value_manual: project.contract_value_manual,
              currency: project.currency,
              client: project.client,
            }}
            scopeItems={scopeItems.map((item) => ({
              id: item.id,
              item_code: item.item_code,
              name: item.name,
              item_path: item.item_path,
              production_percentage: item.production_percentage,
              is_installation_started: item.is_installation_started,
              is_installed: item.is_installed,
              total_sales_price: item.total_sales_price,
            }))}
            drawings={drawings.map((d) => {
              const item = scopeItems.find((i) => i.id === d.item_id);
              return {
                ...d,
                item_code: item?.item_code,
              };
            })}
            materials={materials.map((m) => ({
              id: m.id,
              name: m.name,
              status: m.status,
            }))}
            milestones={milestones}
            snaggingItems={snaggingItems.map((s) => ({
              id: s.id,
              is_resolved: s.is_resolved,
              description: s.description,
            }))}
            assignments={assignments}
            recentActivities={recentActivities}
            canEdit={canEdit}
            isClient={isClient}
          />
        </TabsContent>

        {/* Scope Items Tab */}
        <TabsContent value="scope" className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-medium">Scope Items</h3>
              <p className="text-sm text-muted-foreground">
                {scopeItems.length} items{!isClient && ` totaling ${formatCurrency(totalValue, project.currency)}`}
              </p>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0">
              {canAddItems && (
                <div className="shrink-0">
                  <ScopeItemAddButton
                    projectId={projectId}
                    projectCurrency={project.currency}
                    size="sm"
                    compact
                  />
                </div>
              )}
              {canImportExcel && (
                <>
                  <div className="shrink-0">
                    <DownloadTemplateButton projectCode={project.project_code} compact />
                  </div>
                  <div className="shrink-0">
                    <ExcelImport projectId={projectId} projectCode={project.project_code} compact />
                  </div>
                </>
              )}
              <div className="shrink-0">
                <ExcelExport
                  items={scopeItems}
                  projectCode={project.project_code}
                  projectName={project.name}
                  compact
                />
              </div>
            </div>
          </div>
          <ScopeItemsTable
            projectId={projectId}
            items={scopeItems}
            materials={materials.map((m) => ({
              id: m.id,
              material_code: m.material_code,
              name: m.name,
            }))}
            currency={project.currency}
            isClient={isClient}
            userRole={userRole}
          />
        </TabsContent>

        {/* Drawings Tab */}
        <TabsContent value="drawings">
          <DrawingsOverview
            projectId={projectId}
            productionItems={productionItems.map((item) => ({
              id: item.id,
              item_code: item.item_code,
              name: item.name,
            }))}
            drawings={drawings}
            projectCurrency={project.currency}
            isClient={isClient}
          />
        </TabsContent>

        {/* Materials Tab */}
        <TabsContent value="materials">
          <MaterialsOverview
            projectId={projectId}
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
            projectId={projectId}
            snaggingItems={snaggingItems}
            scopeItems={scopeItems.map((item) => ({
              id: item.id,
              item_code: item.item_code,
              name: item.name,
            }))}
          />
        </TabsContent>

        {/* Milestones Tab */}
        {/* Milestones Tab - hidden from clients */}
        {!isClient && (
          <TabsContent value="milestones">
            <MilestonesOverview
              projectId={projectId}
              milestones={milestones}
            />
          </TabsContent>
        )}

        {/* Reports Tab */}
        <TabsContent value="reports">
          <ReportsOverview
            projectId={projectId}
            projectName={project.name}
            projectCode={project.project_code}
            reports={reports}
            userRole={userRole}
          />
        </TabsContent>

        {/* Financials Tab - hidden from clients */}
        {!isClient && (
          <TabsContent value="financials">
            <FinancialsOverview
              scopeItems={scopeItems.map((item) => ({
                id: item.id,
                item_code: item.item_code,
                name: item.name,
                item_path: item.item_path,
                quantity: item.quantity,
                initial_total_cost: item.initial_total_cost,
                actual_unit_cost: item.actual_unit_cost,
              }))}
              currency={project.currency}
              isClient={isClient}
            />
          </TabsContent>
        )}

        {/* Timeline Tab - viewable by all roles; edit restricted */}
        <TabsContent value="timeline">
          <TimelineOverview
            projectId={projectId}
            projectUrlId={projectUrlId}
            scopeItems={scopeItems.map((item) => ({
              id: item.id,
              item_code: item.item_code,
              name: item.name,
              production_percentage: item.production_percentage,
            }))}
            canEdit={canEdit}
          />
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team">
          <TeamOverview
            projectId={projectId}
            assignments={assignments}
            canManageTeam={canManageTeam}
          />
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <ActivityFeed projectId={projectId} limit={50} maxHeight="600px" />
        </TabsContent>
      </ProjectTabs>
    </div>
  );
}
