"use server";

/**
 * Executive Summary Server Action
 *
 * Gathers all project data and generates a branded PDF summary.
 */

import { createClient } from "@/lib/supabase/server";
import type { ExecutiveSummaryData } from "@/lib/pdf/generate-executive-summary-pdf";

export interface SummaryResult {
  success: boolean;
  data?: { base64: string; fileName: string };
  error?: string;
}

export interface SummaryOptions {
  includeMetrics: boolean;
  includeProgress: boolean;
  includeScope: boolean;
  includeStatus: boolean;
  includeMilestones: boolean;
  includeCosts: boolean;
  includeSnagging: boolean;
}

export async function generateExecutiveSummary(
  projectId: string,
  options?: SummaryOptions
): Promise<SummaryResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  // First resolve the project (could be UUID or slug)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId);

  let query = supabase
    .from("projects")
    .select("id, project_code, name, description, status, installation_date, contract_value_manual, currency, client:clients(company_name)");

  if (isUuid) {
    query = query.eq("id", projectId);
  } else {
    query = query.eq("slug", projectId);
  }

  const { data: project, error: projectError } = await query.single();

  if (projectError || !project) {
    console.error("[generateExecutiveSummary] Project lookup failed:", projectError?.message, "projectId:", projectId, "isUuid:", isUuid);
    return { success: false, error: `Project not found (${isUuid ? "by id" : "by slug"}: ${projectId})` };
  }

  // Use the resolved UUID for all child queries
  const resolvedId = project.id;

  // Fetch all child data in parallel
  const [
    scopeItemsResult,
    drawingsResult,
    materialsResult,
    milestonesResult,
    snaggingResult,
  ] = await Promise.all([
    supabase
      .from("scope_items")
      .select("id, item_code, name, item_path, status, quantity, unit, initial_unit_cost, initial_total_cost, actual_unit_cost, actual_total_cost, unit_sales_price, total_sales_price, production_percentage, is_installation_started, is_installed")
      .eq("project_id", resolvedId)
      .eq("is_deleted", false),
    supabase
      .from("drawings")
      .select("id, status")
      .eq("project_id", resolvedId)
      .eq("is_deleted", false),
    supabase
      .from("materials")
      .select("id, status")
      .eq("project_id", resolvedId)
      .eq("is_deleted", false),
    supabase
      .from("milestones")
      .select("id, name, due_date, is_completed")
      .eq("project_id", resolvedId)
      .eq("is_deleted", false)
      .order("due_date"),
    supabase
      .from("snagging")
      .select("id, is_resolved")
      .eq("project_id", resolvedId)
      .eq("is_deleted", false),
  ]);
  const scopeItems = scopeItemsResult.data || [];
  const drawings = drawingsResult.data || [];
  const materials = materialsResult.data || [];
  const milestones = milestonesResult.data || [];
  const snagging = snaggingResult.data || [];

  // Calculate progress per item
  const calculateProgress = (item: typeof scopeItems[0]): number => {
    if (item.item_path === "procurement") {
      return item.is_installed ? 100 : 0;
    }
    // Production: (production_percentage * 0.9) + (installation_started ? 5 : 0) + (installed ? 5 : 0)
    return (
      (item.production_percentage || 0) * 0.9 +
      (item.is_installation_started ? 5 : 0) +
      (item.is_installed ? 5 : 0)
    );
  };

  const overallProgress = scopeItems.length > 0
    ? Math.round(scopeItems.reduce((sum, item) => sum + calculateProgress(item), 0) / scopeItems.length)
    : 0;

  // Status breakdown
  const statusCounts: Record<string, number> = {};
  scopeItems.forEach((item) => {
    statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
  });
  const statusBreakdown = Object.entries(statusCounts)
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  // Completed items
  const completedStatuses = ["complete", "installed", "received"];
  const inProgressStatuses = ["in_production", "in_design", "awaiting_approval", "approved", "ordered"];
  const completedItems = scopeItems.filter((i) => completedStatuses.includes(i.status)).length;
  const inProgressItems = scopeItems.filter((i) => inProgressStatuses.includes(i.status)).length;
  const pendingItems = scopeItems.length - completedItems - inProgressItems;

  // Cost calculations
  const budgetAllocated = scopeItems.reduce((sum, i) => sum + (i.initial_total_cost || 0), 0);
  const actualSpent = scopeItems.reduce((sum, i) => sum + (i.actual_total_cost || ((i.quantity || 1) * (i.actual_unit_cost || 0))), 0);
  const totalSalesPrice = scopeItems.reduce((sum, i) => sum + (i.total_sales_price || 0), 0);

  const productionItems = scopeItems.filter((i) => i.item_path === "production");
  const procurementItems = scopeItems.filter((i) => i.item_path === "procurement");
  const productionCost = productionItems.reduce((sum, i) => sum + (i.actual_total_cost || ((i.quantity || 1) * (i.actual_unit_cost || 0))), 0);
  const procurementCost = procurementItems.reduce((sum, i) => sum + (i.actual_total_cost || ((i.quantity || 1) * (i.actual_unit_cost || 0))), 0);

  // Drawings & Materials approval counts
  const drawingsApproved = drawings.filter((d) => d.status === "approved" || d.status === "approved_with_comments").length;
  const materialsApproved = materials.filter((m) => m.status === "approved").length;

  const clientData = project.client as { company_name: string } | null;

  const summaryData: ExecutiveSummaryData = {
    projectCode: project.project_code,
    projectName: project.name,
    clientName: clientData?.company_name || "—",
    status: project.status,
    currency: project.currency || "TRY",
    installationDate: project.installation_date,
    description: project.description,
    contractValue: project.contract_value_manual || 0,
    budgetAllocated,
    actualSpent,
    totalSalesPrice,
    totalItems: scopeItems.length,
    productionItems: productionItems.length,
    procurementItems: procurementItems.length,
    completedItems,
    inProgressItems,
    pendingItems,
    overallProgress,
    statusBreakdown,
    milestones: milestones.map((m) => ({
      name: m.name,
      dueDate: m.due_date,
      isCompleted: m.is_completed ?? false,
    })),
    productionCost,
    procurementCost,
    drawingsApproved,
    drawingsTotal: drawings.length,
    materialsApproved,
    materialsTotal: materials.length,
    snaggingTotal: snagging.length,
    snaggingResolved: snagging.filter((s) => s.is_resolved).length,
  };

  // Generate PDF
  try {
    const { generateExecutiveSummaryPdfV2 } = await import("@/lib/pdf/executive-summary");
    const pdfBuffer = await generateExecutiveSummaryPdfV2(summaryData, options);

    const fileName = `${project.project_code}_Executive_Summary_${formatDate(new Date().toISOString())}.pdf`;

    return {
      success: true,
      data: {
        base64: pdfBuffer.toString("base64"),
        fileName,
      },
    };
  } catch (pdfError) {
    console.error("[generateExecutiveSummary] PDF generation failed:", pdfError);
    return { success: false, error: `PDF generation failed: ${pdfError instanceof Error ? pdfError.message : "Unknown error"}` };
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}
