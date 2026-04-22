import { notFound, redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { getRequestContext } from "@/lib/supabase/server";
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
// PERF: Only project + scope items fetched server-side. All other data (materials, drawings,
// snagging, milestones, assignments, reports, areas, activities) lazy-loaded via React Query
// when their tab is activated. This reduces page load from 6 parallel queries to 2.
import { DownloadTemplateButton, ExcelImport, ExcelExport, ScopeItemAddButton } from "@/components/scope-items";
import { BatchPhotoUpload } from "@/components/scope-items/batch-photo-upload";
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
  area_id: string | null;
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

  console.log("\n📊 [PROFILE] Project Detail Data Fetch Starting...");

  // OPTIMIZED: Resolve auth context once, pass to all helpers
  const authStart = performance.now();
  const ctx = await getRequestContext();
  if (!ctx) redirect("/login");
  const { supabase, user, role: userRole } = ctx;
  console.log(`  🔐 getRequestContext: ${(performance.now() - authStart).toFixed(0)}ms`);

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

  // OPTIMIZED: Only 2 server-side queries (project + scope items).
  // Materials, drawings, snagging, milestones, assignments, reports, areas, activities
  // are all lazy-loaded via React Query when their tab is activated.
  const parallelStart = performance.now();
  const [
    projectResult,
    scopeItemsResult,
    areasResult,
    suppliersResult,
  ] = await Promise.all([
    // 1. Project with Client (includes slug for URL generation)
    (async () => {
      const start = performance.now();
      const result = await supabase
        .from("projects")
        .select(`
          id, project_code, name, slug, description, status, installation_date, contract_value_manual, currency, gantt_skip_weekends,
          client:clients(id, company_name, contact_person, email, phone)
        `)
        .eq("id", projectId)
        .single();
      console.log(`  📁 Project with Client: ${(performance.now() - start).toFixed(0)}ms`);
      return result;
    })(),
    // 2. Scope Items - ordered by item_code for consistent display
    (async () => {
      const start = performance.now();
      const result = await supabase
        .from("scope_items")
        .select("id, item_code, name, description, width, depth, height, item_path, status, quantity, unit, initial_unit_cost, initial_total_cost, actual_unit_cost, actual_total_cost, unit_sales_price, total_sales_price, production_percentage, is_shipped, is_installation_started, is_installed, notes, images, created_at, parent_id, area_id, supplier_id")
        .eq("project_id", projectId)
        .eq("is_deleted", false)
        .order("item_code", { ascending: true });
      console.log(`  📋 Scope Items: ${(performance.now() - start).toFixed(0)}ms`);
      return result;
    })(),
    // 3. Project Areas
    supabase
      .from("project_areas")
      .select("id, area_code, name, floor")
      .eq("project_id", projectId)
      .eq("is_deleted", false)
      .order("floor")
      .order("name"),
    // 4. Suppliers (for procurement items)
    supabase
      .from("finance_suppliers")
      .select("id, name, supplier_code")
      .eq("is_deleted", false)
      .order("name"),
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
  // All scope items can have drawings (both production and procurement)
  const drawableItems = scopeItems;

  return (
    <div className="px-4 md:px-6 pt-2 pb-6 flex flex-col min-h-full">
      {/* Header - renders into the App Header bar via context */}
      <ProjectDetailHeader
        projectId={projectUrlId}
        projectName={project.name}
        projectCode={project.project_code}
        status={project.status}
      />

      {/* Tabs - responsive with "More" dropdown on mobile */}
      {/* Badge counts for deferred data default to 0; they'll appear when tabs self-fetch */}
      <ProjectTabs
        scopeItemsCount={scopeItems.length}
        isClient={isClient}
      >

        {/* Overview Tab — deferred data (milestones, snagging, etc.) self-fetches via React Query */}
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
                  items={scopeItems.map((item) => ({
                    ...item,
                    floor: null,
                    area_name: null,
                    area_code: null,
                  }))}
                  projectCode={project.project_code}
                  projectName={project.name}
                  compact
                />
              </div>
              {canEdit && scopeItems.length > 0 && (
                <div className="shrink-0">
                  <BatchPhotoUpload
                    projectId={projectId}
                    items={scopeItems.map((item) => ({
                      id: item.id,
                      item_code: item.item_code,
                      name: item.name,
                      images: item.images,
                    }))}
                  />
                </div>
              )}
            </div>
          </div>
          <ScopeItemsTable
            projectId={projectId}
            items={scopeItems}
            materials={[]}
            areas={(areasResult.data || []).map((a) => ({ id: a.id, area_code: a.area_code, name: a.name, floor: a.floor }))}
            suppliers={isClient ? [] : (suppliersResult.data || []).map((s) => ({ id: s.id, name: s.name, supplier_code: s.supplier_code }))}
            currency={project.currency}
            isClient={isClient}
            userRole={userRole}
          />
        </TabsContent>

        {/* Drawings Tab — self-fetches drawings via React Query */}
        <TabsContent value="drawings">
          <DrawingsOverview
            projectId={projectId}
            projectCode={project.project_code}
            projectName={project.name}
            productionItems={drawableItems.map((item) => ({
              id: item.id,
              item_code: item.item_code,
              name: item.name,
            }))}
            projectCurrency={project.currency}
            isClient={isClient}
            isAdmin={userRole === "admin"}
          />
        </TabsContent>

        {/* Materials Tab — self-fetches via React Query */}
        <TabsContent value="materials">
          <MaterialsOverview
            projectId={projectId}
            projectCode={project.project_code}
            projectName={project.name}
            scopeItems={scopeItems.map((item) => ({
              id: item.id,
              item_code: item.item_code,
              name: item.name,
            }))}
            userRole={userRole}
          />
        </TabsContent>

        {/* Snagging Tab — self-fetches via React Query */}
        <TabsContent value="snagging">
          <SnaggingOverview
            projectId={projectId}
            scopeItems={scopeItems.map((item) => ({
              id: item.id,
              item_code: item.item_code,
              name: item.name,
            }))}
          />
        </TabsContent>

        {/* Milestones Tab - hidden from clients, self-fetches via React Query */}
        {!isClient && (
          <TabsContent value="milestones">
            <MilestonesOverview
              projectId={projectId}
            />
          </TabsContent>
        )}

        {/* Reports Tab */}
        <TabsContent value="reports">
          <ReportsOverview
            projectId={projectId}
            projectName={project.name}
            projectCode={project.project_code}
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

        {/* Timeline Tab - full page height, viewable by all roles; edit restricted */}
        <TabsContent value="timeline" className="flex-1 flex flex-col">
          <TimelineOverview
            projectId={projectId}
            scopeItems={scopeItems.map((item) => ({
              id: item.id,
              item_code: item.item_code,
              name: item.name,
              production_percentage: item.production_percentage,
            }))}
            canEdit={canEdit}
            skipWeekends={(project as { gantt_skip_weekends?: boolean }).gantt_skip_weekends ?? false}
          />
        </TabsContent>

        {/* Team Tab — self-fetches assignments via React Query */}
        <TabsContent value="team">
          <TeamOverview
            projectId={projectId}
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
