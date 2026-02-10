import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { createClient, getUserRoleFromJWT } from "@/lib/supabase/server";
import { isUUID } from "@/lib/slug";
import { TimelineClient } from "./timeline-client";
import { TimelinePageHeader } from "./timeline-page-header";

// ============================================================================
// STANDALONE TIMELINE PAGE
// Only fetches timeline-relevant data (not all 10 project datasets)
// Uses React Query for timeline data with optimistic updates
// ============================================================================

interface ScopeItem {
  id: string;
  item_code: string;
  name: string;
  production_percentage: number | null;
}

interface Project {
  id: string;
  project_code: string;
  name: string;
  slug: string | null;
  status: string;
  installation_date: string | null;
  client: {
    company_name: string;
  } | null;
}

export default async function TimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Opt out of static caching
  noStore();

  const { id } = await params;
  const supabase = await createClient();

  // Get user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    notFound();
  }

  // Get user role from JWT
  const userRole = await getUserRoleFromJWT(user, supabase);

  // Resolve project ID (support both UUID and slug)
  const isIdUUID = isUUID(id);
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

  // For client users, verify access
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

  // LIGHTWEIGHT DATA FETCH - Only what's needed for timeline
  // Timeline items and dependencies are fetched via React Query on client
  const [projectResult, scopeItemsResult] = await Promise.all([
    // Basic project info
    supabase
      .from("projects")
      .select(`
        id, project_code, name, slug, status, installation_date,
        client:clients(company_name)
      `)
      .eq("id", projectId)
      .single(),

    // Scope items (for linking to timeline tasks)
    supabase
      .from("scope_items")
      .select("id, item_code, name, production_percentage")
      .eq("project_id", projectId)
      .eq("is_deleted", false)
      .order("item_code"),
  ]);

  if (projectResult.error || !projectResult.data) {
    notFound();
  }

  const project = projectResult.data as Project;
  const scopeItems = (scopeItemsResult.data || []) as ScopeItem[];

  // Generate back link URL using slug if available
  const projectUrl = project.slug
    ? `/projects/${project.slug}`
    : `/projects/${project.id}`;

  return (
    <div className="flex flex-col h-full">
      {/* Push project info into the App Header */}
      <TimelinePageHeader
        projectName={project.name}
        projectCode={project.project_code}
        clientName={project.client?.company_name || null}
        status={project.status}
        backUrl={projectUrl}
      />

      {/* Timeline Content (React Query powered) - minimal padding for max Gantt space */}
      <div className="flex-1 overflow-hidden px-4 pt-4 pb-2">
        <TimelineClient
          projectId={projectId}
          scopeItems={scopeItems}
          canEdit={canEdit}
          showHeader={false}
        />
      </div>
    </div>
  );
}
