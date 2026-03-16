import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient, getUserProfileFromJWT } from "@/lib/supabase/server";
import { getArchitectureFirm } from "@/lib/actions/crm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard, GradientIcon } from "@/components/ui/ui-helpers";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeftIcon,
  ExternalLinkIcon,
  BuildingIcon,
  LinkIcon,
  CheckCircle2Icon,
  CircleDotIcon,
  CircleIcon,
  XCircleIcon,
  BarChart3Icon,
} from "lucide-react";
import type {
  VendorListStatus,
  ConnectionStrength,
  CrmPriority,
} from "@/types/crm";
import { VENDOR_STATUSES } from "@/types/crm";

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

function VendorStatusBadgeStatic({ status }: { status: VendorListStatus }) {
  const label = VENDOR_STATUSES.find((s) => s.value === status)?.label ?? status;

  switch (status) {
    case "not_applied":
      return <Badge variant="outline">{label}</Badge>;
    case "applied":
      return <Badge variant="info">{label}</Badge>;
    case "under_review":
      return <Badge variant="warning">{label}</Badge>;
    case "approved":
      return <Badge variant="success">{label}</Badge>;
    case "rejected":
      return <Badge variant="destructive">{label}</Badge>;
  }
}

function ConnectionBadgeStatic({ strength }: { strength: ConnectionStrength }) {
  switch (strength) {
    case "none":
      return <Badge variant="outline">None</Badge>;
    case "cold":
      return <Badge variant="info">Cold</Badge>;
    case "warm":
      return <Badge variant="warning">Warm</Badge>;
    case "hot":
      return <Badge variant="destructive">Hot</Badge>;
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
// Vendor Status Stepper
// ============================================================================

/**
 * The vendor workflow steps in order. "rejected" is shown as an alternative
 * final state branching off from "under_review".
 */
const VENDOR_WORKFLOW_STEPS: VendorListStatus[] = [
  "not_applied",
  "applied",
  "under_review",
  "approved",
];

interface VendorStepperProps {
  currentStatus: VendorListStatus;
}

function VendorStepper({ currentStatus }: VendorStepperProps) {
  const isRejected = currentStatus === "rejected";

  // Find where we are in the main workflow
  const currentIndex = isRejected
    ? VENDOR_WORKFLOW_STEPS.indexOf("under_review")
    : VENDOR_WORKFLOW_STEPS.indexOf(currentStatus);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {VENDOR_WORKFLOW_STEPS.map((step, index) => {
          const label =
            VENDOR_STATUSES.find((s) => s.value === step)?.label ?? step;
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex && !isRejected;

          let icon = <CircleIcon className="size-5 text-muted-foreground/40" />;
          if (isComplete) {
            icon = <CheckCircle2Icon className="size-5 text-emerald-500" />;
          } else if (isCurrent) {
            icon = <CircleDotIcon className="size-5 text-primary" />;
          }

          return (
            <div key={step} className="flex items-center">
              <div className="flex flex-col items-center gap-1 min-w-[80px]">
                {icon}
                <span
                  className={`text-xs font-medium text-center ${
                    isComplete
                      ? "text-emerald-600"
                      : isCurrent
                        ? "text-primary"
                        : "text-muted-foreground"
                  }`}
                >
                  {label}
                </span>
              </div>
              {index < VENDOR_WORKFLOW_STEPS.length - 1 && (
                <div
                  className={`h-0.5 w-8 shrink-0 mx-1 ${
                    isComplete ? "bg-emerald-300" : "bg-base-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {isRejected && (
        <div className="flex items-center gap-2 pl-2">
          <XCircleIcon className="size-5 text-destructive shrink-0" />
          <span className="text-xs font-medium text-destructive">
            Rejected
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Brand Link Row
// ============================================================================

interface BrandLinkRowProps {
  brand: { id: string; name: string; brand_code: string };
  relationshipType: string | null;
}

function BrandLinkRow({ brand, relationshipType }: BrandLinkRowProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-base-50/50 border border-transparent hover:bg-primary/5 hover:border-primary/20 transition-all">
      <div className="min-w-0 flex-1">
        <Link
          href={`/crm/brands/${brand.id}`}
          className="text-sm font-medium text-primary hover:underline"
        >
          {brand.name}
        </Link>
        <p className="text-xs text-muted-foreground font-mono">
          {brand.brand_code}
        </p>
      </div>
      {relationshipType && (
        <Badge variant="outline" className="text-xs shrink-0">
          {relationshipType}
        </Badge>
      )}
    </div>
  );
}

// ============================================================================
// Page
// ============================================================================

interface FirmDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function FirmDetailPage({ params }: FirmDetailPageProps) {
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

  // Fetch firm data
  const firmResult = await getArchitectureFirm(id);

  if (!firmResult.success || !firmResult.data) {
    notFound();
  }

  const firm = firmResult.data;

  // Fetch linked brands separately (getArchitectureFirm returns base type)
  const { data: brandLinksRaw } = await supabase
    .from("crm_brand_firm_links")
    .select(`
      relationship_type,
      brand:crm_brands(id, name, brand_code)
    `)
    .eq("architecture_firm_id", id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const brandLinks = (brandLinksRaw ?? []).map((l: any) => ({
    brand: l.brand as { id: string; name: string; brand_code: string },
    relationship_type: l.relationship_type as string | null,
  }));

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
          <Link href="/crm/firms">
            <ArrowLeftIcon className="size-4" />
            <span className="sr-only">Back to Firms</span>
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold tracking-tight">{firm.name}</h1>
            <VendorStatusBadgeStatic status={firm.vendor_list_status} />
            <PriorityBadgeStatic priority={firm.priority} />
          </div>
          <p className="text-sm text-muted-foreground font-mono">
            {firm.firm_code}
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Firm Details */}
        <GlassCard className="lg:col-span-2">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center gap-2">
              <GradientIcon icon={<BuildingIcon className="size-4" />} color="blue" size="sm" />
              <CardTitle className="text-sm font-semibold">
                Firm Details
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <DetailRow label="Name" value={firm.name} />
            <DetailRow label="Location" value={firm.location} />
            <DetailRow label="Specialty" value={firm.specialty} />
            <DetailRow label="Key Clients" value={firm.key_clients} />
            <DetailRow
              label="Vendor Status"
              value={
                <VendorStatusBadgeStatic status={firm.vendor_list_status} />
              }
            />
            <DetailRow
              label="Application Date"
              value={
                firm.vendor_application_date
                  ? new Date(firm.vendor_application_date).toLocaleDateString(
                      "en-GB",
                      { day: "numeric", month: "short", year: "numeric" }
                    )
                  : null
              }
            />
            <DetailRow
              label="Connection"
              value={
                <ConnectionBadgeStatic strength={firm.connection_strength} />
              }
            />
            <DetailRow label="Connection Notes" value={firm.connection_notes} />
            <DetailRow
              label="Website"
              value={
                firm.website ? (
                  <a
                    href={firm.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {firm.website}
                    <ExternalLinkIcon className="size-3" />
                  </a>
                ) : null
              }
            />
            <DetailRow
              label="Priority"
              value={<PriorityBadgeStatic priority={firm.priority} />}
            />
            {firm.notes && <DetailRow label="Notes" value={firm.notes} />}
            <DetailRow
              label="Created"
              value={new Date(firm.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            />
          </CardContent>
        </GlassCard>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Quick Stats */}
          <GlassCard>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center gap-2">
                <GradientIcon icon={<BarChart3Icon className="size-4" />} color="emerald" size="sm" />
                <CardTitle className="text-sm font-semibold">
                  Quick Stats
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Linked Brands
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {brandLinks.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Connection
                </span>
                <ConnectionBadgeStatic strength={firm.connection_strength} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Vendor Status
                </span>
                <VendorStatusBadgeStatic status={firm.vendor_list_status} />
              </div>
            </CardContent>
          </GlassCard>
        </div>
      </div>

      {/* Vendor Status Tracker */}
      <GlassCard>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center gap-2">
            <GradientIcon icon={<BuildingIcon className="size-4" />} color="amber" size="sm" />
            <CardTitle className="text-sm font-semibold">
              Vendor Application Progress
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <VendorStepper currentStatus={firm.vendor_list_status} />
        </CardContent>
      </GlassCard>

      {/* Linked Brands */}
      <GlassCard>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center gap-2">
            <GradientIcon icon={<LinkIcon className="size-4" />} color="teal" size="sm" />
            <CardTitle className="text-sm font-semibold">
              Linked Brands
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {brandLinks.length === 0 ? (
            <div className="flex flex-col items-center py-8">
              <LinkIcon className="size-6 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">
                No brands linked to this firm yet.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {brandLinks.map((link) => (
                <BrandLinkRow
                  key={link.brand.id}
                  brand={link.brand}
                  relationshipType={link.relationship_type}
                />
              ))}
            </div>
          )}
        </CardContent>
      </GlassCard>
    </div>
  );
}
