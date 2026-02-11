"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  HomeIcon,
  ListIcon,
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

const EXTRA_TABS = [
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
  const [mobileSectionsOpen, setMobileSectionsOpen] = useState(false);

  // Sync tab when URL search params change (e.g., from pending approvals link)
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const visibleExtraTabs = EXTRA_TABS.filter(tab => !tab.hideForClient || !isClient);

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

  const getBadgeText = (tabValue: string): string | null => {
    switch (tabValue) {
      case "scope":
        return scopeItemsCount > 0 ? String(scopeItemsCount) : null;
      case "reports":
        return reportsCount > 0 ? String(reportsCount) : null;
      case "snagging":
        return openSnaggingCount > 0 ? String(openSnaggingCount) : null;
      case "milestones":
        return milestonesCount > 0 ? `${incompleteMilestonesCount}/${milestonesCount}` : null;
      case "drawings":
        return drawingsReadyCount && drawingsReadyCount > 0 && !isClient ? String(drawingsReadyCount) : null;
      case "team":
        return assignmentsCount > 0 ? String(assignmentsCount) : null;
      default:
        return null;
    }
  };

  const allTabs = [
    { value: "overview", label: "Overview", icon: HomeIcon },
    { value: "scope", label: "Scope Items", icon: ListIcon },
    { value: "reports", label: "Reports", icon: FileTextIcon },
    ...visibleExtraTabs,
  ];
  const desktopPrimaryTabs = allTabs.slice(0, 3);
  const desktopMoreTabs = visibleExtraTabs;
  const activeDesktopMoreTab = desktopMoreTabs.find((tab) => tab.value === activeTab);

  const activeTabMeta = allTabs.find((tab) => tab.value === activeTab) || allTabs[0];

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <div className="md:hidden">
        <Sheet open={mobileSectionsOpen} onOpenChange={setMobileSectionsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full justify-between bg-white/80 backdrop-blur border shadow-sm h-10 px-3">
              <span className="inline-flex items-center gap-2 truncate">
                <activeTabMeta.icon className="size-4 text-muted-foreground shrink-0" />
                <span className="truncate text-sm">{activeTabMeta.label}</span>
                {getBadgeText(activeTabMeta.value) && (
                  <Badge variant="secondary" className="text-xs px-1.5">
                    {getBadgeText(activeTabMeta.value)}
                  </Badge>
                )}
              </span>
              <ChevronDownIcon className="size-4 opacity-70 shrink-0" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto pb-6">
            <SheetHeader className="pb-2">
              <SheetTitle>Project Sections</SheetTitle>
              <SheetDescription>Select a section to navigate.</SheetDescription>
            </SheetHeader>
            <div className="px-4 space-y-1">
              {allTabs.map((tab) => {
                const Icon = tab.icon;
                const badgeText = getBadgeText(tab.value);
                return (
                  <Button
                    key={tab.value}
                    variant={activeTab === tab.value ? "secondary" : "ghost"}
                    className="w-full justify-between h-10"
                    onClick={() => {
                      setActiveTab(tab.value);
                      setMobileSectionsOpen(false);
                    }}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Icon className="size-4 text-muted-foreground" />
                      <span>{tab.label}</span>
                    </span>
                    {badgeText && (
                      <Badge variant="secondary" className="text-xs px-1.5">
                        {badgeText}
                      </Badge>
                    )}
                  </Button>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <TabsList className="hidden md:flex w-fit max-w-full justify-start flex-nowrap bg-white/80 backdrop-blur border shadow-sm p-1 h-auto">
        {desktopPrimaryTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex-none h-8 px-2.5 text-xs whitespace-nowrap gap-1"
            >
              <Icon className="size-3.5" />
              {tab.label}
              {tab.value === "scope" || tab.value === "reports" ? (
                getBadgeText(tab.value) ? (
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">
                    {getBadgeText(tab.value)}
                  </Badge>
                ) : null
              ) : (
                getBadgeForTab(tab.value)
              )}
            </TabsTrigger>
          );
        })}
        {desktopMoreTabs.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={activeDesktopMoreTab ? "secondary" : "ghost"}
                size="sm"
                className="h-8 min-w-[122px] px-2.5 gap-1.5 text-xs whitespace-nowrap justify-between"
              >
                <span className="truncate">
                  {activeDesktopMoreTab ? activeDesktopMoreTab.label : "More"}
                </span>
                {activeDesktopMoreTab ? (
                  <Badge variant="secondary" className="text-[10px] px-1.5">•</Badge>
                ) : null}
                <ChevronDownIcon className="size-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              {desktopMoreTabs.map((tab) => {
                const Icon = tab.icon;
                const badgeText = getBadgeText(tab.value);
                return (
                  <DropdownMenuItem
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                    className={activeTab === tab.value ? "bg-accent" : ""}
                  >
                    <Icon className="size-4 mr-2" />
                    {tab.label}
                    {badgeText ? (
                      <Badge variant="secondary" className="ml-auto text-xs px-1.5">
                        {badgeText}
                      </Badge>
                    ) : null}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TabsList>

      {children}
    </Tabs>
  );
}
