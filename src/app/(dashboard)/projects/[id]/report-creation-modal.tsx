"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Checkbox } from "@/components/ui/checkbox";
import { GradientAvatar } from "@/components/ui/ui-helpers";
import { getProjectTeamMembers, updateReportShares } from "./reports/actions";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  FileTextIcon,
  SaveIcon,
  SendIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { sanitizeText, sanitizeHTML } from "@/lib/sanitize";
import { validateFile, IMAGE_CONFIG } from "@/lib/file-validation";
import { compressImage } from "@/lib/image-utils";

// Types for local state management
interface LocalSection {
  id: string; // Temporary local ID
  title: string;
  description: string;
  photos: string[];
}

interface ReportCreationModalProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const REPORT_TYPES = [
  { value: "progress", label: "Progress Report" },
  { value: "weekly", label: "Weekly Report" },
  { value: "monthly", label: "Monthly Report" },
  { value: "milestone", label: "Milestone Report" },
  { value: "final", label: "Final Report" },
];

// Generate temporary local IDs
function generateLocalId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Sortable Section Item Component
interface SortableSectionProps {
  section: LocalSection;
  onEdit: (section: LocalSection) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
}

function SortableSection({ section, onEdit, onDelete, disabled }: SortableSectionProps) {
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

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`p-3 ${isDragging ? "shadow-lg ring-2 ring-orange-500" : "hover:bg-muted/30"}`}
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

