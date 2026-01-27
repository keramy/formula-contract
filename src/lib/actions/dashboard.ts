"use server";

import { createClient } from "@/lib/supabase/server";

export interface TaskSummary {
  pendingMaterialApprovals: number;
  rejectedDrawings: number;
  draftReports: number;
  overdueMilestones: number;
  total: number;
}

export interface AtRiskProject {
  id: string;
  slug: string | null;
  name: string;
  project_code: string;
  client_name: string | null;
  overdueCount: number;
  rejectedDrawingsCount: number;
  riskLevel: "high" | "medium" | "low";
}

export interface PendingApproval {
  id: string;
  type: "drawing" | "material";
  title: string;
  projectId: string;
  projectSlug: string | null;
  projectName: string;
  projectCode: string;
  sentAt: string;
}

export interface ClientProjectProgress {
  id: string;
  slug: string | null;
  name: string;
  project_code: string;
  status: string;
  progress: number;
  totalItems: number;
  completedItems: number;
  pendingApprovals: number;
}

export interface DashboardStats {
  projectCounts: {
    total: number;
    tender: number;
    active: number;
    on_hold: number;
    completed: number;
    cancelled: number;
  };
  recentProjects: Array<{
    id: string;
    slug: string | null;
    project_code: string;
    name: string;
    status: string;
    client: { company_name: string | null } | null;
  }>;
}

/**
 * Get dashboard stats filtered by assigned project IDs
 * Used for PM, Production, Procurement roles who only see their projects
 */
export async function getMyDashboardStats(assignedProjectIds: string[]): Promise<DashboardStats> {
  const supabase = await createClient();

  if (assignedProjectIds.length === 0) {
    return {
      projectCounts: { total: 0, tender: 0, active: 0, on_hold: 0, completed: 0, cancelled: 0 },
      recentProjects: [],
    };
  }

  // Fetch projects and clients in parallel
  const [{ data: projectsData }, { data: clientsData }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, slug, project_code, name, status, client_id")
      .eq("is_deleted", false)
      .in("id", assignedProjectIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("clients")
      .select("id, company_name"),
  ]);

  // Type assertion for projects with slug (column added by migration 015)
  const projects = (projectsData as unknown as Array<{
    id: string;
    slug: string | null;
    project_code: string;
    name: string;
    status: string;
    client_id: string | null;
  }>) || [];

  // Build client map
  const clientMap = new Map<string, string>();
  clientsData?.forEach((c: { id: string; company_name: string }) => {
    clientMap.set(c.id, c.company_name);
  });

  // Calculate status counts
  const projectCounts = {
    total: projects.length,
    tender: projects.filter(p => p.status === "tender").length,
    active: projects.filter(p => p.status === "active").length,
    on_hold: projects.filter(p => p.status === "on_hold").length,
    completed: projects.filter(p => p.status === "completed").length,
    cancelled: projects.filter(p => p.status === "cancelled").length,
  };

  // Get recent 5 projects with client info
  const recentProjects = projects.slice(0, 5).map(p => ({
    id: p.id,
    slug: p.slug,
    project_code: p.project_code,
    name: p.name,
    status: p.status,
    client: p.client_id ? { company_name: clientMap.get(p.client_id) || null } : null,
  }));

  return { projectCounts, recentProjects };
}

/**
 * Get aggregated task counts for PM/Admin dashboards
 * Shows what needs attention right now
 */
export async function getMyTasks(): Promise<TaskSummary> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  // Parallel fetch for all task counts
  const [
    { count: pendingMaterialApprovals },
    { count: rejectedDrawings },
    { count: draftReports },
    { count: overdueMilestones },
  ] = await Promise.all([
    // Materials pending client approval (status = sent_to_client)
    supabase
      .from("materials")
      .select("*", { count: "exact", head: true })
      .eq("status", "sent_to_client")
      .eq("is_deleted", false),
    // Drawings rejected (need revision)
    supabase
      .from("drawings")
      .select("*", { count: "exact", head: true })
      .eq("status", "rejected"),
    // Reports in draft status
    supabase
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("is_published", false),
    // Overdue milestones (due_date < now and not completed)
    supabase
      .from("milestones")
      .select("*", { count: "exact", head: true })
      .eq("is_completed", false)
      .lt("due_date", now),
  ]);

  const total =
    (pendingMaterialApprovals || 0) +
    (rejectedDrawings || 0) +
    (draftReports || 0) +
    (overdueMilestones || 0);

  return {
    pendingMaterialApprovals: pendingMaterialApprovals || 0,
    rejectedDrawings: rejectedDrawings || 0,
    draftReports: draftReports || 0,
    overdueMilestones: overdueMilestones || 0,
    total,
  };
}

