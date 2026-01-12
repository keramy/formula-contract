import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileForm } from "./profile-form";
import { ChangePasswordForm } from "./change-password-form";

export default async function ProfilePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("users")
    .select("id, email, name, phone, role, created_at, last_login_at")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Profile Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <div className="space-y-6">
        {/* Profile Information */}
        <ProfileForm
          userId={profile.id}
          initialData={{
            name: profile.name,
            email: profile.email,
            phone: profile.phone || "",
            role: profile.role,
            createdAt: profile.created_at,
            lastLoginAt: profile.last_login_at,
          }}
        />

        {/* Change Password */}
        <ChangePasswordForm />
      </div>
    </div>
  );
}
