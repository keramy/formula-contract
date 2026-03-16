import { createClient, getUserProfileFromJWT } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PipelineBoard } from "./pipeline-board";

export default async function PipelinePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getUserProfileFromJWT(user, supabase);

  if (!["admin", "management"].includes(profile.role)) {
    redirect("/dashboard");
  }

  return <PipelineBoard userRole={profile.role} />;
}