/**
 * Get projects that have risk indicators
 * Used for PM/Admin dashboards to prioritize attention
 */
export async function getAtRiskProjects(): Promise<AtRiskProject[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  // Get active projects with their client info (includes slug for URLs)
  // Note: slug column added by migration 015_add_project_slug.sql
  const { data: projectsData } = await supabase
    .from("projects")
    .select("id, slug, name, project_code, client_id")
    .eq("is_deleted", false)
    .in("status", ["active", "tender"])
    .limit(50);

  // Type assertion for projects with slug (column added by migration)
  const projects = projectsData as { id: string; slug: string | null; name: string; project_code: string; client_id: string | null }[] | null;

  if (!projects || projects.length === 0) {
    return [];
  }

  const projectIds = projects.map((p) => p.id);
  const clientIds = projects.map((p) => p.client_id).filter(Boolean) as string[];

  // Get client names separately
  const { data: clients } = clientIds.length > 0
    ? await supabase
        .from("clients")
        .select("id, company_name")
        .in("id", clientIds)
    : { data: [] };

  const clientMap = new Map(clients?.map(c => [c.id, c.company_name]) || []);

  // Get risk data in parallel
  const [
    { data: overdueMilestones },
    { data: rejectedDrawings },
  ] = await Promise.all([
    // Overdue milestones per project
    supabase
      .from("milestones")
      .select("project_id")
      .in("project_id", projectIds)
      .eq("is_completed", false)
      .lt("due_date", now),
    // Rejected drawings - get via scope_items
    supabase
      .from("drawings")
      .select("item_id")
      .eq("status", "rejected"),
  ]);

  // Get project_ids for rejected drawings via scope_items
  const rejectedItemIds = rejectedDrawings?.map(d => d.item_id) || [];
  let rejectedByProject = new Map<string, number>();

  if (rejectedItemIds.length > 0) {
    const { data: scopeItems } = await supabase
      .from("scope_items")
      .select("id, project_id")
      .in("id", rejectedItemIds);

    scopeItems?.forEach((item) => {
      const count = rejectedByProject.get(item.project_id) || 0;
      rejectedByProject.set(item.project_id, count + 1);
    });
  }

  // Count overdue milestones per project
  const overdueByProject = new Map<string, number>();
  overdueMilestones?.forEach((milestone) => {
    const count = overdueByProject.get(milestone.project_id) || 0;
    overdueByProject.set(milestone.project_id, count + 1);
  });

  // Build at-risk projects list
  const atRiskProjects: AtRiskProject[] = [];

  for (const project of projects) {
    const overdueCount = overdueByProject.get(project.id) || 0;
    const rejectedCount = rejectedByProject.get(project.id) || 0;

    // Only include projects with actual risk indicators
    if (overdueCount > 0 || rejectedCount > 0) {
      // Determine risk level
      let riskLevel: "high" | "medium" | "low" = "low";
      if (overdueCount >= 5 || rejectedCount >= 3) {
        riskLevel = "high";
      } else if (overdueCount >= 2 || rejectedCount >= 1) {
        riskLevel = "medium";
      }

      atRiskProjects.push({
        id: project.id,
        slug: project.slug,
        name: project.name,
        project_code: project.project_code,
        client_name: project.client_id ? clientMap.get(project.client_id) || null : null,
        overdueCount,
        rejectedDrawingsCount: rejectedCount,
        riskLevel,
      });
    }
  }

  // Sort by risk level (high first) then by overdue count
  return atRiskProjects.sort((a, b) => {
    const riskOrder = { high: 0, medium: 1, low: 2 };
    if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
      return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
    }
    return b.overdueCount - a.overdueCount;
  });
}

/**
 * Get pending approvals for client dashboard
 * Shows drawings/materials awaiting client response
 */
