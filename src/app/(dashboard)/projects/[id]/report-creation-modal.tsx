"use client";

/**
 * ReportCreationModal Component
 *
 * Modal dialog for creating new project reports.
 * Supports sections with photos, drag-and-drop reordering,
 * and team sharing functionality.
 *
 * REFACTORED: Now uses shared components from @/components/reports
 * Original: ~875 lines -> Refactored: ~350 lines
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
  SendIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getProjectTeamMembers,
  updateReportShares,
} from "@/lib/actions/reports";

// Shared report components
import {
  REPORT_TYPES,
  type LocalSection,
  type TeamMember,
} from "@/components/reports";
import { SortableSection } from "@/components/reports/sortable-section";
import { TeamShareSelector } from "@/components/reports/team-share-selector";
import { SectionFormDialog } from "@/components/reports/section-form-dialog";
import { DeleteSectionDialog } from "@/components/reports/delete-section-dialog";

interface ReportCreationModalProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportCreationModal({
  projectId,
  open,
  onOpenChange,
}: ReportCreationModalProps) {
  const router = useRouter();

  // Report metadata state
  const [reportType, setReportType] = useState("progress");
  const [shareWithClient, setShareWithClient] = useState(false);
  const [shareInternal, setShareInternal] = useState(true);

  // Sections state (local until save)
  const [sections, setSections] = useState<LocalSection[]>([]);

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

  // Team members state for sharing
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
      setSections((prev) => [...prev, section]);
    }
    setEditingSection(null);
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
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

                  {/* Team Share Selector */}
                  <TeamShareSelector
                    teamMembers={teamMembers}
                    selectedUserIds={selectedShareUsers}
                    onToggleUser={toggleUserSelection}
                    loading={loadingTeam}
                  />
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
                          accentColor="orange"
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
      <SectionFormDialog
        open={sectionFormOpen}
        onOpenChange={setSectionFormOpen}
        editingSection={editingSection}
        onSave={handleSaveSection}
        projectId={projectId}
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
