import { useState, useEffect, useCallback, useRef } from "react";
import { useDebounce } from "./use-debounce";
import { saveDraft, getDraft, deleteDraft, type DraftEntityType } from "@/lib/actions/drafts";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutosaveOptions {
  /**
   * The type of entity being edited
   */
  entityType: DraftEntityType;

  /**
   * The ID of the entity if editing existing, undefined if creating new
   */
  entityId?: string;

  /**
   * Debounce delay in milliseconds (default: 2000ms)
   */
  delay?: number;

  /**
   * Whether autosave is enabled (default: true)
   */
  enabled?: boolean;

  /**
   * Callback when draft is loaded
   */
  onDraftLoaded?: (data: Record<string, unknown>) => void;

  /**
   * Callback when save succeeds
   */
  onSaveSuccess?: () => void;

  /**
   * Callback when save fails
   */
  onSaveError?: (error: string) => void;
}

interface UseAutosaveReturn<T extends Record<string, unknown>> {
  /**
   * Current autosave status
   */
  status: AutosaveStatus;

  /**
   * Whether there's a draft that was restored
   */
  hasDraft: boolean;

  /**
   * Last saved timestamp
   */
  lastSaved: Date | null;

  /**
   * Save the current data immediately
   */
  saveNow: (data: T) => Promise<void>;

  /**
   * Queue data for debounced save
   */
  queueSave: (data: T) => void;

  /**
   * Clear the draft
   */
  clearDraft: () => Promise<void>;

  /**
   * Restore draft data (if exists)
   */
  restoreDraft: () => Promise<Record<string, unknown> | null>;
}

/**
 * Hook for autosaving form data with debouncing
 *
 * @example
 * ```tsx
 * const { status, queueSave, hasDraft, restoreDraft } = useAutosave({
 *   entityType: "report",
 *   entityId: reportId,
 *   onDraftLoaded: (data) => setFormData(data),
 * });
 *
 * // In your form change handler:
 * const handleChange = (field, value) => {
 *   const newData = { ...formData, [field]: value };
 *   setFormData(newData);
 *   queueSave(newData);
 * };
 * ```
 */
export function useAutosave<T extends Record<string, unknown>>({
  entityType,
  entityId,
  delay = 2000,
  enabled = true,
  onDraftLoaded,
  onSaveSuccess,
  onSaveError,
}: UseAutosaveOptions): UseAutosaveReturn<T> {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [hasDraft, setHasDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [pendingData, setPendingData] = useState<T | null>(null);

  // Track if component is mounted
  const isMountedRef = useRef(true);

  // Debounce pending data
  const debouncedData = useDebounce(pendingData, delay);

  // Save function
  const saveNow = useCallback(
    async (data: T) => {
      if (!enabled) return;

      setStatus("saving");

      try {
        const result = await saveDraft(entityType, data, entityId);

        if (!isMountedRef.current) return;

        if (result.success) {
          setStatus("saved");
          setLastSaved(new Date());
          setHasDraft(true);
          onSaveSuccess?.();

          // Reset status to idle after 2 seconds
          setTimeout(() => {
            if (isMountedRef.current) {
              setStatus("idle");
            }
          }, 2000);
        } else {
          setStatus("error");
          onSaveError?.(result.error || "Failed to save");
        }
      } catch (error) {
        if (!isMountedRef.current) return;
        setStatus("error");
        onSaveError?.(error instanceof Error ? error.message : "Failed to save");
      }
    },
    [entityType, entityId, enabled, onSaveSuccess, onSaveError]
  );

  // Queue save (sets pending data for debounced save)
  const queueSave = useCallback((data: T) => {
    setPendingData(data);
  }, []);

  // Clear draft
  const clearDraft = useCallback(async () => {
    try {
      await deleteDraft(entityType, entityId);
      if (isMountedRef.current) {
        setHasDraft(false);
        setPendingData(null);
      }
    } catch (error) {
      console.error("Failed to clear draft:", error);
    }
  }, [entityType, entityId]);

  // Restore draft
  const restoreDraft = useCallback(async () => {
    try {
      const result = await getDraft(entityType, entityId);

      if (result.success && result.data) {
        setHasDraft(true);
        setLastSaved(new Date(result.data.updated_at));
        onDraftLoaded?.(result.data.data);
        return result.data.data;
      }

      return null;
    } catch (error) {
      console.error("Failed to restore draft:", error);
      return null;
    }
  }, [entityType, entityId, onDraftLoaded]);

  // Effect: Save when debounced data changes
  useEffect(() => {
    if (debouncedData && enabled) {
      saveNow(debouncedData);
    }
  }, [debouncedData, enabled, saveNow]);

  // Effect: Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Effect: Load draft on mount
  useEffect(() => {
    if (enabled) {
      restoreDraft();
    }
  }, [enabled, restoreDraft]);

  return {
    status,
    hasDraft,
    lastSaved,
    saveNow,
    queueSave,
    clearDraft,
    restoreDraft,
  };
}
