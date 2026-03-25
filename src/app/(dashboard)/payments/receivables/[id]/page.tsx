import { redirect } from "next/navigation";
import { checkFinanceAccess } from "@/lib/actions/finance";
import { createClient } from "@/lib/supabase/server";
import { ReceivableDetail } from "./receivable-detail";

interface ReceivableDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReceivableDetailPage({ params }: ReceivableDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const hasAccess = await checkFinanceAccess();
  if (!hasAccess) redirect("/dashboard");

  return <ReceivableDetail id={id} />;
}
