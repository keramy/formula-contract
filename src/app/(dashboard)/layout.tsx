import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user profile
  let profile: UserProfile | null = null;
  const { data } = await supabase
    .from("users")
    .select("id, email, name, role")
    .eq("id", user.id)
    .single();
  profile = data as UserProfile | null;

  const userData = {
    name: profile?.name || user.email || "User",
    email: user.email || "",
    role: profile?.role || "user",
  };

  return (
    <SidebarProvider>
      <AppSidebar user={userData} />
      <SidebarInset className="overflow-auto">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
