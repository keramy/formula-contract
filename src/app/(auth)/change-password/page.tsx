import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChangePasswordForm } from "./change-password-form";

export default async function ChangePasswordPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const mustChangePassword = user.user_metadata?.must_change_password === true;
  if (!mustChangePassword) {
    redirect("/dashboard");
  }

  return <ChangePasswordForm userEmail={user.email ?? null} />;
}
