"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
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
import type { ScopeItemUpdate } from "@/types/database";

interface ShippedStatusEditorProps {
  scopeItemId: string;
  isShipped: boolean;
  shippedAt: string | null;
  readOnly?: boolean;
}

export function ShippedStatusEditor({
  scopeItemId,
  isShipped,
  shippedAt,
  readOnly = false,
}: ShippedStatusEditorProps) {
  const router = useRouter();
  const [shipped, setShipped] = useState(isShipped);
  const [date, setDate] = useState<Date | undefined>(
    shippedAt ? new Date(shippedAt) : undefined
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleToggle = async (checked: boolean) => {
    setIsSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      const updateData: ScopeItemUpdate = {
        is_shipped: checked,
        shipped_at: checked ? new Date().toISOString() : null,
      };

      const { error: updateError } = await supabase
        .from("scope_items")
        .update(updateData)
        .eq("id", scopeItemId);

      if (updateError) throw updateError;

      setShipped(checked);
      setDate(checked ? new Date() : undefined);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
      // Revert on error
      setShipped(!checked);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDateChange = async (newDate: Date | undefined) => {
    if (!newDate || !shipped) return;

    setIsSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      const updateData: ScopeItemUpdate = {
        shipped_at: newDate.toISOString(),
      };

      const { error: updateError } = await supabase
        .from("scope_items")
        .update(updateData)
        .eq("id", scopeItemId);

      if (updateError) throw updateError;

      setDate(newDate);
      setShowDatePicker(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update date");
    } finally {
      setIsSaving(false);
    }
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
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Switch
            id="shipped-status"
            checked={shipped}
            onCheckedChange={handleToggle}
            disabled={isSaving}
          />
          <Label
            htmlFor="shipped-status"
            className="flex items-center gap-2 cursor-pointer"
          >
            {isSaving ? (
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
                disabled={isSaving}
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
