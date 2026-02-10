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

import { useState } from "react";
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
  PlusIcon,
  ImageIcon,
  FileTextIcon,
  SaveIcon,
  SendIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon,
  GlobeIcon,
  BellIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { publishReport, uploadReportPdf } from "@/lib/actions/reports";
import { generateReportPdfBase64 } from "@/lib/pdf/generate-report-pdf";
import { toast } from "sonner";

// Shared report components
import {
  REPORT_TYPES,
  type LocalSection,
  type ReportTypeValue,
} from "@/components/reports";
import { SortableSection } from "@/components/reports/sortable-section";
import { SectionFormDialog } from "@/components/reports/section-form-dialog";
import { DeleteSectionDialog } from "@/components/reports/delete-section-dialog";

interface ReportCreationModalProps {
  projectId: string;
  projectName: string;
  projectCode: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportCreationModal({
  projectId,
  projectName,
  projectCode,
  open,
  onOpenChange,
}: ReportCreationModalProps) {
  const router = useRouter();

  // Report metadata state
  const [reportType, setReportType] = useState<ReportTypeValue>("daily");
  const [shareWithClient, setShareWithClient] = useState(false);

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

  // Wizard step state (0 = Report Type, 1 = Sections, 2 = Share & Publish)
  const [currentStep, setCurrentStep] = useState(0);

  // Notification settings - whether to include clients in email notifications
  const [notifyClients, setNotifyClients] = useState(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Wizard steps configuration
  const WIZARD_STEPS = [
    { number: 1, title: "Report Type" },
    { number: 2, title: "Sections" },
    { number: 3, title: "Share" },
  ];

  // Reset all state when modal opens/closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isSaving) {
      setReportType("daily");
      setShareWithClient(false);
      setNotifyClients(false);
      setSections([]);
      setError(null);
      setSectionFormOpen(false);
      setEditingSection(null);
      setCurrentStep(0);
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

      // Create the report (always as draft first)
      // share_internal is always true - team members always see their reports
      const { data: newReport, error: reportError } = await supabase
        .from("reports")
        .insert({
          project_id: projectId,
          report_type: reportType,
          created_by: user.id,
          is_published: false,
          published_at: null,
          share_with_client: shareWithClient,
          share_internal: true,
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

      // If publishing, generate PDF, upload to storage, then publish
      if (publish) {
        try {
          toast.info("Generating PDF...");

          // Build report object from local data (no need to re-fetch)
          // Note: report_code is auto-generated by DB trigger, so we pass null here
          const reportForPdf = {
            id: newReport.id,
            project_id: projectId,
            report_type: reportType,
            report_code: null, // Will be auto-generated by DB trigger
            is_published: false,
            published_at: null,
            share_with_client: shareWithClient,
            share_internal: true,
            created_by: null,
            updated_by: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            creator: null,
            updater: null,
            lines: sections.map((section, index) => ({
              id: section.id,
              report_id: newReport.id,
              line_order: index + 1,
              title: section.title,
              description: section.description || null,
              photos: section.photos,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })),
          };

          // Generate PDF
          const pdfResult = await generateReportPdfBase64({
            report: reportForPdf,
            projectName,
            projectCode,
          });

          if (!pdfResult.success || !pdfResult.base64) {
            console.error("[Report Publish] PDF generation failed:", pdfResult.error);
            await publishReport(newReport.id, notifyClients);
            toast.success("Report published (PDF generation failed)");
          } else {
            toast.info("Uploading PDF...");

            // Upload to storage
            const uploadResult = await uploadReportPdf(
              newReport.id,
              pdfResult.base64,
              projectId,
              projectCode,
              reportType
            );

            if (!uploadResult.success || !uploadResult.url) {
              console.error("[Report Publish] PDF upload failed:", uploadResult.error);
              await publishReport(newReport.id, notifyClients);
              toast.success("Report published (PDF upload failed)");
            } else {
              await publishReport(newReport.id, notifyClients, uploadResult.url);
              toast.success("Report published successfully!");
            }
          }
        } catch (pdfError) {
          console.error("Error with PDF generation/upload:", pdfError);
          // Still publish, just without PDF
          await publishReport(newReport.id, notifyClients);
          toast.success("Report published (PDF generation failed)");
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
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileTextIcon className="size-5 text-orange-500" />
              Create New Report
            </DialogTitle>
            <DialogDescription>
              {currentStep === 0
                ? "Select the type of report you want to create."
                : currentStep === 1
                  ? "Build your report by adding sections with descriptions and photos."
                  : "Configure sharing options and publish your report."}
            </DialogDescription>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 sm:gap-4 py-4 border-b">
            {WIZARD_STEPS.map((step, index) => (
              <div key={step.number} className="flex items-center gap-1.5 sm:gap-2">
                <div
                  className={`flex items-center justify-center size-7 sm:size-8 rounded-full border-2 transition-colors ${
                    index < currentStep
                      ? "bg-orange-500 border-orange-500 text-white"
                      : index === currentStep
                        ? "border-orange-500 text-orange-500"
                        : "border-gray-300 text-gray-400"
                  }`}
                >
                  {index < currentStep ? (
                    <CheckIcon className="size-3.5 sm:size-4" />
                  ) : (
                    <span className="text-xs sm:text-sm font-medium">{step.number}</span>
                  )}
                </div>
                <span
                  className={`hidden sm:inline text-sm font-medium ${
                    index <= currentStep ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step.title}
                </span>
                {index < WIZARD_STEPS.length - 1 && (
                  <div
                    className={`w-6 sm:w-12 h-0.5 mx-1 sm:mx-2 ${
                      index < currentStep ? "bg-orange-500" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          {/* Mobile step label - shown below indicator on small screens */}
          <div className="sm:hidden text-center text-sm font-medium text-muted-foreground -mt-2 pb-2 border-b">
            Step {currentStep + 1}: {WIZARD_STEPS[currentStep].title}
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-2 -mr-2">
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Step 1: Report Type */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-base font-medium">
                    Select Report Type
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {REPORT_TYPES.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setReportType(type.value)}
                        className={`p-3 rounded-lg border-2 text-center transition-all ${
                          reportType === type.value
                            ? "border-orange-500 bg-orange-50 text-orange-700"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <span className="text-sm font-medium">{type.label.replace(" Report", "")}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Sections */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-base">Report Sections</h3>
                      <p className="text-sm text-muted-foreground">
                        {sections.length}{" "}
                        {sections.length === 1 ? "section" : "sections"} •{" "}
                        {sections.reduce((acc, s) => acc + s.photos.length, 0)} photos
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={handleAddSection}>
                      <PlusIcon className="size-4" />
                      Add Section
                    </Button>
                  </div>

                  {sections.length === 0 ? (
                    <Card className="p-8 border-dashed">
                      <div className="flex flex-col items-center justify-center text-center">
                        <ImageIcon className="size-10 text-muted-foreground/50 mb-3" />
                        <p className="text-muted-foreground mb-4">
                          No sections yet. Add your first section to get started.
                        </p>
                        <Button onClick={handleAddSection}>
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
            )}

            {/* Step 3: Share & Publish */}
            {currentStep === 2 && (
              <div className="space-y-6">
                {/* Client Visibility */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Client Access</Label>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setShareWithClient(!shareWithClient)}
                    onKeyDown={(e) => e.key === "Enter" && setShareWithClient(!shareWithClient)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all cursor-pointer ${
                      shareWithClient
                        ? "border-sky-500 bg-sky-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-3 rounded-lg ${
                          shareWithClient ? "bg-sky-100" : "bg-gray-100"
                        }`}
                      >
                        <GlobeIcon
                          className={`size-6 ${
                            shareWithClient ? "text-sky-600" : "text-gray-500"
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-lg">Share with Client</span>
                          <Switch
                            checked={shareWithClient}
                            onCheckedChange={setShareWithClient}
                            className="pointer-events-none"
                          />
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          When enabled, client contacts assigned to this project will be able to view this report.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Email Notifications */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Email Notifications</Label>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setNotifyClients(!notifyClients)}
                    onKeyDown={(e) => e.key === "Enter" && setNotifyClients(!notifyClients)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all cursor-pointer ${
                      notifyClients
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-3 rounded-lg ${
                          notifyClients ? "bg-orange-100" : "bg-gray-100"
                        }`}
                      >
                        <BellIcon
                          className={`size-6 ${
                            notifyClients ? "text-orange-600" : "text-gray-500"
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-lg">Notify Clients</span>
                          <Switch
                            checked={notifyClients}
                            onCheckedChange={setNotifyClients}
                            className="pointer-events-none"
                          />
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Send email notification to client contacts when published.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary Card */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Summary</Label>
                  <Card className="p-4 bg-gray-50">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-semibold text-orange-600">
                          {REPORT_TYPES.find((t) => t.value === reportType)?.label.replace(" Report", "")}
                        </p>
                        <p className="text-sm text-muted-foreground">Report Type</p>
                      </div>
                      <div>
                        <p className="text-2xl font-semibold text-orange-600">
                          {sections.length}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {sections.length === 1 ? "Section" : "Sections"}
                        </p>
                      </div>
                      <div>
                        <p className="text-2xl font-semibold text-orange-600">
                          {sections.reduce((acc, s) => acc + s.photos.length, 0)}
                        </p>
                        <p className="text-sm text-muted-foreground">Photos</p>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 gap-2 sm:gap-2 border-t pt-4">
            {currentStep === 0 ? (
              // Step 1: Report Type
              <>
                <Button
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => setCurrentStep(1)}
                                  >
                  Next: Add Sections
                  <ChevronRightIcon className="size-4" />
                </Button>
              </>
            ) : currentStep === 1 ? (
              // Step 2: Sections
              <>
                <Button
                  variant="ghost"
                  onClick={() => setCurrentStep(0)}
                  disabled={isSaving}
                >
                  <ChevronLeftIcon className="size-4" />
                  Back
                </Button>
                <div className="flex-1" />
                <Button
                  onClick={() => setCurrentStep(2)}
                  disabled={sections.length === 0}
                                  >
                  Next: Share Options
                  <ChevronRightIcon className="size-4" />
                </Button>
              </>
            ) : (
              // Step 3: Share & Publish
              <>
                <Button
                  variant="ghost"
                  onClick={() => setCurrentStep(1)}
                  disabled={isSaving}
                >
                  <ChevronLeftIcon className="size-4" />
                  Back
                </Button>
                <div className="flex-1" />
                <Button
                  variant="secondary"
                  onClick={() => handleSaveReport(false)}
                  disabled={isSaving}
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
                  disabled={isSaving}
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
              </>
            )}
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
