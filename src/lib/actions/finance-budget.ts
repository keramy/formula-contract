"use server";

/**
 * Finance Budget Server Actions (Project Budget Overview)
 *
 * These functions power the /finance page which shows project-level
 * budget tracking: contract values, allocated budgets, variance analysis.
 *
 * Separated from finance.ts which handles the AP/AR payments module (/payments).
 */

import { createClient } from "@/lib/supabase/server";

// ============================================================================
// FINANCE PAGE DATA TYPES
// ============================================================================

export interface FinanceKPIs {
  totalContractValue: number;
  totalBudgetAllocated: number;
  totalActualSpent: number;
  variance: number;
  variancePercentage: number;
  currency: string;
  projectCount: number;
}

export interface BudgetTrendItem {
  month: string;
  monthLabel: string;
  budget: number;
  actual: number;
}

export interface BudgetBreakdownItem {
  status: string;
  label: string;
  value: number;
  color: string;
  count: number;
  [key: string]: string | number; // Index signature for Recharts compatibility
}

export interface ProjectCostRow {
  id: string;
  slug: string | null;
  name: string;
  project_code: string;
  status: string;
  client_name: string | null;
  budget: number;
  actual: number;
  variance: number;
  variancePercentage: number;
  currency: string;
  itemCount: number;
}

// Status colors for budget breakdown chart
const STATUS_COLORS: Record<string, string> = {
  tender: "hsl(45, 93%, 47%)",
  active: "hsl(142, 76%, 36%)",
  on_hold: "hsl(220, 9%, 46%)",
  completed: "hsl(217, 91%, 60%)",
  cancelled: "hsl(0, 84%, 60%)",
  not_awarded: "hsl(0, 72%, 51%)",
};

const STATUS_LABELS: Record<string, string> = {
  tender: "Tender",
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
  not_awarded: "Not Awarded",
};

// ============================================================================
// FINANCE KPI DATA
// ============================================================================

export async function getFinanceKPIs(): Promise<FinanceKPIs> {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, contract_value_manual, currency")
    .eq("is_deleted", false)
    .not("status", "eq", "cancelled");

  const projectIds = (projects || []).map((p) => p.id);

  const { data: scopeItems } = projectIds.length > 0
    ? await supabase
        .from("scope_items")
        .select("project_id, initial_total_cost, quantity, actual_unit_cost")
        .in("project_id", projectIds)
        .eq("is_deleted", false)
    : { data: [] };

  let totalContractValue = 0;
  let totalBudgetAllocated = 0;
  let totalActualSpent = 0;

  for (const project of projects || []) {
    totalContractValue += project.contract_value_manual || 0;
  }

  for (const item of scopeItems || []) {
    totalBudgetAllocated += item.initial_total_cost || 0;
    const actualCost = (item.quantity || 1) * (item.actual_unit_cost || 0);
    totalActualSpent += actualCost;
  }

  const variance = totalBudgetAllocated - totalActualSpent;
  const variancePercentage = totalBudgetAllocated > 0
    ? Math.round((variance / totalBudgetAllocated) * 100)
    : 0;

  return {
    totalContractValue,
    totalBudgetAllocated,
    totalActualSpent,
    variance,
    variancePercentage,
    currency: "TRY",
    projectCount: projectIds.length,
  };
}

// ============================================================================
// BUDGET TREND (Monthly)
// ============================================================================

export async function getBudgetTrend(): Promise<BudgetTrendItem[]> {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, created_at")
    .eq("is_deleted", false)
    .not("status", "eq", "cancelled");

  const projectIds = (projects || []).map((p) => p.id);

  const { data: scopeItems } = projectIds.length > 0
    ? await supabase
        .from("scope_items")
        .select("project_id, initial_total_cost, quantity, actual_unit_cost, created_at")
        .in("project_id", projectIds)
        .eq("is_deleted", false)
    : { data: [] };

  const months: BudgetTrendItem[] = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const monthLabel = date.toLocaleString("en-US", { month: "short" });
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    let budget = 0;
    let actual = 0;

    for (const item of scopeItems || []) {
      if (!item.created_at) continue;
      const itemDate = new Date(item.created_at);
      if (itemDate <= monthEnd) {
        budget += item.initial_total_cost || 0;
        actual += (item.quantity || 1) * (item.actual_unit_cost || 0);
      }
    }

    months.push({
      month: monthKey,
      monthLabel,
      budget: Math.round(budget / 1000),
      actual: Math.round(actual / 1000),
    });
  }

  return months;
}

