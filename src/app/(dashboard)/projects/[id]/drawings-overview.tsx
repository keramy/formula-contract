"use client";

import Link from "next/link";
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
  ArrowRightIcon,
  FactoryIcon,
  PenToolIcon,
} from "lucide-react";
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

export function DrawingsOverview({ projectId, productionItems, drawings }: DrawingsOverviewProps) {
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
      <div className="flex items-center gap-2 mb-2">
        <GradientIcon icon={<PenToolIcon className="size-4" />} color="teal" size="sm" />
        <div>
          <h3 className="text-lg font-medium">Drawings</h3>
          <p className="text-sm text-muted-foreground">Manage technical drawings for production items</p>
        </div>
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
      {needsAttention.length > 0 && (
        <GlassCard>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-orange-500/10 to-amber-500/10">
                <AlertTriangleIcon className="size-3.5 text-orange-600" />
              </div>
              Needs Attention
              <StatusBadge variant="warning">{needsAttention.length}</StatusBadge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1">
              {needsAttention.slice(0, 5).map((item) => (
                <Link
                  key={item.id}
                  href={`/projects/${projectId}/scope/${item.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-muted-foreground bg-gray-100 px-2 py-0.5 rounded">
                      {item.item_code}
                    </span>
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!item.drawing || item.drawing.status === "not_uploaded" ? (
                      <span className="text-sm text-orange-600">No drawing uploaded</span>
                    ) : item.drawing.status === "rejected" ? (
                      <span className="text-sm text-rose-600">Rejected - needs revision</span>
                    ) : item.drawing.status === "sent_to_client" && item.drawing.sent_to_client_at ? (
                      <span className="text-sm text-amber-600">
                        Awaiting client ({formatDistanceToNow(new Date(item.drawing.sent_to_client_at), { addSuffix: false })})
                      </span>
                    ) : null}
                    <ArrowRightIcon className="size-4 text-muted-foreground group-hover:text-teal-600 transition-colors" />
                  </div>
                </Link>
              ))}
              {needsAttention.length > 5 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  +{needsAttention.length - 5} more items need attention
                </p>
              )}
            </div>
          </CardContent>
        </GlassCard>
      )}

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
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="hover:text-teal-600 hover:bg-teal-50"
                        >
                          <Link href={`/projects/${projectId}/scope/${item.id}`}>
                            View
                            <ArrowRightIcon className="size-3 ml-1" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </GlassCard>
    </div>
  );
}
