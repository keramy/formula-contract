import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { ClientsTable } from "./clients-table";

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Clients</h1>
          <p className="text-muted-foreground">Manage your client relationships</p>
        </div>
        <Button asChild>
          <Link href="/clients/new">
            <PlusIcon className="size-4" />
            New Client
          </Link>
        </Button>
      </div>

      {/* Clients Table */}
      <Suspense fallback={<div className="py-8 text-center text-muted-foreground">Loading clients...</div>}>
        <ClientsTable clients={clients || []} />
      </Suspense>
    </div>
  );
}
