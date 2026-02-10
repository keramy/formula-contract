"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { logActivity } from "@/lib/activity-log/actions";
import { ACTIVITY_ACTIONS } from "@/lib/activity-log/constants";
import { sendDrawingsToClient } from "@/lib/actions/drawings";
import { toast } from "sonner";
import { validateFile, DRAWING_CONFIG, CAD_CONFIG, sanitizeFileName } from "@/lib/file-validation";
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
  FileX2Icon,
  RefreshCwIcon,
  UploadIcon,
  FileIcon,
  XIcon,
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
  /** Callback when the scope item status changes (e.g., after marking not required) */
  onStatusChange?: (newStatus: string) => void;
}

export function DrawingApproval({
  drawingId,
  drawingStatus,
  currentRevision,
  scopeItemId,
  userRole = "pm",
  projectId,
  itemCode,
  onStatusChange,
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
  const [markupFile, setMarkupFile] = useState<File | null>(null);
  const markupInputRef = useRef<HTMLInputElement>(null);

  // PM Override dialog
  const [isOverrideDialogOpen, setIsOverrideDialogOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  // Not Required dialog
  const [isNotRequiredDialogOpen, setIsNotRequiredDialogOpen] = useState(false);
  const [notRequiredReason, setNotRequiredReason] = useState("");

  // Replace File dialog
  const [isReplaceDialogOpen, setIsReplaceDialogOpen] = useState(false);
  const [replacePdfFile, setReplacePdfFile] = useState<File | null>(null);
  const [replaceCadFile, setReplaceCadFile] = useState<File | null>(null);
  const replacePdfInputRef = useRef<HTMLInputElement>(null);
  const replaceCadInputRef = useRef<HTMLInputElement>(null);

  const handleSendToClient = async () => {
    if (!drawingId || !projectId) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await sendDrawingsToClient(projectId, [drawingId]);

      if (result.success) {
        setIsSendDialogOpen(false);
        toast.success("Drawing sent to client for approval");
        onStatusChange?.("awaiting_approval");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to send to client");
        setError(result.error || "Failed to send to client");
      }
    } catch (err) {
      toast.error("Failed to send to client");
      setError(err instanceof Error ? err.message : "Failed to send to client");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkupFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateFile(file, DRAWING_CONFIG);
      if (!validation.valid) {
        setError(validation.error || "Invalid file");
        return;
      }
      setMarkupFile(file);
      setError(null);
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

      // Upload client markup file if provided
      let markupUrl: string | null = null;
      if (markupFile && projectId) {
        const timestamp = Date.now();
        const sanitizedName = sanitizeFileName(markupFile.name);
        const storagePath = `${projectId}/${scopeItemId}/markup_${currentRevision}_${timestamp}_${sanitizedName}`;

        const { error: uploadError } = await supabase.storage
          .from("drawings")
          .upload(storagePath, markupFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("drawings")
          .getPublicUrl(storagePath);

        markupUrl = urlData.publicUrl;
      }

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

      // Save markup URL to the current revision record
      if (markupUrl && currentRevision) {
        await supabase
          .from("drawing_revisions")
          .update({ client_markup_url: markupUrl })
          .eq("drawing_id", drawingId)
          .eq("revision", currentRevision);
      }

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
            has_markup: !!markupUrl,
          },
        });
      }

      setIsApprovalDialogOpen(false);
      setClientComments("");
      setMarkupFile(null);
      const statusLabel = approvalType === "rejected" ? "Drawing rejected" : "Drawing approved";
      toast.success(statusLabel);
      onStatusChange?.(newItemStatus);
      router.refresh();
    } catch (err) {
      toast.error("Failed to record approval");
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
      toast.success("Drawing approved via PM override");
      onStatusChange?.("approved");
      router.refresh();
    } catch (err) {
      toast.error("Failed to override");
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
      toast.success("Drawing marked as not required");
      onStatusChange?.("approved");
      router.refresh();
    } catch (err) {
      toast.error("Failed to mark as not required");
      setError(err instanceof Error ? err.message : "Failed to mark as not required");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReplacePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateFile(file, DRAWING_CONFIG);
      if (!validation.valid) {
        setError(validation.error || "Invalid file");
        return;
      }
      setReplacePdfFile(file);
      setError(null);
    }
  };

  const handleReplaceCadSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateFile(file, CAD_CONFIG);
      if (!validation.valid) {
        setError(validation.error || "Invalid CAD file");
        return;
      }
      setReplaceCadFile(file);
      setError(null);
    }
  };

  const handleReplaceFile = async () => {
    if (!drawingId || !currentRevision) return;
    if (!replacePdfFile && !replaceCadFile) {
      setError("Please select at least one file to replace");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const timestamp = Date.now();

      let newFileUrl: string | undefined;
      let newFileName: string | undefined;
      let newFileSize: number | undefined;
      let newCadFileUrl: string | null | undefined;
      let newCadFileName: string | null | undefined;

      // Upload replacement PDF/image
      if (replacePdfFile) {
        const sanitizedName = sanitizeFileName(replacePdfFile.name);
        const storagePath = `${projectId}/${scopeItemId}/${currentRevision}_${timestamp}_${sanitizedName}`;

        const { error: uploadError } = await supabase.storage
          .from("drawings")
          .upload(storagePath, replacePdfFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("drawings")
          .getPublicUrl(storagePath);

        newFileUrl = urlData.publicUrl;
        newFileName = sanitizedName;
        newFileSize = replacePdfFile.size;
      }

      // Upload replacement CAD file
      if (replaceCadFile) {
        const sanitizedName = sanitizeFileName(replaceCadFile.name);
        const storagePath = `${projectId}/${scopeItemId}/${currentRevision}_${timestamp}_${sanitizedName}`;

        const { error: uploadError } = await supabase.storage
          .from("drawings")
          .upload(storagePath, replaceCadFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("drawings")
          .getPublicUrl(storagePath);

        newCadFileUrl = urlData.publicUrl;
        newCadFileName = sanitizedName;
      }

      // Update the existing revision record
      const updateData: Record<string, unknown> = {};
      if (newFileUrl) {
        updateData.file_url = newFileUrl;
        updateData.file_name = newFileName;
        updateData.file_size = newFileSize;
      }
      if (newCadFileUrl !== undefined) {
        updateData.cad_file_url = newCadFileUrl;
        updateData.cad_file_name = newCadFileName;
      }

      const { error: revisionError } = await supabase
        .from("drawing_revisions")
        .update(updateData)
        .eq("drawing_id", drawingId)
        .eq("revision", currentRevision);

      if (revisionError) throw revisionError;

      // If drawing was already sent to client and we're replacing, reset to uploaded
      if (drawingStatus === "sent_to_client" || drawingStatus === "rejected") {
        const drawingUpdate: DrawingUpdate = { status: "uploaded" };
        await supabase
          .from("drawings")
          .update(drawingUpdate)
          .eq("id", drawingId);
      }

      // Log activity
      if (projectId) {
        await logActivity({
          action: ACTIVITY_ACTIONS.DRAWING_UPLOADED,
          entityType: "drawing",
          entityId: drawingId,
          projectId,
          details: {
            item_code: itemCode,
            revision: currentRevision,
            replaced: true,
          },
        });
      }

      setIsReplaceDialogOpen(false);
      setReplacePdfFile(null);
      setReplaceCadFile(null);
      toast.success(`File replaced for revision ${currentRevision}`);
      if (drawingStatus === "sent_to_client" || drawingStatus === "rejected") {
        onStatusChange?.("in_design");
      }
      router.refresh();
    } catch (err) {
      toast.error("Failed to replace file");
      setError(err instanceof Error ? err.message : "Failed to replace file");
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
  // Replace file: PM/Admin can replace before approval, and also after rejection
  const showReplaceFile = drawingId && currentRevision && ["uploaded", "sent_to_client", "rejected"].includes(drawingStatus) && canSendToClient;

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

              {/* Markup file upload — shown for Approved and Approved with Comments */}
              {approvalType !== "rejected" && (
                <div className="space-y-2">
                  <Label>
                    Upload Signed/Marked Drawing (optional)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Attach a signed, stamped, or annotated copy as proof of approval.
                  </p>
                  <input
                    ref={markupInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleMarkupFileSelect}
                    className="hidden"
                  />
                  {markupFile ? (
                    <div className="flex items-center gap-2 p-2 rounded-md bg-emerald-50 border border-emerald-200">
                      <FileIcon className="size-4 text-emerald-600" />
                      <span className="text-sm flex-1 truncate">{markupFile.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={() => {
                          setMarkupFile(null);
                          if (markupInputRef.current) markupInputRef.current.value = "";
                        }}
                      >
                        <XIcon className="size-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => markupInputRef.current?.click()}
                    >
                      <UploadIcon className="size-4" />
                      Select File
                    </Button>
                  )}
                </div>
              )}

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
                  onClick={() => {
                    setIsApprovalDialogOpen(false);
                    setMarkupFile(null);
                  }}
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
                onClick={(e) => {
                  e.preventDefault();
                  handlePMOverride();
                }}
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
              <FileX2Icon className="size-4" />
              No Drawing Needed
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
                onClick={(e) => {
                  e.preventDefault();
                  handleMarkNotRequired();
                }}
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

      {/* Replace File */}
      {showReplaceFile && (
        <Dialog open={isReplaceDialogOpen} onOpenChange={(open) => {
          setIsReplaceDialogOpen(open);
          if (!open) {
            setReplacePdfFile(null);
            setReplaceCadFile(null);
            setError(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <RefreshCwIcon className="size-4" />
              Replace File
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Replace File for Rev {currentRevision}</DialogTitle>
              <DialogDescription>
                Upload a new file to replace the current one. The revision letter stays the same.
                {(drawingStatus === "sent_to_client" || drawingStatus === "rejected") &&
                  " The drawing status will be reset to 'Uploaded'."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {/* PDF/Image file */}
              <div className="space-y-2">
                <Label>Drawing File (PDF/Image)</Label>
                <input
                  ref={replacePdfInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleReplacePdfSelect}
                  className="hidden"
                />
                {replacePdfFile ? (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-muted border">
                    <FileIcon className="size-4 text-blue-600" />
                    <span className="text-sm flex-1 truncate">{replacePdfFile.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      onClick={() => {
                        setReplacePdfFile(null);
                        if (replacePdfInputRef.current) replacePdfInputRef.current.value = "";
                      }}
                    >
                      <XIcon className="size-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => replacePdfInputRef.current?.click()}
                  >
                    <UploadIcon className="size-4" />
                    Select PDF/Image
                  </Button>
                )}
              </div>

              {/* CAD file */}
              <div className="space-y-2">
                <Label>CAD File (optional)</Label>
                <input
                  ref={replaceCadInputRef}
                  type="file"
                  accept=".dwg,.dxf,.dwf,.rvt,.ifc,.skp,.3dm,.step,.stp,.iges,.igs"
                  onChange={handleReplaceCadSelect}
                  className="hidden"
                />
                {replaceCadFile ? (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-muted border">
                    <FileIcon className="size-4 text-gray-600" />
                    <span className="text-sm flex-1 truncate">{replaceCadFile.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      onClick={() => {
                        setReplaceCadFile(null);
                        if (replaceCadInputRef.current) replaceCadInputRef.current.value = "";
                      }}
                    >
                      <XIcon className="size-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => replaceCadInputRef.current?.click()}
                  >
                    <UploadIcon className="size-4" />
                    Select CAD File
                  </Button>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleReplaceFile}
                  disabled={isLoading || (!replacePdfFile && !replaceCadFile)}
                >
                  {isLoading ? (
                    <>
                      <Spinner className="size-4" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <RefreshCwIcon className="size-4" />
                      Replace File
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsReplaceDialogOpen(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
