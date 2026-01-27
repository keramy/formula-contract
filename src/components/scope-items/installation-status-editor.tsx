"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CheckCircleIcon, CalendarIcon, XCircleIcon } from "lucide-react";
import type { ScopeItemUpdate } from "@/types/database";

interface InstallationStatusEditorProps {
  scopeItemId: string;
  isInstalled: boolean;
  installedAt: string | null;
  readOnly?: boolean;
}

export function InstallationStatusEditor({
  scopeItemId,
  isInstalled,
  installedAt,
  readOnly = false,
}: InstallationStatusEditorProps) {
  const router = useRouter();
  const [installed, setInstalled] = useState(isInstalled);
  const [date, setDate] = useState<Date | undefined>(
    installedAt ? new Date(installedAt) : undefined
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
        is_installed: checked,
        installed_at: checked ? new Date().toISOString() : null,
      };

      const { error: updateError } = await supabase
        .from("scope_items")
        .update(updateData)
        .eq("id", scopeItemId);

      if (updateError) throw updateError;

      setInstalled(checked);
      setDate(checked ? new Date() : undefined);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
      // Revert on error
      setInstalled(!checked);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDateChange = async (newDate: Date | undefined) => {
    if (!newDate || !installed) return;

    setIsSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      const updateData: ScopeItemUpdate = {
        installed_at: newDate.toISOString(),
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
        {installed ? (
          <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircleIcon className="size-3 mr-1" />
            Installed
          </Badge>
        ) : (
          <Badge variant="secondary">
            <XCircleIcon className="size-3 mr-1" />
            Not Installed
          </Badge>
        )}
        {installed && date && (
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
            id="installation-status"
            checked={installed}
            onCheckedChange={handleToggle}
            disabled={isSaving}
          />
          <Label
            htmlFor="installation-status"
            className="flex items-center gap-2 cursor-pointer"
          >
            {isSaving ? (
              <Spinner className="size-4" />
            ) : installed ? (
              <CheckCircleIcon className="size-4 text-green-600" />
            ) : (
              <XCircleIcon className="size-4 text-muted-foreground" />
            )}
            {installed ? "Installed" : "Not Installed"}
          </Label>
        </div>

        {installed && (
          <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
            <PopoverTrigger asChild>
              <Button
                variant={date ? "outline" : "ghost"}
                size="sm"
                className={date ? "text-xs" : "text-xs text-violet-600 hover:text-violet-700 hover:bg-violet-50"}
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

      {installed && date && (
        <p className="text-xs text-muted-foreground">
          Marked as installed on {format(date, "MMMM d, yyyy 'at' h:mm a")}
        </p>
      )}
    </div>
  );
}
