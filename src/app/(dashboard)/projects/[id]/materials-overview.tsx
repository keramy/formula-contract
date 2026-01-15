"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertTriangleIcon,
} from "lucide-react";
import { MaterialCard, type Material } from "@/components/materials/material-card";
import { MaterialFormDialog } from "@/components/materials/material-form-dialog";
import { MaterialApproval } from "@/components/materials/material-approval";
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

  // Calculate stats - PM workflow (no "awaiting client")
  const stats = {
    total: materials.length,
    pending: materials.filter((m) => m.status === "pending").length,
    approved: materials.filter((m) => m.status === "approved").length,
    rejected: materials.filter((m) => m.status === "rejected").length,
  };

  const handleAddMaterial = () => {
    setEditMaterial(null);
    setFormDialogOpen(true);
  };

  const handleEditMaterial = (material: Material) => {
    const fullMaterial = materials.find((m) => m.id === material.id);
    if (fullMaterial) {
      setEditMaterial(fullMaterial);
      setFormDialogOpen(true);
    }
  };

  const handleDeleteClick = (materialId: string) => {
    setDeleteMaterialId(materialId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
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
  };

  const handleApprove = (materialId: string) => {
    const material = materials.find((m) => m.id === materialId);
    if (material) {
      setApprovalMaterial(material);
      setApprovalAction("approve");
      setApprovalDialogOpen(true);
    }
  };

  const handleReject = (materialId: string) => {
    const material = materials.find((m) => m.id === materialId);
    if (material) {
      setApprovalMaterial(material);
      setApprovalAction("reject");
      setApprovalDialogOpen(true);
    }
  };

  if (materials.length === 0 && scopeItems.length === 0) {
    return (
      <GlassCard>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GradientIcon icon={<PackageIcon className="size-4" />} color="teal" size="sm" />
            Materials
          </CardTitle>
          <CardDescription>Track material selections and approvals</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<PackageIcon className="size-6" />}
            title="No scope items yet"
            description="Add scope items first to start tracking materials."
          />
        </CardContent>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Excel buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GradientIcon icon={<PackageIcon className="size-4" />} color="teal" size="sm" />
          <div>
            <h3 className="text-lg font-medium">Materials</h3>
            <p className="text-sm text-muted-foreground">
              {materials.length} material{materials.length !== 1 ? "s" : ""} in this project
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

      {/* Stats Cards - Updated for PM workflow */}
      <div className="grid grid-cols-4 gap-4">
        <GlassCard hover="lift" className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <GradientIcon icon={<PackageIcon className="size-3.5" />} color="teal" size="sm" />
            <span className="text-xs font-medium">Total</span>
          </div>
          <p className="text-2xl font-bold">{stats.total}</p>
        </GlassCard>

        <GlassCard hover="lift" className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <GradientIcon icon={<ClockIcon className="size-3.5" />} color="amber" size="sm" />
            <span className="text-xs font-medium">Pending</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
        </GlassCard>

        <GlassCard hover="lift" className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <GradientIcon icon={<CheckCircleIcon className="size-3.5" />} color="emerald" size="sm" />
            <span className="text-xs font-medium">Approved</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{stats.approved}</p>
        </GlassCard>

        <GlassCard hover="lift" className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <GradientIcon icon={<XCircleIcon className="size-3.5" />} color="rose" size="sm" />
            <span className="text-xs font-medium">Rejected</span>
          </div>
          <p className="text-2xl font-bold text-rose-600">{stats.rejected}</p>
        </GlassCard>
      </div>

      {/* Pending notice - remind PM to review */}
      {stats.pending > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangleIcon className="size-5 text-amber-500" />
            <span className="font-medium text-amber-700">
              {stats.pending} material{stats.pending !== 1 ? "s" : ""} pending approval
            </span>
          </div>
        </div>
      )}

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

      {/* Form Dialog */}
      <MaterialFormDialog
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