export async function getPendingApprovals(userId: string): Promise<PendingApproval[]> {
  const supabase = await createClient();

  // Get projects assigned to this user (client)
  const { data: assignments } = await supabase
    .from("project_assignments")
    .select("project_id")
    .eq("user_id", userId);

  if (!assignments || assignments.length === 0) {
    return [];
  }

  const projectIds = assignments.map((a) => a.project_id);

  // Get project info (includes slug for URLs)
  // Note: slug column added by migration 015_add_project_slug.sql
  const { data: projectsData } = await supabase
    .from("projects")
    .select("id, slug, name, project_code")
    .in("id", projectIds);

  const projects = projectsData as { id: string; slug: string | null; name: string; project_code: string }[] | null;
  const projectMap = new Map(projects?.map(p => [p.id, { slug: p.slug, name: p.name, code: p.project_code }]) || []);

  // Get pending drawings via scope_items
  const { data: scopeItems } = await supabase
    .from("scope_items")
    .select("id, project_id, name")
    .in("project_id", projectIds)
    .eq("is_deleted", false);

  const scopeItemIds = scopeItems?.map(s => s.id) || [];
  const scopeItemMap = new Map(scopeItems?.map(s => [s.id, { project_id: s.project_id, name: s.name }]) || []);

  // Get drawings with sent_to_client status
  const { data: pendingDrawings } = scopeItemIds.length > 0
    ? await supabase
        .from("drawings")
        .select("id, item_id, sent_to_client_at")
        .eq("status", "sent_to_client")
        .in("item_id", scopeItemIds)
        .order("sent_to_client_at", { ascending: false })
        .limit(10)
    : { data: [] };

  // Get pending materials (sent_to_client status)
  const { data: pendingMaterials } = await supabase
    .from("materials")
    .select("id, name, project_id, sent_to_client_at")
    .eq("status", "sent_to_client")
    .in("project_id", projectIds)
    .eq("is_deleted", false)
    .order("sent_to_client_at", { ascending: false })
    .limit(10);

  const approvals: PendingApproval[] = [];

  // Map drawings
  if (pendingDrawings) {
    for (const drawing of pendingDrawings) {
      const scopeItem = scopeItemMap.get(drawing.item_id);
      if (scopeItem) {
        const project = projectMap.get(scopeItem.project_id);
        if (project) {
          approvals.push({
            id: drawing.id,
            type: "drawing",
            title: scopeItem.name || "Drawing",
            projectId: scopeItem.project_id,
            projectSlug: project.slug,
            projectName: project.name,
            projectCode: project.code,
            sentAt: drawing.sent_to_client_at || new Date().toISOString(),
          });
        }
      }
    }
  }

  // Map materials
  if (pendingMaterials) {
    for (const material of pendingMaterials) {
      const project = projectMap.get(material.project_id);
      if (project) {
        approvals.push({
          id: material.id,
          type: "material",
          title: material.name,
          projectId: material.project_id,
          projectSlug: project.slug,
          projectName: project.name,
          projectCode: project.code,
          sentAt: material.sent_to_client_at || new Date().toISOString(),
        });
      }
    }
  }

  // Sort by date
  return approvals.sort(
    (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
  );
}

/**
 * Get project progress for client dashboard
 * Shows simplified view of client's assigned projects
 */
export async function getClientProjectProgress(userId: string): Promise<ClientProjectProgress[]> {
  const supabase = await createClient();

  // Get projects assigned to this user
  const { data: assignments } = await supabase
    .from("project_assignments")
    .select("project_id")
    .eq("user_id", userId);

  if (!assignments || assignments.length === 0) {
    return [];
  }

  const projectIds = assignments.map((a) => a.project_id);

  // Get projects and scope items for progress calculation (includes slug for URLs)
  // Note: slug column added by migration 015_add_project_slug.sql
  const [{ data: projectsData }, { data: scopeItems }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, slug, name, project_code, status")
      .in("id", projectIds)
      .eq("is_deleted", false)
      .order("updated_at", { ascending: false }),
    supabase
      .from("scope_items")
      .select("id, project_id, status")
      .in("project_id", projectIds)
      .eq("is_deleted", false),
  ]);

  // Type assertion for projects with slug (column added by migration)
  const projects = projectsData as { id: string; slug: string | null; name: string; project_code: string; status: string }[] | null;

  if (!projects) {
    return [];
  }

  // Get scope item IDs to check for pending drawings
  const scopeItemIds = scopeItems?.map(s => s.id) || [];

  // Get pending drawings count
  const { data: pendingDrawings } = scopeItemIds.length > 0
    ? await supabase
        .from("drawings")
        .select("item_id")
        .eq("status", "sent_to_client")
        .in("item_id", scopeItemIds)
    : { data: [] };

  // Calculate progress per project
  const progressMap = new Map<string, { total: number; completed: number }>();
  scopeItems?.forEach((item) => {
    const stats = progressMap.get(item.project_id) || { total: 0, completed: 0 };
    stats.total++;
    if (item.status === "complete") {
      stats.completed++;
    }
    progressMap.set(item.project_id, stats);
  });

  // Map pending drawings to projects via scope_items
  const scopeItemToProject = new Map(scopeItems?.map(s => [s.id, s.project_id]) || []);
  const pendingApprovalMap = new Map<string, number>();
  pendingDrawings?.forEach((drawing) => {
    const projectId = scopeItemToProject.get(drawing.item_id);
    if (projectId) {
      const count = pendingApprovalMap.get(projectId) || 0;
      pendingApprovalMap.set(projectId, count + 1);
    }
  });

  return projects.map((project) => {
    const stats = progressMap.get(project.id) || { total: 0, completed: 0 };
    const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

    return {
      id: project.id,
      slug: project.slug,
      name: project.name,
      project_code: project.project_code,
      status: project.status,
      progress,
      totalItems: stats.total,
      completedItems: stats.completed,
      pendingApprovals: pendingApprovalMap.get(project.id) || 0,
    };
  });
}

