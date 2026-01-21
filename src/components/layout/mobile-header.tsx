"use client";

import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { NotificationsDropdown } from "@/components/notifications/notifications-dropdown";
import { cn } from "@/lib/utils";
import { MenuIcon, PanelLeftIcon } from "lucide-react";

interface AppHeaderProps {
  className?: string;
}

/**
 * Unified app header component:
 * - Desktop: Sidebar collapse toggle on left, notifications bell on right
 * - Mobile: Hamburger menu, app branding, and notifications
 *
 * This header sits at the top of the content area (inside SidebarInset)
 */
export function MobileHeader({ className }: AppHeaderProps) {
  const { isMobile } = useSidebar();

  // Desktop: header with sidebar toggle on left, notifications on right
  if (!isMobile) {
    return (
      <header
        className={cn(
          "sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-white/95 backdrop-blur-sm px-4",
          className
        )}
      >
        {/* Left side: Sidebar toggle */}
        <SidebarTrigger className="size-9 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors">
          <PanelLeftIcon className="size-5" />
        </SidebarTrigger>

        {/* Right side: Notifications */}
        <NotificationsDropdown />
      </header>
    );
  }

  // Mobile: full header with hamburger, branding, and notifications
  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-white/95 backdrop-blur-sm px-4",
        className
      )}
    >
      {/* Hamburger Menu Trigger */}
      <SidebarTrigger className="size-9 flex items-center justify-center -ml-1">
        <MenuIcon className="size-5" />
      </SidebarTrigger>

      {/* App Logo & Title */}
      <div className="flex items-center gap-2 flex-1">
        <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white font-bold text-xs shadow-md shadow-violet-500/25">
          FC
        </div>
        <span className="font-semibold text-sm">Formula Contract</span>
      </div>

      {/* Notifications */}
      <NotificationsDropdown />
    </header>
  );
}
