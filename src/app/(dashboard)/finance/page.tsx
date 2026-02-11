import { redirect } from "next/navigation";
import { createClient, getUserProfileFromJWT } from "@/lib/supabase/server";
import {
  getFinanceKPIs,
  getBudgetTrend,
  getBudgetBreakdown,
  getProjectCosts,
} from "@/lib/actions/finance";
import { KPICards } from "@/components/finance/kpi-cards";
import { BudgetTrendChart } from "@/components/finance/budget-trend-chart";
import { BudgetBreakdown } from "@/components/finance/budget-breakdown";
import { ProjectCostsTable } from "@/components/finance/project-costs-table";
import { FinancePageHeader } from "./finance-page-header";

export default async function FinancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check authorization - only admin and management can access
  const profile = await getUserProfileFromJWT(user, supabase);
  const canAccess = ["admin", "management"].includes(profile.role);

  if (!canAccess) {
    redirect("/dashboard");
  }

  // Fetch all finance data in parallel
  const [kpis, budgetTrend, budgetBreakdown, projectCosts] = await Promise.all([
    getFinanceKPIs(),
    getBudgetTrend(),
    getBudgetBreakdown(),
    getProjectCosts(),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-6 space-y-6">
        {/* Page Header */}
        <FinancePageHeader />

        {/* KPI Cards Row */}
        <KPICards data={kpis} />

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          <BudgetTrendChart data={budgetTrend} currency={kpis.currency} />
          <BudgetBreakdown data={budgetBreakdown} currency={kpis.currency} />
        </div>

        {/* Project Costs Table */}
        <ProjectCostsTable data={projectCosts} />
      </div>
    </div>
  );
}