export function ReportCreationModal({
  projectId,
  open,
  onOpenChange,
}: ReportCreationModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Report metadata state
  const [reportType, setReportType] = useState("progress");
  const [shareWithClient, setShareWithClient] = useState(false);
  const [shareInternal, setShareInternal] = useState(true);

  // Sections state (local until save)
  const [sections, setSections] = useState<LocalSection[]>([]);

  // Section form state
  const [sectionFormOpen, setSectionFormOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<LocalSection | null>(null);
  const [sectionTitle, setSectionTitle] = useState("");
  const [sectionDescription, setSectionDescription] = useState("");
  const [sectionPhotos, setSectionPhotos] = useState<string[]>([]);

  // Loading states
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delete confirmation state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Expanded state for settings
  const [settingsExpanded, setSettingsExpanded] = useState(true);

  // Team members state for sharing
  interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: string;
  }
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedShareUsers, setSelectedShareUsers] = useState<string[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);

  // Fetch team members when modal opens
  useEffect(() => {
    async function loadTeamMembers() {
      if (open && teamMembers.length === 0) {
        setLoadingTeam(true);
        const members = await getProjectTeamMembers(projectId);
        setTeamMembers(members);
        setLoadingTeam(false);
      }
    }
    loadTeamMembers();
  }, [open, projectId, teamMembers.length]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Reset all state when modal opens/closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isSaving) {
      // Reset all state when closing
      setReportType("progress");
      setShareWithClient(false);
      setShareInternal(true);
      setSections([]);
      setError(null);
      setSectionFormOpen(false);
      setEditingSection(null);
      setSelectedShareUsers([]);
    }
    onOpenChange(newOpen);
  };

  // Toggle user selection for sharing
  const toggleUserSelection = (userId: string) => {
    setSelectedShareUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSections((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Section form handlers
  const handleAddSection = () => {
    setEditingSection(null);
    setSectionTitle("");
    setSectionDescription("");
    setSectionPhotos([]);
    setSectionFormOpen(true);
  };

  const handleEditSection = (section: LocalSection) => {
    setEditingSection(section);
    setSectionTitle(section.title);
    setSectionDescription(section.description);
    setSectionPhotos([...section.photos]);
    setSectionFormOpen(true);
  };

  const handleDeleteSection = (id: string) => {
    setDeleteId(id);
  };

  const confirmDeleteSection = () => {
    if (deleteId) {
      setSections((prev) => prev.filter((s) => s.id !== deleteId));
      setDeleteId(null);
    }
  };

  // Photo upload handler with compression
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError(null);

    const supabase = createClient();
    const newPhotos: string[] = [];
    const errors: string[] = [];

    for (const originalFile of Array.from(files)) {
      // Validate file
      const validation = validateFile(originalFile, IMAGE_CONFIG);
      if (!validation.valid) {
        errors.push(`${originalFile.name}: ${validation.error || "Invalid file"}`);
        continue;
      }

      try {
        // Compress the image before upload (max 1920x1080, 80% quality)
        const compressedFile = await compressImage(originalFile, {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 0.8,
        });

        const fileExt = compressedFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const fileName = `${projectId}/temp/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

        const { data, error: uploadError } = await supabase.storage
          .from("reports")
          .upload(fileName, compressedFile);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          errors.push(`${originalFile.name}: ${uploadError.message}`);
          continue;
        }

        if (data) {
          const { data: { publicUrl } } = supabase.storage
            .from("reports")
            .getPublicUrl(data.path);

          newPhotos.push(publicUrl);
        }
      } catch (err) {
        console.error("Upload exception:", err);
        errors.push(`${originalFile.name}: Upload failed`);
      }
    }

    if (errors.length > 0) {
      setError(errors.join(". "));
    }

    if (newPhotos.length > 0) {
      setSectionPhotos((prev) => [...prev, ...newPhotos]);
    }

    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = (index: number) => {
    setSectionPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Save section to local state
  const handleSaveSection = () => {
    if (!sectionTitle.trim()) return;

    const sanitizedTitle = sanitizeText(sectionTitle.trim());
    const sanitizedDescription = sectionDescription.trim()
      ? sanitizeHTML(sectionDescription.trim())
      : "";

    if (editingSection) {
      // Update existing section
      setSections((prev) =>
        prev.map((s) =>
          s.id === editingSection.id
            ? {
                ...s,
                title: sanitizedTitle,
                description: sanitizedDescription,
                photos: sectionPhotos,
              }
            : s
        )
      );
    } else {
      // Add new section
      const newSection: LocalSection = {
        id: generateLocalId(),
        title: sanitizedTitle,
        description: sanitizedDescription,
        photos: sectionPhotos,
      };
      setSections((prev) => [...prev, newSection]);
    }

    setSectionFormOpen(false);
    setEditingSection(null);
  };

  // Save report to database
  const handleSaveReport = async (publish: boolean = false) => {
    if (sections.length === 0) {
      setError("Please add at least one section to the report.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create the report
      const { data: newReport, error: reportError } = await supabase
        .from("reports")
        .insert({
          project_id: projectId,
          report_type: reportType,
          created_by: user.id,
          is_published: publish,
          published_at: publish ? new Date().toISOString() : null,
          share_with_client: shareWithClient,
          share_internal: shareInternal,
        })
        .select("id")
        .single();

      if (reportError) throw reportError;

      // Create all report lines
      const reportLines = sections.map((section, index) => ({
        report_id: newReport.id,
        line_order: index + 1,
        title: section.title,
        description: section.description || null,
        photos: section.photos,
      }));

      const { error: linesError } = await supabase
        .from("report_lines")
        .insert(reportLines);

      if (linesError) throw linesError;

      // Save report shares if any users selected
      if (selectedShareUsers.length > 0) {
        await updateReportShares(newReport.id, selectedShareUsers);
      }

      // Close modal and refresh
      handleOpenChange(false);
      router.refresh();
    } catch (err) {
      console.error("Error saving report:", err);
      setError(err instanceof Error ? err.message : "Failed to save report");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileTextIcon className="size-5 text-orange-500" />
              Create New Report
            </DialogTitle>
            <DialogDescription>
              Build your report by adding sections with descriptions and photos.
              Save as draft or publish when ready.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-2 -mr-2">
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Report Settings - Collapsible */}
            <div className="border rounded-lg">
              <button
                type="button"
                className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                onClick={() => setSettingsExpanded(!settingsExpanded)}
              >
                <span className="font-medium text-sm">Report Settings</span>
                {settingsExpanded ? (
                  <ChevronUpIcon className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronDownIcon className="size-4 text-muted-foreground" />
                )}
              </button>

              {settingsExpanded && (
                <div className="p-3 pt-0 space-y-4 border-t">
                  {/* Report Type */}
                  <div className="space-y-2">
                    <Label htmlFor="report-type">Report Type</Label>
                    <Select value={reportType} onValueChange={setReportType}>
                      <SelectTrigger id="report-type">
                        <SelectValue placeholder="Select report type" />
                      </SelectTrigger>
                      <SelectContent>
                        {REPORT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Share Settings */}
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="share-internal"
                        checked={shareInternal}
                        onCheckedChange={setShareInternal}
                      />
                      <Label htmlFor="share-internal" className="text-sm font-normal cursor-pointer">
                        Share internally
                      </Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        id="share-client"
                        checked={shareWithClient}
                        onCheckedChange={setShareWithClient}
                      />
                      <Label htmlFor="share-client" className="text-sm font-normal cursor-pointer">
                        Share with client
                      </Label>
                    </div>
                  </div>

                  {/* Share With Specific Users */}
                  <div className="space-y-2">
                    <Label className="text-sm">Share with specific users</Label>
                    {loadingTeam ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Spinner className="size-4" />
                        Loading team members...
                      </div>
                    ) : teamMembers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No team members assigned to this project
                      </p>
                    ) : (
                      <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                        {teamMembers.map((member) => (
                          <label
                            key={member.id}
                            className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
                          >
                            <Checkbox
                              checked={selectedShareUsers.includes(member.id)}
                              onCheckedChange={() => toggleUserSelection(member.id)}
                            />
                            <GradientAvatar name={member.name} size="sm" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{member.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {member.role.charAt(0).toUpperCase() + member.role.slice(1).replace("_", " ")}
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                    {selectedShareUsers.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {selectedShareUsers.length} user{selectedShareUsers.length === 1 ? "" : "s"} selected
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Report Sections */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-sm">Report Sections</h3>
                  <p className="text-xs text-muted-foreground">
                    {sections.length} {sections.length === 1 ? "section" : "sections"}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={handleAddSection}>
                  <PlusIcon className="size-4" />
                  Add Section
                </Button>
              </div>

              {sections.length === 0 ? (
                <Card className="p-6 border-dashed">
                  <div className="flex flex-col items-center justify-center text-center">
                    <ImageIcon className="size-8 text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">
                      No sections yet. Add your first section to get started.
                    </p>
                    <Button size="sm" onClick={handleAddSection}>
                      <PlusIcon className="size-4" />
                      Add First Section
                    </Button>
                  </div>
                </Card>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={sections.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {sections.map((section) => (
                        <SortableSection
                          key={section.id}
                          section={section}
                          onEdit={handleEditSection}
                          onDelete={handleDeleteSection}
                          disabled={isSaving}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 gap-2 sm:gap-2 border-t pt-4">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleSaveReport(false)}
              disabled={isSaving || sections.length === 0}
            >
              {isSaving ? (
                <>
                  <Spinner className="size-4" />
                  Saving...
                </>
              ) : (
                <>
                  <SaveIcon className="size-4" />
                  Save as Draft
                </>
              )}
            </Button>
            <Button
              onClick={() => handleSaveReport(true)}
              disabled={isSaving || sections.length === 0}
              className="bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600"
            >
              {isSaving ? (
                <>
                  <Spinner className="size-4" />
                  Publishing...
                </>
              ) : (
                <>
                  <SendIcon className="size-4" />
                  Publish
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Section Add/Edit Dialog */}
      <Dialog open={sectionFormOpen} onOpenChange={(open) => {
        setSectionFormOpen(open);
        if (!open) setError(null); // Clear errors when closing
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSection ? "Edit Section" : "Add Section"}
            </DialogTitle>
            <DialogDescription>
              {editingSection
                ? "Update the section content."
                : "Add a new section to your report."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Error display for upload issues */}
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="section-title">Title *</Label>
              <Input
                id="section-title"
                value={sectionTitle}
                onChange={(e) => setSectionTitle(e.target.value)}
                placeholder="e.g., Site Preparation Complete"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="section-description">Description</Label>
              <Textarea
                id="section-description"
                value={sectionDescription}
                onChange={(e) => setSectionDescription(e.target.value)}
                placeholder="Add details, notes, or observations..."
                rows={4}
              />
            </div>

            {/* Photos */}
            <div className="space-y-2">
              <Label>Photos</Label>
              <div className="flex flex-wrap gap-2">
                {sectionPhotos.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative w-20 h-14 rounded-md overflow-hidden bg-slate-100 group"
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
                      className="absolute top-0.5 right-0.5 size-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </div>
                ))}

                {/* Upload Button */}
                <label className="size-16 rounded-md border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 flex flex-col items-center justify-center cursor-pointer transition-colors">
                  {isUploading ? (
                    <Spinner className="size-5" />
                  ) : (
                    <>
                      <ImageIcon className="size-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground mt-0.5">Add</span>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Max 10MB per image. JPG, PNG, GIF, WebP supported.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSectionFormOpen(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSection}
              disabled={!sectionTitle.trim() || isUploading}
            >
              {editingSection ? "Save Changes" : "Add Section"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Section</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this section? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteSection}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
