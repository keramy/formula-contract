"use client";

import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { NotificationsDropdown } from "@/components/notifications/notifications-dropdown";
import { cn } from "@/lib/utils";
import { MenuIcon } from "lucide-react";

interface MobileHeaderProps {
  className?: string;
}

/**
 * Unified header component:
 * - Mobile: Shows hamburger menu, app branding, and notifications
 * - Desktop: Shows just notifications bell in top-right corner
 */
export function MobileHeader({ className }: MobileHeaderProps) {
  const { isMobile } = useSidebar();

  // Desktop: minimal header with just notifications
  if (!isMobile) {
    return (
      <header
        className={cn(
          "sticky top-0 z-40 flex h-14 items-center justify-end border-b bg-white/95 backdrop-blur-sm px-6",
          className
        )}
      >
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
