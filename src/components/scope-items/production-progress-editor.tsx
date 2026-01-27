"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { CheckIcon, PencilIcon } from "lucide-react";
import type { ScopeItemUpdate } from "@/types/database";

interface ProductionProgressEditorProps {
  scopeItemId: string;
  initialValue: number;
  readOnly?: boolean;
}

export function ProductionProgressEditor({
  scopeItemId,
  initialValue,
  readOnly = false,
}: ProductionProgressEditorProps) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      const updateData: ScopeItemUpdate = { production_percentage: value };
      const { error: updateError } = await supabase
        .from("scope_items")
        .update(updateData)
        .eq("id", scopeItemId);

      if (updateError) throw updateError;

      setIsEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update progress");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setValue(initialValue);
    setIsEditing(false);
    setError(null);
  };

  // Read-only mode: just show progress bar, no edit button
  if (readOnly) {
    return (
      <div className="space-y-2">
        <div className="flex justify-end items-center text-sm">
          {value === 0 ? (
            <span className="text-muted-foreground italic text-xs">Not started</span>
          ) : (
            <span className="font-medium">{value}%</span>
          )}
        </div>
        {value > 0 && <Progress value={value} className="h-2" />}
      </div>
    );
  }

  if (!isEditing) {
    return (
      <div className="space-y-2">
        <div className="flex justify-end items-center text-sm">
          <div className="flex items-center gap-2">
            {value === 0 ? (
              <span className="text-muted-foreground italic text-xs">Not started</span>
            ) : (
              <span className="font-medium">{value}%</span>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsEditing(true)}
              className="h-6 w-6"
            >
              <PencilIcon className="size-3" />
            </Button>
          </div>
        </div>
        {value > 0 && <Progress value={value} className="h-2" />}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {/* Slider with labels */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-6">0%</span>
          <Slider
            value={[value]}
            onValueChange={([v]) => setValue(v)}
            min={0}
            max={100}
            step={5}
            className="flex-1 [&_[data-slot=slider-track]]:h-3 [&_[data-slot=slider-track]]:bg-gray-200 [&_[data-slot=slider-range]]:bg-gradient-to-r [&_[data-slot=slider-range]]:from-violet-500 [&_[data-slot=slider-range]]:to-purple-600 [&_[data-slot=slider-thumb]]:size-5 [&_[data-slot=slider-thumb]]:border-2 [&_[data-slot=slider-thumb]]:border-violet-500 [&_[data-slot=slider-thumb]]:shadow-md"
          />
          <span className="text-xs text-muted-foreground w-8">100%</span>
        </div>

        {/* Tick marks */}
        <div className="flex justify-between px-7 -mt-1">
          {[0, 25, 50, 75, 100].map((tick) => (
            <div key={tick} className="flex flex-col items-center">
              <div className={`w-0.5 h-1.5 ${value >= tick ? 'bg-violet-400' : 'bg-gray-300'}`} />
            </div>
          ))}
        </div>
      </div>

      {/* Input and buttons row */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 bg-white border rounded-md px-2">
          <Input
            type="number"
            min={0}
            max={100}
            value={value}
            onChange={(e) =>
              setValue(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))
            }
            className="w-12 text-center h-8 border-0 p-0 focus-visible:ring-0"
          />
          <span className="text-sm text-muted-foreground">%</span>
        </div>

        <div className="flex gap-2 flex-1 justify-end">
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Spinner className="size-4" />
            ) : (
              <CheckIcon className="size-4" />
            )}
            Save
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
