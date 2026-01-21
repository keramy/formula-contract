"use client";

import { useEffect } from "react";
import { GradientIcon } from "@/components/ui/ui-helpers";
import { UserIcon } from "lucide-react";
import { usePageHeader } from "@/components/layout/app-header";

export function ProfilePageHeader() {
  const { setContent } = usePageHeader();

  useEffect(() => {
    setContent({
      icon: <GradientIcon icon={<UserIcon className="size-4" />} color="coral" size="sm" />,
      title: "Profile Settings",
      description: "Manage your account settings and preferences",
    });
    return () => setContent({});
  }, [setContent]);

  // No action buttons for this page
  return null;
}
