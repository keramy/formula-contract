import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveProjectIdentifier } from "@/lib/slug";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";
import { ScopeItemForm } from "../scope-item-form";

export default async function NewScopeItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectIdOrSlug } = await params;
  const supabase = await createClient();

  // Resolve project identifier (could be slug or UUID)
  const projectInfo = await resolveProjectIdentifier(supabase, projectIdOrSlug);
  if (!projectInfo) {
    notFound();
  }
  const { projectId, projectSlug } = projectInfo;
  const projectUrlId = projectSlug || projectId;

  // Fetch project to get currency
  const { data: projectData, error } = await supabase
    .from("projects")
    .select("id, name, currency")
    .eq("id", projectId)
    .single();

  const project = projectData as { id: string; name: string; currency: string } | null;

  if (error || !project) {
    notFound();
  }

  return (
    <div className="p-6 max-w-2xl">
      {/* Page Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
          <Link href={`/projects/${projectUrlId}`}>
            <ArrowLeftIcon className="size-4" />
            Back to Project
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold text-foreground">Add Scope Item</h1>
        <p className="text-muted-foreground">Add a new item to {project.name}</p>
      </div>

      {/* Form */}
      <ScopeItemForm projectId={projectId} projectCurrency={project.currency} />
    </div>
  );
}
