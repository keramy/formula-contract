/**
 * Server-Side Caching Utilities
 *
 * Uses Next.js unstable_cache to cache expensive database queries.
 * This dramatically improves performance for:
 * - COUNT queries (which can't use Supabase's built-in caching)
 * - Stats that don't need real-time accuracy
 * - Data that changes infrequently
 *
 * Cache is automatically invalidated after the TTL expires.
 * You can also manually revalidate using revalidateTag().
 *
 * IMPORTANT: Uses service role client (not cookie-based) because
 * unstable_cache cannot use dynamic functions like cookies().
 */

import { unstable_cache } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";

// Cache TTL in seconds
const STATS_CACHE_TTL = 60; // 1 minute for dashboard stats
const PROJECT_CACHE_TTL = 30; // 30 seconds for project data

/**
 * Get cached dashboard statistics
 * Caches COUNT queries which are slow in PostgreSQL
 */
export const getCachedDashboardStats = unstable_cache(
  async () => {
    const start = performance.now();
    const supabase = createServiceRoleClient();

    const [projectsResult, clientCountResult, userCountResult] = await Promise.all([
      // Get all projects (for status counts)
      supabase.from("projects").select("id, status").eq("is_deleted", false),
      // Client count
      supabase.from("clients").select("*", { count: "exact", head: true }).eq("is_deleted", false),
      // User count
      supabase.from("users").select("*", { count: "exact", head: true }).eq("is_active", true),
    ]);

    if (projectsResult.error) throw new Error(`[Cache] getDashboardStats/projects: ${projectsResult.error.message}`);
    if (clientCountResult.error) throw new Error(`[Cache] getDashboardStats/clients: ${clientCountResult.error.message}`);
    if (userCountResult.error) throw new Error(`[Cache] getDashboardStats/users: ${userCountResult.error.message}`);

    const projects = projectsResult.data || [];
    const projectCounts = {
      total: projects.length,
      active: projects.filter((p) => p.status === "active").length,
      tender: projects.filter((p) => p.status === "tender").length,
      on_hold: projects.filter((p) => p.status === "on_hold").length,
      completed: projects.filter((p) => p.status === "completed").length,
      cancelled: projects.filter((p) => p.status === "cancelled").length,
      not_awarded: projects.filter((p) => p.status === "not_awarded").length,
    };

    console.log(`  📊 [CACHE] Dashboard stats fetched in ${(performance.now() - start).toFixed(0)}ms`);

    return {
      projectCounts,
      clientCount: clientCountResult.count || 0,
      userCount: userCountResult.count || 0,
    };
  },
  ["dashboard-stats"],
  {
    revalidate: STATS_CACHE_TTL,
    tags: ["dashboard-stats"],
  }
);

/**
 * Get cached recent projects for dashboard
 * Enhanced with progress calculation and client initials
 */
export const getCachedRecentProjects = unstable_cache(
  async () => {
    const start = performance.now();
    const supabase = createServiceRoleClient();

    // Get recent projects (includes slug for URL-friendly links)
    // Note: slug column added by migration 015_add_project_slug.sql
    const projectsResult = await supabase
      .from("projects")
      .select("id, slug, project_code, name, status, client_id")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(5);
    if (projectsResult.error) throw new Error(`[Cache] getRecentProjects/projects: ${projectsResult.error.message}`);

    // Type assertion for projects with slug (column added by migration)
    const projects = projectsResult.data as { id: string; slug: string | null; project_code: string; name: string; status: string; client_id: string | null }[] | null;

    if (!projects || projects.length === 0) {
      console.log(`  📊 [CACHE] Recent projects: 0 found in ${(performance.now() - start).toFixed(0)}ms`);
      return [];
    }

    const projectIds = projects.map(p => p.id);

    // Get client names and scope items for progress in parallel
    const clientIds = projects
      .map(p => p.client_id)
      .filter((id): id is string => id !== null);

    const [clientsResult, scopeItemsResult] = await Promise.all([
      clientIds.length > 0
        ? supabase.from("clients").select("id, company_name").in("id", clientIds)
        : Promise.resolve({ data: [] }),
      supabase
        .from("scope_items")
        .select("project_id, item_path, production_percentage, is_installed, is_installation_started, is_shipped")
        .in("project_id", projectIds)
        .eq("is_deleted", false),
    ]);

    const clientMap = new Map<string, string>();
    clientsResult.data?.forEach((c: { id: string; company_name: string }) =>
      clientMap.set(c.id, c.company_name)
    );

    // Calculate progress per project using the formula from CLAUDE.md
    // Production items: (production_percentage × 0.9) + (installation_started ? 5 : 0) + (installed ? 5 : 0)
    // Procurement items: installed ? 100 : 0
    const progressMap = new Map<string, { totalProgress: number; itemCount: number }>();

    for (const item of scopeItemsResult.data || []) {
      const current = progressMap.get(item.project_id) || { totalProgress: 0, itemCount: 0 };
      let itemProgress = 0;

      if (item.item_path === "production") {
        const prodPct = item.production_percentage || 0;
        itemProgress = (prodPct * 0.9) +
          (item.is_installation_started ? 5 : 0) +
          (item.is_installed ? 5 : 0);
      } else {
        // Procurement path
        itemProgress = item.is_installed ? 100 : 0;
      }

      current.totalProgress += itemProgress;
      current.itemCount += 1;
      progressMap.set(item.project_id, current);
    }

    // Merge client data and progress
    const projectsWithClients = projects.map(project => {
      const progressData = progressMap.get(project.id);
      const progress = progressData && progressData.itemCount > 0
        ? Math.round(progressData.totalProgress / progressData.itemCount)
        : 0;

      const clientName = project.client_id ? clientMap.get(project.client_id) || null : null;

      return {
        id: project.id,
        slug: project.slug,
        project_code: project.project_code,
        name: project.name,
        status: project.status,
        progress,
        itemCount: progressData?.itemCount || 0,
        client: {
          company_name: clientName,
          initials: clientName
            ? clientName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
            : null,
        },
      };
    });

    console.log(`  📊 [CACHE] Recent projects fetched in ${(performance.now() - start).toFixed(0)}ms`);

    return projectsWithClients;
  },
  ["recent-projects"],
  {
    revalidate: STATS_CACHE_TTL,
    tags: ["recent-projects", "projects"],
  }
);

