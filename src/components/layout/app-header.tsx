"use client";

import { ReactNode, createContext, useContext, useState, useEffect } from "react";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { NotificationsDropdown } from "@/components/notifications/notifications-dropdown";
import { cn } from "@/lib/utils";
import { PanelLeftIcon, MenuIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// ============================================================================
// Page Header Context - allows pages to set their header content
// ============================================================================

interface PageHeaderContent {
  icon?: ReactNode;
  title?: string;
  description?: string;
  /** Render a back link before the icon/title */
  backLink?: ReactNode;
  /** Render a badge/status after the title */
  badge?: ReactNode;
  /** Render action buttons in the right zone (before notifications) */
  actions?: ReactNode;
}

interface PageHeaderContextType {
  content: PageHeaderContent;
  setContent: (content: PageHeaderContent) => void;
}

const PageHeaderContext = createContext<PageHeaderContextType | null>(null);

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<PageHeaderContent>({});
  return (
    <PageHeaderContext.Provider value={{ content, setContent }}>
      {children}
    </PageHeaderContext.Provider>
  );
}

export function usePageHeader() {
  const context = useContext(PageHeaderContext);
  if (!context) {
    throw new Error("usePageHeader must be used within PageHeaderProvider");
  }
  return context;
}

// ============================================================================
// App Header Component
// ============================================================================

interface AppHeaderProps {
  className?: string;
}

export function AppHeader({ className }: AppHeaderProps) {
  const handleSearchClick = () => {
    // Dispatch custom event to open CommandMenu
    window.dispatchEvent(new CustomEvent("open-command-menu"));
  };
  const { isMobile } = useSidebar();
  const headerContext = useContext(PageHeaderContext);
  const content = headerContext?.content || {};

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-14 items-center gap-2 sm:gap-4 border-b bg-card/95 backdrop-blur-sm px-2 sm:px-4",
        className
      )}
    >
      {/* Left: Sidebar Toggle */}
      <SidebarTrigger className="size-9 flex items-center justify-center hover:bg-primary/10 rounded-lg transition-colors shrink-0">
        {isMobile ? <MenuIcon className="size-5" /> : <PanelLeftIcon className="size-5" />}
      </SidebarTrigger>

      {/* Back Link / Breadcrumb (optional) */}
      {content.backLink && (
        <div className="min-w-0">
          {content.backLink}
        </div>
      )}

      {/* Page Icon + Title + Description + Badge */}
      {(content.icon || content.title) && (
        <div className="flex items-center gap-3 min-w-0">
          {content.icon && (
            <div className="shrink-0">
              {content.icon}
            </div>
          )}
          <div className="min-w-0">
            {content.title && (
              <h1 className="text-base font-semibold truncate">{content.title}</h1>
            )}
            {content.description && (
              <p className="text-xs text-muted-foreground truncate hidden sm:block">
                {content.description}
              </p>
            )}
          </div>
          {content.badge && (
            <div className="shrink-0 hidden sm:block">
              {content.badge}
            </div>
          )}
        </div>
      )}

      {/* Right: Page Actions + Search + Notifications */}
      <div className="ml-auto shrink-0 flex items-center gap-1">
        {content.actions}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 text-muted-foreground hover:text-foreground hover:bg-primary/10"
                onClick={handleSearchClick}
                aria-label="Search (⌘K)"
              >
                <SearchIcon className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <span>Search</span>
              <kbd className="ml-1.5 inline-flex h-4 items-center rounded border bg-muted px-1 font-mono text-[10px]">⌘K</kbd>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <NotificationsDropdown />
      </div>
    </header>
  );
}

// ============================================================================
// Hook for pages to set their header content
// ============================================================================

export function useSetPageHeader(content: PageHeaderContent) {
  const { setContent } = usePageHeader();

  useEffect(() => {
    setContent(content);
    return () => setContent({});
  }, [content.title, content.description, setContent]);
}
