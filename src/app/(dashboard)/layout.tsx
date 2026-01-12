import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { NotificationsDropdown } from "@/components/notifications/notifications-dropdown";

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
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <div className="ml-auto flex items-center gap-2">
            <NotificationsDropdown />
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
