"use client";

/**
 * ReportEditModal Component
 *
 * Modal dialog for editing existing project reports.
 * Supports sections with photos, drag-and-drop reordering,
 * and team sharing functionality.
 *
 * REFACTORED: Now uses shared components from @/components/reports
 * Original: ~910 lines -> Refactored: ~400 lines
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
  PlusIcon,
  ImageIcon,
  FileTextIcon,
  SaveIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { type Report, type ReportLine } from "@/lib/actions/reports";

// Shared report components
import {
  REPORT_TYPES,
  type LocalSection,
} from "@/components/reports";
import { SortableSection } from "@/components/reports/sortable-section";
import { SectionFormDialog } from "@/components/reports/section-form-dialog";
import { DeleteSectionDialog } from "@/components/reports/delete-section-dialog";

interface ReportEditModalProps {
  projectId: string;
  report: Report;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Convert existing report lines to local sections
function linesToSections(lines: ReportLine[]): LocalSection[] {
  return lines.map((line) => ({
    id: line.id,
    originalId: line.id,
    title: line.title,
    description: line.description || "",
    photos: (line.photos || []) as string[],
    isNew: false,
  }));
}

export function ReportEditModal({
  projectId,
  report,
  open,
  onOpenChange,
}: ReportEditModalProps) {
  const router = useRouter();

  // Report metadata state
  const [reportType, setReportType] = useState(report.report_type);
  const [shareWithClient, setShareWithClient] = useState(report.share_with_client);
  const [shareInternal, setShareInternal] = useState(report.share_internal);

  // Sections state (local until save)
  const [sections, setSections] = useState<LocalSection[]>([]);
  const [deletedSectionIds, setDeletedSectionIds] = useState<string[]>([]);

  // Section form state
  const [sectionFormOpen, setSectionFormOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<LocalSection | null>(null);

  // Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delete confirmation state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Expanded state for settings
  const [settingsExpanded, setSettingsExpanded] = useState(true);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Initialize state from report when modal opens
  useEffect(() => {
    if (open) {
      setReportType(report.report_type);
      setShareWithClient(report.share_with_client);
      setShareInternal(report.share_internal);
      setSections(linesToSections(report.lines || []));
      setDeletedSectionIds([]);
      setError(null);
      setSectionFormOpen(false);
      setEditingSection(null);
    }
  }, [open, report]);

  // Handle modal close
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isSaving) {
      setError(null);
      setSectionFormOpen(false);
      setEditingSection(null);
    }
    onOpenChange(newOpen);
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

  // Section handlers
  const handleAddSection = () => {
    setEditingSection(null);
    setSectionFormOpen(true);
  };

  const handleEditSection = (section: LocalSection) => {
    setEditingSection(section);
    setSectionFormOpen(true);
  };

  const handleSaveSection = (section: LocalSection) => {
    if (editingSection) {
      setSections((prev) =>
        prev.map((s) => (s.id === editingSection.id ? section : s))
      );
    } else {
      // Mark as new section
      const newSection: LocalSection = {
        ...section,
        isNew: true,
      };
      setSections((prev) => [...prev, newSection]);
    }
    setEditingSection(null);
  };

  const handleDeleteSection = (id: string) => {
    setDeleteId(id);
  };

  const confirmDeleteSection = () => {
    if (deleteId) {
      const sectionToDelete = sections.find((s) => s.id === deleteId);

      // If it's an existing section (has originalId), track for deletion
      if (sectionToDelete?.originalId && !sectionToDelete.isNew) {
        setDeletedSectionIds((prev) => [...prev, sectionToDelete.originalId!]);
      }

      setSections((prev) => prev.filter((s) => s.id !== deleteId));
      setDeleteId(null);
    }
  };

  // Save report changes to database
  const handleSaveReport = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      // Get current user for updated_by tracking
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // 1. Update report metadata
      const { error: reportError } = await supabase
        .from("reports")
        .update({
          report_type: reportType,
          share_with_client: shareWithClient,
          share_internal: shareInternal,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", report.id);

      if (reportError) throw reportError;

      // 2. Delete removed sections
      if (deletedSectionIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("report_lines")
          .delete()
          .in("id", deletedSectionIds);

        if (deleteError) throw deleteError;
      }

      // 3. Process sections (update existing, insert new)
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];

        if (section.isNew) {
          // Insert new section
          const { error: insertError } = await supabase
            .from("report_lines")
            .insert({
              report_id: report.id,
              line_order: i + 1,
              title: section.title,
              description: section.description || null,
              photos: section.photos,
            });

          if (insertError) throw insertError;
        } else if (section.originalId) {
          // Update existing section
          const { error: updateError } = await supabase
            .from("report_lines")
            .update({
              line_order: i + 1,
              title: section.title,
              description: section.description || null,
              photos: section.photos,
              updated_at: new Date().toISOString(),
            })
            .eq("id", section.originalId);

          if (updateError) throw updateError;
        }
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
              <FileTextIcon className="size-5 text-teal-500" />
              Edit Report
            </DialogTitle>
            <DialogDescription>
              Edit your report sections, photos, and settings.
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

                  {/* Visibility Settings */}
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="share-internal"
                        checked={shareInternal}
                        onCheckedChange={setShareInternal}
                      />
                      <Label
                        htmlFor="share-internal"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Share internally
                      </Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        id="share-client"
                        checked={shareWithClient}
                        onCheckedChange={setShareWithClient}
                      />
                      <Label
                        htmlFor="share-client"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Share with client
                      </Label>
                    </div>
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
                    {sections.length}{" "}
                    {sections.length === 1 ? "section" : "sections"}
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
                          accentColor="teal"
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
              onClick={handleSaveReport}
              disabled={isSaving}
              className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
            >
              {isSaving ? (
                <>
                  <Spinner className="size-4" />
                  Saving...
                </>
              ) : (
                <>
                  <SaveIcon className="size-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Section Add/Edit Dialog */}
      <SectionFormDialog
        open={sectionFormOpen}
        onOpenChange={setSectionFormOpen}
        editingSection={editingSection}
        onSave={handleSaveSection}
        projectId={projectId}
        reportId={report.id}
      />

      {/* Delete Confirmation */}
      <DeleteSectionDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={confirmDeleteSection}
      />
    </>
  );
}
