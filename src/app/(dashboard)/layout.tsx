import { redirect } from "next/navigation";
import { getRequestContext } from "@/lib/supabase/server";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { CommandMenu } from "@/components/layout/command-menu";
import { AppHeader, PageHeaderProvider } from "@/components/layout/app-header";
import { ErrorBoundary } from "@/components/error-boundary";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // PERF: Use JWT metadata only — no DB query for profile.
  // The old pattern queried the users table on every page render,
  // which was timing out on Small compute and showing "User" as fallback.
  const ctx = await getRequestContext();
  if (!ctx) redirect("/login");

  const { user, role } = ctx;
  const userData = {
    name: user.user_metadata?.name || user.email?.split("@")[0] || "User",
    email: user.email || "",
    role: role,
  };

  return (
    <PageHeaderProvider>
      <SidebarProvider>
        <AppSidebar user={userData} />
        <SidebarInset className="flex flex-col overflow-hidden">
          {/* Unified top header with toggle, page info, search, notifications */}
          <AppHeader />
          {/* Page content - wrapped in ErrorBoundary for graceful error handling */}
          <div className="flex-1 overflow-auto overflow-x-hidden flex flex-col">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
        </SidebarInset>
        {/* Global Command Menu - Cmd+K to open */}
        <CommandMenu userRole={userData.role} />
      </SidebarProvider>
    </PageHeaderProvider>
  );
}
