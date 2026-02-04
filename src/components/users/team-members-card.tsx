"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  UsersIcon,
  ShieldIcon,
  UserIcon,
  HardHatIcon,
  PackageIcon,
  PresentationIcon,
  Building2Icon,
  UserCheckIcon,
  UserXIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
}

interface TeamMembersCardProps {
  users: User[];
}

// Role configuration with icons, labels, and full names for tooltips
const roleConfig: Record<string, { label: string; fullName: string; icon: React.ReactNode; color: string }> = {
  admin: {
    label: "Admin",
    fullName: "Administrator",
    icon: <ShieldIcon className="size-3.5" />,
    color: "text-rose-600 bg-rose-100",
  },
  pm: {
    label: "PM",
    fullName: "Project Manager",
    icon: <UserIcon className="size-3.5" />,
    color: "text-blue-600 bg-blue-100",
  },
  production: {
    label: "Prod",
    fullName: "Production",
    icon: <HardHatIcon className="size-3.5" />,
    color: "text-amber-600 bg-amber-100",
  },
  procurement: {
    label: "Proc",
    fullName: "Procurement",
    icon: <PackageIcon className="size-3.5" />,
    color: "text-purple-600 bg-purple-100",
  },
  management: {
    label: "Mgmt",
    fullName: "Management",
    icon: <PresentationIcon className="size-3.5" />,
    color: "text-emerald-600 bg-emerald-100",
  },
  client: {
    label: "Client",
    fullName: "Client",
    icon: <Building2Icon className="size-3.5" />,
    color: "text-gray-600 bg-gray-100",
  },
};

export function TeamMembersCard({ users }: TeamMembersCardProps) {
  // Calculate stats
  const activeUsers = users.filter((u) => u.is_active);
  const inactiveUsers = users.filter((u) => !u.is_active);

  // Group users by role for stats
  const roleStats = users.reduce((acc, user) => {
    if (user.is_active) {
      acc[user.role] = (acc[user.role] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  return (
    <TooltipProvider delayDuration={200}>
      <Card className="border border-base-200">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Total Count */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 pr-4 border-r border-base-200 cursor-default">
                  <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <UsersIcon className="size-4.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold leading-none">{users.length}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Total registered users in the system</p>
              </TooltipContent>
            </Tooltip>

            {/* Active/Inactive */}
            <div className="flex items-center gap-3 pr-4 border-r border-base-200">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 text-emerald-600 cursor-default">
                    <UserCheckIcon className="size-4" />
                    <span className="text-sm font-semibold">{activeUsers.length}</span>
                    <span className="text-xs text-muted-foreground">active</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Users who can log in and access the system</p>
                </TooltipContent>
              </Tooltip>
              {inactiveUsers.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 text-gray-400 cursor-default">
                      <UserXIcon className="size-4" />
                      <span className="text-sm font-semibold">{inactiveUsers.length}</span>
                      <span className="text-xs text-muted-foreground">inactive</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Deactivated users who cannot log in</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Role Distribution */}
            <div className="flex flex-wrap items-center gap-2">
              {Object.entries(roleStats)
                .filter(([_, count]) => count > 0)
                .sort(([_, a], [__, b]) => b - a)
                .map(([role, count]) => {
                  const config = roleConfig[role] || {
                    label: role,
                    fullName: role,
                    icon: <UserIcon className="size-3.5" />,
                    color: "text-gray-600 bg-gray-100"
                  };
                  return (
                    <Tooltip key={role}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-default transition-opacity hover:opacity-80",
                            config.color
                          )}
                        >
                          {config.icon}
                          <span>{count} {config.label}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{count} {config.fullName}{count !== 1 ? "s" : ""}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
