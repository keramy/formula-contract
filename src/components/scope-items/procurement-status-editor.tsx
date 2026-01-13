"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardCheckIcon,
  PackageIcon,
  TruckIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
} from "lucide-react";
import type { ScopeItemUpdate, ProcurementStatus } from "@/types/database";

interface ProcurementStatusEditorProps {
  scopeItemId: string;
  currentStatus: ProcurementStatus | null;
  readOnly?: boolean;
}

const PROCUREMENT_STATUSES: { value: ProcurementStatus; label: string; icon: React.ReactNode; color: string }[] = [
  {
    value: "pm_approval",
    label: "PM Approval",
    icon: <ClipboardCheckIcon className="size-4" />,
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  {
    value: "not_ordered",
    label: "Not Ordered",
    icon: <PackageIcon className="size-4" />,
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  },
  {
    value: "ordered",
    label: "Ordered",
    icon: <TruckIcon className="size-4" />,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  {
    value: "received",
    label: "Received",
    icon: <CheckCircle2Icon className="size-4" />,
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
];

export function ProcurementStatusEditor({
  scopeItemId,
  currentStatus,
  readOnly = false,
}: ProcurementStatusEditorProps) {
  const router = useRouter();
  const [status, setStatus] = useState<ProcurementStatus | null>(currentStatus);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentIndex = status ? PROCUREMENT_STATUSES.findIndex(s => s.value === status) : -1;

  const handleStatusChange = async (newStatus: ProcurementStatus) => {
    setIsSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      const updateData: ScopeItemUpdate = {
        procurement_status: newStatus,
      };

      const { error: updateError } = await supabase
        .from("scope_items")
        .update(updateData)
        .eq("id", scopeItemId);

      if (updateError) throw updateError;

      setStatus(newStatus);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setIsSaving(false);
    }
  };

  if (readOnly) {
    const currentConfig = PROCUREMENT_STATUSES.find(s => s.value === status);
    return (
      <div className="space-y-3">
        <Badge variant="secondary" className={currentConfig?.color}>
          {currentConfig?.icon}
          <span className="ml-1">{currentConfig?.label || "Not Set"}</span>
        </Badge>

        {/* Progress Timeline */}
        <div className="flex items-center gap-1">
          {PROCUREMENT_STATUSES.map((s, index) => {
            const isActive = index <= currentIndex;
            const isCurrent = s.value === status;
            return (
              <div key={s.value} className="flex items-center">
                <div
                  className={`size-6 rounded-full flex items-center justify-center text-xs
                    ${isActive
                      ? isCurrent
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                    }`}
                >
                  {index + 1}
                </div>
                {index < PROCUREMENT_STATUSES.length - 1 && (
                  <div className={`w-6 h-0.5 ${index < currentIndex ? "bg-primary/50" : "bg-muted"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      <div className="flex items-center gap-2">
        <Select
          value={status || undefined}
          onValueChange={(value) => handleStatusChange(value as ProcurementStatus)}
          disabled={isSaving}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {PROCUREMENT_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                <div className="flex items-center gap-2">
                  {s.icon}
                  <span>{s.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isSaving && <Spinner className="size-4" />}
      </div>

      {/* Progress Timeline */}
      <div className="flex items-center gap-1">
        {PROCUREMENT_STATUSES.map((s, index) => {
          const isActive = index <= currentIndex;
          const isCurrent = s.value === status;
          return (
            <div key={s.value} className="flex items-center">
              <button
                type="button"
                onClick={() => !isSaving && handleStatusChange(s.value)}
                disabled={isSaving}
                className={`size-8 rounded-full flex items-center justify-center transition-colors
                  ${isActive
                    ? isCurrent
                      ? "bg-primary text-primary-foreground"
                      : "bg-primary/20 text-primary hover:bg-primary/30"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }
                  ${isSaving ? "cursor-not-allowed" : "cursor-pointer"}
                `}
                title={s.label}
              >
                {s.icon}
              </button>
              {index < PROCUREMENT_STATUSES.length - 1 && (
                <ChevronRightIcon className={`size-4 ${index < currentIndex ? "text-primary/50" : "text-muted-foreground/30"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Status Labels */}
      <div className="flex justify-between text-xs text-muted-foreground px-1">
        {PROCUREMENT_STATUSES.map((s) => (
          <span key={s.value} className={s.value === status ? "font-medium text-foreground" : ""}>
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
