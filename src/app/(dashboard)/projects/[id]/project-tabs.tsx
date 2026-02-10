"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
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
  ChevronDownIcon,
  PencilRulerIcon,
  PackageIcon,
  AlertTriangleIcon,
  CalendarIcon,
  UsersIcon,
  WalletIcon,
  GanttChartIcon,
} from "lucide-react";

interface ProjectTabsProps {
  children: React.ReactNode;
  scopeItemsCount: number;
  openSnaggingCount: number;
  milestonesCount: number;
  incompleteMilestonesCount: number;
  reportsCount: number;
  assignmentsCount: number;
  drawingsReadyCount?: number;
  isClient: boolean;
}

// Tabs that go into the "More" dropdown on all screen sizes
const MORE_TABS = [
  { value: "financials", label: "Financials", icon: WalletIcon, hideForClient: true },
  { value: "timeline", label: "Timeline", icon: GanttChartIcon, hideForClient: true },
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
  drawingsReadyCount,
  isClient,
}: ProjectTabsProps) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "overview");

  // Sync tab when URL search params change (e.g., from pending approvals link)
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

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
      case "drawings":
        return drawingsReadyCount && drawingsReadyCount > 0 && !isClient ? (
          <Badge className="ml-1.5 text-xs px-1.5 bg-amber-100 text-amber-700 border-amber-200">
            {drawingsReadyCount}
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
      <TabsList className="bg-white/80 backdrop-blur border shadow-sm p-1 h-auto">
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

        {/* "More" dropdown - always visible */}
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
                  {getBadgeForTab(activeMoreTab.value)}
                </>
              ) : (
                "More"
              )}
              <ChevronDownIcon className="size-3.5 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
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
      </TabsList>

      {children}
    </Tabs>
  );
}
