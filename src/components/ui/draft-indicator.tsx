"use client";

import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import {
  CloudIcon,
  CloudOffIcon,
  CheckCircleIcon,
  Loader2Icon,
  AlertCircleIcon,
} from "lucide-react";
import type { AutosaveStatus } from "@/hooks/use-autosave";

interface DraftIndicatorProps {
  status: AutosaveStatus;
  lastSaved?: Date | null;
  className?: string;
  showText?: boolean;
}

const statusConfig: Record<
  AutosaveStatus,
  {
    icon: React.ComponentType<{ className?: string }>;
    text: string;
    className: string;
  }
> = {
  idle: {
    icon: CloudIcon,
    text: "Ready",
    className: "text-muted-foreground",
  },
  saving: {
    icon: Loader2Icon,
    text: "Saving...",
    className: "text-blue-500",
  },
  saved: {
    icon: CheckCircleIcon,
    text: "Saved",
    className: "text-green-500",
  },
  error: {
    icon: AlertCircleIcon,
    text: "Error saving",
    className: "text-red-500",
  },
};

/**
 * Visual indicator for autosave status
 *
 * @example
 * ```tsx
 * const { status, lastSaved } = useAutosave({ ... });
 *
 * return (
 *   <div>
 *     <DraftIndicator status={status} lastSaved={lastSaved} />
 *     <form>...</form>
 *   </div>
 * );
 * ```
 */
export function DraftIndicator({
  status,
  lastSaved,
  className,
  showText = true,
}: DraftIndicatorProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const isSaving = status === "saving";

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs transition-all duration-200",
        config.className,
        className
      )}
    >
      <Icon
        className={cn("size-3.5", isSaving && "animate-spin")}
      />
      {showText && (
        <span>
          {config.text}
          {status === "saved" && lastSaved && (
            <span className="text-muted-foreground ml-1">
              {formatDistanceToNow(lastSaved, { addSuffix: true })}
            </span>
          )}
        </span>
      )}
    </div>
  );
}

interface DraftBannerProps {
  hasDraft: boolean;
  lastSaved?: Date | null;
  onRestore: () => void;
  onDiscard: () => void;
  className?: string;
}

/**
 * Banner shown when a draft exists that can be restored
 *
 * @example
 * ```tsx
 * const { hasDraft, restoreDraft, clearDraft, lastSaved } = useAutosave({ ... });
 *
 * return (
 *   <div>
 *     <DraftBanner
 *       hasDraft={hasDraft}
 *       lastSaved={lastSaved}
 *       onRestore={() => restoreDraft()}
 *       onDiscard={() => clearDraft()}
 *     />
 *     <form>...</form>
 *   </div>
 * );
 * ```
 */
export function DraftBanner({
  hasDraft,
  lastSaved,
  onRestore,
  onDiscard,
  className,
}: DraftBannerProps) {
  if (!hasDraft) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 p-3 rounded-lg",
        "bg-amber-50 border border-amber-200",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <CloudIcon className="size-4 text-amber-600" />
        <span className="text-sm text-amber-800">
          You have unsaved changes
          {lastSaved && (
            <span className="text-amber-600">
              {" "}
              from {formatDistanceToNow(lastSaved, { addSuffix: true })}
            </span>
          )}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onDiscard}
          className="text-xs text-amber-700 hover:text-amber-900 underline"
        >
          Discard
        </button>
        <button
          type="button"
          onClick={onRestore}
          className="px-3 py-1 text-xs font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700"
        >
          Restore
        </button>
      </div>
    </div>
  );
}