/**
 * Get cached project detail data
 * Caches the main project query for faster subsequent loads
 */
export const getCachedProjectDetail = unstable_cache(
  async (projectId: string) => {
    const start = performance.now();
    const supabase = createServiceRoleClient();

    const [
      projectResult,
      scopeItemsResult,
      materialsResult,
      snaggingResult,
      milestonesResult,
    ] = await Promise.all([
      // Project with client
      supabase
        .from("projects")
        .select(`
          id, project_code, name, description, status, installation_date, contract_value_manual, currency,
          client:clients(id, company_name, contact_person, email, phone)
        `)
        .eq("id", projectId)
        .single(),
      // Scope items
      supabase
        .from("scope_items")
        .select("id, item_code, name, description, width, depth, height, item_path, status, quantity, unit, unit_cost, initial_total_cost, unit_sales_price, total_sales_price, production_percentage, is_installed, notes, images")
        .eq("project_id", projectId)
        .eq("is_deleted", false)
        .order("item_code"),
      // Materials with item_materials
      supabase
        .from("materials")
        .select(`
          id, material_code, name, specification, supplier, images, status,
          item_materials(item_id, material_id)
        `)
        .eq("project_id", projectId)
        .eq("is_deleted", false)
        .order("material_code"),
      // Snagging
      supabase
        .from("snagging")
        .select(`
          id, project_id, item_id, description, photos, is_resolved,
          resolved_at, resolved_by, resolution_notes, created_by, created_at,
          item:scope_items!snagging_item_id_fkey(item_code, name),
          creator:users!snagging_created_by_fkey(name),
          resolver:users!snagging_resolved_by_fkey(name)
        `)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
      // Milestones
      supabase
        .from("milestones")
        .select("id, project_id, name, description, due_date, is_completed, completed_at, alert_days_before")
        .eq("project_id", projectId)
        .order("due_date"),
    ]);

    console.log(`  📊 [CACHE] Project detail fetched in ${(performance.now() - start).toFixed(0)}ms`);

    // Log non-critical errors but don't throw (enrichment queries)
    if (scopeItemsResult.error) console.error("[Cache] getProjectDetail/scopeItems:", scopeItemsResult.error.message);
    if (materialsResult.error) console.error("[Cache] getProjectDetail/materials:", materialsResult.error.message);
    if (snaggingResult.error) console.error("[Cache] getProjectDetail/snagging:", snaggingResult.error.message);
    if (milestonesResult.error) console.error("[Cache] getProjectDetail/milestones:", milestonesResult.error.message);

    return {
      project: projectResult.data,
      projectError: projectResult.error,
      scopeItems: scopeItemsResult.data || [],
      materials: materialsResult.data || [],
      snagging: snaggingResult.data || [],
      milestones: milestonesResult.data || [],
    };
  },
  ["project-detail"],
  {
    revalidate: PROJECT_CACHE_TTL,
    tags: ["project-detail"],
  }
);
