"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ActivityIcon,
  FileTextIcon,
  MoreHorizontalIcon,
  PencilRulerIcon,
  PackageIcon,
  AlertTriangleIcon,
  CalendarIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";

interface ProjectTabsProps {
  children: React.ReactNode;
  scopeItemsCount: number;
  openSnaggingCount: number;
  milestonesCount: number;
  incompleteMilestonesCount: number;
  reportsCount: number;
  assignmentsCount: number;
  isClient: boolean;
}

// Tab configuration for the "More" dropdown
const MORE_TABS = [
  { value: "financials", label: "Financials", icon: WalletIcon, hideForClient: true },
  { value: "drawings", label: "Drawings", icon: PencilRulerIcon },
  { value: "materials", label: "Materials", icon: PackageIcon },
  { value: "snagging", label: "Snagging", icon: AlertTriangleIcon },
  { value: "milestones", label: "Milestones", icon: CalendarIcon, hideForClient: true },
  { value: "team", label: "Team", icon: UsersIcon },
  { value: "activity", label: "Activity", icon: ActivityIcon },
];

export function ProjectTabs({
  children,
  scopeItemsCount,
  openSnaggingCount,
  milestonesCount,
  incompleteMilestonesCount,
  reportsCount,
  assignmentsCount,
  isClient,
}: ProjectTabsProps) {
  const [activeTab, setActiveTab] = useState("overview");

  // Filter tabs based on client status
  const visibleMoreTabs = MORE_TABS.filter(tab => !tab.hideForClient || !isClient);

  // Check if active tab is in the "More" menu
  const activeTabInMore = visibleMoreTabs.some(tab => tab.value === activeTab);
  const activeMoreTab = visibleMoreTabs.find(tab => tab.value === activeTab);

  const getBadgeForTab = (tabValue: string) => {
    switch (tabValue) {
      case "snagging":
        return openSnaggingCount > 0 ? (
          <Badge variant="destructive" className="ml-1.5 text-xs px-1.5">
            {openSnaggingCount}
          </Badge>
        ) : null;
      case "milestones":
        return milestonesCount > 0 ? (
          <Badge variant="secondary" className="ml-1.5 text-xs px-1.5">
            {incompleteMilestonesCount}/{milestonesCount}
          </Badge>
        ) : null;
      case "team":
        return assignmentsCount > 0 ? (
          <Badge variant="secondary" className="ml-1.5 text-xs px-1.5">
            {assignmentsCount}
          </Badge>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList className="bg-white/80 backdrop-blur border shadow-sm p-1 h-auto flex-wrap">
        {/* Primary tabs - always visible */}
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="scope">
          Scope Items
          {scopeItemsCount > 0 && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {scopeItemsCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="reports">
          <FileTextIcon className="size-4 mr-1.5" />
          Reports
          {reportsCount > 0 && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {reportsCount}
            </Badge>
          )}
        </TabsTrigger>

        {/* Secondary tabs - visible on desktop, hidden on mobile */}
        {!isClient && (
          <TabsTrigger value="financials" className="hidden md:flex">
            <WalletIcon className="size-4 mr-1.5" />
            Financials
          </TabsTrigger>
        )}
        <TabsTrigger value="drawings" className="hidden md:flex">
          Drawings
        </TabsTrigger>
        <TabsTrigger value="materials" className="hidden md:flex">
          Materials
        </TabsTrigger>
        <TabsTrigger value="snagging" className="hidden md:flex">
          Snagging
          {openSnaggingCount > 0 && (
            <Badge variant="destructive" className="ml-2 text-xs">
              {openSnaggingCount}
            </Badge>
          )}
        </TabsTrigger>
        {!isClient && (
          <TabsTrigger value="milestones" className="hidden md:flex">
            Milestones
            {milestonesCount > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {incompleteMilestonesCount}/{milestonesCount}
              </Badge>
            )}
          </TabsTrigger>
        )}
        <TabsTrigger value="team" className="hidden md:flex">
          Team
          {assignmentsCount > 0 && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {assignmentsCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="activity" className="hidden md:flex">
          <ActivityIcon className="size-4 mr-1.5" />
          Activity
        </TabsTrigger>

        {/* "More" dropdown - visible only on mobile */}
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={activeTabInMore ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-3 gap-1.5"
              >
                {activeMoreTab ? (
                  <>
                    <activeMoreTab.icon className="size-4" />
                    {activeMoreTab.label}
                  </>
                ) : (
                  <>
                    <MoreHorizontalIcon className="size-4" />
                    More
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {visibleMoreTabs.map((tab) => {
                const Icon = tab.icon;
                const badge = getBadgeForTab(tab.value);
                return (
                  <DropdownMenuItem
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                    className={activeTab === tab.value ? "bg-accent" : ""}
                  >
                    <Icon className="size-4 mr-2" />
                    {tab.label}
                    {badge}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TabsList>

      {children}
    </Tabs>
  );
}
