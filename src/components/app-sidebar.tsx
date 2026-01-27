"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboardIcon,
  FolderKanbanIcon,
  BuildingIcon,
  UsersIcon,
  FileTextIcon,
  SettingsIcon,
} from "lucide-react";
import { getVersionDisplay } from "@/lib/version";

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
  SidebarRail,
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

// Color mapping for each nav item to give visual variety
const navItemColors: Record<string, string> = {
  "/dashboard": "violet",
  "/projects": "violet",
  "/clients": "teal",
  "/users": "coral",
  "/reports": "amber",
  "/settings": "gray",
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

// Get active background class based on nav item color
function getActiveClasses(href: string, isActive: boolean): string {
  if (!isActive) return "";

  const color = navItemColors[href] || "violet";
  const colorMap: Record<string, string> = {
    violet: "bg-violet-100 text-violet-700 hover:bg-violet-100",
    teal: "bg-teal-100 text-teal-700 hover:bg-teal-100",
    coral: "bg-orange-100 text-orange-700 hover:bg-orange-100",
    amber: "bg-amber-100 text-amber-700 hover:bg-amber-100",
    gray: "bg-gray-100 text-gray-700 hover:bg-gray-100",
  };

  return colorMap[color] || colorMap.violet;
}

// Get icon color class for active state
function getIconClasses(href: string, isActive: boolean): string {
  if (!isActive) return "text-muted-foreground group-hover:text-foreground";

  const color = navItemColors[href] || "violet";
  const colorMap: Record<string, string> = {
    violet: "text-violet-600",
    teal: "text-teal-600",
    coral: "text-orange-600",
    amber: "text-amber-600",
    gray: "text-gray-600",
  };

  return colorMap[color] || colorMap.violet;
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();

  // Filter nav items based on user role
  const filteredMainItems = mainNavItems.filter(item => canAccess(item.href, user.role));
  const filteredManagementItems = managementNavItems.filter(item => canAccess(item.href, user.role));

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      {/* Header with Gradient Logo */}
      <SidebarHeader className="border-b border-sidebar-border/50">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white font-bold text-sm shadow-lg shadow-violet-500/25 shrink-0">
            FC
          </div>
          <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold tracking-tight truncate">Formula Contract</span>
            <span className="text-xs text-muted-foreground truncate">Project Management</span>
          </div>
        </div>
      </SidebarHeader>

      {/* Main Content */}
      <SidebarContent className="px-2">
        {/* Main Navigation */}
        {filteredMainItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider px-2 group-data-[collapsible=icon]:hidden">
              Main
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredMainItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                        className={cn(
                          "group rounded-lg transition-all duration-200",
                          getActiveClasses(item.href, isActive),
                          !isActive && "hover:bg-gray-100"
                        )}
                      >
                        <Link href={item.href}>
                          <item.icon className={cn("size-4 transition-colors", getIconClasses(item.href, isActive))} />
                          <span className={cn("font-medium", isActive && "font-semibold")}>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {filteredManagementItems.length > 0 && (
          <>
            <SidebarSeparator className="my-2 bg-border/50" />

            {/* Management Navigation */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider px-2 group-data-[collapsible=icon]:hidden">
                Management
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {filteredManagementItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.title}
                          className={cn(
                            "group rounded-lg transition-all duration-200",
                            getActiveClasses(item.href, isActive),
                            !isActive && "hover:bg-gray-100"
                          )}
                        >
                          <Link href={item.href}>
                            <item.icon className={cn("size-4 transition-colors", getIconClasses(item.href, isActive))} />
                            <span className={cn("font-medium", isActive && "font-semibold")}>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      {/* Footer - User Menu with subtle gradient background */}
      <SidebarFooter className="border-t border-sidebar-border/50 bg-gradient-to-t from-gray-50/80 to-transparent">
        <SidebarMenu>
          <SidebarMenuItem>
            <UserMenu user={user} />
          </SidebarMenuItem>
        </SidebarMenu>
        {/* Version display - subtle, bottom of sidebar */}
        <div className="px-3 pb-2 group-data-[collapsible=icon]:hidden">
          <span className="text-[10px] text-muted-foreground/50 font-mono">
            {getVersionDisplay()}
          </span>
        </div>
      </SidebarFooter>

      {/* Rail for collapse/expand on hover at edge */}
      <SidebarRail />
    </Sidebar>
  );
}
