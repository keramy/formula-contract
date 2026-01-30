import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileForm } from "./profile-form";
import { ChangePasswordForm } from "./change-password-form";
import { ProfilePageHeader } from "./profile-page-header";

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50/50 via-white to-gray-50/50 p-6">
      <div className="max-w-2xl">
        <ProfilePageHeader />

        <div className="space-y-6">
          {/* Profile Information */}
          <ProfileForm
            userId={profile.id}
            initialData={{
              name: profile.name,
              email: profile.email,
              phone: profile.phone || "",
              role: profile.role,
              createdAt: profile.created_at || new Date().toISOString(),
              lastLoginAt: profile.last_login_at || null,
            }}
          />

          {/* Change Password */}
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
