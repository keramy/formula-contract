"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { TruckIcon, CalendarIcon, PackageIcon } from "lucide-react";
import { useUpdateShippedStatus } from "@/lib/react-query/scope-items";

interface ShippedStatusEditorProps {
  projectId: string;
  scopeItemId: string;
  isShipped: boolean;
  shippedAt: string | null;
  readOnly?: boolean;
}

export function ShippedStatusEditor({
  projectId,
  scopeItemId,
  isShipped,
  shippedAt,
  readOnly = false,
}: ShippedStatusEditorProps) {
  const [shipped, setShipped] = useState(isShipped);
  const [date, setDate] = useState<Date | undefined>(
    shippedAt ? new Date(shippedAt) : undefined
  );
  const [showDatePicker, setShowDatePicker] = useState(false);

  const updateMutation = useUpdateShippedStatus(projectId);

  const handleToggle = async (checked: boolean) => {
    // Optimistically update local state
    setShipped(checked);
    setDate(checked ? new Date() : undefined);

    updateMutation.mutate(
      { itemId: scopeItemId, isShipped: checked },
      {
        onError: () => {
          // Revert on error
          setShipped(!checked);
          setDate(!checked ? (shippedAt ? new Date(shippedAt) : undefined) : undefined);
        },
      }
    );
  };

  const handleDateChange = async (newDate: Date | undefined) => {
    if (!newDate || !shipped) return;

    // Optimistically update local state
    setDate(newDate);
    setShowDatePicker(false);

    updateMutation.mutate(
      { itemId: scopeItemId, isShipped: true, shippedAt: newDate.toISOString() },
      {
        onError: () => {
          // Revert on error
          setDate(shippedAt ? new Date(shippedAt) : undefined);
        },
      }
    );
  };

  if (readOnly) {
    return (
      <div className="flex items-center gap-2">
        {shipped ? (
          <Badge variant="default" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            <TruckIcon className="size-3 mr-1" />
            Shipped
          </Badge>
        ) : (
          <Badge variant="secondary">
            <PackageIcon className="size-3 mr-1" />
            Not Shipped
          </Badge>
        )}
        {shipped && date && (
          <span className="text-xs text-muted-foreground">
            {format(date, "MMM d, yyyy")}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {updateMutation.error && (
        <p className="text-xs text-destructive">{updateMutation.error.message}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Switch
            id="shipped-status"
            checked={shipped}
            onCheckedChange={handleToggle}
            disabled={updateMutation.isPending}
          />
          <Label
            htmlFor="shipped-status"
            className="flex items-center gap-2 cursor-pointer"
          >
            {updateMutation.isPending ? (
              <Spinner className="size-4" />
            ) : shipped ? (
              <TruckIcon className="size-4 text-blue-600" />
            ) : (
              <PackageIcon className="size-4 text-muted-foreground" />
            )}
            {shipped ? "Shipped to Site" : "Not Shipped"}
          </Label>
        </div>

        {shipped && (
          <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
            <PopoverTrigger asChild>
              <Button
                variant={date ? "outline" : "ghost"}
                size="sm"
                className={date ? "text-xs" : "text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"}
                disabled={updateMutation.isPending}
              >
                <CalendarIcon className="size-3 mr-1" />
                {date ? format(date, "MMM d, yyyy") : "Set date →"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        )}
      </div>

      {shipped && date && (
        <p className="text-xs text-muted-foreground">
          Shipped on {format(date, "MMMM d, yyyy 'at' h:mm a")}
        </p>
      )}
    </div>
  );
}
