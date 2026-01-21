import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveProjectIdentifier } from "@/lib/slug";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";
import { ScopeItemForm } from "../../scope-item-form";

interface ScopeItemData {
  id: string;
  item_code: string;
  name: string;
  description: string | null;
  width: number | null;
  depth: number | null;
  height: number | null;
  unit: string;
  quantity: number;
  // Cost tracking fields (what WE pay)
  unit_cost: number | null;
  initial_total_cost: number | null;
  // Sales price fields (what CLIENT pays)
  unit_sales_price: number | null;
  item_path: string;
  status: string;
  notes: string | null;
  images: string[] | null;
  project: {
    currency: string;
  };
}

export default async function EditScopeItemPage({
  params,
}: {
  params: Promise<{ id: string; itemId: string }>;
}) {
  const { id: projectIdOrSlug, itemId } = await params;
  const supabase = await createClient();

  // Resolve project identifier (could be slug or UUID)
  const projectInfo = await resolveProjectIdentifier(supabase, projectIdOrSlug);
  if (!projectInfo) {
    notFound();
  }
  const { projectId, projectSlug } = projectInfo;
  const projectUrlId = projectSlug || projectId;

  // Fetch scope item with project currency
  const { data, error } = await supabase
    .from("scope_items")
    .select(`
      id, item_code, name, description, width, depth, height,
      unit, quantity, unit_cost, initial_total_cost, unit_sales_price,
      item_path, status, notes, images,
      project:projects(currency)
    `)
    .eq("id", itemId)
    .eq("project_id", projectId)
    .eq("is_deleted", false)
    .single();

  const scopeItem = data as ScopeItemData | null;

  if (error || !scopeItem) {
    notFound();
  }

  return (
    <div className="p-6 max-w-2xl">
      {/* Page Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
          <Link href={`/projects/${projectUrlId}/scope/${itemId}`}>
            <ArrowLeftIcon className="size-4" />
            Back to Item
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold text-foreground">Edit Scope Item</h1>
        <p className="text-muted-foreground">Update the details for {scopeItem.name}</p>
      </div>

      {/* Form */}
      <ScopeItemForm
        projectId={projectId}
        projectCurrency={scopeItem.project.currency}
        initialData={scopeItem}
      />
    </div>
  );
}
