import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeftIcon,
  PencilIcon,
  FactoryIcon,
  ShoppingCartIcon,
  FileIcon,
  ImageIcon,
} from "lucide-react";
import { DrawingUpload, DrawingsList, DrawingApproval } from "@/components/drawings";
import { ProductionProgressEditor, InstallationStatusEditor, ProcurementStatusEditor } from "@/components/scope-items";
import { ItemMaterialsSection } from "@/components/materials";
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
  unit_price: number | null;
  total_price: number | null;
  item_path: "production" | "procurement";
  status: string;
  notes: string | null;
  production_percentage: number;
  procurement_status: ProcurementStatus | null;
  is_installed: boolean;
  installed_at: string | null;
  images: string[] | null;
  project: {
    id: string;
    name: string;
    project_code: string;
    currency: string;
  };
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

const statusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  in_design: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  awaiting_approval: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  in_production: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  complete: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  on_hold: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  in_design: "In Design",
  awaiting_approval: "Awaiting Approval",
  approved: "Approved",
  in_production: "In Production",
  complete: "Complete",
  on_hold: "On Hold",
  cancelled: "Cancelled",
};

const drawingStatusColors: Record<string, string> = {
  not_uploaded: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  uploaded: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  sent_to_client: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  approved_with_comments: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const drawingStatusLabels: Record<string, string> = {
  not_uploaded: "Not Uploaded",
  uploaded: "Uploaded",
  sent_to_client: "Sent to Client",
  approved: "Approved",
  rejected: "Rejected",
  approved_with_comments: "Approved with Comments",
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
      unit_price, total_price, item_path, status, notes, production_percentage,
      procurement_status, is_installed, installed_at, images,
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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild className="mb-3 -ml-2">
          <Link href={`/projects/${projectId}`}>
            <ArrowLeftIcon className="size-4" />
            Back to {scopeItem.project.name}
          </Link>
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-semibold text-foreground">{scopeItem.name}</h1>
              <Badge variant="secondary" className={statusColors[scopeItem.status]}>
                {statusLabels[scopeItem.status] || scopeItem.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono">{scopeItem.item_code}</span>
              <span>•</span>
              <div className="flex items-center gap-1">
                {scopeItem.item_path === "production" ? (
                  <FactoryIcon className="size-3.5 text-purple-500" />
                ) : (
                  <ShoppingCartIcon className="size-3.5 text-blue-500" />
                )}
                <span className="capitalize">{scopeItem.item_path}</span>
              </div>
            </div>
          </div>
          {canEdit && (
            <Button size="sm" asChild>
              <Link href={`/projects/${projectId}/scope/${itemId}/edit`}>
                <PencilIcon className="size-4" />
                Edit
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Compact Single Column Layout */}
      <div className="max-w-4xl space-y-4">
        {/* Progress & Pricing Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Progress */}
          <Card className="p-4">
            <ProductionProgressEditor
              scopeItemId={scopeItem.id}
              initialValue={scopeItem.production_percentage}
            />
          </Card>

          {/* Pricing */}
          <Card className="p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quantity</span>
                <span className="font-medium">{scopeItem.quantity} {scopeItem.unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Unit Price</span>
                <span className="font-mono">{formatCurrency(scopeItem.unit_price, scopeItem.project.currency)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="font-medium">Total</span>
                <span className="font-semibold font-mono">{formatCurrency(scopeItem.total_price, scopeItem.project.currency)}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Dimensions & Installation Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Dimensions */}
          <Card className="p-4">
            <div className="flex items-center gap-6 text-sm">
              <span className="text-muted-foreground font-medium">Dimensions:</span>
              <div className="flex gap-4">
                <span><span className="text-muted-foreground">W:</span> {scopeItem.width ? `${scopeItem.width}cm` : "-"}</span>
                <span><span className="text-muted-foreground">D:</span> {scopeItem.depth ? `${scopeItem.depth}cm` : "-"}</span>
                <span><span className="text-muted-foreground">H:</span> {scopeItem.height ? `${scopeItem.height}cm` : "-"}</span>
              </div>
            </div>
          </Card>

          {/* Installation Status */}
          <Card className="p-4">
            <div className="text-sm font-medium text-muted-foreground mb-2">Installation Status</div>
            <InstallationStatusEditor
              scopeItemId={scopeItem.id}
              isInstalled={scopeItem.is_installed}
              installedAt={scopeItem.installed_at}
              readOnly={!canToggleInstallation}
            />
          </Card>
        </div>

        {/* Procurement Status - Only for procurement items */}
        {scopeItem.item_path === "procurement" && (
          <Card className="p-4">
            <div className="text-sm font-medium text-muted-foreground mb-2">Procurement Status</div>
            <ProcurementStatusEditor
              scopeItemId={scopeItem.id}
              currentStatus={scopeItem.procurement_status}
              readOnly={!canEditProcurement}
            />
          </Card>
        )}

        {/* Images */}
        {scopeItem.images && scopeItem.images.length > 0 && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon className="size-4 text-muted-foreground" />
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
                  className="relative size-24 rounded-md overflow-hidden border bg-muted hover:opacity-90 transition-opacity"
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
          </Card>
        )}

        {/* Drawings Section - Prominent for Production Items */}
        {scopeItem.item_path === "production" && (
          <Card>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileIcon className="size-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium">Drawings</CardTitle>
                  {drawing && (
                    <Badge variant="secondary" className={drawingStatusColors[drawing.status]}>
                      {drawingStatusLabels[drawing.status] || drawing.status}
                    </Badge>
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
                <div className="p-2 rounded-md bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800">
                  <p className="text-xs font-medium text-green-800 dark:text-green-400">
                    Approved by {drawing.approved_by.name}
                  </p>
                </div>
              )}

              {/* Client Comments */}
              {drawing?.client_comments && (
                <div className="p-2 rounded-md bg-muted">
                  <p className="text-xs font-medium mb-1">Client Comments</p>
                  <p className="text-xs text-muted-foreground">{drawing.client_comments}</p>
                </div>
              )}

              {/* PM Override Notice */}
              {drawing?.pm_override && (
                <div className="p-2 rounded-md bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
                  <p className="text-xs font-medium text-yellow-800 dark:text-yellow-400">
                    PM Override by {drawing.pm_override_by?.name || "Unknown"}
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-500">
                    {drawing.pm_override_reason}
                  </p>
                </div>
              )}

              <DrawingsList
                revisions={revisions}
                currentRevision={drawing?.current_revision || null}
              />
            </CardContent>
          </Card>
        )}

        {/* Materials Section */}
        <ItemMaterialsSection
          scopeItemId={itemId}
          assignedMaterials={assignedMaterials}
          availableMaterials={availableMaterials}
        />

        {/* Description & Notes Combined */}
        {(scopeItem.description || scopeItem.notes) && (
          <Card className="p-4 space-y-3">
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
          </Card>
        )}
      </div>
    </div>
  );
}
