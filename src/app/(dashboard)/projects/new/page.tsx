import { createClient } from "@/lib/supabase/server";
import { ProjectWizard } from "./project-wizard";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";

export default async function NewProjectPage() {
  const supabase = await createClient();

  // Fetch clients and users in parallel
  const [{ data: clients }, { data: users }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, company_name")
      .eq("is_deleted", false)
      .order("company_name"),
    supabase
      .from("users")
      .select("id, name, email, role")
      .eq("is_active", true)
      .order("name"),
  ]);

  return (
    <div className="p-6 max-w-3xl">
      {/* Page Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
          <Link href="/projects">
            <ArrowLeftIcon className="size-4" />
            Back to Projects
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold text-foreground">New Project</h1>
        <p className="text-muted-foreground">Create a new furniture manufacturing project</p>
      </div>

      {/* Multi-Step Wizard */}
      <ProjectWizard clients={clients || []} users={users || []} />
    </div>
  );
}
