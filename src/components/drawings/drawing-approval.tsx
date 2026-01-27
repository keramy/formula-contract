"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { logActivity } from "@/lib/activity-log/actions";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/constants";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  SendIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertTriangleIcon,
  BanIcon,
} from "lucide-react";
import type { DrawingUpdate, DrawingInsert, ScopeItemUpdate, DrawingStatus } from "@/types/database";

interface DrawingApprovalProps {
  drawingId: string | null; // Can be null if no drawing record exists yet
  drawingStatus: string;
  currentRevision: string | null;
  scopeItemId: string;
  userRole?: string; // Pass user role to determine available actions
  projectId?: string; // For activity logging
  itemCode?: string; // For activity logging
}

export function DrawingApproval({
  drawingId,
  drawingStatus,
  currentRevision,
  scopeItemId,
  userRole = "pm",
  projectId,
  itemCode,
}: DrawingApprovalProps) {
  const isClient = userRole === "client";
  const canSendToClient = ["admin", "pm"].includes(userRole);
  const canOverride = ["admin", "pm"].includes(userRole);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Send to client dialog
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);

  // Approval dialog
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [approvalType, setApprovalType] = useState<"approved" | "rejected" | "approved_with_comments">("approved");
  const [clientComments, setClientComments] = useState("");

  // PM Override dialog
  const [isOverrideDialogOpen, setIsOverrideDialogOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  // Not Required dialog
  const [isNotRequiredDialogOpen, setIsNotRequiredDialogOpen] = useState(false);
  const [notRequiredReason, setNotRequiredReason] = useState("");

  const handleSendToClient = async () => {
    if (!drawingId) return; // Safety check - should never happen for this action

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const drawingUpdate: DrawingUpdate = {
        status: "sent_to_client",
        sent_to_client_at: new Date().toISOString(),
      };
      const { error: updateError } = await supabase
        .from("drawings")
        .update(drawingUpdate)
        .eq("id", drawingId);

      if (updateError) throw updateError;

      // Update scope item status
      const scopeItemUpdate: ScopeItemUpdate = { status: "awaiting_approval" };
      await supabase
        .from("scope_items")
        .update(scopeItemUpdate)
        .eq("id", scopeItemId);

      // Log activity
      if (projectId) {
        await logActivity({
          action: ACTIVITY_ACTIONS.DRAWING_SENT_TO_CLIENT,
          entityType: "drawing",
          entityId: drawingId,
          projectId,
          details: { item_code: itemCode, revision: currentRevision },
        });
      }

      setIsSendDialogOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send to client");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproval = async () => {
    if (!drawingId) return; // Safety check - should never happen for this action

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const drawingUpdate: DrawingUpdate = {
        status: approvalType as DrawingStatus,
        client_response_at: new Date().toISOString(),
        client_comments: clientComments || null,
        approved_by: approvalType !== "rejected" ? user.id : null,
      };
      const { error: updateError } = await supabase
        .from("drawings")
        .update(drawingUpdate)
        .eq("id", drawingId);

      if (updateError) throw updateError;

      // Update scope item status
      let newItemStatus: "awaiting_approval" | "approved" | "in_design" = "awaiting_approval";
      if (approvalType === "approved" || approvalType === "approved_with_comments") {
        newItemStatus = "approved";
      } else if (approvalType === "rejected") {
        newItemStatus = "in_design";
      }

      const scopeItemUpdate: ScopeItemUpdate = { status: newItemStatus };
      await supabase
        .from("scope_items")
        .update(scopeItemUpdate)
        .eq("id", scopeItemId);

      // Log activity
      if (projectId) {
        const activityAction = approvalType === "rejected"
          ? ACTIVITY_ACTIONS.DRAWING_REJECTED
          : ACTIVITY_ACTIONS.DRAWING_APPROVED;
        await logActivity({
          action: activityAction,
          entityType: "drawing",
          entityId: drawingId,
          projectId,
          details: {
            item_code: itemCode,
            revision: currentRevision,
            status: approvalType,
            comments: clientComments || undefined,
          },
        });
      }

      setIsApprovalDialogOpen(false);
      setClientComments("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record approval");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePMOverride = async () => {
    if (!drawingId) return; // Safety check - should never happen for this action

    if (!overrideReason.trim()) {
      setError("Please provide a reason for the override");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const drawingUpdate: DrawingUpdate = {
        status: "approved",
        pm_override: true,
        pm_override_reason: overrideReason,
        pm_override_at: new Date().toISOString(),
        pm_override_by: user.id,
        approved_by: user.id,
      };
      const { error: updateError } = await supabase
        .from("drawings")
        .update(drawingUpdate)
        .eq("id", drawingId);

      if (updateError) throw updateError;

      // Update scope item status
      const scopeItemUpdate: ScopeItemUpdate = { status: "approved" };
      await supabase
        .from("scope_items")
        .update(scopeItemUpdate)
        .eq("id", scopeItemId);

      // Log activity
      if (projectId) {
        await logActivity({
          action: ACTIVITY_ACTIONS.DRAWING_PM_OVERRIDE,
          entityType: "drawing",
          entityId: drawingId,
          projectId,
          details: {
            item_code: itemCode,
            revision: currentRevision,
            override_reason: overrideReason,
          },
        });
      }

      setIsOverrideDialogOpen(false);
      setOverrideReason("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to override");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkNotRequired = async () => {
    if (!notRequiredReason.trim()) {
      setError("Please provide a reason why drawing is not required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let finalDrawingId = drawingId;

      if (!drawingId) {
        // No drawing record exists yet - create one with not_required status
        const drawingInsert: DrawingInsert = {
          item_id: scopeItemId,
          status: "not_required",
          not_required_reason: notRequiredReason,
          not_required_at: new Date().toISOString(),
          not_required_by: user.id,
        };
        const { data: newDrawing, error: insertError } = await supabase
          .from("drawings")
          .insert(drawingInsert)
          .select("id")
          .single();

        if (insertError) throw insertError;
        finalDrawingId = (newDrawing as { id: string }).id;
      } else {
        // Update existing drawing record
        const drawingUpdate: DrawingUpdate = {
          status: "not_required",
          not_required_reason: notRequiredReason,
          not_required_at: new Date().toISOString(),
          not_required_by: user.id,
        };
        const { error: updateError } = await supabase
          .from("drawings")
          .update(drawingUpdate)
          .eq("id", drawingId);

        if (updateError) throw updateError;
      }

      // Update scope item status to approved (can proceed to production)
      const scopeItemUpdate: ScopeItemUpdate = { status: "approved" };
      await supabase
        .from("scope_items")
        .update(scopeItemUpdate)
        .eq("id", scopeItemId);

      // Log activity
      if (projectId && finalDrawingId) {
        await logActivity({
          action: ACTIVITY_ACTIONS.DRAWING_MARKED_NOT_REQUIRED,
          entityType: "drawing",
          entityId: finalDrawingId,
          projectId,
          details: {
            item_code: itemCode,
            reason: notRequiredReason,
          },
        });
      }

      setIsNotRequiredDialogOpen(false);
      setNotRequiredReason("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark as not required");
    } finally {
      setIsLoading(false);
    }
  };

  // Show different actions based on current status and user role
  // Actions that require an existing drawing record need drawingId check
  const showSendToClient = drawingId && drawingStatus === "uploaded" && canSendToClient;
  const showApprovalOptions = drawingId && drawingStatus === "sent_to_client";
  const showOverride = drawingId && (drawingStatus === "sent_to_client" || drawingStatus === "rejected") && canOverride;
  // Not Required can work without existing drawing (will create one)
  const showNotRequired = drawingStatus === "not_uploaded" && canOverride;

  // For "not required" action, we don't need a revision
  if (!currentRevision && !showNotRequired) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {error && (
        <div className="w-full p-2 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm mb-2">
          {error}
        </div>
      )}

      {/* Send to Client */}
      {showSendToClient && (
        <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="default">
              <SendIcon className="size-4" />
              Send to Client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Drawing to Client</DialogTitle>
              <DialogDescription>
                Send revision {currentRevision} to the client for approval. They will be notified via email.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-3 pt-4">
              <Button onClick={handleSendToClient} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Spinner className="size-4" />
                    Sending...
                  </>
                ) : (
                  <>
                    <SendIcon className="size-4" />
                    Send to Client
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsSendDialogOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Approval Options */}
      {showApprovalOptions && (
        <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="default"
              onClick={() => setApprovalType("approved")}
            >
              <CheckCircleIcon className="size-4" />
              {isClient ? "Review Drawing" : "Record Approval"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {isClient ? "Review Drawing" : "Record Client Response"}
              </DialogTitle>
              <DialogDescription>
                {isClient
                  ? `Please review revision ${currentRevision} and provide your approval or feedback.`
                  : `Record the client's response for revision ${currentRevision}.`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={approvalType === "approved" ? "default" : "outline"}
                  onClick={() => setApprovalType("approved")}
                >
                  <CheckCircleIcon className="size-4" />
                  Approved
                </Button>
                <Button
                  size="sm"
                  variant={approvalType === "approved_with_comments" ? "default" : "outline"}
                  onClick={() => setApprovalType("approved_with_comments")}
                >
                  <CheckCircleIcon className="size-4" />
                  Approved with Comments
                </Button>
                <Button
                  size="sm"
                  variant={approvalType === "rejected" ? "destructive" : "outline"}
                  onClick={() => setApprovalType("rejected")}
                >
                  <XCircleIcon className="size-4" />
                  Rejected
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comments">
                  {isClient ? "Your Comments (optional)" : "Client Comments"}
                </Label>
                <Textarea
                  id="comments"
                  placeholder={isClient
                    ? "Add any comments or feedback about the drawing..."
                    : "Enter any comments from the client..."}
                  value={clientComments}
                  onChange={(e) => setClientComments(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleApproval} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Spinner className="size-4" />
                      Saving...
                    </>
                  ) : (
                    "Save Response"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsApprovalDialogOpen(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* PM Override */}
      {showOverride && (
        <AlertDialog open={isOverrideDialogOpen} onOpenChange={setIsOverrideDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline">
              <AlertTriangleIcon className="size-4" />
              PM Override
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>PM Override Approval</AlertDialogTitle>
              <AlertDialogDescription>
                This will approve the drawing without client confirmation. This action is logged and requires justification.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2 py-4">
              <Label htmlFor="override-reason">Reason for Override *</Label>
              <Textarea
                id="override-reason"
                placeholder="Explain why you are overriding the client approval..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                rows={3}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handlePMOverride}
                disabled={isLoading || !overrideReason.trim()}
              >
                {isLoading ? (
                  <>
                    <Spinner className="size-4" />
                    Processing...
                  </>
                ) : (
                  "Approve with Override"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Mark as Not Required */}
      {showNotRequired && (
        <AlertDialog open={isNotRequiredDialogOpen} onOpenChange={setIsNotRequiredDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline">
              <BanIcon className="size-4" />
              No Drawing Required
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Mark Drawing as Not Required</AlertDialogTitle>
              <AlertDialogDescription>
                This will skip the drawing approval process and allow the item to proceed to production.
                This action is logged and requires justification.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2 py-4">
              <Label htmlFor="not-required-reason">Reason *</Label>
              <Textarea
                id="not-required-reason"
                placeholder="Explain why this item doesn't require a drawing (e.g., standard item, client provided specs, etc.)..."
                value={notRequiredReason}
                onChange={(e) => setNotRequiredReason(e.target.value)}
                rows={3}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleMarkNotRequired}
                disabled={isLoading || !notRequiredReason.trim()}
              >
                {isLoading ? (
                  <>
                    <Spinner className="size-4" />
                    Processing...
                  </>
                ) : (
                  "Mark as Not Required"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
