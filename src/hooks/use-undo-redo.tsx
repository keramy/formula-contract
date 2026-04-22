"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ============================================================================
// UNDO / REDO STACKS
//
// Bounded, session-scoped stacks for undoing user actions on the timeline.
// Each record stores both a forward (redo) and inverse (undo) operation so
// the stacks behave like a linear timeline the user can traverse.
//
// Keyboard bindings:
//   Ctrl+Z / ⌘+Z         → undo
//   Ctrl+Shift+Z / ⌘+⇧+Z → redo
//   Ctrl+Y / ⌘+Y         → redo (Windows convention)
//
// Bindings are ignored when focus is in an <input>, <textarea>, <select>,
// or a contenteditable element — so native field undo still works.
// ============================================================================

/** Maximum combined entries per stack. Beyond this, oldest entry is dropped. */
const MAX_STACK = 20;

export interface UndoRecord {
  /** Short human-readable summary shown in the toast, e.g. "Set priority to High" */
  description: string;
  /** The action that was originally performed — called again on redo */
  forward: () => void | Promise<void>;
  /** The reverse action — called on undo */
  inverse: () => void | Promise<void>;
}

interface UndoRedoContextValue {
  record: (record: UndoRecord) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canUndo: boolean;
  canRedo: boolean;
  clear: () => void;
}

const UndoRedoContext = createContext<UndoRedoContextValue | null>(null);

const NOOP_VALUE: UndoRedoContextValue = {
  record: () => {},
  undo: async () => {},
  redo: async () => {},
  canUndo: false,
  canRedo: false,
  clear: () => {},
};

export function UndoRedoProvider({ children }: { children: React.ReactNode }) {
  const [undoStack, setUndoStack] = useState<UndoRecord[]>([]);
  const [redoStack, setRedoStack] = useState<UndoRecord[]>([]);
  // Guard against concurrent undo/redo (e.g., user hammering the shortcut)
  const busyRef = useRef(false);

  const record = useCallback((r: UndoRecord) => {
    setUndoStack((s) => {
      const next = [...s, r];
      if (next.length > MAX_STACK) next.shift();
      return next;
    });
    // A fresh action invalidates the redo timeline — standard pattern
    setRedoStack([]);
  }, []);

  const undo = useCallback(async () => {
    if (busyRef.current) return;
    const last = undoStack[undoStack.length - 1];
    if (!last) {
      toast.info("Nothing to undo");
      return;
    }
    busyRef.current = true;
    try {
      await last.inverse();
      setUndoStack((s) => s.slice(0, -1));
      setRedoStack((s) => {
        const next = [...s, last];
        if (next.length > MAX_STACK) next.shift();
        return next;
      });
      toast.success(`Undid: ${last.description}`);
    } catch (e) {
      toast.error(`Undo failed: ${(e as Error).message || "Unknown error"}`);
    } finally {
      busyRef.current = false;
    }
  }, [undoStack]);

  const redo = useCallback(async () => {
    if (busyRef.current) return;
    const last = redoStack[redoStack.length - 1];
    if (!last) {
      toast.info("Nothing to redo");
      return;
    }
    busyRef.current = true;
    try {
      await last.forward();
      setRedoStack((s) => s.slice(0, -1));
      setUndoStack((s) => {
        const next = [...s, last];
        if (next.length > MAX_STACK) next.shift();
        return next;
      });
      toast.success(`Redid: ${last.description}`);
    } catch (e) {
      toast.error(`Redo failed: ${(e as Error).message || "Unknown error"}`);
    } finally {
      busyRef.current = false;
    }
  }, [redoStack]);

  const clear = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  // Global keyboard listener. Ignored when focus is inside editable text.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const contentEditable = target?.getAttribute?.("contenteditable");
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        contentEditable === "true"
      ) {
        return;
      }

      const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      if (!modKey) return;

      const key = e.key.toLowerCase();
      if (key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          void redo();
        } else {
          void undo();
        }
      } else if (key === "y") {
        e.preventDefault();
        void redo();
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [undo, redo]);

  return (
    <UndoRedoContext.Provider
      value={{
        record,
        undo,
        redo,
        canUndo: undoStack.length > 0,
        canRedo: redoStack.length > 0,
        clear,
      }}
    >
      {children}
    </UndoRedoContext.Provider>
  );
}

/**
 * Access the undo/redo API. When called outside a provider, returns no-op
 * implementations so components can safely reference it unconditionally.
 */
export function useUndoRedo(): UndoRedoContextValue {
  return useContext(UndoRedoContext) ?? NOOP_VALUE;
}
