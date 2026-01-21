import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { CommandMenu } from "@/components/layout/command-menu";
import { AppHeader, PageHeaderProvider } from "@/components/layout/app-header";

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
    <PageHeaderProvider>
      <SidebarProvider>
        <AppSidebar user={userData} />
        <SidebarInset className="flex flex-col overflow-hidden">
          {/* Unified top header with toggle, page info, search, notifications */}
          <AppHeader />
          {/* Page content */}
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </SidebarInset>
        {/* Global Command Menu - Cmd+K to open */}
        <CommandMenu userRole={userData.role} />
      </SidebarProvider>
    </PageHeaderProvider>
  );
}
