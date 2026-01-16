"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getMaterials,
  getMaterial,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  updateMaterialStatus,
  updateItemMaterialAssignments,
  removeItemMaterial,
  bulkImportMaterials,
  type MaterialInput,
  type MaterialWithAssignments,
  type BulkMaterialImportItem,
} from "@/lib/actions/materials";

// ============================================================================
// Query Keys
// ============================================================================

/**
 * Query keys factory for materials
 * Enables efficient cache invalidation and query management
 */
export const materialKeys = {
  all: ["materials"] as const,
  lists: () => [...materialKeys.all, "list"] as const,
  list: (projectId: string) => [...materialKeys.lists(), projectId] as const,
  details: () => [...materialKeys.all, "detail"] as const,
  detail: (materialId: string) => [...materialKeys.details(), materialId] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Hook for fetching all materials for a project
 *
 * Features:
 * - Automatic caching with 60-second stale time
 * - Deduplication (multiple components won't cause multiple fetches)
 * - Background refetching when data becomes stale
 */
export function useMaterials(projectId: string) {
  return useQuery({
    queryKey: materialKeys.list(projectId),
    queryFn: async () => {
      const result = await getMaterials(projectId);
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch materials");
      }
      return result.data!;
    },
    enabled: !!projectId,
    staleTime: 60 * 1000, // 60 seconds
  });
}

/**
 * Hook for fetching a single material
 */
export function useMaterial(materialId: string) {
  return useQuery({
    queryKey: materialKeys.detail(materialId),
    queryFn: async () => {
      const result = await getMaterial(materialId);
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch material");
      }
      return result.data!;
    },
    enabled: !!materialId,
    staleTime: 60 * 1000,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Hook for creating a new material
 * Includes optimistic updates and automatic cache invalidation
 */
export function useCreateMaterial(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      input,
      assignedItemIds,
    }: {
      input: MaterialInput;
      assignedItemIds?: string[];
    }) => {
      const result = await createMaterial(projectId, input, assignedItemIds);
      if (!result.success) {
        throw new Error(result.error || "Failed to create material");
      }
      return result.data!;
    },
    onSuccess: () => {
      // Invalidate materials list to trigger refetch
      queryClient.invalidateQueries({ queryKey: materialKeys.list(projectId) });
      toast.success("Material created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Hook for updating a material
 * Includes optimistic updates for instant UI feedback
 */
export function useUpdateMaterial(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      materialId,
      input,
      assignedItemIds,
    }: {
      materialId: string;
      input: MaterialInput;
      assignedItemIds?: string[];
    }) => {
      const result = await updateMaterial(materialId, projectId, input, assignedItemIds);
      if (!result.success) {
        throw new Error(result.error || "Failed to update material");
      }
    },
    // Optimistic update
    onMutate: async ({ materialId, input }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: materialKeys.list(projectId) });
      await queryClient.cancelQueries({ queryKey: materialKeys.detail(materialId) });

      // Snapshot current state
      const previousMaterials = queryClient.getQueryData(materialKeys.list(projectId));
      const previousMaterial = queryClient.getQueryData(materialKeys.detail(materialId));

      // Optimistically update the list
      queryClient.setQueryData(
        materialKeys.list(projectId),
        (old: MaterialWithAssignments[] | undefined) => {
          if (!old) return old;
          return old.map((m) =>
            m.id === materialId ? { ...m, ...input } : m
          );
        }
      );

      return { previousMaterials, previousMaterial };
    },
    onError: (error: Error, variables, context) => {
      // Rollback on error
      if (context?.previousMaterials) {
        queryClient.setQueryData(materialKeys.list(projectId), context.previousMaterials);
      }
      if (context?.previousMaterial) {
        queryClient.setQueryData(
          materialKeys.detail(variables.materialId),
          context.previousMaterial
        );
      }
      toast.error(error.message);
    },
    onSuccess: () => {
      toast.success("Material updated successfully");
    },
    onSettled: (_, __, variables) => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: materialKeys.list(projectId) });
      queryClient.invalidateQueries({ queryKey: materialKeys.detail(variables.materialId) });
    },
  });
}

