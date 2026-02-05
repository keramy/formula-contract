"use client";

import { useEffect } from "react";
import { WalletIcon } from "lucide-react";
import { GradientIcon } from "@/components/ui/ui-helpers";
import { usePageHeader } from "@/components/layout/app-header";

/**
 * Sets the page header content for the Finance page.
 * The actual header is rendered by AppHeader in the layout.
 */
export function FinancePageHeader() {
  const { setContent } = usePageHeader();

  useEffect(() => {
    setContent({
      icon: <GradientIcon icon={<WalletIcon className="size-4" />} color="emerald" size="sm" />,
      title: "Financial Overview",
      description: "Budget tracking and project costs analysis",
    });
    return () => setContent({});
  }, [setContent]);

  // This component only sets context, renders nothing
  return null;
}
