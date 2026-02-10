import { useState, useEffect } from "react";

/**
 * Hook to detect if a media query matches
 *
 * @param query - CSS media query string
 * @returns boolean indicating if the query matches
 *
 * @example
 * ```tsx
 * const isMobile = useMediaQuery("(max-width: 768px)");
 * const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
 * const isDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
 * ```
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Create media query list
    const mediaQuery = window.matchMedia(query);

    // Set initial value
    setMatches(mediaQuery.matches);

    // Define listener
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add listener
    mediaQuery.addEventListener("change", handleChange);

    // Cleanup
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [query]);

  return matches;
}

/**
 * Convenience hook for common breakpoints
 * Aligned with Tailwind CSS `md:` breakpoint (768px) for CSS/JS consistency.
 * All CSS responsive classes in the codebase use `md:` as the mobile/desktop split.
 */
export function useBreakpoint() {
  const isMobile = useMediaQuery("(max-width: 767px)"); // < md (matches Tailwind md: breakpoint)
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1023px)"); // md to lg
  const isDesktop = useMediaQuery("(min-width: 1024px)"); // lg+

  return {
    isMobile,
    isTablet,
    isDesktop,
    // Convenience
    isMobileOrTablet: isMobile || isTablet,
    isTabletOrDesktop: isTablet || isDesktop,
  };
}

/**
 * Hook to detect if device supports touch
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    // Check for touch support
    const hasTouch =
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0;

    setIsTouch(hasTouch);
  }, []);

  return isTouch;
}
