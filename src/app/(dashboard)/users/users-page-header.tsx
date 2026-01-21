"use client";

import { useEffect } from "react";
import { UsersIcon } from "lucide-react";
import { GradientIcon } from "@/components/ui/ui-helpers";
import { usePageHeader } from "@/components/layout/app-header";

export function UsersPageHeader() {
  const { setContent } = usePageHeader();

  useEffect(() => {
    setContent({
      icon: <GradientIcon icon={<UsersIcon className="size-4" />} color="coral" size="sm" />,
      title: "Users",
      description: "Manage team members and permissions",
    });
    return () => setContent({});
  }, [setContent]);

  // No action buttons for this page
  return null;
}