/**
 * Get upcoming and overdue milestones for dashboard
 * Includes project info for display
 */
export interface DashboardMilestone {
  id: string;
  project_id: string;
  name: string;
  due_date: string;
  is_completed: boolean;
  project?: {
    name: string;
    project_code: string;
    slug: string | null;
  };
}

// ============================================================================
// PRODUCTION ROLE - Queue of items in production
// ============================================================================
export interface ProductionQueueItem {
  id: string;
  item_code: string;
  name: string;
  production_percentage: number;
  project_id: string;
  project_name: string;
  project_code: string;
  project_slug: string | null;
}

export interface ProductionQueueSummary {
  inProduction: ProductionQueueItem[];
  readyForProduction: ProductionQueueItem[];
  pendingInstallation: ProductionQueueItem[];
  totalInProduction: number;
  totalReady: number;
  totalPendingInstall: number;
}

export async function getProductionQueue(): Promise<ProductionQueueSummary> {
  const supabase = await createClient();

  // Get scope items that are in production path
  const { data: itemsData } = await supabase
    .from("scope_items")
    .select("id, item_code, name, project_id, production_percentage, status, is_installed, item_path")
    .eq("item_path", "production")
    .eq("is_deleted", false)
    .in("status", ["approved", "in_production", "complete"])
    .order("production_percentage", { ascending: true });

  const items = itemsData || [];
  const projectIds = [...new Set(items.map(i => i.project_id))];

  // Get project info
  const { data: projectsData } = projectIds.length > 0
    ? await supabase
        .from("projects")
        .select("id, name, project_code, slug")
        .in("id", projectIds)
        .eq("is_deleted", false)
    : { data: [] };

  const projectMap = new Map(
    (projectsData as { id: string; name: string; project_code: string; slug: string | null }[] || [])
      .map(p => [p.id, { name: p.name, code: p.project_code, slug: p.slug }])
  );

  const inProduction: ProductionQueueItem[] = [];
  const readyForProduction: ProductionQueueItem[] = [];
  const pendingInstallation: ProductionQueueItem[] = [];

  for (const item of items) {
    const project = projectMap.get(item.project_id);
    if (!project) continue;

    const queueItem: ProductionQueueItem = {
      id: item.id,
      item_code: item.item_code,
      name: item.name,
      production_percentage: item.production_percentage || 0,
      project_id: item.project_id,
      project_name: project.name,
      project_code: project.code,
      project_slug: project.slug,
    };

    // Categorize items
    if (item.status === "complete" && !item.is_installed) {
      pendingInstallation.push(queueItem);
    } else if (item.status === "in_production" || (item.production_percentage > 0 && item.production_percentage < 100)) {
      inProduction.push(queueItem);
    } else if (item.status === "approved" && item.production_percentage === 0) {
      readyForProduction.push(queueItem);
    }
  }

  return {
    inProduction: inProduction.slice(0, 10),
    readyForProduction: readyForProduction.slice(0, 10),
    pendingInstallation: pendingInstallation.slice(0, 10),
    totalInProduction: inProduction.length,
    totalReady: readyForProduction.length,
    totalPendingInstall: pendingInstallation.length,
  };
}

// ============================================================================
// PROCUREMENT ROLE - Items needing materials
// ============================================================================
export interface ProcurementQueueItem {
  id: string;
  item_code: string;
  name: string;
  project_id: string;
  project_name: string;
  project_code: string;
  project_slug: string | null;
  materialsCount: number;
  pendingMaterials: number;
}

