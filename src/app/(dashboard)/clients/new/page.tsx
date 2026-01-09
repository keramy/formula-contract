import { ClientForm } from "../client-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";

export default function NewClientPage() {
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
        <h1 className="text-2xl font-semibold text-foreground">New Client</h1>
        <p className="text-muted-foreground">Add a new client to your database</p>
      </div>

      {/* Form */}
      <ClientForm />
    </div>
  );
}
