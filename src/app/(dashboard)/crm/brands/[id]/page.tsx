import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient, getUserProfileFromJWT } from "@/lib/supabase/server";
import {
  getBrand,
  getBrandOpportunities,
  getBrandActivities,
} from "@/lib/actions/crm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard, GradientIcon } from "@/components/ui/ui-helpers";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeftIcon, ExternalLinkIcon, TargetIcon, BarChart3Icon, ActivityIcon } from "lucide-react";
import type { BrandTier, CrmPriority } from "@/types/crm";

// ============================================================================
// Helper components (module scope)
// ============================================================================

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "" || value === "-") {
    return null;
  }
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 py-2.5 border-b border-base-100 last:border-0">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground sm:w-40 shrink-0">
        {label}
      </span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

function TierBadgeStatic({ tier }: { tier: BrandTier }) {
  switch (tier) {
    case "luxury":
      return <Badge variant="default">Luxury</Badge>;
    case "mid_luxury":
      return <Badge variant="secondary">Mid-Luxury</Badge>;
    case "bridge":
      return <Badge variant="outline">Bridge</Badge>;
  }
}

function PriorityBadgeStatic({ priority }: { priority: CrmPriority }) {
  switch (priority) {
    case "high":
      return <Badge variant="destructive">High</Badge>;
    case "medium":
      return <Badge variant="secondary">Medium</Badge>;
    case "low":
      return <Badge variant="outline">Low</Badge>;
  }
}

// ============================================================================
// Page
// ============================================================================

interface BrandDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function BrandDetailPage({ params }: BrandDetailPageProps) {
  const { id } = await params;

  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getUserProfileFromJWT(user, supabase);

  if (!["admin", "management"].includes(profile.role)) {
    redirect("/dashboard");
  }

  // Fetch brand and related data in parallel
  const [brandResult, oppsResult, activitiesResult] = await Promise.all([
    getBrand(id),
    getBrandOpportunities(id),
    getBrandActivities(id),
  ]);

  if (!brandResult.success || !brandResult.data) {
    notFound();
  }

  const brand = brandResult.data;
  const opportunities = oppsResult.data ?? [];
  const activities = activitiesResult.data ?? [];

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
          <Link href="/crm/brands">
            <ArrowLeftIcon className="size-4" />
            <span className="sr-only">Back to Brands</span>
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold tracking-tight">{brand.name}</h1>
            <TierBadgeStatic tier={brand.tier} />
            <PriorityBadgeStatic priority={brand.priority} />
          </div>
          <p className="text-sm text-muted-foreground font-mono">
            {brand.brand_code}
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Brand Details */}
        <GlassCard className="lg:col-span-2">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center gap-2">
              <GradientIcon icon={<TargetIcon className="size-4" />} color="amber" size="sm" />
              <CardTitle className="text-sm font-semibold">Brand Details</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <DetailRow label="Name" value={brand.name} />
            <DetailRow label="Parent Group" value={brand.parent_group} />
            <DetailRow label="Tier" value={<TierBadgeStatic tier={brand.tier} />} />
            <DetailRow label="Segment" value={brand.segment} />
            <DetailRow
              label="Store Count"
              value={brand.store_count !== null ? String(brand.store_count) : null}
            />
            <DetailRow label="Expansion Rate" value={brand.expansion_rate} />
            <DetailRow label="Creative Director" value={brand.creative_director} />
            {brand.cd_changed_recently && (
              <DetailRow
                label="CD Changed Recently"
                value={<Badge variant="secondary">Yes</Badge>}
              />
            )}
            <DetailRow label="Headquarters" value={brand.headquarters} />
            <DetailRow
              label="Website"
              value={
                brand.website ? (
                  <a
                    href={brand.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {brand.website}
                    <ExternalLinkIcon className="size-3" />
                  </a>
                ) : null
              }
            />
            <DetailRow label="Annual Revenue" value={brand.annual_revenue} />
            <DetailRow label="Priority" value={<PriorityBadgeStatic priority={brand.priority} />} />
            {brand.notes && <DetailRow label="Notes" value={brand.notes} />}
            <DetailRow
              label="Created"
              value={new Date(brand.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            />
          </CardContent>
        </GlassCard>

        {/* Sidebar: Quick Stats */}
        <div className="space-y-5">
          <GlassCard>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center gap-2">
                <GradientIcon icon={<BarChart3Icon className="size-4" />} color="emerald" size="sm" />
                <CardTitle className="text-sm font-semibold">Quick Stats</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Opportunities</span>
                <span className="text-sm font-semibold tabular-nums">
                  {opportunities.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Activities</span>
                <span className="text-sm font-semibold tabular-nums">
                  {activities.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Store Count
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {brand.store_count ?? "-"}
                </span>
              </div>
            </CardContent>
          </GlassCard>
        </div>
      </div>

      {/* Related Opportunities */}
      <GlassCard>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center gap-2">
            <GradientIcon icon={<TargetIcon className="size-4" />} color="teal" size="sm" />
            <CardTitle className="text-sm font-semibold">
              Related Opportunities
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {opportunities.length === 0 ? (
            <div className="flex flex-col items-center py-8">
              <TargetIcon className="size-6 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">
                No opportunities linked to this brand yet.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {opportunities.map((opp) => (
                <div
                  key={opp.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-base-50/50 border border-transparent hover:bg-primary/5 hover:border-primary/20 transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{opp.title}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {opp.opportunity_code}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-xs">
                      {opp.stage.replace(/_/g, " ")}
                    </Badge>
                    {opp.estimated_value !== null && (
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {opp.currency}{" "}
                        {opp.estimated_value.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </GlassCard>

      {/* Related Activities */}
      <GlassCard>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center gap-2">
            <GradientIcon icon={<ActivityIcon className="size-4" />} color="violet" size="sm" />
            <CardTitle className="text-sm font-semibold">
              Recent Activities
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {activities.length === 0 ? (
            <div className="flex flex-col items-center py-8">
              <ActivityIcon className="size-6 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">
                No activities logged for this brand yet.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-base-50/50 border border-transparent hover:bg-primary/5 hover:border-primary/20 transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {activity.title}
                    </p>
                    {activity.outcome && (
                      <p className="text-xs text-muted-foreground truncate">
                        {activity.outcome}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-xs">
                      {activity.activity_type.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {new Date(activity.activity_date).toLocaleDateString(
                        "en-GB",
                        { day: "numeric", month: "short" }
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </GlassCard>
    </div>
  );
}