export interface ProcurementQueueSummary {
  needsMaterials: ProcurementQueueItem[];
  pendingApproval: ProcurementQueueItem[];
  totalNeedsMaterials: number;
  totalPendingApproval: number;
}

export async function getProcurementQueue(): Promise<ProcurementQueueSummary> {
  const supabase = await createClient();

  // Get scope items that are in procurement path
  const { data: itemsData } = await supabase
    .from("scope_items")
    .select("id, item_code, name, project_id, item_path, status")
    .eq("item_path", "procurement")
    .eq("is_deleted", false)
    .not("status", "eq", "complete")
    .not("status", "eq", "cancelled");

  const items = itemsData || [];
  const itemIds = items.map(i => i.id);
  const projectIds = [...new Set(items.map(i => i.project_id))];

  // Get project info
  const { data: projectsData } = projectIds.length > 0
    ? await supabase
        .from("projects")
        .select("id, name, project_code, slug")
        .in("id", projectIds)
        .eq("is_deleted", false)
    : { data: [] };

  const projectMap = new Map(
    (projectsData as { id: string; name: string; project_code: string; slug: string | null }[] || [])
      .map(p => [p.id, { name: p.name, code: p.project_code, slug: p.slug }])
  );

  // Get materials for these items
  const { data: itemMaterialsData } = itemIds.length > 0
    ? await supabase
        .from("item_materials")
        .select("item_id, material_id")
        .in("item_id", itemIds)
    : { data: [] };

  const materialIds = [...new Set((itemMaterialsData || []).map(im => im.material_id))];

  // Get material statuses
  const { data: materialsData } = materialIds.length > 0
    ? await supabase
        .from("materials")
        .select("id, status")
        .in("id", materialIds)
        .eq("is_deleted", false)
    : { data: [] };

  const materialStatusMap = new Map(
    (materialsData || []).map(m => [m.id, m.status])
  );

  // Count materials per item
  const itemMaterialsMap = new Map<string, { total: number; pending: number }>();
  for (const im of itemMaterialsData || []) {
    const stats = itemMaterialsMap.get(im.item_id) || { total: 0, pending: 0 };
    stats.total++;
    const status = materialStatusMap.get(im.material_id);
    if (status === "pending" || status === "sent_to_client") {
      stats.pending++;
    }
    itemMaterialsMap.set(im.item_id, stats);
  }

  const needsMaterials: ProcurementQueueItem[] = [];
  const pendingApproval: ProcurementQueueItem[] = [];

  for (const item of items) {
    const project = projectMap.get(item.project_id);
    if (!project) continue;

    const materialStats = itemMaterialsMap.get(item.id) || { total: 0, pending: 0 };

    const queueItem: ProcurementQueueItem = {
      id: item.id,
      item_code: item.item_code,
      name: item.name,
      project_id: item.project_id,
      project_name: project.name,
      project_code: project.code,
      project_slug: project.slug,
      materialsCount: materialStats.total,
      pendingMaterials: materialStats.pending,
    };

    // Items with no materials assigned
    if (materialStats.total === 0) {
      needsMaterials.push(queueItem);
    }
    // Items with pending material approvals
    else if (materialStats.pending > 0) {
      pendingApproval.push(queueItem);
    }
  }

  return {
    needsMaterials: needsMaterials.slice(0, 10),
    pendingApproval: pendingApproval.slice(0, 10),
    totalNeedsMaterials: needsMaterials.length,
    totalPendingApproval: pendingApproval.length,
  };
}

// ============================================================================
// ADMIN/MANAGEMENT - Financial Overview
// ============================================================================
export interface FinancialOverview {
  totalContractValue: number;
  byStatus: {
    tender: number;
    active: number;
    completed: number;
  };
  currency: string;
  projectCount: number;
}

export async function getFinancialOverview(): Promise<FinancialOverview> {
  const supabase = await createClient();

  const { data: projectsData } = await supabase
    .from("projects")
    .select("status, contract_value_manual, currency")
    .eq("is_deleted", false)
    .not("status", "eq", "cancelled");

  const projects = projectsData || [];

  let totalContractValue = 0;
  const byStatus = { tender: 0, active: 0, completed: 0 };

  for (const project of projects) {
    const value = project.contract_value_manual || 0;
    totalContractValue += value;

    if (project.status === "tender") {
      byStatus.tender += value;
    } else if (project.status === "active" || project.status === "on_hold") {
      byStatus.active += value;
    } else if (project.status === "completed") {
      byStatus.completed += value;
    }
  }

  return {
    totalContractValue,
    byStatus,
    currency: "TRY", // Default, could be made configurable
    projectCount: projects.length,
  };
}

