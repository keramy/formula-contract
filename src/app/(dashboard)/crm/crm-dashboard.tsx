"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { GlassCard, GradientIcon } from "@/components/ui/ui-helpers";
import { usePageHeader } from "@/components/layout/app-header";
import {
  TargetIcon,
  BuildingIcon,
  UsersIcon,
  TrendingUpIcon,
  CalendarIcon,
  ArrowRightIcon,
  PlusIcon,
} from "lucide-react";
import { useCrmDashboard, useUpcomingActions } from "@/lib/react-query/crm";
import { OPPORTUNITY_STAGES } from "@/types/crm";
import { formatCurrency } from "@/lib/utils";

interface CrmDashboardProps {
  userRole: string;
}

const EMPTY_TIER = { luxury: 0, mid_luxury: 0, bridge: 0 };

export function CrmDashboard({ userRole }: CrmDashboardProps) {
  const { data: stats, isLoading } = useCrmDashboard();
  const { data: upcomingActions } = useUpcomingActions();
  const canEdit = userRole === "admin";

  const { setContent } = usePageHeader();
  useEffect(() => {
    setContent({
      icon: <GradientIcon icon={<TargetIcon className="size-4" />} color="amber" size="sm" />,
      title: "Sales CRM",
      description: "Track brands, firms, and sales pipeline",
      actions: canEdit ? (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/crm/pipeline">
              <TrendingUpIcon className="size-4 mr-1" />
              Pipeline
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/crm/brands">
              <PlusIcon className="size-4 mr-1" />
              Brands
            </Link>
          </Button>
        </div>
      ) : undefined,
    });
    return () => setContent({});
  }, [setContent, canEdit]);

  const brandsByTier = stats?.brandsByTier ?? EMPTY_TIER;
  const activeStages = OPPORTUNITY_STAGES.filter(
    (s) => s.value !== "won" && s.value !== "lost"
  );

  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brands */}
        <Link href="/crm/brands">
          <GlassCard hover="primary" className="cursor-pointer">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center gap-2">
                <GradientIcon icon={<TargetIcon className="size-4" />} color="amber" size="sm" />
                <CardTitle className="text-sm font-semibold">Brands</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold tabular-nums">
                {isLoading ? <Skeleton className="h-7 w-10 inline-block" /> : stats?.brandCount ?? 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {brandsByTier.luxury}L / {brandsByTier.mid_luxury}M / {brandsByTier.bridge}B
              </p>
            </CardContent>
          </GlassCard>
        </Link>

        {/* Active Opportunities */}
        <Link href="/crm/pipeline">
          <GlassCard hover="primary" className="cursor-pointer">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center gap-2">
                <GradientIcon icon={<TrendingUpIcon className="size-4" />} color="emerald" size="sm" />
                <CardTitle className="text-sm font-semibold">Active Pipeline</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold tabular-nums">
                {isLoading ? <Skeleton className="h-7 w-10 inline-block" /> : stats?.activeOpportunities ?? 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isLoading ? <Skeleton className="h-4 w-16 inline-block" /> : <>{formatCurrency(stats?.totalPipelineValue ?? 0, "USD")} total</>}
              </p>
            </CardContent>
          </GlassCard>
        </Link>

        {/* Firms */}
        <Link href="/crm/firms">
          <GlassCard hover="primary" className="cursor-pointer">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center gap-2">
                <GradientIcon icon={<BuildingIcon className="size-4" />} color="blue" size="sm" />
                <CardTitle className="text-sm font-semibold">Firms</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold tabular-nums">
                {isLoading ? <Skeleton className="h-7 w-10 inline-block" /> : stats?.firmCount ?? 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isLoading ? <Skeleton className="h-4 w-16 inline-block" /> : <>{stats?.vendorApproved ?? 0} vendor-approved</>}
              </p>
            </CardContent>
          </GlassCard>
        </Link>

        {/* Upcoming Actions */}
        <Link href="/crm/activities">
          <GlassCard hover="primary" className="cursor-pointer">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center gap-2">
                <GradientIcon icon={<CalendarIcon className="size-4" />} color="violet" size="sm" />
                <CardTitle className="text-sm font-semibold">Upcoming</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold tabular-nums">
                {isLoading ? <Skeleton className="h-7 w-10 inline-block" /> : stats?.upcomingActions ?? 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                follow-up actions
              </p>
            </CardContent>
          </GlassCard>
        </Link>
      </div>

      {/* Pipeline Summary + Upcoming Actions */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Pipeline Summary */}
        <GlassCard>
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GradientIcon icon={<TrendingUpIcon className="size-4" />} color="amber" size="sm" />
                <CardTitle className="text-sm font-semibold">Pipeline by Stage</CardTitle>
              </div>
              <CardAction>
                <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                  <Link href="/crm/pipeline">
                    View board
                    <ArrowRightIcon className="size-3 ml-1" />
                  </Link>
                </Button>
              </CardAction>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={`skel-${i}`} className="flex items-center gap-3">
                    <Skeleton className="size-2.5 rounded-full shrink-0" />
                    <Skeleton className="h-4 w-24 shrink-0" />
                    <Skeleton className="h-2 flex-1" />
                    <Skeleton className="h-4 w-6" />
                  </div>
                ))}
              </div>
            ) : (
              activeStages.map((stage) => {
                const count = stats?.opportunitiesByStage[stage.value] ?? 0;
                const total = stats?.activeOpportunities ?? 1;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={stage.value} className="flex items-center gap-3">
                    <div
                      className="size-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: stage.color }}
                    />
                    <span className="text-sm w-24 shrink-0">{stage.label}</span>
                    <Progress
                      value={pct}
                      className="h-2 flex-1 bg-base-200"
                      indicatorColor="bg-primary"
                    />
                    <span className="text-sm font-medium tabular-nums w-6 text-right">
                      {count}
                    </span>
                  </div>
                );
              })
            )}
          </CardContent>
        </GlassCard>

        {/* Upcoming Actions */}
        <GlassCard>
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GradientIcon icon={<CalendarIcon className="size-4" />} color="violet" size="sm" />
                <CardTitle className="text-sm font-semibold">Upcoming Actions</CardTitle>
              </div>
              <CardAction>
                <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                  <Link href="/crm/activities">
                    View all
                    <ArrowRightIcon className="size-3 ml-1" />
                  </Link>
                </Button>
              </CardAction>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {!upcomingActions || upcomingActions.length === 0 ? (
              <div className="py-8 text-center">
                <CalendarIcon className="size-6 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No upcoming actions</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Log an activity with a next action date
                </p>
              </div>
            ) : (
              upcomingActions.slice(0, 5).map((action) => (
                <div
                  key={action.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-base-50/50 border border-transparent hover:bg-primary/5 hover:border-primary/20 transition-all"
                >
                  <div className="shrink-0 mt-0.5">
                    <Badge variant="outline" className="text-xs">
                      {new Date(action.next_action_date!).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </Badge>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{action.next_action}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {action.brand?.name || action.architecture_firm?.name || action.title}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </GlassCard>
      </div>

      {/* Quick Links */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { href: "/crm/brands", label: "Brands", icon: TargetIcon },
          { href: "/crm/firms", label: "Firms", icon: BuildingIcon },
          { href: "/crm/pipeline", label: "Pipeline", icon: TrendingUpIcon },
          { href: "/crm/contacts", label: "Contacts", icon: UsersIcon },
          { href: "/crm/activities", label: "Activities", icon: CalendarIcon },
        ].map((link) => (
          <Button key={link.href} variant="outline" asChild className="h-auto py-3 justify-start">
            <Link href={link.href}>
              <link.icon className="size-4 mr-2 text-muted-foreground" />
              {link.label}
              <ArrowRightIcon className="size-3 ml-auto text-muted-foreground" />
            </Link>
          </Button>
        ))}
      </div>
    </div>
  );
}
