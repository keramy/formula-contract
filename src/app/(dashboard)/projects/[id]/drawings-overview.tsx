"use client";

import { useState } from "react";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GlassCard, GradientIcon, StatusBadge, EmptyState } from "@/components/ui/ui-helpers";
import {
  FileIcon,
  AlertTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  FactoryIcon,
  PenToolIcon,
  UploadIcon,
} from "lucide-react";
import { DrawingUploadSheet } from "@/components/drawings/drawing-upload-sheet";
import { ScopeItemSheet } from "@/components/scope-items/scope-item-sheet";
import { formatDistanceToNow } from "date-fns";

interface Drawing {
  id: string;
  item_id: string;
  status: string;
  current_revision: string | null;
  sent_to_client_at: string | null;
}

interface ProductionItem {
  id: string;
  item_code: string;
  name: string;
}

interface DrawingsOverviewProps {
  projectId: string;
  productionItems: ProductionItem[];
  drawings: Drawing[];
  projectCurrency?: string;
  isClient?: boolean;
}

type StatusVariant = "info" | "success" | "warning" | "default" | "danger";

const statusConfig: Record<string, { variant: StatusVariant; label: string }> = {
  not_uploaded: { variant: "default", label: "Not Uploaded" },
  uploaded: { variant: "info", label: "Uploaded" },
  sent_to_client: { variant: "warning", label: "Awaiting Client" },
  approved: { variant: "success", label: "Approved" },
  approved_with_comments: { variant: "success", label: "Approved w/ Comments" },
  rejected: { variant: "danger", label: "Rejected" },
};