// ============================================================================
// THIS WEEK SUMMARY - Quick overview of weekly activity
// ============================================================================
export interface ThisWeekSummary {
  itemsCompletedThisWeek: number;
  reportsPublishedThisWeek: number;
  upcomingMilestones: number; // Next 7 days
  milestonesOverdue: number;
}

export async function getThisWeekSummary(): Promise<ThisWeekSummary> {
  const supabase = await createClient();

  // Calculate date ranges
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(now.getDate() + 7);

  const startOfWeekISO = startOfWeek.toISOString();
  const nowISO = now.toISOString();
  const sevenDaysISO = sevenDaysFromNow.toISOString();

  // Parallel fetch for all stats
  const [
    { count: itemsCompletedThisWeek },
    { count: reportsPublishedThisWeek },
    { count: upcomingMilestones },
    { count: milestonesOverdue },
  ] = await Promise.all([
    // Items marked complete this week (status changed to 'complete')
    // We check updated_at since we don't have a completed_at field on scope_items
    supabase
      .from("scope_items")
      .select("*", { count: "exact", head: true })
      .eq("status", "complete")
      .eq("is_deleted", false)
      .gte("updated_at", startOfWeekISO),

    // Reports published this week
    supabase
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("is_published", true)
      .gte("published_at", startOfWeekISO),

    // Milestones due in next 7 days (not completed)
    supabase
      .from("milestones")
      .select("*", { count: "exact", head: true })
      .eq("is_completed", false)
      .gte("due_date", nowISO)
      .lte("due_date", sevenDaysISO),

    // Overdue milestones
    supabase
      .from("milestones")
      .select("*", { count: "exact", head: true })
      .eq("is_completed", false)
      .lt("due_date", nowISO),
  ]);

  return {
    itemsCompletedThisWeek: itemsCompletedThisWeek || 0,
    reportsPublishedThisWeek: reportsPublishedThisWeek || 0,
    upcomingMilestones: upcomingMilestones || 0,
    milestonesOverdue: milestonesOverdue || 0,
  };
}

// ============================================================================
// PROJECTS BY STATUS - For chart visualization
// ============================================================================
export interface ProjectsByStatus {
  tender: number;
  active: number;
  on_hold: number;
  completed: number;
  cancelled: number;
  not_awarded: number;
  total: number;
}

export async function getProjectsByStatus(): Promise<ProjectsByStatus> {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("status")
    .eq("is_deleted", false);

  const counts = {
    tender: 0,
    active: 0,
    on_hold: 0,
    completed: 0,
    cancelled: 0,
    not_awarded: 0,
    total: 0,
  };

  for (const project of projects || []) {
    counts.total++;
    if (project.status in counts) {
      counts[project.status as keyof Omit<ProjectsByStatus, 'total'>]++;
    }
  }

  return counts;
}

export async function getDashboardMilestones(): Promise<DashboardMilestone[]> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get all milestones from all projects (admin/management will see all)
  // For now, get all incomplete milestones sorted by due date
  const today = new Date().toISOString().split("T")[0];

  // Get milestones due in next 30 days or overdue
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const thirtyDaysLater = thirtyDaysFromNow.toISOString().split("T")[0];

  // First get milestones
  const { data: milestones, error } = await supabase
    .from("milestones")
    .select("id, project_id, name, due_date, is_completed")
    .eq("is_completed", false)
    .lte("due_date", thirtyDaysLater)
    .order("due_date", { ascending: true })
    .limit(10);

  if (error) {
    console.error("Error fetching dashboard milestones:", error);
    return [];
  }

  if (!milestones || milestones.length === 0) {
    return [];
  }

  // Get project info for these milestones
  const projectIds = [...new Set(milestones.map(m => m.project_id))];
  const { data: projectsData } = await supabase
    .from("projects")
    .select("id, name, project_code, slug")
    .in("id", projectIds);

  // Type assertion for projects with slug (column added by migration)
  const projects = projectsData as { id: string; name: string; project_code: string; slug: string | null }[] | null;

  const projectMap = new Map(
    (projects || []).map(p => [p.id, { name: p.name, project_code: p.project_code, slug: p.slug }])
  );

  return milestones.map(m => ({
    ...m,
    project: projectMap.get(m.project_id),
  })) as DashboardMilestone[];
}
