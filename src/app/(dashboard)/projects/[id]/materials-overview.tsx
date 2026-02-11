"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { deleteMaterial } from "@/lib/actions/materials";
import { toast } from "sonner";
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
  Clock3Icon,
  CheckCircle2Icon,
  XCircleIcon,
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

    try {
      const result = await deleteMaterial(deleteMaterialId, projectId);

      if (result.success) {
        toast.success("Material deleted");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete material");
        console.error("Delete material error:", result.error);
      }
    } catch (error) {
      toast.error("Failed to delete material");
      console.error("Failed to delete material:", error);
    } finally {
      setIsLoading(false);
      setDeleteDialogOpen(false);
      setDeleteMaterialId(null);
    }
  }, [deleteMaterialId, projectId, router]);

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
    <div className="space-y-3">
      {/* Header with compact mobile stats/actions */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <GradientIcon icon={<PackageIcon className="size-5" />} color="teal" size="default" />
          <div>
            <h3 className="text-lg font-medium">Materials</h3>
            <p className="text-sm text-muted-foreground">{stats.total} material{stats.total !== 1 ? "s" : ""}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-base-200 bg-base-50/70 p-1.5 md:hidden">
          <div className="rounded-md border border-base-200/80 bg-white px-2.5 py-1.5 dark:bg-base-950/40">
            <div className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <PackageIcon className="size-3 text-primary" />
              Total
            </div>
            <p className="mt-1 text-sm font-semibold leading-none text-primary">{stats.total}</p>
          </div>
          <div className="rounded-md border border-base-200/80 bg-white px-2.5 py-1.5 dark:bg-base-950/40">
            <div className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock3Icon className="size-3 text-amber-600" />
              Pending
            </div>
            <p className="mt-1 text-sm font-semibold leading-none text-amber-700">{stats.pending}</p>
          </div>
          {!isClient && (
            <>
              <div className="rounded-md border border-base-200/80 bg-white px-2.5 py-1.5 dark:bg-base-950/40">
                <div className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <CheckCircle2Icon className="size-3 text-emerald-600" />
                  Approved
                </div>
                <p className="mt-1 text-sm font-semibold leading-none text-emerald-700">{stats.approved}</p>
              </div>
              <div className="rounded-md border border-base-200/80 bg-white px-2.5 py-1.5 dark:bg-base-950/40">
                <div className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <XCircleIcon className="size-3 text-rose-600" />
                  Rejected
                </div>
                <p className="mt-1 text-sm font-semibold leading-none text-rose-700">{stats.rejected}</p>
              </div>
            </>
          )}
        </div>

        <div className="hidden text-sm text-muted-foreground md:block">
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
        </div>

        <div className="flex flex-wrap gap-1.5 md:gap-2">
          {canManageMaterials && (
            <>
              <MaterialsTemplateButton
                projectCode={projectCode}
                compact
                className="h-8 px-2.5 text-xs md:h-9 md:px-3 md:text-sm"
              />
              <MaterialsExcelImport
                projectId={projectId}
                projectCode={projectCode}
                compact
                className="h-8 px-2.5 text-xs md:h-9 md:px-3 md:text-sm"
              />
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
            compact
            className="h-8 px-2.5 text-xs md:h-9 md:px-3 md:text-sm"
          />
          {canManageMaterials && (
            <Button
              onClick={handleAddMaterial}
              size="sm"
              className="h-8 px-2.5 text-xs md:h-9 md:px-3 md:text-sm"
            >
              <PlusIcon className="size-4" />
              Add
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
