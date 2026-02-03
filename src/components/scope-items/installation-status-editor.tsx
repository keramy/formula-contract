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
import { CheckCircleIcon, CalendarIcon, XCircleIcon } from "lucide-react";
import { useUpdateInstallationStatus } from "@/lib/react-query/scope-items";

interface InstallationStatusEditorProps {
  projectId: string;
  scopeItemId: string;
  isInstalled: boolean;
  installedAt: string | null;
  readOnly?: boolean;
}

export function InstallationStatusEditor({
  projectId,
  scopeItemId,
  isInstalled,
  installedAt,
  readOnly = false,
}: InstallationStatusEditorProps) {
  const [installed, setInstalled] = useState(isInstalled);
  const [date, setDate] = useState<Date | undefined>(
    installedAt ? new Date(installedAt) : undefined
  );
  const [showDatePicker, setShowDatePicker] = useState(false);

  const updateMutation = useUpdateInstallationStatus(projectId);

  const handleToggle = async (checked: boolean) => {
    // Optimistically update local state
    setInstalled(checked);
    setDate(checked ? new Date() : undefined);

    updateMutation.mutate(
      { itemId: scopeItemId, isInstalled: checked },
      {
        onError: () => {
          // Revert on error
          setInstalled(!checked);
          setDate(!checked ? (installedAt ? new Date(installedAt) : undefined) : undefined);
        },
      }
    );
  };

  // Note: The current server action updateInstallationStatus doesn't support
  // custom date override, but we keep the date picker UI for future enhancement.
  // For now, date changes just update local state visually.
  const handleDateChange = async (newDate: Date | undefined) => {
    if (!newDate || !installed) return;
    setDate(newDate);
    setShowDatePicker(false);
    // Future: Add server action support for custom installed_at date
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
      {updateMutation.error && (
        <p className="text-xs text-destructive">{updateMutation.error.message}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Switch
            id="installation-status"
            checked={installed}
            onCheckedChange={handleToggle}
            disabled={updateMutation.isPending}
          />
          <Label
            htmlFor="installation-status"
            className="flex items-center gap-2 cursor-pointer"
          >
            {updateMutation.isPending ? (
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

      {installed && date && (
        <p className="text-xs text-muted-foreground">
          Marked as installed on {format(date, "MMMM d, yyyy 'at' h:mm a")}
        </p>
      )}
    </div>
  );
}
