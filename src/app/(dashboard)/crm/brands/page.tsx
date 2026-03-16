import { createClient, getUserProfileFromJWT } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BrandsTable } from "./brands-table";

export default async function BrandsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getUserProfileFromJWT(user, supabase);

  if (!["admin", "management"].includes(profile.role)) {
    redirect("/dashboard");
  }

  return <BrandsTable userRole={profile.role} />;
}
