"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, BuildingIcon } from "lucide-react";
import Link from "next/link";
import { GradientIcon } from "@/components/ui/ui-helpers";
import { usePageHeader } from "@/components/layout/app-header";

export function ClientsPageHeader() {
  const { setContent } = usePageHeader();

  useEffect(() => {
    setContent({
      icon: <GradientIcon icon={<BuildingIcon className="size-4" />} color="teal" size="sm" />,
      title: "Clients",
      description: "Manage your client relationships",
    });
    return () => setContent({});
  }, [setContent]);

  // Render action button below header
  return (
    <div className="flex items-center justify-end mb-4">
      <Button asChild size="sm" className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700">
        <Link href="/clients/new">
          <PlusIcon className="size-4" />
          New Client
        </Link>
      </Button>
    </div>
  );
}
