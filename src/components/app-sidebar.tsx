"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboardIcon,
  FolderKanbanIcon,
  BuildingIcon,
  UsersIcon,
  FileTextIcon,
  SettingsIcon,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { UserMenu } from "@/components/user-menu";

interface AppSidebarProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
}

// Define which roles can access which routes
const routePermissions: Record<string, string[]> = {
  "/dashboard": ["admin", "pm", "production", "procurement", "management", "client"],
  "/projects": ["admin", "pm", "production", "procurement", "management", "client"], // Clients see assigned projects
  "/clients": ["admin", "pm"],
  "/users": ["admin"],
  "/reports": ["admin", "pm", "management", "client"], // Clients see their project reports
  "/settings": ["admin"],
};

const mainNavItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboardIcon,
  },
  {
    title: "Projects",
    href: "/projects",
    icon: FolderKanbanIcon,
  },
  {
    title: "Clients",
    href: "/clients",
    icon: BuildingIcon,
  },
];

const managementNavItems = [
  {
    title: "Users",
    href: "/users",
    icon: UsersIcon,
  },
  {
    title: "Reports",
    href: "/reports",
    icon: FileTextIcon,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: SettingsIcon,
  },
];

// Helper to check if user can access a route
function canAccess(href: string, role: string): boolean {
  const allowedRoles = routePermissions[href];
  return allowedRoles ? allowedRoles.includes(role) : false;
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();

  // Filter nav items based on user role
  const filteredMainItems = mainNavItems.filter(item => canAccess(item.href, user.role));
  const filteredManagementItems = managementNavItems.filter(item => canAccess(item.href, user.role));

  return (
    <Sidebar>
      {/* Header */}
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            FC
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Formula Contract</span>
            <span className="text-xs text-muted-foreground">Project Management</span>
          </div>
        </div>
      </SidebarHeader>

      {/* Main Content */}
      <SidebarContent>
        {/* Main Navigation */}
        {filteredMainItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Main</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredMainItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
                      tooltip={item.title}
                    >
                      <Link href={item.href}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {filteredManagementItems.length > 0 && (
          <>
            <SidebarSeparator />

            {/* Management Navigation */}
            <SidebarGroup>
              <SidebarGroupLabel>Management</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {filteredManagementItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.href}
                        tooltip={item.title}
                      >
                        <Link href={item.href}>
                          <item.icon className="size-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      {/* Footer - User Menu */}
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <UserMenu user={user} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
