"use client";

import { ReactNode } from "react";
import { useBreakpoint } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

interface ResponsiveDataViewProps<T> {
  /**
   * Data array to render
   */
  data: T[];

  /**
   * Component to render in table/desktop view
   */
  tableView: ReactNode;

  /**
   * Render function for card/mobile view
   */
  renderCard: (item: T, index: number) => ReactNode;

  /**
   * Optional class name for the cards container
   */
  cardsClassName?: string;

  /**
   * Loading state
   */
  isLoading?: boolean;

  /**
   * Empty state component
   */
  emptyState?: ReactNode;

  /**
   * Force a specific view (useful for user preference)
   */
  forceView?: "table" | "cards";
}

/**
 * Responsive component that switches between table view (desktop)
 * and card view (mobile) based on screen size.
 *
 * @example
 * ```tsx
 * <ResponsiveDataView
 *   data={projects}
 *   tableView={<ProjectsTable projects={projects} />}
 *   renderCard={(project) => <ProjectCard key={project.id} project={project} />}
 * />
 * ```
 */
export function ResponsiveDataView<T>({
  data,
  tableView,
  renderCard,
  cardsClassName,
  isLoading,
  emptyState,
  forceView,
}: ResponsiveDataViewProps<T>) {
  const { isMobile } = useBreakpoint();

  // Determine which view to show
  const showCards = forceView === "cards" || (forceView !== "table" && isMobile);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-8 rounded-full border-2 border-primary-200 border-t-primary animate-spin" />
      </div>
    );
  }

  // Show empty state if no data
  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  // Show cards on mobile
  if (showCards) {
    return (
      <div className={cn("grid gap-4 sm:grid-cols-2", cardsClassName)}>
        {data.map((item, index) => renderCard(item, index))}
      </div>
    );
  }

  // Show table on desktop
  return <>{tableView}</>;
}

interface ViewToggleProps {
  view: "table" | "cards";
  onViewChange: (view: "table" | "cards") => void;
  className?: string;
}

/**
 * Toggle button group for switching between table and cards view
 * Useful when you want to give users manual control
 */
export function ViewToggle({ view, onViewChange, className }: ViewToggleProps) {
  return (
    <div className={cn("flex rounded-md border overflow-hidden", className)}>
      <button
        type="button"
        onClick={() => onViewChange("table")}
        className={cn(
          "px-3 py-1.5 text-xs font-medium transition-colors",
          view === "table"
            ? "bg-primary-100 text-primary-700"
            : "bg-white text-muted-foreground hover:bg-gray-50"
        )}
      >
        <svg
          className="size-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 10h18M3 14h18M3 6h18M3 18h18"
          />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => onViewChange("cards")}
        className={cn(
          "px-3 py-1.5 text-xs font-medium transition-colors border-l",
          view === "cards"
            ? "bg-primary-100 text-primary-700"
            : "bg-white text-muted-foreground hover:bg-gray-50"
        )}
      >
        <svg
          className="size-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
      </button>
    </div>
  );
}
