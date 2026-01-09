import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProjectForm } from "../../project-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";

interface Project {
  id: string;
  project_code: string;
  name: string;
  description: string | null;
  client_id: string | null;
  status: string;
  installation_date: string | null;
  contract_value_manual: number | null;
  currency: string;
}

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch the project
  const { data, error: projectError } = await supabase
    .from("projects")
    .select("id, project_code, name, description, client_id, status, installation_date, contract_value_manual, currency")
    .eq("id", id)
    .single();

  const project = data as Project | null;

  if (projectError || !project) {
    notFound();
  }

  // Fetch clients for dropdown
  const { data: clients } = await supabase
    .from("clients")
    .select("id, company_name")
    .eq("is_deleted", false)
    .order("company_name");

  return (
    <div className="p-6 max-w-2xl">
      {/* Page Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
          <Link href={`/projects/${id}`}>
            <ArrowLeftIcon className="size-4" />
            Back to Project
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold text-foreground">Edit Project</h1>
        <p className="text-muted-foreground">Update project details</p>
      </div>

      {/* Form */}
      <ProjectForm
        clients={clients || []}
        initialData={{
          id: project.id,
          project_code: project.project_code,
          name: project.name,
          description: project.description,
          client_id: project.client_id,
          status: project.status,
          installation_date: project.installation_date,
          contract_value_manual: project.contract_value_manual,
          currency: project.currency,
        }}
      />
    </div>
  );
}
