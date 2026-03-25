import { redirect } from "next/navigation";
import { checkFinanceAccess } from "@/lib/actions/finance";
import { createClient } from "@/lib/supabase/server";
import { InvoiceDetail } from "./invoice-detail";

interface InvoiceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const hasAccess = await checkFinanceAccess();
  if (!hasAccess) redirect("/dashboard");

  return <InvoiceDetail id={id} />;
}
