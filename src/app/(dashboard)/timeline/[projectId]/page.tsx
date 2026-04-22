import { notFound, redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { createClient, getUserRoleFromJWT } from "@/lib/supabase/server";
import { isUUID } from "@/lib/slug";
import { TimelineClient } from "@/app/(dashboard)/projects/[id]/timeline/timeline-client";
import { TimelineDetailHeader } from "./timeline-detail-header";

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
  client: { company_name: string } | null;
}

interface SwitcherProject {
  id: string;
  slug: string | null;
  project_code: string;
  name: string;
  status: string;
}

export default async function TimelineDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  noStore();

  const { projectId: idOrSlug } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const userRole = await getUserRoleFromJWT(user, supabase);
  if (userRole === "client") redirect("/dashboard");

  // Resolve UUID (support both UUID and slug)
  let projectId = idOrSlug;
  if (!isUUID(idOrSlug)) {
    const { data: projectBySlug } = await supabase
      .from("projects")
      .select("id")
      .eq("slug", idOrSlug)
      .single();
    if (!projectBySlug) notFound();
    projectId = projectBySlug.id;
  }

  const canEdit = ["admin", "pm"].includes(userRole);

  const [projectResult, scopeItemsResult, assignmentsResult, allProjectsResult] = await Promise.all([
    supabase
      .from("projects")
      .select(`id, project_code, name, slug, status, installation_date, client:clients(company_name)`)
      .eq("id", projectId)
      .single(),
    supabase
      .from("scope_items")
      .select("id, item_code, name, production_percentage")
      .eq("project_id", projectId)
      .eq("is_deleted", false)
      .order("item_code"),
    supabase.from("project_assignments").select("project_id").eq("user_id", user.id),
    // For the in-header project switcher: same visibility rules as the picker
    supabase
      .from("projects")
      .select("id, slug, project_code, name, status")
      .eq("is_deleted", false)
      .in("status", ["active", "tender"])
      .order("installation_date", { ascending: true, nullsFirst: false }),
  ]);

  if (projectResult.error || !projectResult.data) notFound();

  const project = projectResult.data as Project;
  const scopeItems = (scopeItemsResult.data || []) as ScopeItem[];

  // Role-based filter for switcher list — admin/management see all; else only assigned
  const canSeeAll = ["admin", "management"].includes(userRole);
  const assignedIds = new Set(((assignmentsResult.data) || []).map((a) => a.project_id));
  let switcherProjects = (allProjectsResult.data || []) as SwitcherProject[];
  if (!canSeeAll) {
    switcherProjects = switcherProjects.filter((p) => assignedIds.has(p.id));
  }

  return (
    <div className="flex flex-col h-full">
      <TimelineDetailHeader
        projectId={project.id}
        projectName={project.name}
        projectCode={project.project_code}
        clientName={project.client?.company_name || null}
        status={project.status}
        switcherProjects={switcherProjects}
        currentUser={{
          id: user.id,
          name: (user.user_metadata?.name as string | undefined) || user.email?.split("@")[0] || "You",
        }}
      />

      <div className="flex-1 overflow-hidden px-3 md:px-4 pt-4 pb-2">
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