export function DrawingsOverview({ projectId, productionItems, drawings, projectCurrency = "TRY", isClient = false }: DrawingsOverviewProps) {
  // Sheet states
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);
  const [preselectedItemId, setPreselectedItemId] = useState<string | undefined>(undefined);

  // View item sheet state
  const [viewSheetOpen, setViewSheetOpen] = useState(false);
  const [viewItemId, setViewItemId] = useState<string | null>(null);

  // Open the view sheet for an item
  const openViewSheet = (itemId: string) => {
    setViewItemId(itemId);
    setViewSheetOpen(true);
  };

  // Create a map of drawings by item_id
  const drawingsByItemId = new Map(drawings.map((d) => [d.item_id, d]));

  // Combine items with their drawings
  const itemsWithDrawings = productionItems.map((item) => ({
    ...item,
    drawing: drawingsByItemId.get(item.id) || null,
  }));

  // Calculate stats
  const stats = {
    total: productionItems.length,
    needDrawing: itemsWithDrawings.filter(
      (i) => !i.drawing || i.drawing.status === "not_uploaded"
    ).length,
    awaitingClient: itemsWithDrawings.filter(
      (i) => i.drawing?.status === "sent_to_client"
    ).length,
    rejected: itemsWithDrawings.filter(
      (i) => i.drawing?.status === "rejected"
    ).length,
    approved: itemsWithDrawings.filter(
      (i) => i.drawing?.status === "approved" || i.drawing?.status === "approved_with_comments"
    ).length,
  };

  // Items needing attention
  const needsAttention = itemsWithDrawings.filter((item) => {
    if (!item.drawing || item.drawing.status === "not_uploaded") return true;
    if (item.drawing.status === "rejected") return true;
    // Awaiting client for more than 3 days
    if (item.drawing.status === "sent_to_client" && item.drawing.sent_to_client_at) {
      const sentDate = new Date(item.drawing.sent_to_client_at);
      const daysSinceSent = (Date.now() - sentDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceSent > 3;
    }
    return false;
  });

  if (productionItems.length === 0) {
    return (
      <GlassCard>
        <CardHeader>
          <div className="flex items-center gap-2">
            <GradientIcon icon={<PenToolIcon className="size-4" />} color="teal" size="sm" />
            <CardTitle className="text-base">Drawings</CardTitle>
          </div>
          <CardDescription>Manage technical drawings for production items</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<FactoryIcon className="size-6" />}
            title="No production items yet"
            description="Add scope items with 'Production' path to manage drawings."
          />
        </CardContent>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <GradientIcon icon={<PenToolIcon className="size-4" />} color="teal" size="sm" />
          <div>
            <h3 className="text-lg font-medium">Drawings</h3>
            <p className="text-sm text-muted-foreground">
              {isClient ? "Review and respond to drawings" : "Manage technical drawings for production items"}
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            setPreselectedItemId(undefined);
            setUploadSheetOpen(true);
          }}
          className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700"
        >
          <UploadIcon className="size-4" />
          Upload Drawing
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <GlassCard hover="lift" className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-slate-500/10 to-gray-500/10">
              <FactoryIcon className="size-3.5 text-slate-600" />
            </div>
            <span className="text-xs font-medium">Production Items</span>
          </div>
          <p className="text-2xl font-bold">{stats.total}</p>
        </GlassCard>

        <GlassCard hover="lift" className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-orange-500/10 to-amber-500/10">
              <AlertTriangleIcon className="size-3.5 text-orange-600" />
            </div>
            <span className="text-xs font-medium">Need Drawing</span>
          </div>
          <p className="text-2xl font-bold text-orange-600">{stats.needDrawing}</p>
        </GlassCard>

        <GlassCard hover="lift" className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500/10 to-yellow-500/10">
              <ClockIcon className="size-3.5 text-amber-600" />
            </div>
            <span className="text-xs font-medium">Awaiting Client</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{stats.awaitingClient}</p>
        </GlassCard>

        <GlassCard hover="lift" className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-rose-500/10 to-red-500/10">
              <XCircleIcon className="size-3.5 text-rose-600" />
            </div>
            <span className="text-xs font-medium">Rejected</span>
          </div>
          <p className="text-2xl font-bold text-rose-600">{stats.rejected}</p>
        </GlassCard>

        <GlassCard hover="lift" className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500/10 to-green-500/10">
              <CheckCircleIcon className="size-3.5 text-emerald-600" />
            </div>
            <span className="text-xs font-medium">Approved</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{stats.approved}</p>
        </GlassCard>
      </div>

      {/* Needs Attention Section */}
      {(() => {
        // For clients: only show items sent to them for review
        // For PM/Admin: show all items needing attention
        const itemsToShow = isClient
          ? needsAttention.filter((item) => item.drawing?.status === "sent_to_client")
          : needsAttention;

        if (itemsToShow.length === 0) return null;

        return (
          <GlassCard>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-orange-500/10 to-amber-500/10">
                  <AlertTriangleIcon className="size-3.5 text-orange-600" />
                </div>
                {isClient ? "Awaiting Your Review" : "Needs Attention"}
                <StatusBadge variant="warning">{itemsToShow.length}</StatusBadge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1">
                {itemsToShow.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => openViewSheet(item.id)}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group w-full text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-muted-foreground bg-gray-100 px-2 py-0.5 rounded">
                        {item.item_code}
                      </span>
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isClient ? (
                        <span className="text-sm text-amber-600">
                          Sent {item.drawing?.sent_to_client_at
                            ? formatDistanceToNow(new Date(item.drawing.sent_to_client_at), { addSuffix: true })
                            : "recently"}
                        </span>
                      ) : (
                        <>
                          {!item.drawing || item.drawing.status === "not_uploaded" ? (
                            <span className="text-sm text-orange-600">No drawing uploaded</span>
                          ) : item.drawing.status === "rejected" ? (
                            <span className="text-sm text-rose-600">Rejected - needs revision</span>
                          ) : item.drawing.status === "sent_to_client" && item.drawing.sent_to_client_at ? (
                            <span className="text-sm text-amber-600">
                              Awaiting client ({formatDistanceToNow(new Date(item.drawing.sent_to_client_at), { addSuffix: false })})
                            </span>
                          ) : null}
                        </>
                      )}
                      <EyeIcon className="size-4 text-muted-foreground group-hover:text-teal-600 transition-colors" />
                    </div>
                  </button>
                ))}
                {itemsToShow.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    +{itemsToShow.length - 5} more items {isClient ? "awaiting your review" : "need attention"}
                  </p>
                )}
              </div>
            </CardContent>
          </GlassCard>
        );
      })()}

      {/* All Production Items Table */}
      <GlassCard>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileIcon className="size-4 text-teal-600" />
            All Production Items
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Revision</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsWithDrawings.map((item) => {
                  const status = item.drawing?.status || "not_uploaded";
                  const config = statusConfig[status] || { variant: "default" as StatusVariant, label: status };
                  return (
                    <TableRow key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell>
                        <span className="font-mono text-sm bg-gray-100 px-2 py-0.5 rounded">
                          {item.item_code}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        {item.drawing?.current_revision ? (
                          <Badge variant="outline" className="font-mono bg-teal-50 text-teal-700 border-teal-200">
                            Rev {item.drawing.current_revision}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge variant={config.variant}>
                          {config.label}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setPreselectedItemId(item.id);
                              setUploadSheetOpen(true);
                            }}
                            className="hover:text-teal-600 hover:bg-teal-50"
                          >
                            <UploadIcon className="size-3 mr-1" />
                            {item.drawing ? "New Rev" : "Upload"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openViewSheet(item.id)}
                            className="hover:text-teal-600 hover:bg-teal-50"
                          >
                            <EyeIcon className="size-3 mr-1" />
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </GlassCard>

      {/* Drawing Upload Sheet - Clients can also upload (for markups/responses) */}
      <DrawingUploadSheet
        projectId={projectId}
        scopeItems={productionItems.map((item) => {
          const drawing = drawingsByItemId.get(item.id);
          return {
            id: item.id,
            item_code: item.item_code,
            name: item.name,
            hasDrawing: !!drawing,
            currentRevision: drawing?.current_revision || null,
          };
        })}
        open={uploadSheetOpen}
        onOpenChange={setUploadSheetOpen}
        preselectedItemId={preselectedItemId}
      />

      {/* View Item Sheet - Opens when clicking View on any item */}
      <ScopeItemSheet
        projectId={projectId}
        projectCurrency={projectCurrency}
        open={viewSheetOpen}
        onOpenChange={setViewSheetOpen}
        itemId={viewItemId}
        isClient={isClient}
      />
    </div>
  );
}
