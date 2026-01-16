"use client";

/**
 * SortableSection Component
 *
 * A drag-and-drop enabled card for report sections.
 * Uses @dnd-kit for smooth dragging interactions.
 *
 * Used in both report creation and editing modals.
 */

import Image from "next/image";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GripVerticalIcon, PencilIcon, TrashIcon } from "lucide-react";
import type { LocalSection } from "./report-types";

interface SortableSectionProps {
  section: LocalSection;
  onEdit: (section: LocalSection) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
  /**
   * Accent color for the drag ring
   * @default "teal"
   */
  accentColor?: "teal" | "orange";
}

const ACCENT_COLORS = {
  teal: "ring-teal-500",
  orange: "ring-orange-500",
} as const;

export function SortableSection({
  section,
  onEdit,
  onDelete,
  disabled,
  accentColor = "teal",
}: SortableSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const ringClass = ACCENT_COLORS[accentColor];

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`p-3 ${isDragging ? `shadow-lg ring-2 ${ringClass}` : "hover:bg-muted/30"}`}
    >
      <div className="flex items-start gap-2">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0"
          disabled={disabled}
        >
          <GripVerticalIcon className="size-4" />
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="font-medium text-sm truncate">{section.title}</h4>
              {section.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {section.description}
                </p>
              )}
            </div>
            <div className="flex gap-0.5 shrink-0">
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={() => onEdit(section)}
                disabled={disabled}
              >
                <PencilIcon className="size-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-7 text-destructive hover:text-destructive"
                onClick={() => onDelete(section.id)}
                disabled={disabled}
              >
                <TrashIcon className="size-3.5" />
              </Button>
            </div>
          </div>

          {/* Photos Preview */}
          {section.photos.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {section.photos.map((url, idx) => (
                <div
                  key={idx}
                  className="relative w-12 h-9 rounded overflow-hidden bg-slate-100"
                >
                  <Image
                    src={url}
                    alt={`Photo ${idx + 1}`}
                    fill
                    className="object-contain"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
