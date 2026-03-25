import { redirect } from "next/navigation";
import { createClient, getUserProfileFromJWT } from "@/lib/supabase/server";
import { FinanceAccessManager } from "./finance-access-manager";

export default async function FinanceAccessPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getUserProfileFromJWT(user, supabase);
  if (profile.role !== "admin") redirect("/dashboard");

  return <FinanceAccessManager />;
}
