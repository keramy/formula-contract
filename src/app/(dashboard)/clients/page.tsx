import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { ClientsTable } from "./clients-table";
import { ClientsPageHeader } from "./clients-page-header";
import { AlertTriangleIcon } from "lucide-react";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  // Build query
  let query = supabase
    .from("clients")
    .select("*")
    .eq("is_deleted", false)
    .order("company_name");

  if (params.search) {
    query = query.or(`company_name.ilike.%${params.search}%,contact_person.ilike.%${params.search}%`);
  }

  const { data: clients, error } = await query;

  if (error) {
    console.error("Error fetching clients:", error);
    return (
      <div className="p-4 md:p-6">
        <ClientsPageHeader />
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6 text-center">
          <AlertTriangleIcon className="size-8 text-destructive mx-auto mb-2" />
          <h3 className="font-medium text-destructive">Failed to load clients</h3>
          <p className="text-sm text-muted-foreground mt-1">{error.message || "An unexpected error occurred"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {/* Page Header */}
      <ClientsPageHeader />

      {/* Clients Table */}
      <Suspense fallback={<div className="py-8 text-center text-muted-foreground">Loading clients...</div>}>
        <ClientsTable clients={clients || []} />
      </Suspense>
    </div>
  );
}
