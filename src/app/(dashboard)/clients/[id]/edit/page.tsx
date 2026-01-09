import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClientForm } from "../../client-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";

interface Client {
  id: string;
  company_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
}

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch the client
  const { data, error } = await supabase
    .from("clients")
    .select("id, company_name, contact_person, email, phone, address, notes")
    .eq("id", id)
    .single();

  const client = data as Client | null;

  if (error || !client) {
    notFound();
  }

  return (
    <div className="p-6 max-w-2xl">
      {/* Page Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
          <Link href="/clients">
            <ArrowLeftIcon className="size-4" />
            Back to Clients
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold text-foreground">Edit Client</h1>
        <p className="text-muted-foreground">Update client information</p>
      </div>

      {/* Form */}
      <ClientForm initialData={client} />
    </div>
  );
}
