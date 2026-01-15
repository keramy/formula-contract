import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { ClientsTable } from "./clients-table";
import { ClientsPageHeader } from "./clients-page-header";

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
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <ClientsPageHeader />

      {/* Clients Table */}
      <Suspense fallback={<div className="py-8 text-center text-muted-foreground">Loading clients...</div>}>
        <ClientsTable clients={clients || []} />
      </Suspense>
    </div>
  );
}
