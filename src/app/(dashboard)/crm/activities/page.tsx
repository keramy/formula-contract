import { createClient, getUserProfileFromJWT } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ActivitiesTimeline } from "./activities-timeline";

export default async function ActivitiesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getUserProfileFromJWT(user, supabase);

  if (!["admin", "management"].includes(profile.role)) {
    redirect("/dashboard");
  }

  return <ActivitiesTimeline userRole={profile.role} />;
}
