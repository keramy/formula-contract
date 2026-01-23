"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { GlassCard, GradientIcon, EmptyState } from "@/components/ui/ui-helpers";
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
  PackageIcon,
  PlusIcon,
} from "lucide-react";
import { MaterialCard, type Material } from "@/components/materials/material-card";
import { MaterialApproval } from "@/components/materials/material-approval";

// ============================================================================
// PERFORMANCE: Lazy load MaterialSheet (~500+ lines + dependencies)
// Only loaded when user clicks "Add Material" or "Edit" button
// ============================================================================
const MaterialSheet = dynamic(
  () => import("@/components/materials/material-sheet").then((mod) => mod.MaterialSheet),
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
import { MaterialsExcelImport, MaterialsExcelExport, MaterialsTemplateButton } from "@/components/materials";

interface ScopeItem {
  id: string;
  item_code: string;
  name: string;
}

interface MaterialWithAssignments extends Material {
  assignedItemIds: string[];
}

interface MaterialsOverviewProps {
  projectId: string;
  projectCode: string;
  projectName: string;
  materials: MaterialWithAssignments[];
  scopeItems: ScopeItem[];
  userRole?: string;
}

export function MaterialsOverview({
  projectId,
  projectCode,
  projectName,
  materials,
  scopeItems,
  userRole = "pm",
}: MaterialsOverviewProps) {
  // Role-based permissions
  const canManageMaterials = ["admin", "pm"].includes(userRole);
  const canApproveMaterials = ["admin", "pm", "client"].includes(userRole);
  const isClient = userRole === "client";
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Dialog states
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editMaterial, setEditMaterial] = useState<MaterialWithAssignments | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteMaterialId, setDeleteMaterialId] = useState<string | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve");
  const [approvalMaterial, setApprovalMaterial] = useState<Material | null>(null);

  // OPTIMIZED: Memoize stats calculation to avoid recomputing on every render
  const stats = useMemo(() => ({
    total: materials.length,
    pending: materials.filter((m) => m.status === "pending").length,
    approved: materials.filter((m) => m.status === "approved").length,
    rejected: materials.filter((m) => m.status === "rejected").length,
  }), [materials]);

  // ============================================================================
  // PERFORMANCE: Memoized callbacks to prevent MaterialCard re-renders
  // When parent re-renders, these stable references ensure children don't re-render
  // ============================================================================

  const handleAddMaterial = useCallback(() => {
    setEditMaterial(null);
    setFormDialogOpen(true);
  }, []);

  const handleEditMaterial = useCallback((material: Material) => {
    const fullMaterial = materials.find((m) => m.id === material.id);
    if (fullMaterial) {
      setEditMaterial(fullMaterial);
      setFormDialogOpen(true);
    }
  }, [materials]);

  const handleDeleteClick = useCallback((materialId: string) => {
    setDeleteMaterialId(materialId);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteMaterialId) return;

    setIsLoading(true);
    const supabase = createClient();

    try {
      // Soft delete
      const { error } = await supabase
        .from("materials")
        .update({ is_deleted: true })
        .eq("id", deleteMaterialId);

      if (error) throw error;

      router.refresh();
    } catch (error) {
      console.error("Failed to delete material:", error);
    } finally {
      setIsLoading(false);
      setDeleteDialogOpen(false);
      setDeleteMaterialId(null);
    }
  }, [deleteMaterialId, router]);

  const handleApprove = useCallback((materialId: string) => {
    const material = materials.find((m) => m.id === materialId);
    if (material) {
      setApprovalMaterial(material);
      setApprovalAction("approve");
      setApprovalDialogOpen(true);
    }
  }, [materials]);

  const handleReject = useCallback((materialId: string) => {
    const material = materials.find((m) => m.id === materialId);
    if (material) {
      setApprovalMaterial(material);
      setApprovalAction("reject");
      setApprovalDialogOpen(true);
    }
  }, [materials]);

  if (materials.length === 0 && scopeItems.length === 0) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GradientIcon icon={<PackageIcon className="size-5" />} color="teal" size="default" />
            <div>
              <h3 className="text-lg font-medium">Materials</h3>
              <p className="text-sm text-muted-foreground">
                No scope items yet
              </p>
            </div>
          </div>
        </div>

        <EmptyState
          icon={<PackageIcon className="size-6" />}
          title="No scope items yet"
          description="Add scope items first to start tracking materials."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with inline stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GradientIcon icon={<PackageIcon className="size-5" />} color="teal" size="default" />
          <div>
            <h3 className="text-lg font-medium">Materials</h3>
            <p className="text-sm text-muted-foreground">
              {stats.total} material{stats.total !== 1 ? "s" : ""}
              {!isClient && stats.total > 0 && (
                <>
                  {" "}({stats.pending > 0 && <span className="text-amber-600">{stats.pending} pending</span>}
                  {stats.pending > 0 && stats.approved > 0 && ", "}
                  {stats.approved > 0 && <span className="text-emerald-600">{stats.approved} approved</span>}
                  {(stats.pending > 0 || stats.approved > 0) && stats.rejected > 0 && ", "}
                  {stats.rejected > 0 && <span className="text-rose-600">{stats.rejected} rejected</span>})
                </>
              )}
              {isClient && stats.pending > 0 && (
                <span className="text-amber-600"> ({stats.pending} awaiting your review)</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {canManageMaterials && (
            <>
              <MaterialsTemplateButton projectCode={projectCode} />
              <MaterialsExcelImport projectId={projectId} projectCode={projectCode} />
            </>
          )}
          <MaterialsExcelExport
            materials={materials.map((m) => ({
              material_code: m.material_code,
              name: m.name,
              specification: m.specification,
              supplier: m.supplier,
              status: m.status,
              assignedItemsCount: m.assignedItemsCount,
            }))}
            projectCode={projectCode}
            projectName={projectName}
          />
          {canManageMaterials && (
            <Button
              onClick={handleAddMaterial}
              className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700"
            >
              <PlusIcon className="size-4" />
              Add Material
            </Button>
          )}
        </div>
      </div>

      {/* Materials List */}
      {materials.length > 0 ? (
        <div className="space-y-3">
          {materials.map((material) => (
            <MaterialCard
              key={material.id}
              material={material}
              onEdit={canManageMaterials ? handleEditMaterial : undefined}
              onDelete={canManageMaterials ? handleDeleteClick : undefined}
              onApprove={canApproveMaterials ? handleApprove : undefined}
              onReject={canApproveMaterials ? handleReject : undefined}
              disabled={isLoading}
            />
          ))}
        </div>
      ) : (
        <GlassCard className="p-8">
          <EmptyState
            icon={<PackageIcon className="size-6" />}
            title="No materials yet"
            description={isClient
              ? "No materials added to this project yet."
              : "No materials added yet. Add materials to track approvals."}
            action={canManageMaterials ? (
              <Button
                onClick={handleAddMaterial}
                className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700"
              >
                <PlusIcon className="size-4" />
                Add First Material
              </Button>
            ) : undefined}
          />
        </GlassCard>
      )}

      {/* Material Sheet (slide-out drawer) - only mount when open */}
      {formDialogOpen && (
        <MaterialSheet
          projectId={projectId}
          scopeItems={scopeItems}
          open={formDialogOpen}
          onOpenChange={setFormDialogOpen}
          editMaterial={editMaterial ? {
            id: editMaterial.id,
            material_code: editMaterial.material_code,
            name: editMaterial.name,
            specification: editMaterial.specification,
            supplier: editMaterial.supplier,
            images: editMaterial.images,
            assignedItemIds: editMaterial.assignedItemIds,
          } : null}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Material</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this material? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approval Dialog */}
      {approvalMaterial && (
        <MaterialApproval
          materialId={approvalMaterial.id}
          materialName={approvalMaterial.name}
          action={approvalAction}
          open={approvalDialogOpen}
          onOpenChange={setApprovalDialogOpen}
        />
      )}
    </div>
  );
}
