"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// PERFORMANCE: Lazy load the Sheet component
// Before: ScopeItemSheet (~700 lines + dependencies) loaded on page load
// After:  Only loaded when user clicks "Add Item" button
// ============================================================================
const ScopeItemSheet = dynamic(
  () => import("./scope-item-sheet").then((mod) => mod.ScopeItemSheet),
  {
    loading: () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-lg p-6 flex items-center gap-3">
          <Spinner className="size-5" />
          <span>Loading...</span>
        </div>
      </div>
    ),
    ssr: false,
  }
);

interface ScopeItemAddButtonProps {
  projectId: string;
  projectCurrency?: string;
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  compact?: boolean;
}

export function ScopeItemAddButton({
  projectId,
  projectCurrency,
  size = "default",
  className,
  compact = false,
}: ScopeItemAddButtonProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setSheetOpen(true)} size={size} className={cn(className)}>
        <PlusIcon className="size-3.5" />
        {compact ? (
          <>
            <span className="sm:hidden">Add</span>
            <span className="hidden sm:inline">Add Item</span>
          </>
        ) : (
          "Add Item"
        )}
      </Button>

      {/* Only render when open - prevents loading until needed */}
      {sheetOpen && (
        <ScopeItemSheet
          projectId={projectId}
          projectCurrency={projectCurrency}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          itemId={null}
        />
      )}
    </>
  );
}
