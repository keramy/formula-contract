"use client";

import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { GlassCard, GradientIcon, EmptyState } from "@/components/ui/ui-helpers";
import { usePageHeader } from "@/components/layout/app-header";
import {
  useActivities,
  useCreateActivity,
  useBrands,
  useFirms,
} from "@/lib/react-query/crm";
import { activitySchema } from "@/lib/validations/crm";
import type { ActivityFormData } from "@/lib/validations/crm";
import { ACTIVITY_TYPES } from "@/types/crm";
import type { CrmActivityWithRelations, CrmActivityType } from "@/types/crm";
import {
  PlusIcon,
  Loader2Icon,
  CalendarIcon,
  ActivityIcon,
  ArrowRightIcon,
} from "lucide-react";

// ============================================================================
// Props
// ============================================================================

interface ActivitiesTimelineProps {
  userRole: string;
}

// ============================================================================
// Constants
// ============================================================================

const ALL_FILTER = "__all__";
const NONE_VALUE = "__none__";

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

const ACTIVITY_FORM_DEFAULTS: ActivityFormData = {
  activity_type: "email",
  title: "",
  description: "",
  activity_date: getTodayString(),
  brand_id: null,
  architecture_firm_id: null,
  contact_id: null,
  opportunity_id: null,
  outcome: "",
  next_action: "",
  next_action_date: "",
};

// ============================================================================
// Badge helper (module-scope)
// ============================================================================

function ActivityTypeBadge({ type }: { type: CrmActivityType }) {
  switch (type) {
    case "email":
      return <Badge variant="info">Email</Badge>;
    case "call":
      return <Badge variant="warning">Call</Badge>;
    case "meeting":
      return <Badge variant="success">Meeting</Badge>;
    case "linkedin_message":
      return <Badge variant="info">LinkedIn</Badge>;
    case "sample_sent":
      return <Badge variant="default">Sample Sent</Badge>;
    case "vendor_application":
      return <Badge variant="secondary">Vendor App</Badge>;
    case "trade_show":
      return <Badge variant="default">Trade Show</Badge>;
    case "site_visit":
      return <Badge variant="success">Site Visit</Badge>;
    case "proposal_sent":
      return <Badge variant="warning">Proposal</Badge>;
    case "follow_up":
      return <Badge variant="destructive">Follow Up</Badge>;
    case "note":
      return <Badge variant="outline">Note</Badge>;
  }
}

// ============================================================================
// Activity Card (module-scope)
// ============================================================================

interface ActivityCardProps {
  activity: CrmActivityWithRelations;
}

