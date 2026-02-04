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
  WalletIcon,
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
  "/finance": ["admin", "management"],
  "/users": ["admin"],
  "/reports": ["admin", "pm", "management", "client"], // Clients see their project reports
  "/settings": ["admin"],
};

// Color mapping for each nav item - using Forest Whisper theme (teal primary)
const navItemColors: Record<string, string> = {
  "/dashboard": "teal",
  "/projects": "teal",
  "/clients": "slate",
  "/finance": "teal",
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
  {
    title: "Finance",
    href: "/finance",
    icon: WalletIcon,
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

// Get active background class based on nav item color (Forest Whisper theme)
// Force text color with ! to override shadcn defaults (data-[active=true] styles)
function getActiveClasses(href: string, isActive: boolean): string {
  if (!isActive) return "";

  const color = navItemColors[href] || "teal";
  const colorMap: Record<string, string> = {
    teal: "bg-primary-100! text-primary-800! hover:bg-primary-150",
    slate: "bg-secondary-100! text-secondary-800! hover:bg-secondary-150",
    coral: "bg-orange-100! text-orange-700! hover:bg-orange-150",
    amber: "bg-amber-100! text-amber-700! hover:bg-amber-150",
    gray: "bg-base-100! text-base-700! hover:bg-base-150",
  };

  return colorMap[color] || colorMap.teal;
}

// Get icon color class for active state
// Force icon color with ! to override shadcn's data-[active=true] styles
function getIconClasses(href: string, isActive: boolean): string {
  if (!isActive) return "text-muted-foreground group-hover:text-foreground";

  const color = navItemColors[href] || "teal";
  const colorMap: Record<string, string> = {
    teal: "text-primary-700!",
    slate: "text-secondary-700!",
    coral: "text-orange-600!",
    amber: "text-amber-600!",
    gray: "text-base-600!",
  };

  return colorMap[color] || colorMap.teal;
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();

  // Filter nav items based on user role
  const filteredMainItems = mainNavItems.filter(item => canAccess(item.href, user.role));
  const filteredManagementItems = managementNavItems.filter(item => canAccess(item.href, user.role));

  return (
    <Sidebar collapsible="icon" className="border-r-0!">
      {/* Header with Logo - adapts to collapsed state */}
      <SidebarHeader className="border-b border-sidebar-border/50 p-0">
        <div className="flex items-center gap-2 px-3 py-3 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:justify-center">
          <div className="flex items-center justify-center size-8 rounded-lg bg-primary-700 text-white font-bold text-xs shrink-0">
            FC
          </div>
          <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold tracking-tight truncate">Formula Contract</span>
            <span className="text-xs text-muted-foreground truncate">Project Management</span>
          </div>
        </div>
      </SidebarHeader>

      {/* Main Content - remove horizontal padding, let SidebarGroup handle it */}
      <SidebarContent className="overflow-x-hidden">
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
                          !isActive && "hover:bg-primary/10 hover:text-foreground"
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
                            !isActive && "hover:bg-primary/10 hover:text-foreground"
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

      {/* Footer - User Menu */}
      <SidebarFooter className="border-t border-sidebar-border/50 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <UserMenu user={user} />
          </SidebarMenuItem>
        </SidebarMenu>
        {/* Version display - subtle, bottom of sidebar */}
        <div className="px-1 pb-1 group-data-[collapsible=icon]:hidden">
          <span className="text-[10px] text-muted-foreground/50 font-mono">
            {getVersionDisplay()}
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
