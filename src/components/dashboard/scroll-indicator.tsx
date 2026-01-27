"use client";

import { useEffect, useState } from "react";
import { ChevronDownIcon } from "lucide-react";

export function ScrollIndicator() {
  const [showIndicator, setShowIndicator] = useState(true);

  useEffect(() => {
    const checkScroll = () => {
      // Check if we're at the bottom of the page
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;

      // Hide when within 100px of bottom, or if page is too short to scroll
      const nearBottom = scrollTop + clientHeight >= scrollHeight - 100;
      const canScroll = scrollHeight > clientHeight + 50;

      setShowIndicator(canScroll && !nearBottom);
    };

    // Initial check
    checkScroll();

    // Check on scroll
    window.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, []);

  if (!showIndicator) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur border border-gray-200 shadow-lg text-xs text-muted-foreground animate-bounce">
        <ChevronDownIcon className="size-3.5" />
        <span>Scroll for more</span>
      </div>
    </div>
  );
}
