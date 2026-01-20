"use server";

import { createClient } from "@/lib/supabase/server";

export interface SearchResult {
  id: string;
  type: "project" | "client" | "user" | "report";
  title: string;
  subtitle?: string;
  href: string;
  icon?: string;
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const supabase = await createClient();
  const searchTerm = `%${query.toLowerCase().trim()}%`;
  const results: SearchResult[] = [];

  // Search in parallel for better performance
  const [
    { data: projects },
    { data: clients },
    { data: users },
    { data: reports },
  ] = await Promise.all([
    // Search projects
    supabase
      .from("projects")
      .select("id, name, project_code, status, client_id")
      .eq("is_deleted", false)
      .or(`name.ilike.${searchTerm},project_code.ilike.${searchTerm}`)
      .limit(5),
    // Search clients
    supabase
      .from("clients")
      .select("id, company_name, contact_person")
      .ilike("company_name", searchTerm)
      .limit(5),
    // Search users (PM and admin only should see this)
    supabase
      .from("users")
      .select("id, name, email, role")
      .eq("is_active", true)
      .or(`name.ilike.${searchTerm},email.ilike.${searchTerm}`)
      .limit(5),
    // Search reports by project
    supabase
      .from("reports")
      .select("id, report_type, project_id")
      .limit(10),
  ]);

  // Get client names for projects
  const clientIds = projects?.map(p => p.client_id).filter(Boolean) as string[] || [];
  const { data: projectClients } = clientIds.length > 0
    ? await supabase.from("clients").select("id, company_name").in("id", clientIds)
    : { data: [] };
  const clientMap = new Map(projectClients?.map(c => [c.id, c.company_name]) || []);

  // Get project info for reports
  const reportProjectIds = reports?.map(r => r.project_id).filter(Boolean) as string[] || [];
  const { data: reportProjects } = reportProjectIds.length > 0
    ? await supabase.from("projects").select("id, name, project_code").in("id", reportProjectIds)
    : { data: [] };
  const projectMap = new Map(reportProjects?.map(p => [p.id, { name: p.name, code: p.project_code }]) || []);

  // Map projects to results
  if (projects) {
    for (const project of projects) {
      const clientName = project.client_id ? clientMap.get(project.client_id) : null;
      results.push({
        id: project.id,
        type: "project",
        title: project.name,
        subtitle: `${project.project_code} • ${clientName || "No client"}`,
        href: `/projects/${project.id}`,
        icon: "folder",
      });
    }
  }

  // Map clients to results
  if (clients) {
    for (const client of clients) {
      results.push({
        id: client.id,
        type: "client",
        title: client.company_name,
        subtitle: client.contact_person || "Client",
        href: `/clients/${client.id}`,
        icon: "building",
      });
    }
  }

  // Map users to results
  if (users) {
    for (const user of users) {
      results.push({
        id: user.id,
        type: "user",
        title: user.name || user.email,
        subtitle: user.role,
        href: `/users/${user.id}`,
        icon: "user",
      });
    }
  }

  // Map reports to results (filter by search term in project name/code)
  if (reports) {
    for (const report of reports) {
      const project = projectMap.get(report.project_id);
      // Only include if project name/code matches search
      if (project && (
        project.name.toLowerCase().includes(query.toLowerCase()) ||
        project.code.toLowerCase().includes(query.toLowerCase())
      )) {
        results.push({
          id: report.id,
          type: "report",
          title: `${report.report_type} Report`,
          subtitle: project ? `${project.code} - ${project.name}` : "Report",
          href: `/reports/${report.id}`,
          icon: "file-text",
        });
      }
    }
  }

  return results;
}

// Get recent items for command menu suggestions
export async function getRecentItems(): Promise<SearchResult[]> {
  const supabase = await createClient();
  const results: SearchResult[] = [];

  // Get recent projects (last 5)
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, project_code, client_id")
    .eq("is_deleted", false)
    .order("updated_at", { ascending: false })
    .limit(5);

  if (projects) {
    // Get client names
    const clientIds = projects.map(p => p.client_id).filter(Boolean) as string[];
    const { data: clients } = clientIds.length > 0
      ? await supabase.from("clients").select("id, company_name").in("id", clientIds)
      : { data: [] };
    const clientMap = new Map(clients?.map(c => [c.id, c.company_name]) || []);

    for (const project of projects) {
      const clientName = project.client_id ? clientMap.get(project.client_id) : null;
      results.push({
        id: project.id,
        type: "project",
        title: project.name,
        subtitle: `${project.project_code} • ${clientName || "No client"}`,
        href: `/projects/${project.id}`,
        icon: "folder",
      });
    }
  }

  return results;
}
