"use client";

import { ReactNode, createContext, useContext, useState, useEffect } from "react";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { NotificationsDropdown } from "@/components/notifications/notifications-dropdown";
import { cn } from "@/lib/utils";
import { PanelLeftIcon, MenuIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

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

      {/* Back Link (optional) */}
      {content.backLink && (
        <div className="shrink-0">
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

      {/* Center: Search Bar */}
      <div className="hidden md:flex flex-1 justify-center max-w-xl mx-auto">
        <Button
          variant="outline"
          onClick={handleSearchClick}
          className="w-full max-w-md h-9 px-3 justify-start text-muted-foreground font-normal bg-base-50/50 border-base-200 hover:bg-primary/10 hover:border-primary/30"
        >
          <SearchIcon className="size-4 mr-2 shrink-0" />
          <span className="truncate">Search projects, clients...</span>
          <kbd className="ml-auto hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      </div>

      {/* Right: Page Actions + Notifications */}
      <div className={cn("shrink-0 flex items-center gap-1", isMobile && "ml-auto")}>
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="size-9"
            onClick={handleSearchClick}
            aria-label="Open search"
          >
            <SearchIcon className="size-4" />
          </Button>
        )}
        {content.actions}
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
