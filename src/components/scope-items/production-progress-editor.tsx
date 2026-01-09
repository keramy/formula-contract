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
}

export function ProductionProgressEditor({
  scopeItemId,
  initialValue,
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

  if (!isEditing) {
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Production Progress</span>
          <div className="flex items-center gap-2">
            <span className="font-medium">{value}%</span>
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
        <Progress value={value} className="h-2" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
      <div className="flex items-center gap-3">
        <Slider
          value={[value]}
          onValueChange={([v]) => setValue(v)}
          min={0}
          max={100}
          step={5}
          className="flex-1"
        />
        <Input
          type="number"
          min={0}
          max={100}
          value={value}
          onChange={(e) =>
            setValue(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))
          }
          className="w-16 text-center h-8"
        />
        <span className="text-sm text-muted-foreground">%</span>
      </div>
      <div className="flex gap-2">
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
  );
}
