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
import { Spinner } from "@/components/ui/spinner";
import {
  PlusIcon,
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

type FilterType = "all" | "open" | "resolved";

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
  const [filter, setFilter] = useState<FilterType>("all");

  // Stats
  const stats = {
    total: snaggingItems.length,
    open: snaggingItems.filter((s) => !s.is_resolved).length,
    resolved: snaggingItems.filter((s) => s.is_resolved).length,
  };

  // Filter items based on selected filter
  const filteredItems = snaggingItems.filter((item) => {
    if (filter === "open") return !item.is_resolved;
    if (filter === "resolved") return item.is_resolved;
    return true;
  });

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
      {/* Header with inline stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GradientIcon icon={<BugIcon className="size-5" />} color="rose" size="default" />
          <div>
            <h3 className="text-lg font-medium">Snagging / Defects</h3>
            <p className="text-sm text-muted-foreground">
              {stats.total} issue{stats.total !== 1 ? "s" : ""}
              {stats.total > 0 && (
                <>
                  {" "}({stats.open > 0 && <span className="text-amber-600">{stats.open} open</span>}
                  {stats.open > 0 && stats.resolved > 0 && ", "}
                  {stats.resolved > 0 && <span className="text-emerald-600">{stats.resolved} resolved</span>})
                </>
              )}
            </p>
          </div>
        </div>
        <Button onClick={handleAdd}>
          <PlusIcon className="size-4" />
          Report Issue
        </Button>
      </div>

      {/* Filter Tabs */}
      {snaggingItems.length > 0 && (
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              filter === "all"
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setFilter("open")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              filter === "open"
                ? "bg-white text-amber-600 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Open ({stats.open})
          </button>
          <button
            onClick={() => setFilter("resolved")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              filter === "resolved"
                ? "bg-white text-emerald-600 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Resolved ({stats.resolved})
          </button>
        </div>
      )}

      {/* Items List */}
      {filteredItems.length > 0 ? (
        <div className="space-y-3">
          {filteredItems.map((item) => (
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
                        sizes="64px"
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
      ) : snaggingItems.length > 0 ? (
        // Items exist but none match current filter
        <EmptyState
          icon={<BugIcon className="size-6" />}
          title={filter === "open" ? "No open issues" : "No resolved issues"}
          description={filter === "open"
            ? "All issues have been resolved. Great job!"
            : "No issues have been resolved yet."}
        />
      ) : (
        // No items at all
        <EmptyState
          icon={<BugIcon className="size-6" />}
          title="No issues reported"
          description="No snagging items reported yet. Report issues as they arise during production or installation."
          action={
            <Button onClick={handleAdd}>
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
              onClick={(e) => {
                e.preventDefault();
                handleResolveConfirm();
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Spinner className="size-4 mr-2" />
                  Resolving...
                </>
              ) : (
                "Mark as Resolved"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