// ============================================================================
// BUDGET BREAKDOWN BY STATUS
// ============================================================================

export async function getBudgetBreakdown(): Promise<BudgetBreakdownItem[]> {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, status, contract_value_manual")
    .eq("is_deleted", false);

  const byStatus: Record<string, { value: number; count: number }> = {};

  for (const project of projects || []) {
    const status = project.status;
    if (!byStatus[status]) {
      byStatus[status] = { value: 0, count: 0 };
    }
    byStatus[status].value += project.contract_value_manual || 0;
    byStatus[status].count += 1;
  }

  const breakdown: BudgetBreakdownItem[] = Object.entries(byStatus)
    .filter(([_, data]) => data.value > 0)
    .map(([status, data]) => ({
      status,
      label: STATUS_LABELS[status] || status,
      value: data.value,
      color: STATUS_COLORS[status] || "hsl(220, 9%, 46%)",
      count: data.count,
    }))
    .sort((a, b) => b.value - a.value);

  return breakdown;
}

// ============================================================================
// PROJECT COSTS TABLE
// ============================================================================

export async function getProjectCosts(): Promise<ProjectCostRow[]> {
  const supabase = await createClient();

  const { data: projectsData } = await supabase
    .from("projects")
    .select("id, slug, name, project_code, status, currency, client_id")
    .eq("is_deleted", false)
    .not("status", "eq", "cancelled")
    .order("created_at", { ascending: false });

  const projects = projectsData as {
    id: string;
    slug: string | null;
    name: string;
    project_code: string;
    status: string;
    currency: string;
    client_id: string | null;
  }[] | null;

  if (!projects || projects.length === 0) {
    return [];
  }

  const projectIds = projects.map((p) => p.id);
  const clientIds = projects.map((p) => p.client_id).filter((id): id is string => id !== null);

  const [clientsResult, scopeItemsResult] = await Promise.all([
    clientIds.length > 0
      ? supabase.from("clients").select("id, company_name").in("id", clientIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("scope_items")
      .select("project_id, initial_total_cost, quantity, actual_unit_cost")
      .in("project_id", projectIds)
      .eq("is_deleted", false),
  ]);

  const clientMap = new Map<string, string>();
  for (const client of clientsResult.data || []) {
    clientMap.set(client.id, client.company_name);
  }

  const costMap = new Map<string, { budget: number; actual: number; itemCount: number }>();
  for (const item of scopeItemsResult.data || []) {
    const current = costMap.get(item.project_id) || { budget: 0, actual: 0, itemCount: 0 };
    current.budget += item.initial_total_cost || 0;
    current.actual += (item.quantity || 1) * (item.actual_unit_cost || 0);
    current.itemCount += 1;
    costMap.set(item.project_id, current);
  }

  const rows: ProjectCostRow[] = projects.map((project) => {
    const costs = costMap.get(project.id) || { budget: 0, actual: 0, itemCount: 0 };
    const variance = costs.budget - costs.actual;
    const variancePercentage = costs.budget > 0
      ? Math.round((variance / costs.budget) * 100)
      : 0;

    return {
      id: project.id,
      slug: project.slug,
      name: project.name,
      project_code: project.project_code,
      status: project.status,
      client_name: project.client_id ? clientMap.get(project.client_id) || null : null,
      budget: costs.budget,
      actual: costs.actual,
      variance,
      variancePercentage,
      currency: project.currency || "TRY",
      itemCount: costs.itemCount,
    };
  });

  return rows;
}