/**
 * Hook for deleting a material (soft delete)
 */
export function useDeleteMaterial(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (materialId: string) => {
      const result = await deleteMaterial(materialId, projectId);
      if (!result.success) {
        throw new Error(result.error || "Failed to delete material");
      }
    },
    // Optimistic update - remove from list immediately
    onMutate: async (materialId) => {
      await queryClient.cancelQueries({ queryKey: materialKeys.list(projectId) });

      const previousMaterials = queryClient.getQueryData(materialKeys.list(projectId));

      queryClient.setQueryData(
        materialKeys.list(projectId),
        (old: MaterialWithAssignments[] | undefined) => {
          if (!old) return old;
          return old.filter((m) => m.id !== materialId);
        }
      );

      return { previousMaterials };
    },
    onError: (error: Error, _, context) => {
      if (context?.previousMaterials) {
        queryClient.setQueryData(materialKeys.list(projectId), context.previousMaterials);
      }
      toast.error(error.message);
    },
    onSuccess: () => {
      toast.success("Material deleted successfully");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: materialKeys.list(projectId) });
    },
  });
}

/**
 * Hook for updating material status
 */
export function useUpdateMaterialStatus(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      materialId,
      status,
    }: {
      materialId: string;
      status: "pending" | "approved" | "rejected";
    }) => {
      const result = await updateMaterialStatus(materialId, projectId, status);
      if (!result.success) {
        throw new Error(result.error || "Failed to update status");
      }
    },
    onMutate: async ({ materialId, status }) => {
      await queryClient.cancelQueries({ queryKey: materialKeys.list(projectId) });

      const previousMaterials = queryClient.getQueryData(materialKeys.list(projectId));

      queryClient.setQueryData(
        materialKeys.list(projectId),
        (old: MaterialWithAssignments[] | undefined) => {
          if (!old) return old;
          return old.map((m) =>
            m.id === materialId ? { ...m, status } : m
          );
        }
      );

      return { previousMaterials };
    },
    onError: (error: Error, _, context) => {
      if (context?.previousMaterials) {
        queryClient.setQueryData(materialKeys.list(projectId), context.previousMaterials);
      }
      toast.error(error.message);
    },
    onSuccess: (_, { status }) => {
      toast.success(`Material ${status}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: materialKeys.list(projectId) });
    },
  });
}

/**
 * Hook for updating item-material assignments
 */
export function useUpdateItemMaterialAssignments(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      scopeItemId,
      currentMaterialIds,
      selectedMaterialIds,
    }: {
      scopeItemId: string;
      currentMaterialIds: string[];
      selectedMaterialIds: string[];
    }) => {
      const result = await updateItemMaterialAssignments(
        scopeItemId,
        projectId,
        currentMaterialIds,
        selectedMaterialIds
      );
      if (!result.success) {
        throw new Error(result.error || "Failed to update assignments");
      }
    },
    onSuccess: () => {
      // Invalidate both materials and scope items queries
      queryClient.invalidateQueries({ queryKey: materialKeys.list(projectId) });
      queryClient.invalidateQueries({ queryKey: ["scopeItems", projectId] });
      toast.success("Material assignments updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Hook for removing a single item-material assignment
 */
export function useRemoveItemMaterial(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      scopeItemId,
      materialId,
    }: {
      scopeItemId: string;
      materialId: string;
    }) => {
      const result = await removeItemMaterial(scopeItemId, materialId, projectId);
      if (!result.success) {
        throw new Error(result.error || "Failed to remove material");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: materialKeys.list(projectId) });
      queryClient.invalidateQueries({ queryKey: ["scopeItems", projectId] });
      toast.success("Material removed from item");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Hook for bulk importing materials from Excel
 */
export function useBulkImportMaterials(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (materials: BulkMaterialImportItem[]) => {
      const result = await bulkImportMaterials(projectId, materials);
      if (!result.success) {
        throw new Error(result.error || "Failed to import materials");
      }
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: materialKeys.list(projectId) });
      toast.success(`Imported: ${data.inserted} new, ${data.updated} updated`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
