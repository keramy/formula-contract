import { redirect } from "next/navigation";
import { checkFinanceAccess } from "@/lib/actions/finance";
import { createClient } from "@/lib/supabase/server";
import { InvoicesTable } from "./invoices-table";

export default async function InvoicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const hasAccess = await checkFinanceAccess();
  if (!hasAccess) redirect("/dashboard");

  return <InvoicesTable />;
}