function ActivityCard({ activity }: ActivityCardProps) {
  const relationParts: string[] = [];
  if (activity.brand?.name) relationParts.push(activity.brand.name);
  if (activity.architecture_firm?.name)
    relationParts.push(activity.architecture_firm.name);
  if (activity.contact) {
    relationParts.push(
      `${activity.contact.first_name} ${activity.contact.last_name}`
    );
  }

  const truncatedDescription =
    activity.description && activity.description.length > 150
      ? `${activity.description.slice(0, 150)}...`
      : activity.description;

  return (
    <GlassCard hover="primary" className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <ActivityTypeBadge type={activity.activity_type} />
            {activity.user?.name && (
              <span className="text-xs text-muted-foreground">
                by {activity.user.name}
              </span>
            )}
          </div>
          <p className="text-sm font-semibold">{activity.title}</p>
          {truncatedDescription && (
            <p className="text-sm text-muted-foreground mt-1">
              {truncatedDescription}
            </p>
          )}
        </div>
      </div>

      {relationParts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {relationParts.map((part) => (
            <span
              key={part}
              className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              {part}
            </span>
          ))}
        </div>
      )}

      {(activity.outcome || activity.next_action) && (
        <div className="mt-3 space-y-1.5 border-t border-base-100 pt-2.5">
          {activity.outcome && (
            <p className="text-xs">
              <span className="font-medium text-foreground">Outcome:</span>{" "}
              <span className="text-muted-foreground">{activity.outcome}</span>
            </p>
          )}
          {activity.next_action && (
            <div className="flex items-center gap-1 text-xs">
              <ArrowRightIcon className="size-3 text-primary shrink-0" />
              <span className="font-medium text-foreground">Next:</span>{" "}
              <span className="text-muted-foreground">
                {activity.next_action}
              </span>
              {activity.next_action_date && (
                <span className="text-muted-foreground">
                  ({activity.next_action_date})
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}

// ============================================================================
// Date group header (module-scope)
// ============================================================================

function DateHeader({ date }: { date: string }) {
  const formatted = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex items-center gap-2">
        <CalendarIcon className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">{formatted}</h3>
      </div>
      <div className="flex-1 border-t border-base-200" />
    </div>
  );
}

// ============================================================================
// Log Activity Dialog (module-scope)
// ============================================================================

interface LogActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function LogActivityDialog({ open, onOpenChange }: LogActivityDialogProps) {
  const createActivity = useCreateActivity();
  const { data: brands } = useBrands();
  const { data: firms } = useFirms();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ActivityFormData>({
    resolver: zodResolver(activitySchema),
    defaultValues: { ...ACTIVITY_FORM_DEFAULTS, activity_date: getTodayString() },
  });

  function onSubmit(data: ActivityFormData): void {
    const payload: Record<string, unknown> = {
      ...data,
      description: data.description || null,
      brand_id: data.brand_id || null,
      architecture_firm_id: data.architecture_firm_id || null,
      contact_id: data.contact_id || null,
      opportunity_id: data.opportunity_id || null,
      outcome: data.outcome || null,
      next_action: data.next_action || null,
      next_action_date: data.next_action_date || null,
    };

    createActivity.mutate(payload, {
      onSuccess: () => {
        reset({ ...ACTIVITY_FORM_DEFAULTS, activity_date: getTodayString() });
        onOpenChange(false);
      },
    });
  }

  function handleOpenChange(nextOpen: boolean): void {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      reset({ ...ACTIVITY_FORM_DEFAULTS, activity_date: getTodayString() });
    }
  }

  const activityTypeValue = watch("activity_type");
  const brandIdValue = watch("brand_id");
  const firmIdValue = watch("architecture_firm_id");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Activity</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Activity Type + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Activity Type *</Label>
              <Select
                value={activityTypeValue}
                onValueChange={(val) =>
                  setValue("activity_type", val as CrmActivityType)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="activity-date">Date *</Label>
              <Input
                id="activity-date"
                type="date"
                {...register("activity_date")}
              />
              {errors.activity_date && (
                <p className="text-xs text-destructive">
                  {errors.activity_date.message}
                </p>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="activity-title">Title *</Label>
            <Input
              id="activity-title"
              placeholder="e.g. Follow-up call with Gucci team"
              {...register("title")}
            />
            {errors.title && (
              <p className="text-xs text-destructive">
                {errors.title.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="activity-description">Description</Label>
            <Textarea
              id="activity-description"
              placeholder="What happened during this activity..."
              rows={3}
              {...register("description")}
            />
          </div>

          {/* Brand + Firm */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Brand</Label>
              <Select
                value={brandIdValue ?? NONE_VALUE}
                onValueChange={(val) =>
                  setValue("brand_id", val === NONE_VALUE ? null : val)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>None</SelectItem>
                  {brands?.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Architecture Firm</Label>
              <Select
                value={firmIdValue ?? NONE_VALUE}
                onValueChange={(val) =>
                  setValue(
                    "architecture_firm_id",
                    val === NONE_VALUE ? null : val
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select firm" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>None</SelectItem>
                  {firms?.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Outcome */}
          <div className="space-y-1.5">
            <Label htmlFor="activity-outcome">Outcome</Label>
            <Input
              id="activity-outcome"
              placeholder="e.g. Agreed to schedule a site visit"
              {...register("outcome")}
            />
          </div>

          {/* Next Action + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="activity-next-action">Next Action</Label>
              <Input
                id="activity-next-action"
                placeholder="e.g. Send proposal"
                {...register("next_action")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="activity-next-action-date">
                Next Action Date
              </Label>
              <Input
                id="activity-next-action-date"
                type="date"
                {...register("next_action_date")}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createActivity.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createActivity.isPending}>
              {createActivity.isPending && (
                <Loader2Icon className="size-4 mr-1 animate-spin" />
              )}
              Log Activity
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Utility: group activities by date
// ============================================================================

function groupByDate(
  activities: CrmActivityWithRelations[]
): Map<string, CrmActivityWithRelations[]> {
  const groups = new Map<string, CrmActivityWithRelations[]>();

  for (const activity of activities) {
    const dateKey = activity.activity_date;
    const existing = groups.get(dateKey);
    if (existing) {
      existing.push(activity);
    } else {
      groups.set(dateKey, [activity]);
    }
  }

  return groups;
}

// ============================================================================
// Main Component
// ============================================================================

export function ActivitiesTimeline({ userRole }: ActivitiesTimelineProps) {
  const { data: activities, isLoading } = useActivities();
  const canEdit = userRole === "admin";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState(ALL_FILTER);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filteredActivities = useMemo(() => {
    if (!activities) return [];
    return activities.filter((activity) => {
      const matchesType =
        typeFilter === ALL_FILTER || activity.activity_type === typeFilter;
      const matchesFrom = !dateFrom || activity.activity_date >= dateFrom;
      const matchesTo = !dateTo || activity.activity_date <= dateTo;
      return matchesType && matchesFrom && matchesTo;
    });
  }, [activities, typeFilter, dateFrom, dateTo]);

  const groupedActivities = useMemo(
    () => groupByDate(filteredActivities),
    [filteredActivities]
  );

  const sortedDates = useMemo(
    () => Array.from(groupedActivities.keys()).sort((a, b) => b.localeCompare(a)),
    [groupedActivities]
  );

  const hasActiveFilters =
    typeFilter !== ALL_FILTER || dateFrom || dateTo;

  const { setContent } = usePageHeader();
  const description = `${filteredActivities.length} activit${filteredActivities.length !== 1 ? "ies" : "y"}`;
  useEffect(() => {
    setContent({
      icon: <GradientIcon icon={<ActivityIcon className="size-4" />} color="violet" size="sm" />,
      title: "Activities",
      description,
      actions: canEdit ? (
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <PlusIcon className="size-4 mr-1" />
          Log Activity
        </Button>
      ) : undefined,
    });
    return () => setContent({});
  }, [description, setContent, canEdit]);

  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>All Types</SelectItem>
            {ACTIVITY_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5">
          <Label htmlFor="date-from" className="text-xs text-muted-foreground">
            From
          </Label>
          <Input
            id="date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-[140px] h-9"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Label htmlFor="date-to" className="text-xs text-muted-foreground">
            To
          </Label>
          <Input
            id="date-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-[140px] h-9"
          />
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, gi) => (
            <div key={gi}>
              <div className="flex items-center gap-3 py-3">
                <Skeleton className="size-4 rounded" />
                <Skeleton className="h-4 w-40" />
                <div className="flex-1 border-t border-base-200" />
              </div>
              <div className="ml-6 border-l-2 border-base-200 pl-6 space-y-4">
                {Array.from({ length: 2 }).map((_, ci) => (
                  <div key={ci} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-14 rounded-full" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-full max-w-xs" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredActivities.length === 0 && (
        <EmptyState
          icon={<ActivityIcon className="size-6" />}
          title="No activities found"
          description={
            hasActiveFilters
              ? "Try adjusting your filters."
              : "Get started by logging your first activity."
          }
          action={
            canEdit && !hasActiveFilters ? (
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <PlusIcon className="size-4 mr-1" />
                Log Activity
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Timeline */}
      {!isLoading && sortedDates.length > 0 && (
        <div className="space-y-6">
          {sortedDates.map((date) => {
            const dayActivities = groupedActivities.get(date)!;
            return (
              <div key={date}>
                <DateHeader date={date} />
                <div className="relative ml-6 border-l-2 border-base-200 pl-6 space-y-4 mt-2">
                  {dayActivities.map((activity) => (
                    <div key={activity.id} className="relative">
                      <div className="absolute -left-[29px] top-4 size-3 rounded-full border-2 border-base-200 bg-card" />
                      <ActivityCard activity={activity} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Log Activity Dialog */}
      {canEdit && (
        <LogActivityDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      )}
    </div>
  );
}
