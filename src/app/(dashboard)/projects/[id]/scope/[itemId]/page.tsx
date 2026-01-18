import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GlassCard, GradientIcon, StatusBadge } from "@/components/ui/ui-helpers";
import {
  ArrowLeftIcon,
  PencilIcon,
  FactoryIcon,
  ShoppingCartIcon,
  FileIcon,
  ImageIcon,
  PackageIcon,
  RulerIcon,
  DollarSignIcon,
  CheckCircle2Icon,
  TruckIcon,
  StickyNoteIcon,
  GitBranchIcon,
  ExternalLinkIcon,
} from "lucide-react";
import { DrawingUpload, DrawingsList, DrawingApproval } from "@/components/drawings";
import { ProductionProgressEditor, InstallationStatusEditor, ProcurementStatusEditor } from "@/components/scope-items";
import { ItemMaterialsSection } from "@/components/materials";
import { ScopeItemHeader } from "./scope-item-header";
import type { ProcurementStatus } from "@/types/database";

interface ScopeItem {
  id: string;
  item_code: string;
  name: string;
  description: string | null;
  width: number | null;
  depth: number | null;
  height: number | null;
  unit: string;
  quantity: number;
  // Cost tracking fields (what WE pay)
  unit_cost: number | null;
  initial_total_cost: number | null;
  // Sales price fields (what CLIENT pays)
  unit_sales_price: number | null;
  total_sales_price: number | null;
  item_path: "production" | "procurement";
  status: string;
  notes: string | null;
  production_percentage: number;
  procurement_status: ProcurementStatus | null;
  is_installed: boolean;
  installed_at: string | null;
  images: string[] | null;
  parent_id: string | null; // References parent item when created via split
  project: {
    id: string;
    name: string;
    project_code: string;
    currency: string;
  };
}

// Parent/child item info for display
interface RelatedItem {
  id: string;
  item_code: string;
  name: string;
  item_path: "production" | "procurement";
  status: string;
}

interface Drawing {
  id: string;
  status: string;
  current_revision: string | null;
  sent_to_client_at: string | null;
  client_response_at: string | null;
  client_comments: string | null;
  pm_override: boolean;
  pm_override_reason: string | null;
  approved_by: {
    name: string;
  } | null;
  pm_override_by: {
    name: string;
  } | null;
}

interface DrawingRevision {
  id: string;
  revision: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
  cad_file_url: string | null;
  cad_file_name: string | null;
  notes: string | null;
  created_at: string;
  uploaded_by: string | null;
}

interface Material {
  id: string;
  material_code: string;
  name: string;
  specification: string | null;
  supplier: string | null;
  images: string[] | null;
  status: string;
}

type StatusVariant = "info" | "success" | "warning" | "default" | "danger";

const statusConfig: Record<string, { variant: StatusVariant; label: string }> = {
  pending: { variant: "default", label: "Pending" },
  in_design: { variant: "info", label: "In Design" },
  awaiting_approval: { variant: "warning", label: "Awaiting Approval" },
  approved: { variant: "success", label: "Approved" },
  in_production: { variant: "info", label: "In Production" },
  complete: { variant: "success", label: "Complete" },
  on_hold: { variant: "warning", label: "On Hold" },
  cancelled: { variant: "danger", label: "Cancelled" },
};

const drawingStatusConfig: Record<string, { variant: StatusVariant; label: string }> = {
  not_uploaded: { variant: "default", label: "Not Uploaded" },
  uploaded: { variant: "info", label: "Uploaded" },
  sent_to_client: { variant: "warning", label: "Sent to Client" },
  approved: { variant: "success", label: "Approved" },
  rejected: { variant: "danger", label: "Rejected" },
  approved_with_comments: { variant: "success", label: "Approved with Comments" },
};

const currencySymbols: Record<string, string> = {
  TRY: "₺",
  USD: "$",
  EUR: "€",
};

