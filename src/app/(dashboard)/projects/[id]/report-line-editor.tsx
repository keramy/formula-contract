"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { RichTextDisplay, truncateHtml } from "@/components/ui/rich-text-display";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  GripVerticalIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ImageIcon,
  XIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image-utils";
import {
  addReportLine,
  updateReportLine,
  deleteReportLine,
  reorderReportLines,
  type ReportLine,
} from "@/lib/actions/reports";

interface SortableLineItemProps {
  line: ReportLine;
  onEdit: (line: ReportLine) => void;
  onDelete: (lineId: string) => void;
  disabled?: boolean;
}

function SortableLineItem({ line, onEdit, onDelete, disabled }: SortableLineItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: line.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const photos = (line.photos || []) as string[];

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`p-4 ${isDragging ? "shadow-lg ring-2 ring-primary" : ""}`}
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          disabled={disabled}
        >
          <GripVerticalIcon className="size-5" />
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h4 className="font-medium">{line.title}</h4>
              {line.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {truncateHtml(line.description, 150)}
                </p>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={() => onEdit(line)}
                disabled={disabled}
              >
                <PencilIcon className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-8 text-destructive hover:text-destructive"
                onClick={() => onDelete(line.id)}
                disabled={disabled}
              >
                <TrashIcon className="size-4" />
              </Button>
            </div>
          </div>

          {/* Photos Preview */}
          {photos.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {photos.slice(0, 4).map((url, idx) => (
                <div
                  key={idx}
                  className="relative w-20 h-14 rounded-md overflow-hidden bg-slate-100"
                >
                  <Image
                    src={url}
                    alt={`Photo ${idx + 1}`}
                    fill
                    className="object-contain"
                  />
                </div>
              ))}
              {photos.length > 4 && (
                <div className="w-20 h-14 rounded-md bg-muted flex items-center justify-center text-sm text-muted-foreground">
                  +{photos.length - 4}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

interface ReportLineEditorProps {
  projectId: string;
  reportId: string;
  lines: ReportLine[];
  readOnly?: boolean;
}

export function ReportLineEditor({
  projectId,
  reportId,
  lines: initialLines,
  readOnly = false,
}: ReportLineEditorProps) {
  const router = useRouter();
  const [lines, setLines] = useState<ReportLine[]>(initialLines);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editLine, setEditLine] = useState<ReportLine | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLineId, setDeleteLineId] = useState<string | null>(null);

  // Update lines when props change
  useEffect(() => {
    setLines(initialLines);
  }, [initialLines]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = lines.findIndex((l) => l.id === active.id);
      const newIndex = lines.findIndex((l) => l.id === over.id);

      const newLines = arrayMove(lines, oldIndex, newIndex);
      setLines(newLines);

      // Save new order
      setIsSaving(true);
      const lineIds = newLines.map((l) => l.id);
      await reorderReportLines(reportId, lineIds);
      setIsSaving(false);
      router.refresh();
    }
  };

  const handleAddClick = () => {
    setEditLine(null);
    setTitle("");
    setDescription("");
    setPhotos([]);
    setFormOpen(true);
  };

  const handleEditClick = (line: ReportLine) => {
    setEditLine(line);
    setTitle(line.title);
    setDescription(line.description || "");
    setPhotos((line.photos || []) as string[]);
    setFormOpen(true);
  };

  const handleDeleteClick = (lineId: string) => {
    setDeleteLineId(lineId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteLineId) return;

    setIsLoading(true);
    const result = await deleteReportLine(deleteLineId);

    if (result.success) {
      setLines(lines.filter((l) => l.id !== deleteLineId));
    }

    setDeleteDialogOpen(false);
    setDeleteLineId(null);
    setIsLoading(false);
    router.refresh();
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhoto(true);
    const supabase = createClient();

    for (const originalFile of Array.from(files)) {
      try {
        // Compress the image before upload
        const compressedFile = await compressImage(originalFile, {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 0.8,
        });

        const fileExt = compressedFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const fileName = `${projectId}/${reportId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from("reports")
          .upload(fileName, compressedFile);

        if (!error && data) {
          const { data: { publicUrl } } = supabase.storage
            .from("reports")
            .getPublicUrl(data.path);

          setPhotos((prev) => [...prev, publicUrl]);
        }
      } catch (err) {
        console.error("Photo upload error:", err);
      }
    }

    setUploadingPhoto(false);
    e.target.value = "";
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFormSubmit = async () => {
    if (!title.trim()) return;

    setIsLoading(true);

    if (editLine) {
      const result = await updateReportLine(editLine.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        photos,
      });

      if (result.success) {
        setLines(
          lines.map((l) =>
            l.id === editLine.id
              ? { ...l, title: title.trim(), description: description.trim() || null, photos }
              : l
          )
        );
      }
    } else {
      const result = await addReportLine(reportId, {
        title: title.trim(),
        description: description.trim() || undefined,
        photos,
      });

      if (result.success && result.data?.lineId) {
        const newLine: ReportLine = {
          id: result.data.lineId,
          report_id: reportId,
          line_order: lines.length + 1,
          title: title.trim(),
          description: description.trim() || null,
          photos,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setLines([...lines, newLine]);
      }
    }

    setFormOpen(false);
    setIsLoading(false);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Report Content</h3>
          <p className="text-sm text-muted-foreground">
            {lines.length} {lines.length === 1 ? "section" : "sections"}
            {isSaving && " - Saving..."}
          </p>
        </div>
        {!readOnly && (
          <Button size="sm" onClick={handleAddClick}>
            <PlusIcon className="size-4" />
            Add Section
          </Button>
        )}
      </div>

      {/* Lines List */}
      {lines.length === 0 ? (
        <Card className="p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <ImageIcon className="size-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground mb-3">No content yet</p>
            {!readOnly && (
              <Button size="sm" variant="outline" onClick={handleAddClick}>
                <PlusIcon className="size-4" />
                Add First Section
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={lines.map((l) => l.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {lines.map((line) => (
                <SortableLineItem
                  key={line.id}
                  line={line}
                  onEdit={handleEditClick}
                  onDelete={handleDeleteClick}
                  disabled={readOnly || isLoading}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add/Edit Line Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editLine ? "Edit Section" : "Add Section"}</DialogTitle>
            <DialogDescription>
              {editLine
                ? "Update the section content."
                : "Add a new section to the report."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="line-title">Title *</Label>
              <Input
                id="line-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Section title"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <RichTextEditor
                value={description}
                onChange={setDescription}
                placeholder="Section description or notes..."
                minHeight="120px"
              />
            </div>

            {/* Photos */}
            <div className="space-y-2">
              <Label>Photos</Label>
              <div className="flex flex-wrap gap-2">
                {photos.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative w-24 h-16 rounded-md overflow-hidden bg-slate-100 group"
                  >
                    <Image
                      src={url}
                      alt={`Photo ${idx + 1}`}
                      fill
                      className="object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-1 right-1 size-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </div>
                ))}

                {/* Upload Button */}
                <label className="w-24 h-16 rounded-md border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 flex flex-col items-center justify-center cursor-pointer transition-colors">
                  {uploadingPhoto ? (
                    <Spinner className="size-5" />
                  ) : (
                    <>
                      <ImageIcon className="size-5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground mt-1">Add</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                    disabled={uploadingPhoto}
                  />
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleFormSubmit} disabled={isLoading || !title.trim()}>
              {isLoading ? (
                <>
                  <Spinner className="size-4 mr-2" />
                  Saving...
                </>
              ) : editLine ? (
                "Save Changes"
              ) : (
                "Add Section"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Section</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this section? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? (
                <>
                  <Spinner className="size-4 mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
