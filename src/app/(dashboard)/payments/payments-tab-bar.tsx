"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboardIcon,
  ReceiptTextIcon,
  HandCoinsIcon,
  TruckIcon,
  RepeatIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const tabs = [
  { label: "Dashboard", href: "/payments", icon: LayoutDashboardIcon, exact: true },
  { label: "Invoices", href: "/payments/invoices", icon: ReceiptTextIcon },
  { label: "Receivables", href: "/payments/receivables", icon: HandCoinsIcon },
  { label: "Suppliers", href: "/payments/suppliers", icon: TruckIcon },
  { label: "Recurring", href: "/payments/recurring", icon: RepeatIcon },
  { label: "Access", href: "/payments/access", icon: ShieldCheckIcon, adminOnly: true },
];

export function PaymentsTabBar() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata?.role === "admin") setIsAdmin(true);
    });
  }, []);

  // Don't render on detail pages (invoices/[id], receivables/[id])
  const isDetailPage = /\/payments\/(invoices|receivables)\/[^/]+/.test(pathname);
  if (isDetailPage) return null;

  return (
    <div className="border-b border-base-200 bg-card/80 backdrop-blur-sm">
      <div className="flex gap-1 px-4 overflow-x-auto">
        {tabs.map((tab) => {
          if (tab.adminOnly && !isAdmin) return null;

          const isActive = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);

          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-base-300"
              )}
            >
              <Icon className="size-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