export default async function ScopeItemDetailPage({
  params,
}: {
  params: Promise<{ id: string; itemId: string }>;
}) {
  const { id: projectId, itemId } = await params;
  const supabase = await createClient();

  // Get current user and role
  const { data: { user } } = await supabase.auth.getUser();
  let userRole = "pm";
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile) {
      userRole = profile.role;
    }
  }

  // For client users, verify they have access to this project
  if (userRole === "client" && user) {
    const { data: assignment } = await supabase
      .from("project_assignments")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .single();

    if (!assignment) {
      notFound(); // Client doesn't have access to this project
    }
  }

  // Role-based permissions
  const canEdit = ["admin", "pm"].includes(userRole);
  const canUploadDrawings = ["admin", "pm", "production", "client"].includes(userRole); // Clients can upload drawings
  const canApproveDrawings = ["admin", "pm", "client"].includes(userRole); // Clients can approve drawings
  const canEditProgress = ["admin", "pm", "production"].includes(userRole);
  const canManageMaterials = ["admin", "pm"].includes(userRole);
  const canToggleInstallation = ["admin", "pm"].includes(userRole);
  const canEditProcurement = ["admin", "pm", "procurement"].includes(userRole);

  // Fetch scope item with project info
  const { data, error } = await supabase
    .from("scope_items")
    .select(`
      id, item_code, name, description, width, depth, height, unit, quantity,
      unit_cost, initial_total_cost, unit_sales_price, total_sales_price,
      item_path, status, notes, production_percentage,
      procurement_status, is_installed, installed_at, images, parent_id,
      project:projects(id, name, project_code, currency)
    `)
    .eq("id", itemId)
    .eq("project_id", projectId)
    .eq("is_deleted", false)
    .single();

  const scopeItem = data as ScopeItem | null;

  if (error || !scopeItem) {
    notFound();
  }

  // Fetch parent item if this is a child (has parent_id)
  let parentItem: RelatedItem | null = null;
  if (scopeItem.parent_id) {
    const { data: parentData } = await supabase
      .from("scope_items")
      .select("id, item_code, name, item_path, status")
      .eq("id", scopeItem.parent_id)
      .eq("is_deleted", false)
      .single();

    if (parentData) {
      parentItem = parentData as RelatedItem;
    }
  }

  // Fetch child items if this item has children
  const { data: childrenData } = await supabase
    .from("scope_items")
    .select("id, item_code, name, item_path, status")
    .eq("parent_id", itemId)
    .eq("is_deleted", false)
    .order("item_code", { ascending: true });

  const childItems = (childrenData || []) as RelatedItem[];

  // Fetch drawing and revisions if this is a production item
  let drawing: Drawing | null = null;
  let revisions: DrawingRevision[] = [];

  if (scopeItem.item_path === "production") {
    const { data: drawingData } = await supabase
      .from("drawings")
      .select(`
        id, status, current_revision, sent_to_client_at, client_response_at,
        client_comments, pm_override, pm_override_reason,
        approved_by:users!drawings_approved_by_fkey(name),
        pm_override_by:users!drawings_pm_override_by_fkey(name)
      `)
      .eq("item_id", itemId)
      .single();

    drawing = drawingData as Drawing | null;

    if (drawing) {
      const { data: revisionsData } = await supabase
        .from("drawing_revisions")
        .select(`
          id, revision, file_url, file_name, file_size,
          cad_file_url, cad_file_name, notes, created_at,
          uploaded_by
        `)
        .eq("drawing_id", drawing.id)
        .order("created_at", { ascending: false });

      revisions = (revisionsData || []) as DrawingRevision[];
    }
  }

  // Fetch materials assigned to this item
  const { data: itemMaterialsData } = await supabase
    .from("item_materials")
    .select("material_id")
    .eq("item_id", itemId);

  const assignedMaterialIds = (itemMaterialsData || []).map((im) => im.material_id);

  // Fetch all materials in this project
  const { data: allMaterialsData } = await supabase
    .from("materials")
    .select("id, material_code, name, specification, supplier, images, status")
    .eq("project_id", projectId)
    .eq("is_deleted", false)
    .order("material_code");

  const allMaterials = (allMaterialsData || []) as Material[];

  // Split into assigned and available
  const assignedMaterials = allMaterials.filter((m) => assignedMaterialIds.includes(m.id));
  const availableMaterials = allMaterials.filter((m) => !assignedMaterialIds.includes(m.id));

  const formatCurrency = (value: number | null, currency: string) => {
    if (!value) return "-";
    const symbol = currencySymbols[currency] || currency;
    return `${symbol}${new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)}`;
  };

  const itemStatusConfig = statusConfig[scopeItem.status] || { variant: "default" as StatusVariant, label: scopeItem.status };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50/50 via-white to-gray-50/50 p-6">
      {/* Header */}
      <ScopeItemHeader
        projectId={projectId}
        projectName={scopeItem.project.name}
        itemId={itemId}
        itemName={scopeItem.name}
        itemCode={scopeItem.item_code}
        itemPath={scopeItem.item_path}
        status={scopeItem.status}
        statusLabel={itemStatusConfig.label}
        statusVariant={itemStatusConfig.variant}
        canEdit={canEdit}
      />

      {/* Compact Single Column Layout */}
      <div className="max-w-4xl space-y-4">
        {/* Parent/Child Relationship Section */}
        {(parentItem || childItems.length > 0) && (
          <GlassCard className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <GradientIcon icon={<GitBranchIcon className="size-3.5" />} color="violet" size="sm" />
              <span className="text-sm font-medium">Related Items</span>
            </div>
            <div className="space-y-3">
              {/* Show parent if this is a child item */}
              {parentItem && (
                <div className="p-3 rounded-lg bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Parent Item</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-violet-700 dark:text-violet-300">{parentItem.item_code}</span>
                      <span className="text-sm font-medium">{parentItem.name}</span>
                      <div className="flex items-center gap-1">
                        {parentItem.item_path === "production" ? (
                          <FactoryIcon className="size-3 text-purple-500" />
                        ) : (
                          <ShoppingCartIcon className="size-3 text-blue-500" />
                        )}
                        <span className="text-xs text-muted-foreground capitalize">{parentItem.item_path}</span>
                      </div>
                    </div>
                    <Link
                      href={`/projects/${projectId}/scope/${parentItem.id}`}
                      className="inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 hover:underline"
                    >
                      View
                      <ExternalLinkIcon className="size-3" />
                    </Link>
                  </div>
                </div>
              )}

              {/* Show children if this is a parent item */}
              {childItems.length > 0 && (
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Split Items ({childItems.length})</p>
                  <div className="space-y-2">
                    {childItems.map((child) => (
                      <div key={child.id} className="flex items-center justify-between p-2 rounded bg-white/50 dark:bg-gray-900/20">
                        <div className="flex items-center gap-2">
                          <span className="text-violet-400">⤷</span>
                          <span className="font-mono text-sm text-blue-700 dark:text-blue-300">{child.item_code}</span>
                          <span className="text-sm">{child.name}</span>
                          <div className="flex items-center gap-1">
                            {child.item_path === "production" ? (
                              <FactoryIcon className="size-3 text-purple-500" />
                            ) : (
                              <ShoppingCartIcon className="size-3 text-blue-500" />
                            )}
                            <span className="text-xs text-muted-foreground capitalize">{child.item_path}</span>
                          </div>
                        </div>
                        <Link
                          href={`/projects/${projectId}/scope/${child.id}`}
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          View
                          <ExternalLinkIcon className="size-3" />
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        )}

        {/* Progress & Pricing Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Progress */}
          <GlassCard className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <GradientIcon icon={<FactoryIcon className="size-3.5" />} color="violet" size="sm" />
              <span className="text-sm font-medium">Production Progress</span>
            </div>
            <ProductionProgressEditor
              scopeItemId={scopeItem.id}
              initialValue={scopeItem.production_percentage}
            />
          </GlassCard>

          {/* Cost & Pricing */}
          <GlassCard className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <GradientIcon icon={<DollarSignIcon className="size-3.5" />} color="teal" size="sm" />
              <span className="text-sm font-medium">Cost & Pricing</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quantity</span>
                <span className="font-medium">{scopeItem.quantity} {scopeItem.unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Unit Cost (Our Cost)</span>
                <span className="font-mono">{formatCurrency(scopeItem.unit_cost, scopeItem.project.currency)}</span>
              </div>
              {scopeItem.initial_total_cost !== null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Initial Cost (Locked)</span>
                  <span className="font-mono text-gray-500">{formatCurrency(scopeItem.initial_total_cost, scopeItem.project.currency)}</span>
                </div>
              )}
              <div className="border-t pt-2" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Unit Sales Price</span>
                <span className="font-mono">{formatCurrency(scopeItem.unit_sales_price, scopeItem.project.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Total Sales Price</span>
                <span className="font-semibold font-mono text-teal-700">{formatCurrency(scopeItem.total_sales_price, scopeItem.project.currency)}</span>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Dimensions & Installation Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Dimensions */}
          <GlassCard className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <GradientIcon icon={<RulerIcon className="size-3.5" />} color="amber" size="sm" />
              <span className="text-sm font-medium">Dimensions</span>
            </div>
            <div className="flex gap-4 text-sm">
              <span><span className="text-muted-foreground">W:</span> <span className="font-medium">{scopeItem.width ? `${scopeItem.width}cm` : "-"}</span></span>
              <span><span className="text-muted-foreground">D:</span> <span className="font-medium">{scopeItem.depth ? `${scopeItem.depth}cm` : "-"}</span></span>
              <span><span className="text-muted-foreground">H:</span> <span className="font-medium">{scopeItem.height ? `${scopeItem.height}cm` : "-"}</span></span>
            </div>
          </GlassCard>

          {/* Installation Status */}
          <GlassCard className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <GradientIcon icon={<CheckCircle2Icon className="size-3.5" />} color="emerald" size="sm" />
              <span className="text-sm font-medium">Installation Status</span>
            </div>
            <InstallationStatusEditor
              scopeItemId={scopeItem.id}
              isInstalled={scopeItem.is_installed}
              installedAt={scopeItem.installed_at}
              readOnly={!canToggleInstallation}
            />
          </GlassCard>
        </div>

        {/* Procurement Status - Only for procurement items */}
        {scopeItem.item_path === "procurement" && (
          <GlassCard className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <GradientIcon icon={<TruckIcon className="size-3.5" />} color="sky" size="sm" />
              <span className="text-sm font-medium">Procurement Status</span>
            </div>
            <ProcurementStatusEditor
              scopeItemId={scopeItem.id}
              currentStatus={scopeItem.procurement_status}
              readOnly={!canEditProcurement}
            />
          </GlassCard>
        )}

        {/* Images */}
        {scopeItem.images && scopeItem.images.length > 0 && (
          <GlassCard className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <GradientIcon icon={<ImageIcon className="size-3.5" />} color="rose" size="sm" />
              <span className="text-sm font-medium">Images</span>
              <span className="text-xs text-muted-foreground">({scopeItem.images.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {scopeItem.images.map((url, index) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative size-24 rounded-lg overflow-hidden border-2 border-white shadow-md hover:shadow-lg hover:scale-105 transition-all"
                >
                  <Image
                    src={url}
                    alt={`${scopeItem.name} image ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </a>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Drawings Section - Prominent for Production Items */}
        {scopeItem.item_path === "production" && (
          <GlassCard>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GradientIcon icon={<FileIcon className="size-3.5" />} color="sky" size="sm" />
                  <CardTitle className="text-sm font-medium">Drawings</CardTitle>
                  {drawing && (
                    <StatusBadge
                      variant={drawingStatusConfig[drawing.status]?.variant || "default"}
                    >
                      {drawingStatusConfig[drawing.status]?.label || drawing.status}
                    </StatusBadge>
                  )}
                </div>
                {canUploadDrawings && (
                  <DrawingUpload
                    scopeItemId={itemId}
                    currentRevision={drawing?.current_revision || null}
                    hasDrawing={!!drawing}
                  />
                )}
              </div>
              <CardDescription className="text-xs">
                {drawing
                  ? `Current revision: ${drawing.current_revision} • ${revisions.length} revision(s)`
                  : "Upload technical drawings for client approval"}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-3">
              {/* Approval Actions */}
              {drawing && canApproveDrawings && (
                <DrawingApproval
                  drawingId={drawing.id}
                  drawingStatus={drawing.status}
                  currentRevision={drawing.current_revision}
                  scopeItemId={itemId}
                  userRole={userRole}
                  projectId={projectId}
                  itemCode={scopeItem.item_code}
                />
              )}

              {/* Approved By Info */}
              {drawing?.approved_by && (drawing.status === "approved" || drawing.status === "approved_with_comments") && !drawing.pm_override && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <p className="text-xs font-medium text-emerald-700">
                    ✓ Approved by {drawing.approved_by.name}
                  </p>
                </div>
              )}

              {/* Client Comments */}
              {drawing?.client_comments && (
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-xs font-medium mb-1">Client Comments</p>
                  <p className="text-xs text-muted-foreground">{drawing.client_comments}</p>
                </div>
              )}

              {/* PM Override Notice */}
              {drawing?.pm_override && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-xs font-medium text-amber-700">
                    ⚠ PM Override by {drawing.pm_override_by?.name || "Unknown"}
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    {drawing.pm_override_reason}
                  </p>
                </div>
              )}

              <DrawingsList
                revisions={revisions}
                currentRevision={drawing?.current_revision || null}
              />
            </CardContent>
          </GlassCard>
        )}

        {/* Materials Section */}
        <ItemMaterialsSection
          scopeItemId={itemId}
          projectId={scopeItem.project.id}
          assignedMaterials={assignedMaterials}
          availableMaterials={availableMaterials}
        />

        {/* Description & Notes Combined */}
        {(scopeItem.description || scopeItem.notes) && (
          <GlassCard className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <GradientIcon icon={<StickyNoteIcon className="size-3.5" />} color="slate" size="sm" />
              <span className="text-sm font-medium">Details</span>
            </div>
            <div className="space-y-3">
              {scopeItem.description && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                  <p className="text-sm">{scopeItem.description}</p>
                </div>
              )}
              {scopeItem.notes && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{scopeItem.notes}</p>
                </div>
              )}
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
