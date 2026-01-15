"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
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
import { GlassCard, GradientIcon, StatusBadge, EmptyState } from "@/components/ui/ui-helpers";
import {
  AlertTriangleIcon,
  PlusIcon,
  CheckCircleIcon,
  ClockIcon,
  ImageIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  BugIcon,
} from "lucide-react";
import { format } from "date-fns";
import { SnaggingFormDialog } from "./snagging-form-dialog";

interface ScopeItem {
  id: string;
  item_code: string;
  name: string;
}

interface Snagging {
  id: string;
  project_id: string;
  item_id: string | null;
  description: string;
  photos: string[] | null;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_by: string | null;
  created_at: string;
  item?: {
    item_code: string;
    name: string;
  } | null;
  creator?: {
    name: string;
  } | null;
  resolver?: {
    name: string;
  } | null;
}

interface SnaggingOverviewProps {
  projectId: string;
  snaggingItems: Snagging[];
  scopeItems: ScopeItem[];
}

export function SnaggingOverview({
  projectId,
  snaggingItems,
  scopeItems,
}: SnaggingOverviewProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Snagging | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolveItem, setResolveItem] = useState<Snagging | null>(null);

  // Stats
  const stats = {
    total: snaggingItems.length,
    open: snaggingItems.filter((s) => !s.is_resolved).length,
    resolved: snaggingItems.filter((s) => s.is_resolved).length,
  };

  const handleAdd = () => {
    setEditItem(null);
    setFormDialogOpen(true);
  };

  const handleEdit = (item: Snagging) => {
    setEditItem(item);
    setFormDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteItemId(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteItemId) return;

    setIsLoading(true);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from("snagging")
        .delete()
        .eq("id", deleteItemId);

      if (error) throw error;
      router.refresh();
    } catch (error) {
      console.error("Failed to delete snagging item:", error);
    } finally {
      setIsLoading(false);
      setDeleteDialogOpen(false);
      setDeleteItemId(null);
    }
  };

  const handleResolveClick = (item: Snagging) => {
    setResolveItem(item);
    setResolveDialogOpen(true);
  };

  const handleResolveConfirm = async () => {
    if (!resolveItem) return;

    setIsLoading(true);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from("snagging")
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", resolveItem.id);

      if (error) throw error;
      router.refresh();
    } catch (error) {
      console.error("Failed to resolve snagging item:", error);
    } finally {
      setIsLoading(false);
      setResolveDialogOpen(false);
      setResolveItem(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GradientIcon icon={<BugIcon className="size-5" />} color="rose" size="default" />
          <div>
            <h3 className="text-lg font-medium">Snagging / Defects</h3>
            <p className="text-sm text-muted-foreground">
              Track and resolve quality issues
            </p>
          </div>
        </div>
        <Button
          onClick={handleAdd}
          className="bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600"
        >
          <PlusIcon className="size-4" />
          Report Issue
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <GlassCard hover="lift" className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-slate-500/10 to-gray-500/10">
              <BugIcon className="size-3.5 text-slate-600" />
            </div>
            <span className="text-xs font-medium">Total Issues</span>
          </div>
          <p className="text-2xl font-bold">{stats.total}</p>
        </GlassCard>

        <GlassCard hover="lift" className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500/10 to-yellow-500/10">
              <ClockIcon className="size-3.5 text-amber-600" />
            </div>
            <span className="text-xs font-medium">Open</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{stats.open}</p>
        </GlassCard>

        <GlassCard hover="lift" className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/10">
              <CheckCircleIcon className="size-3.5 text-emerald-600" />
            </div>
            <span className="text-xs font-medium">Resolved</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{stats.resolved}</p>
        </GlassCard>
      </div>

      {/* Open Issues Alert */}
      {stats.open > 0 && (
        <GlassCard className="p-4 border-amber-200 bg-amber-50/80 dark:bg-amber-900/10 dark:border-amber-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20">
              <AlertTriangleIcon className="size-4 text-amber-600" />
            </div>
            <span className="font-medium text-amber-700 dark:text-amber-400">
              {stats.open} open issue{stats.open !== 1 ? "s" : ""} requiring attention
            </span>
          </div>
        </GlassCard>
      )}

      {/* Items List */}
      {snaggingItems.length > 0 ? (
        <div className="space-y-3">
          {snaggingItems.map((item) => (
            <GlassCard key={item.id} className={`p-4 ${item.is_resolved ? "opacity-60" : ""}`}>
              <div className="flex gap-4">
                {/* Photo thumbnail */}
                <div className="shrink-0">
                  {item.photos && item.photos.length > 0 ? (
                    <div className="relative size-16 rounded-lg overflow-hidden bg-muted ring-1 ring-black/5">
                      <Image
                        src={item.photos[0]}
                        alt="Issue photo"
                        fill
                        className="object-cover"
                      />
                      {item.photos.length > 1 && (
                        <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded-md font-medium">
                          +{item.photos.length - 1}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="size-16 rounded-lg bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center ring-1 ring-black/5">
                      <ImageIcon className="size-6 text-slate-400" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge variant={item.is_resolved ? "success" : "danger"}>
                        {item.is_resolved ? "Resolved" : "Open"}
                      </StatusBadge>
                      {item.item && (
                        <span className="text-xs text-muted-foreground font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                          {item.item.item_code}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(item.created_at), "MMM d, yyyy")}
                    </span>
                  </div>

                  <p className="text-sm mb-2">{item.description}</p>

                  {item.item && (
                    <p className="text-xs text-muted-foreground mb-2">
                      Related to: {item.item.name}
                    </p>
                  )}

                  {item.is_resolved && item.resolution_notes && (
                    <div className="p-2.5 rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 mb-2 ring-1 ring-emerald-200/50">
                      <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        Resolution: {item.resolution_notes}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {!item.is_resolved && (
                      <Button
                        size="sm"
                        onClick={() => handleResolveClick(item)}
                        disabled={isLoading}
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
                      >
                        <CheckIcon className="size-3 mr-1" />
                        Resolve
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(item)}
                      disabled={isLoading}
                    >
                      <PencilIcon className="size-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteClick(item.id)}
                      disabled={isLoading}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    >
                      <TrashIcon className="size-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<BugIcon className="size-6" />}
          title="No issues reported"
          description="No snagging items reported yet. Report issues as they arise during production or installation."
          action={
            <Button
              onClick={handleAdd}
              className="bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600"
            >
              <PlusIcon className="size-4" />
              Report First Issue
            </Button>
          }
        />
      )}

      {/* Form Dialog */}
      <SnaggingFormDialog
        projectId={projectId}
        scopeItems={scopeItems}
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        editItem={editItem}
      />

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Issue</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this snagging item? This action cannot be undone.
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

      {/* Resolve Dialog */}
      <AlertDialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resolve Issue</AlertDialogTitle>
            <AlertDialogDescription>
              Mark this issue as resolved? This indicates the defect has been fixed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResolveConfirm}
              disabled={isLoading}
            >
              Mark as Resolved
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
