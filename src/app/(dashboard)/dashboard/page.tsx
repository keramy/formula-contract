import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanbanIcon, ClipboardCheckIcon, ClockIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get user profile
  let profile: UserProfile | null = null;
  if (user) {
    const { data } = await supabase
      .from("users")
      .select("id, email, name, role")
      .eq("id", user.id)
      .single();
    profile = data as UserProfile | null;
  }

  // Get project counts
  const { count: activeProjectsCount } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true })
    .eq("is_deleted", false)
    .eq("status", "active");

  const { count: tenderProjectsCount } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true })
    .eq("is_deleted", false)
    .eq("status", "tender");

  const { count: totalProjectsCount } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true })
    .eq("is_deleted", false);

  // Get recent projects
  const { data: recentProjects } = await supabase
    .from("projects")
    .select("id, project_code, name, status, created_at")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(5);

  const displayName = profile?.name || user?.email || "User";

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {displayName}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <FolderKanbanIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProjectsCount || 0}</div>
            <p className="text-xs text-muted-foreground">Projects in progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tender Projects</CardTitle>
            <ClipboardCheckIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenderProjectsCount || 0}</div>
            <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <ClockIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProjectsCount || 0}</div>
            <p className="text-xs text-muted-foreground">All projects</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Projects</CardTitle>
          <CardDescription>Your latest project updates</CardDescription>
        </CardHeader>
        <CardContent>
          {recentProjects && recentProjects.length > 0 ? (
            <div className="space-y-4">
              {(recentProjects as Array<{id: string; project_code: string; name: string; status: string; created_at: string}>).map((project) => (
                <div key={project.id} className="flex items-center justify-between">
                  <div>
                    <Link href={`/projects/${project.id}`} className="font-medium hover:underline">
                      {project.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">{project.project_code}</p>
                  </div>
                  <span className="text-xs capitalize px-2 py-1 rounded bg-muted">
                    {project.status.replace("_", " ")}
                  </span>
                </div>
              ))}
              <div className="pt-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/projects">View all projects</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="rounded-full bg-muted p-3 mb-4">
                <FolderKanbanIcon className="size-6 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-1">No projects yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-4">
                Create your first project to start tracking work.
              </p>
              <Button asChild>
                <Link href="/projects/new">Create Project</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
