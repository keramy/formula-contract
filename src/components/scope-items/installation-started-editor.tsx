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
import { WrenchIcon, CalendarIcon, ClockIcon } from "lucide-react";
import type { ScopeItemUpdate } from "@/types/database";

interface InstallationStartedEditorProps {
  scopeItemId: string;
  isInstallationStarted: boolean;
  installationStartedAt: string | null;
  readOnly?: boolean;
}

export function InstallationStartedEditor({
  scopeItemId,
  isInstallationStarted,
  installationStartedAt,
  readOnly = false,
}: InstallationStartedEditorProps) {
  const router = useRouter();
  const [started, setStarted] = useState(isInstallationStarted);
  const [date, setDate] = useState<Date | undefined>(
    installationStartedAt ? new Date(installationStartedAt) : undefined
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
        is_installation_started: checked,
        installation_started_at: checked ? new Date().toISOString() : null,
      };

      const { error: updateError } = await supabase
        .from("scope_items")
        .update(updateData)
        .eq("id", scopeItemId);

      if (updateError) throw updateError;

      setStarted(checked);
      setDate(checked ? new Date() : undefined);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
      // Revert on error
      setStarted(!checked);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDateChange = async (newDate: Date | undefined) => {
    if (!newDate || !started) return;

    setIsSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      const updateData: ScopeItemUpdate = {
        installation_started_at: newDate.toISOString(),
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
        {started ? (
          <Badge variant="default" className="bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400">
            <WrenchIcon className="size-3 mr-1" />
            Installing
          </Badge>
        ) : (
          <Badge variant="secondary">
            <ClockIcon className="size-3 mr-1" />
            Not Started
          </Badge>
        )}
        {started && date && (
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
            id="installation-started-status"
            checked={started}
            onCheckedChange={handleToggle}
            disabled={isSaving}
          />
          <Label
            htmlFor="installation-started-status"
            className="flex items-center gap-2 cursor-pointer"
          >
            {isSaving ? (
              <Spinner className="size-4" />
            ) : started ? (
              <WrenchIcon className="size-4 text-violet-600" />
            ) : (
              <ClockIcon className="size-4 text-muted-foreground" />
            )}
            {started ? "Installation Started" : "Not Started"}
          </Label>
        </div>

        {started && (
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

      {started && date && (
        <p className="text-xs text-muted-foreground">
          Installation started on {format(date, "MMMM d, yyyy 'at' h:mm a")}
        </p>
      )}
    </div>
  );
}
