import { redirect } from "next/navigation";
import { checkFinanceAccess } from "@/lib/actions/finance";
import { createClient, getUserProfileFromJWT } from "@/lib/supabase/server";
import { PaymentsDashboard } from "./payments-dashboard";

export default async function PaymentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const hasAccess = await checkFinanceAccess();
  if (!hasAccess) redirect("/dashboard");

  const profile = await getUserProfileFromJWT(user, supabase);

  return <PaymentsDashboard userRole={profile.role} />;
}
