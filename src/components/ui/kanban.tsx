"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { composeRefs } from "@/lib/compose-refs";
import { GripVerticalIcon } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface KanbanBoardProps {
  children: React.ReactNode;
  onDragStart?: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onDragOver?: (event: DragOverEvent) => void;
  overlay?: React.ReactNode;
}

interface KanbanColumnProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  items: string[];
}

interface KanbanColumnHeaderProps {
  title: string;
  count: number;
  color?: string;
  className?: string;
  children?: React.ReactNode;
}

interface KanbanCardProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

interface KanbanOverlayProps {
  children: React.ReactNode;
}

// ============================================================================
// KanbanBoard — Root wrapper with DndContext
// ============================================================================

function KanbanBoard({
  children,
  onDragStart,
  onDragEnd,
  onDragOver,
  overlay,
}: KanbanBoardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor)
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
    >
      {children}
      <DragOverlay dropAnimation={null}>{overlay}</DragOverlay>
    </DndContext>
  );
}

// ============================================================================
// KanbanColumn — Droppable column area
// ============================================================================

function KanbanColumn({ id, children, className, items }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <SortableContext
      id={id}
      items={items}
      strategy={verticalListSortingStrategy}
    >
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-col min-h-[200px] rounded-lg bg-base-50/70 border border-base-200 p-2.5",
          isOver && "ring-2 ring-primary/20 bg-primary/[0.02]",
          className
        )}
      >
        {children}
      </div>
    </SortableContext>
  );
}

// ============================================================================
// KanbanColumnHeader — Column title + count badge
// ============================================================================

function KanbanColumnHeader({
  title,
  count,
  color,
  className,
  children,
}: KanbanColumnHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-2 py-2.5 mb-1.5 border-b border-base-200/60",
        className
      )}
    >
      <div className="flex items-center gap-2">
        {color && (
          <div
            className="size-2.5 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
        )}
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <span className="inline-flex items-center justify-center size-5 rounded-full bg-base-200 text-xs font-medium text-muted-foreground">
          {count}
        </span>
      </div>
      {children}
    </div>
  );
}

// ============================================================================
// KanbanCard — Draggable item
// ============================================================================

const KanbanCard = React.forwardRef<HTMLDivElement, KanbanCardProps>(
  function KanbanCard({ id, children, className, disabled }, forwardedRef) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id, disabled });

    const style: React.CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <div
        ref={composeRefs(setNodeRef, forwardedRef)}
        style={style}
        className={cn(
          "group relative rounded-lg border border-base-200 bg-card p-3 transition-all",
          "hover:border-primary/20 hover:shadow-sm",
          isDragging && "opacity-50 shadow-lg ring-2 ring-primary/20",
          disabled && "opacity-60 cursor-default",
          className
        )}
        {...attributes}
      >
        {/* Drag handle */}
        {!disabled && (
          <button
            type="button"
            className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-60 hover:!opacity-100 cursor-grab active:cursor-grabbing p-0.5 rounded text-muted-foreground"
            {...listeners}
            aria-label="Drag to reorder"
          >
            <GripVerticalIcon className="size-3.5" />
          </button>
        )}
        <div className={cn(!disabled && "pl-4")}>{children}</div>
      </div>
    );
  }
);

// ============================================================================
// KanbanOverlay — Drag overlay wrapper
// ============================================================================

function KanbanOverlay({ children }: KanbanOverlayProps) {
  return (
    <div className="rounded-lg border-2 border-primary/30 bg-card shadow-xl p-3 rotate-[2deg] scale-105">
      {children}
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  KanbanBoard,
  KanbanColumn,
  KanbanColumnHeader,
  KanbanCard,
  KanbanOverlay,
  type KanbanBoardProps,
  type KanbanColumnProps,
  type KanbanColumnHeaderProps,
  type KanbanCardProps,
  type KanbanOverlayProps,
};
