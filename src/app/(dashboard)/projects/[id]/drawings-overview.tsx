"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { GlassCard, StatusBadge, EmptyState } from "@/components/ui/ui-helpers";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import {
  EyeIcon,
  FactoryIcon,
  PenToolIcon,
  UploadIcon,
  AlertTriangleIcon,
  SendIcon,
} from "lucide-react";
import { DrawingUploadSheet } from "@/components/drawings/drawing-upload-sheet";
import { ScopeItemSheet } from "@/components/scope-items/scope-item-sheet";
import { sendDrawingsToClient } from "@/lib/actions/drawings";
import { toast } from "sonner";

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
  const router = useRouter();

  // Sheet states
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);
  const [preselectedItemId, setPreselectedItemId] = useState<string | undefined>(undefined);

  // View item sheet state
  const [viewSheetOpen, setViewSheetOpen] = useState(false);
  const [viewItemId, setViewItemId] = useState<string | null>(null);

  // Confirmation dialog for new revision on approved drawings
  const [confirmNewRevOpen, setConfirmNewRevOpen] = useState(false);
  const [pendingNewRevItemId, setPendingNewRevItemId] = useState<string | null>(null);

  // Bulk send state
  const [bulkSendDialogOpen, setBulkSendDialogOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

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

  // Client-side filtering: hide unsent drawings from clients
  const visibleItems = isClient
    ? itemsWithDrawings.filter((i) => {
        const s = i.drawing?.status;
        return (
          s === "sent_to_client" ||
          s === "approved" ||
          s === "approved_with_comments" ||
          s === "rejected"
        );
      })
    : itemsWithDrawings;

  // Compute "ready to send" count (uploaded but not yet sent)
  const readyToSendCount = itemsWithDrawings.filter(
    (i) => i.drawing?.status === "uploaded"
  ).length;

  const handleBulkSend = async () => {
    const drawingIds = itemsWithDrawings
      .filter((i) => i.drawing?.status === "uploaded")
      .map((i) => i.drawing!.id);

    setIsSending(true);
    try {
      const result = await sendDrawingsToClient(projectId, drawingIds);
      if (result.success) {
        toast.success(`${result.sentCount} drawing${result.sentCount !== 1 ? "s" : ""} sent to client`);
        setBulkSendDialogOpen(false);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to send drawings");
      }
    } catch {
      toast.error("Failed to send drawings");
    } finally {
      setIsSending(false);
    }
  };

  if (productionItems.length === 0) {
    return (
      <EmptyState
        icon={<FactoryIcon className="size-6" />}
        title="No production items yet"
        description="Add scope items with 'Production' path to manage drawings."
      />
    );
  }

  // Client empty state when no drawings have been shared
  if (isClient && visibleItems.length === 0) {
    return (
      <EmptyState
        icon={<PenToolIcon className="size-6" />}
        title="No drawings shared yet"
        description="No drawings have been shared for your review yet. You will be notified when drawings are ready."
      />
    );
  }

  return (
    <div>
      {/* Stats + actions bar, flush above the table */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <PenToolIcon className="size-3.5 text-teal-600" />
          <span className="font-medium text-foreground">{stats.total} items</span>
          {!isClient && (
            <>
              {stats.needDrawing > 0 && <><span>&middot;</span><span className="text-orange-600">{stats.needDrawing} need drawing</span></>}
              {stats.awaitingClient > 0 && <><span>&middot;</span><span className="text-amber-600">{stats.awaitingClient} awaiting</span></>}
              {stats.rejected > 0 && <><span>&middot;</span><span className="text-rose-600">{stats.rejected} rejected</span></>}
              {stats.approved > 0 && <><span>&middot;</span><span className="text-emerald-600">{stats.approved} approved</span></>}
            </>
          )}
          {isClient && stats.awaitingClient > 0 && (
            <><span>&middot;</span><span className="text-amber-600">{stats.awaitingClient} awaiting your review</span></>
          )}
        </div>
        {!isClient && (
          <div className="flex gap-1.5">
            {readyToSendCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkSendDialogOpen(true)}
                disabled={isSending}
              >
                <SendIcon className="size-3.5" />
                Send All ({readyToSendCount})
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => {
                setPreselectedItemId(undefined);
                setUploadSheetOpen(true);
              }}
            >
              <UploadIcon className="size-3.5" />
              Upload
            </Button>
          </div>
        )}
      </div>

      <GlassCard className="py-0 gap-0">
        <div className="overflow-hidden">
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
                {visibleItems.map((item, index) => {
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
                          {!isClient && (() => {
                            const isApproved = item.drawing?.status === "approved" || item.drawing?.status === "approved_with_comments";
                            return (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (isApproved) {
                                    setPendingNewRevItemId(item.id);
                                    setConfirmNewRevOpen(true);
                                  } else {
                                    setPreselectedItemId(item.id);
                                    setUploadSheetOpen(true);
                                  }
                                }}
                                className={isApproved ? "hover:text-amber-600 hover:bg-amber-50" : "hover:text-teal-600 hover:bg-teal-50"}
                              >
                                <UploadIcon className="size-3 mr-1" />
                                {item.drawing ? "New Rev" : "Upload"}
                              </Button>
                            );
                          })()}
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
        onSuccess={() => router.refresh()}
      />

      {/* View Item Sheet */}
      <ScopeItemSheet
        projectId={projectId}
        projectCurrency={projectCurrency}
        open={viewSheetOpen}
        onOpenChange={(open) => {
          setViewSheetOpen(open);
          if (!open) {
            // Refresh data when sheet closes (e.g., after approval action)
            router.refresh();
          }
        }}
        itemId={viewItemId}
        isClient={isClient}
      />

      {/* Confirmation dialog: new revision on approved drawing */}
      <AlertDialog open={confirmNewRevOpen} onOpenChange={setConfirmNewRevOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangleIcon className="size-5 text-amber-500" />
              Upload New Revision?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This drawing has already been approved by the client. Uploading a new revision will reset the approval status and the client will need to review again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingNewRevItemId) {
                  setPreselectedItemId(pendingNewRevItemId);
                  setUploadSheetOpen(true);
                }
                setPendingNewRevItemId(null);
              }}
            >
              Continue with New Revision
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk send confirmation dialog */}
      <AlertDialog open={bulkSendDialogOpen} onOpenChange={setBulkSendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <SendIcon className="size-5 text-blue-500" />
              Send {readyToSendCount} Drawing{readyToSendCount !== 1 ? "s" : ""} to Client?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  This will send all uploaded drawings to the client for review. They will receive an email notification.
                </p>
                <div className="max-h-32 overflow-y-auto rounded-md bg-gray-50 p-2 space-y-1">
                  {itemsWithDrawings
                    .filter((i) => i.drawing?.status === "uploaded")
                    .map((item) => (
                      <div key={item.id} className="text-sm font-mono text-gray-700">
                        {item.item_code} — {item.name}
                      </div>
                    ))}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleBulkSend();
              }}
              disabled={isSending}
            >
              {isSending ? (
                <>
                  <Spinner className="size-4" />
                  Sending...
                </>
              ) : (
                <>
                  <SendIcon className="size-4" />
                  Send All
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
