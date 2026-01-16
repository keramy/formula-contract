"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getScopeItems,
  getScopeItem,
  bulkUpdateScopeItems,
  bulkAssignMaterials,
  updateScopeItemField,
  updateProductionPercentage,
  updateInstallationStatus,
  deleteScopeItem,
  type ScopeItem,
  type ScopeItemWithMaterials,
  type ScopeItemField,
} from "@/lib/actions/scope-items";
import { materialKeys } from "./materials";

// ============================================================================
// Query Keys
// ============================================================================

/**
 * Query keys factory for scope items
 * Enables efficient cache invalidation and query management
 */
export const scopeItemKeys = {
  all: ["scopeItems"] as const,
  lists: () => [...scopeItemKeys.all, "list"] as const,
  list: (projectId: string) => [...scopeItemKeys.lists(), projectId] as const,
  details: () => [...scopeItemKeys.all, "detail"] as const,
  detail: (itemId: string) => [...scopeItemKeys.details(), itemId] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Hook for fetching all scope items for a project
 *
 * Features:
 * - Automatic caching with 60-second stale time
 * - Deduplication (multiple components won't cause multiple fetches)
 * - Background refetching when data becomes stale
 */
export function useScopeItems(projectId: string) {
  return useQuery({
    queryKey: scopeItemKeys.list(projectId),
    queryFn: async () => {
      const result = await getScopeItems(projectId);
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch scope items");
      }
      return result.data!;
    },
    enabled: !!projectId,
    staleTime: 60 * 1000, // 60 seconds
  });
}

/**
 * Hook for fetching a single scope item with its materials
 */
export function useScopeItem(itemId: string) {
  return useQuery({
    queryKey: scopeItemKeys.detail(itemId),
    queryFn: async () => {
      const result = await getScopeItem(itemId);
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch scope item");
      }
      return result.data!;
    },
    enabled: !!itemId,
    staleTime: 60 * 1000,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Hook for bulk updating scope items
 * Updates a single field across multiple items
 */
export function useBulkUpdateScopeItems(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemIds,
      field,
      value,
    }: {
      itemIds: string[];
      field: ScopeItemField;
      value: unknown;
    }) => {
      const result = await bulkUpdateScopeItems(projectId, itemIds, field, value);
      if (!result.success) {
        throw new Error(result.error || "Failed to update items");
      }
    },
    // Optimistic update
    onMutate: async ({ itemIds, field, value }) => {
      await queryClient.cancelQueries({ queryKey: scopeItemKeys.list(projectId) });

      const previousItems = queryClient.getQueryData(scopeItemKeys.list(projectId));

      queryClient.setQueryData(
        scopeItemKeys.list(projectId),
        (old: ScopeItem[] | undefined) => {
          if (!old) return old;
          return old.map((item) =>
            itemIds.includes(item.id) ? { ...item, [field]: value } : item
          );
        }
      );

      return { previousItems };
    },
    onError: (error: Error, _, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(scopeItemKeys.list(projectId), context.previousItems);
      }
      toast.error(error.message);
    },
    onSuccess: (_, { itemIds }) => {
      toast.success(`Updated ${itemIds.length} item${itemIds.length > 1 ? "s" : ""}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: scopeItemKeys.list(projectId) });
    },
  });
}

/**
 * Hook for bulk assigning materials to scope items
 */
export function useBulkAssignMaterials(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemIds,
      materialIds,
    }: {
      itemIds: string[];
      materialIds: string[];
    }) => {
      const result = await bulkAssignMaterials(projectId, itemIds, materialIds);
      if (!result.success) {
        throw new Error(result.error || "Failed to assign materials");
      }
      return result.data!;
    },
    onSuccess: (data) => {
      // Invalidate both scope items and materials queries
      queryClient.invalidateQueries({ queryKey: scopeItemKeys.list(projectId) });
      queryClient.invalidateQueries({ queryKey: materialKeys.list(projectId) });
      toast.success(
        `Assigned ${data.assigned} material-item combination${data.assigned !== 1 ? "s" : ""}`
      );
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Hook for updating a single scope item field
 */
export function useUpdateScopeItemField(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      field,
      value,
    }: {
      itemId: string;
      field: ScopeItemField;
      value: unknown;
    }) => {
      const result = await updateScopeItemField(projectId, itemId, field, value);
      if (!result.success) {
        throw new Error(result.error || "Failed to update item");
      }
    },
    // Optimistic update
    onMutate: async ({ itemId, field, value }) => {
      await queryClient.cancelQueries({ queryKey: scopeItemKeys.list(projectId) });
      await queryClient.cancelQueries({ queryKey: scopeItemKeys.detail(itemId) });

      const previousItems = queryClient.getQueryData(scopeItemKeys.list(projectId));
      const previousItem = queryClient.getQueryData(scopeItemKeys.detail(itemId));

      // Update list
      queryClient.setQueryData(
        scopeItemKeys.list(projectId),
        (old: ScopeItem[] | undefined) => {
          if (!old) return old;
          return old.map((item) =>
            item.id === itemId ? { ...item, [field]: value } : item
          );
        }
      );

      // Update detail
      queryClient.setQueryData(
        scopeItemKeys.detail(itemId),
        (old: ScopeItemWithMaterials | undefined) => {
          if (!old) return old;
          return { ...old, [field]: value };
        }
      );

      return { previousItems, previousItem };
    },
    onError: (error: Error, variables, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(scopeItemKeys.list(projectId), context.previousItems);
      }
      if (context?.previousItem) {
        queryClient.setQueryData(scopeItemKeys.detail(variables.itemId), context.previousItem);
      }
      toast.error(error.message);
    },
    onSuccess: () => {
      toast.success("Item updated");
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: scopeItemKeys.list(projectId) });
      queryClient.invalidateQueries({ queryKey: scopeItemKeys.detail(variables.itemId) });
    },
  });
}

/**
 * Hook for updating production percentage
 * Includes validation (0-100 range)
 */
export function useUpdateProductionPercentage(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      percentage,
    }: {
      itemId: string;
      percentage: number;
    }) => {
      const result = await updateProductionPercentage(projectId, itemId, percentage);
      if (!result.success) {
        throw new Error(result.error || "Failed to update percentage");
      }
    },
    onMutate: async ({ itemId, percentage }) => {
      await queryClient.cancelQueries({ queryKey: scopeItemKeys.list(projectId) });

      const previousItems = queryClient.getQueryData(scopeItemKeys.list(projectId));

      queryClient.setQueryData(
        scopeItemKeys.list(projectId),
        (old: ScopeItem[] | undefined) => {
          if (!old) return old;
          return old.map((item) =>
            item.id === itemId ? { ...item, production_percentage: percentage } : item
          );
        }
      );

      return { previousItems };
    },
    onError: (error: Error, _, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(scopeItemKeys.list(projectId), context.previousItems);
      }
      toast.error(error.message);
    },
    onSuccess: (_, { percentage }) => {
      toast.success(`Progress updated to ${percentage}%`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: scopeItemKeys.list(projectId) });
    },
  });
}

/**
 * Hook for updating installation status
 */
export function useUpdateInstallationStatus(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      isInstalled,
    }: {
      itemId: string;
      isInstalled: boolean;
    }) => {
      const result = await updateInstallationStatus(projectId, itemId, isInstalled);
      if (!result.success) {
        throw new Error(result.error || "Failed to update status");
      }
    },
    onMutate: async ({ itemId, isInstalled }) => {
      await queryClient.cancelQueries({ queryKey: scopeItemKeys.list(projectId) });

      const previousItems = queryClient.getQueryData(scopeItemKeys.list(projectId));

      queryClient.setQueryData(
        scopeItemKeys.list(projectId),
        (old: ScopeItem[] | undefined) => {
          if (!old) return old;
          return old.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  is_installed: isInstalled,
                  installed_at: isInstalled ? new Date().toISOString() : null,
                }
              : item
          );
        }
      );

      return { previousItems };
    },
    onError: (error: Error, _, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(scopeItemKeys.list(projectId), context.previousItems);
      }
      toast.error(error.message);
    },
    onSuccess: (_, { isInstalled }) => {
      toast.success(isInstalled ? "Marked as installed" : "Marked as not installed");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: scopeItemKeys.list(projectId) });
    },
  });
}

/**
 * Hook for deleting a scope item (soft delete)
 */
export function useDeleteScopeItem(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const result = await deleteScopeItem(projectId, itemId);
      if (!result.success) {
        throw new Error(result.error || "Failed to delete item");
      }
    },
    // Optimistic update - remove from list immediately
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: scopeItemKeys.list(projectId) });

      const previousItems = queryClient.getQueryData(scopeItemKeys.list(projectId));

      queryClient.setQueryData(
        scopeItemKeys.list(projectId),
        (old: ScopeItem[] | undefined) => {
          if (!old) return old;
          return old.filter((item) => item.id !== itemId);
        }
      );

      return { previousItems };
    },
    onError: (error: Error, _, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(scopeItemKeys.list(projectId), context.previousItems);
      }
      toast.error(error.message);
    },
    onSuccess: () => {
      toast.success("Item deleted");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: scopeItemKeys.list(projectId) });
    },
  });
}
