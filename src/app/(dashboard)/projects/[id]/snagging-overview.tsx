"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  AlertTriangleIcon,
  PlusIcon,
  CheckCircleIcon,
  ClockIcon,
  ImageIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
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
        <div>
          <h3 className="text-lg font-medium">Snagging / Defects</h3>
          <p className="text-sm text-muted-foreground">
            Track and resolve quality issues
          </p>
        </div>
        <Button onClick={handleAdd}>
          <PlusIcon className="size-4" />
          Report Issue
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <AlertTriangleIcon className="size-4" />
            <span className="text-xs font-medium">Total Issues</span>
          </div>
          <p className="text-2xl font-bold">{stats.total}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <ClockIcon className="size-4 text-yellow-500" />
            <span className="text-xs font-medium">Open</span>
          </div>
          <p className="text-2xl font-bold text-yellow-600">{stats.open}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <CheckCircleIcon className="size-4 text-green-500" />
            <span className="text-xs font-medium">Resolved</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
        </Card>
      </div>

      {/* Open Issues Alert */}
      {stats.open > 0 && (
        <Card className="p-4 border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-800">
          <div className="flex items-center gap-2">
            <AlertTriangleIcon className="size-5 text-yellow-500" />
            <span className="font-medium text-yellow-700 dark:text-yellow-400">
              {stats.open} open issue{stats.open !== 1 ? "s" : ""} requiring attention
            </span>
          </div>
        </Card>
      )}

      {/* Items List */}
      {snaggingItems.length > 0 ? (
        <div className="space-y-3">
          {snaggingItems.map((item) => (
            <Card key={item.id} className={`p-4 ${item.is_resolved ? "opacity-60" : ""}`}>
              <div className="flex gap-4">
                {/* Photo thumbnail */}
                <div className="shrink-0">
                  {item.photos && item.photos.length > 0 ? (
                    <div className="relative size-16 rounded-md overflow-hidden bg-muted">
                      <Image
                        src={item.photos[0]}
                        alt="Issue photo"
                        fill
                        className="object-cover"
                      />
                      {item.photos.length > 1 && (
                        <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1 rounded">
                          +{item.photos.length - 1}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="size-16 rounded-md bg-muted flex items-center justify-center">
                      <ImageIcon className="size-6 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={item.is_resolved ? "secondary" : "destructive"}>
                        {item.is_resolved ? "Resolved" : "Open"}
                      </Badge>
                      {item.item && (
                        <span className="text-xs text-muted-foreground font-mono">
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
                    <div className="p-2 rounded-md bg-green-50 dark:bg-green-900/20 mb-2">
                      <p className="text-xs font-medium text-green-700 dark:text-green-400">
                        Resolution: {item.resolution_notes}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {!item.is_resolved && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolveClick(item)}
                        disabled={isLoading}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
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
                      className="text-destructive hover:text-destructive"
                    >
                      <TrashIcon className="size-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-muted p-3 mb-4">
              <AlertTriangleIcon className="size-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">
              No snagging items reported yet. Report issues as they arise during production or installation.
            </p>
            <Button onClick={handleAdd}>
              <PlusIcon className="size-4" />
              Report First Issue
            </Button>
          </div>
        </Card>
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
