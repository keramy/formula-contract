"use client";

import { useState } from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  EyeIcon,
  FactoryIcon,
  PenToolIcon,
  UploadIcon,
} from "lucide-react";
import { DrawingUploadSheet } from "@/components/drawings/drawing-upload-sheet";
import { ScopeItemSheet } from "@/components/scope-items/scope-item-sheet";

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
  not_required: { variant: "default", label: "Not Required" },
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

  // Calculate stats for header
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
      (i) => i.drawing?.status === "approved" || i.drawing?.status === "approved_with_comments" || i.drawing?.status === "not_required"
    ).length,
  };

  if (productionItems.length === 0) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GradientIcon icon={<PenToolIcon className="size-5" />} color="teal" size="default" />
            <div>
              <h3 className="text-lg font-medium">Drawings</h3>
              <p className="text-sm text-muted-foreground">
                No production items yet
              </p>
            </div>
          </div>
        </div>

        <EmptyState
          icon={<FactoryIcon className="size-6" />}
          title="No production items yet"
          description="Add scope items with 'Production' path to manage drawings."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with inline stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GradientIcon icon={<PenToolIcon className="size-5" />} color="teal" size="default" />
          <div>
            <h3 className="text-lg font-medium">Drawings</h3>
            <p className="text-sm text-muted-foreground">
              {stats.total} production items
              {!isClient && (
                <>
                  {" "}({stats.needDrawing > 0 && <span className="text-orange-600">{stats.needDrawing} need drawing</span>}
                  {stats.needDrawing > 0 && stats.awaitingClient > 0 && ", "}
                  {stats.awaitingClient > 0 && <span className="text-amber-600">{stats.awaitingClient} awaiting client</span>}
                  {(stats.needDrawing > 0 || stats.awaitingClient > 0) && stats.rejected > 0 && ", "}
                  {stats.rejected > 0 && <span className="text-rose-600">{stats.rejected} rejected</span>}
                  {(stats.needDrawing > 0 || stats.awaitingClient > 0 || stats.rejected > 0) && stats.approved > 0 && ", "}
                  {stats.approved > 0 && <span className="text-emerald-600">{stats.approved} approved</span>})
                </>
              )}
              {isClient && stats.awaitingClient > 0 && (
                <span className="text-amber-600"> ({stats.awaitingClient} awaiting your review)</span>
              )}
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            setPreselectedItemId(undefined);
            setUploadSheetOpen(true);
          }}
        >
          <UploadIcon className="size-4" />
          Upload Drawing
        </Button>
      </div>

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
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Revision</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsWithDrawings.map((item, index) => {
                  const status = item.drawing?.status || "not_uploaded";
                  const config = statusConfig[status] || { variant: "default" as StatusVariant, label: status };
                  return (
                    <TableRow key={item.id} className="hover:bg-primary/5 transition-colors">
                      <TableCell className="text-center">
                        <span className="text-sm font-medium text-muted-foreground">
                          {index + 1}
                        </span>
                      </TableCell>
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

      {/* Drawing Upload Sheet */}
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

      {/* View Item Sheet */}
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
