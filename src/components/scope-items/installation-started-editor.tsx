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
import { WrenchIcon, CalendarIcon, ClockIcon } from "lucide-react";
import { useUpdateInstallationStartedStatus } from "@/lib/react-query/scope-items";

interface InstallationStartedEditorProps {
  projectId: string;
  scopeItemId: string;
  isInstallationStarted: boolean;
  installationStartedAt: string | null;
  readOnly?: boolean;
}

export function InstallationStartedEditor({
  projectId,
  scopeItemId,
  isInstallationStarted,
  installationStartedAt,
  readOnly = false,
}: InstallationStartedEditorProps) {
  const [started, setStarted] = useState(isInstallationStarted);
  const [date, setDate] = useState<Date | undefined>(
    installationStartedAt ? new Date(installationStartedAt) : undefined
  );
  const [showDatePicker, setShowDatePicker] = useState(false);

  const updateMutation = useUpdateInstallationStartedStatus(projectId);

  const handleToggle = async (checked: boolean) => {
    // Optimistically update local state
    setStarted(checked);
    setDate(checked ? new Date() : undefined);

    updateMutation.mutate(
      { itemId: scopeItemId, isStarted: checked },
      {
        onError: () => {
          // Revert on error
          setStarted(!checked);
          setDate(!checked ? (installationStartedAt ? new Date(installationStartedAt) : undefined) : undefined);
        },
      }
    );
  };

  const handleDateChange = async (newDate: Date | undefined) => {
    if (!newDate || !started) return;

    // Optimistically update local state
    setDate(newDate);
    setShowDatePicker(false);

    updateMutation.mutate(
      { itemId: scopeItemId, isStarted: true, startedAt: newDate.toISOString() },
      {
        onError: () => {
          // Revert on error
          setDate(installationStartedAt ? new Date(installationStartedAt) : undefined);
        },
      }
    );
  };

  if (readOnly) {
    return (
      <div className="flex items-center gap-2">
        {started ? (
          <Badge variant="default" className="bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-400">
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
      {updateMutation.error && (
        <p className="text-xs text-destructive">{updateMutation.error.message}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Switch
            id="installation-started-status"
            checked={started}
            onCheckedChange={handleToggle}
            disabled={updateMutation.isPending}
          />
          <Label
            htmlFor="installation-started-status"
            className="flex items-center gap-2 cursor-pointer"
          >
            {updateMutation.isPending ? (
              <Spinner className="size-4" />
            ) : started ? (
              <WrenchIcon className="size-4 text-primary" />
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
                className={date ? "text-xs" : "text-xs text-primary hover:text-primary-700 hover:bg-primary/10"}
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

      {started && date && (
        <p className="text-xs text-muted-foreground">
          Installation started on {format(date, "MMMM d, yyyy 'at' h:mm a")}
        </p>
      )}
    </div>
  );
}
