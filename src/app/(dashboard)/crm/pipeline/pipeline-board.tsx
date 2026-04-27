"use client";

import { useState, useMemo, useEffect } from "react";
import type { DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import {
  KanbanBoard,
  KanbanColumn,
  KanbanColumnHeader,
  KanbanCard,
  KanbanOverlay,
} from "@/components/ui/kanban";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  usePipeline,
  useMoveOpportunityStage,
} from "@/lib/react-query/crm";
import type {
  CrmOpportunityWithRelations,
  OpportunityStage,
  PipelineColumn as PipelineColumnType,
} from "@/types/crm";
import { OPPORTUNITY_STAGES } from "@/types/crm";
import { formatCurrency } from "@/lib/utils";
import { GradientIcon } from "@/components/ui/ui-helpers";
import { usePageHeader } from "@/components/layout/app-header";
import { useBreakpoint } from "@/hooks/use-media-query";
import { PlusIcon, KanbanIcon, ChevronDownIcon } from "lucide-react";

// ============================================================================
// Constants
// ============================================================================

const EMPTY_COLUMNS: PipelineColumnType[] = [];

const PRIORITY_VARIANT_MAP: Record<string, "destructive" | "warning" | "secondary"> = {
  high: "destructive",
  medium: "warning",
  low: "secondary",
};

// ============================================================================
// OpportunityCard — Module-scope extracted card component
// ============================================================================

interface OpportunityCardProps {
  opportunity: CrmOpportunityWithRelations;
}

function OpportunityCard({ opportunity }: OpportunityCardProps) {
  const priorityVariant = PRIORITY_VARIANT_MAP[opportunity.priority] ?? "secondary";

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium truncate" title={opportunity.title}>
        {opportunity.title}
      </p>
      {opportunity.brand?.name && (
        <p className="text-xs text-muted-foreground truncate">
          {opportunity.brand.name}
        </p>
      )}
      <div className="h-px bg-base-200/60" />
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-foreground">
          {formatCurrency(opportunity.estimated_value, opportunity.currency)}
        </span>
        <div className="flex items-center gap-1.5">
          {opportunity.probability !== null && (
            <span className="text-muted-foreground">
              {opportunity.probability}%
            </span>
          )}
          <Badge variant={priorityVariant} className="text-[10px] px-1.5 py-0.5">
            {opportunity.priority}
          </Badge>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MobileStageGroup — Collapsible stage section for mobile
// ============================================================================

interface MobileStageGroupProps {
  column: PipelineColumnType;
}

function MobileStageGroup({ column }: MobileStageGroupProps) {
  return (
    <details className="group rounded-xl border border-base-200 bg-card">
      <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 select-none list-none [&::-webkit-details-marker]:hidden">
        <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
        <div
          className="size-2.5 rounded-full shrink-0"
          style={{ backgroundColor: column.color }}
        />
        <span className="text-sm font-semibold">{column.label}</span>
        <span className="inline-flex items-center justify-center size-5 rounded-full bg-base-200 text-xs font-medium text-muted-foreground">
          {column.opportunities.length}
        </span>
      </summary>
      <div className="space-y-2 px-4 pb-4 pt-1">
        {column.opportunities.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            No opportunities in this stage
          </p>
        ) : (
          column.opportunities.map((opp) => (
            <div
              key={opp.id}
              className="rounded-lg border border-base-200 bg-card p-3 hover:border-primary/20 transition-all"
            >
              <OpportunityCard opportunity={opp} />
            </div>
          ))
        )}
      </div>
    </details>
  );
}

// ============================================================================
// PipelineSkeleton — Loading state
// ============================================================================

function PipelineSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={`skel-${i}`} className="w-72 shrink-0 space-y-2">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// PipelineBoard — Main board component
// ============================================================================

interface PipelineBoardProps {
  userRole: string;
}

export function PipelineBoard({ userRole }: PipelineBoardProps) {
  const { data: columns = EMPTY_COLUMNS, isLoading } = usePipeline();
  const moveStage = useMoveOpportunityStage();
  const { isMobile } = useBreakpoint();

  const [activeId, setActiveId] = useState<string | null>(null);

  const canCreate = userRole === "admin";

  const { setContent } = usePageHeader();
  useEffect(() => {
    setContent({
      icon: <GradientIcon icon={<KanbanIcon className="size-4" />} color="emerald" size="sm" />,
      title: "Pipeline",
      description: "Sales opportunities by stage",
      actions: canCreate ? (
        <Button size="sm">
          <PlusIcon className="size-4 mr-1" />
          Add Opportunity
        </Button>
      ) : undefined,
    });
    return () => setContent({});
  }, [setContent, canCreate]);

  // Build a flat lookup of all opportunities for overlay rendering
  const opportunityMap = useMemo(() => {
    const map = new Map<string, CrmOpportunityWithRelations>();
    for (const col of columns) {
      for (const opp of col.opportunities) {
        map.set(opp.id, opp);
      }
    }
    return map;
  }, [columns]);

  function handleDragStart(event: DragStartEvent): void {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const opportunityId = String(active.id);
    const newStage = String(over.id) as OpportunityStage;

    // Only move if dropping onto a valid stage column that differs from current
    const isValidStage = OPPORTUNITY_STAGES.some((s) => s.value === newStage);
    if (!isValidStage) return;

    const opportunity = opportunityMap.get(opportunityId);
    if (!opportunity || opportunity.stage === newStage) return;

    moveStage.mutate({ opportunityId, newStage });
  }

  if (isLoading) {
    return <div className="p-4 md:p-6"><PipelineSkeleton /></div>;
  }

  const activeOpportunity = activeId ? opportunityMap.get(activeId) : null;

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Mobile: collapsible list */}
      {isMobile ? (
        <div className="space-y-2">
          {columns.map((col) => (
            <MobileStageGroup key={col.stage} column={col} />
          ))}
        </div>
      ) : (
        /* Desktop: kanban board */
        <KanbanBoard
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          overlay={
            activeOpportunity ? (
              <KanbanOverlay>
                <OpportunityCard opportunity={activeOpportunity} />
              </KanbanOverlay>
            ) : null
          }
        >
          <div className="flex gap-3 overflow-x-auto pb-4">
            {columns.map((col) => (
              <div key={col.stage} className="w-72 shrink-0">
                <KanbanColumn
                  id={col.stage}
                  items={col.opportunities.map((o) => o.id)}
                >
                  <KanbanColumnHeader
                    title={col.label}
                    count={col.opportunities.length}
                    color={col.color}
                  />
                  <div className="flex flex-col gap-2 mt-1">
                    {col.opportunities.map((opp) => (
                      <KanbanCard key={opp.id} id={opp.id}>
                        <OpportunityCard opportunity={opp} />
                      </KanbanCard>
                    ))}
                  </div>
                </KanbanColumn>
              </div>
            ))}
          </div>
        </KanbanBoard>
      )}
    </div>
  );
}
