"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { materialKeys } from "@/lib/react-query/materials";
import { approveOrRejectMaterial } from "@/lib/actions/drawings";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircleIcon, XCircleIcon } from "lucide-react";

interface MaterialApprovalProps {
  materialId: string;
  materialName: string;
  materialCode: string;
  projectId: string;
  action: "approve" | "reject";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MaterialApproval({
  materialId,
  materialName,
  materialCode,
  projectId,
  action,
  open,
  onOpenChange,
}: MaterialApprovalProps) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [comments, setComments] = useState("");

  const handleClose = () => {
    onOpenChange(false);
    setComments("");
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const result = await approveOrRejectMaterial({
        materialId,
        projectId,
        materialCode,
        materialName,
        action,
        comments: comments.trim() || undefined,
      });

      if (!result.success) throw new Error(result.error);

      handleClose();
      queryClient.invalidateQueries({ queryKey: materialKeys.all });
    } catch (error) {
      console.error("Failed to update material status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const isApprove = action === "approve";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isApprove ? (
              <CheckCircleIcon className="size-5 text-green-500" />
            ) : (
              <XCircleIcon className="size-5 text-red-500" />
            )}
            {isApprove ? "Approve Material" : "Reject Material"}
          </DialogTitle>
          <DialogDescription>
            {isApprove
              ? `Approve "${materialName}" for use in this project?`
              : `Reject "${materialName}"? You can add comments explaining why.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="comments">
              {isApprove ? "Notes (optional)" : "Rejection Reason (optional)"}
            </Label>
            <Textarea
              id="comments"
              placeholder={
                isApprove
                  ? "Add any notes about this approval..."
                  : "Enter reason for rejection..."
              }
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className={
              isApprove
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-600 hover:bg-red-700"
            }
          >
            {isLoading && <Spinner className="size-4 mr-2" />}
            {isApprove ? "Approve" : "Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
