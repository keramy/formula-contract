"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getTimelineItems,
  getTimelineDependencies,
  createTimelineItem,
  updateTimelineItem,
  deleteTimelineItem,
  createTimelineDependency,
  updateTimelineDependency,
  deleteTimelineDependency,
  getBaselines,
  getBaselineItems,
  saveBaseline,
  deleteBaseline,
  type GanttItem as TimelineItem,
  type GanttItemInput as TimelineItemInput,
  type GanttDependency as TimelineDependency,
  type GanttDependencyInput as TimelineDependencyInput,
  type GanttBaseline,
  type GanttBaselineItem,
  type DependencyType,
} from "@/lib/actions/timelines";

// ============================================================================
// Query Keys
// ============================================================================

/**
 * Query keys factory for timelines
 * Enables efficient cache invalidation and query management
 */
export const timelineKeys = {
  all: ["timelines"] as const,
  lists: () => [...timelineKeys.all, "list"] as const,
  list: (projectId: string) => [...timelineKeys.lists(), projectId] as const,
  dependencies: () => [...timelineKeys.all, "dependencies"] as const,
  dependencyList: (projectId: string) => [...timelineKeys.dependencies(), projectId] as const,
  baselines: () => [...timelineKeys.all, "baselines"] as const,
  baselineList: (projectId: string) => [...timelineKeys.baselines(), projectId] as const,
  baselineItems: (baselineId: string) => [...timelineKeys.all, "baseline-items", baselineId] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Hook for fetching all timeline items for a project
 */
export function useTimelineItems(projectId: string) {
  return useQuery({
    queryKey: timelineKeys.list(projectId),
    queryFn: () => getTimelineItems(projectId),
    enabled: !!projectId,
    staleTime: 30 * 1000, // 30 seconds - timeline data changes frequently
  });
}

/**
 * Hook for fetching all dependencies for a project
 */
export function useTimelineDependencies(projectId: string) {
  return useQuery({
    queryKey: timelineKeys.dependencyList(projectId),
    queryFn: () => getTimelineDependencies(projectId),
    enabled: !!projectId,
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// Mutation Hooks - Timeline Items
// ============================================================================

/**
 * Hook for creating a new timeline item
 * Includes optimistic updates for instant visual feedback
 */
export function useCreateTimelineItem(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TimelineItemInput) => {
      const result = await createTimelineItem(input);
      if (!result.success) {
        throw new Error(result.error || "Failed to create timeline item");
      }
      return result.data!;
    },
    // Optimistic update - add temporary item immediately
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: timelineKeys.list(projectId) });

      const previousItems = queryClient.getQueryData<TimelineItem[]>(
        timelineKeys.list(projectId)
      );

      // Create optimistic item with temp ID
      const tempItem: TimelineItem = {
        id: `temp-${Date.now()}`,
        project_id: projectId,
        name: input.name,
        item_type: input.item_type,
        phase_key: input.phase_key ?? null,
        parent_id: input.parent_id ?? null,
        start_date: input.start_date,
        end_date: input.end_date,
        color: input.color || null,
        priority: input.priority || 2,
        progress_override: input.progress_override ?? null,
        is_completed: input.is_completed ?? false,
        completed_at: null,
        sort_order: (previousItems?.length || 0) + 1,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        progress: 0,
        description: input.description || null,
        is_on_critical_path: input.is_on_critical_path ?? false,
        linked_scope_item_ids: input.linked_scope_item_ids || [],
      };

      queryClient.setQueryData<TimelineItem[]>(
        timelineKeys.list(projectId),
        (old) => [...(old || []), tempItem]
      );

      return { previousItems };
    },
    onError: (error: Error, _, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(timelineKeys.list(projectId), context.previousItems);
      }
      toast.error(error.message);
    },
    onSuccess: () => {
      toast.success("Timeline item created");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: timelineKeys.list(projectId) });
    },
  });
}

/**
 * Hook for updating a timeline item
 * Includes optimistic updates for instant visual feedback
 */
export function useUpdateTimelineItem(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      timelineId,
      input,
    }: {
      timelineId: string;
      input: Partial<TimelineItemInput>;
    }) => {
      const result = await updateTimelineItem(timelineId, input);
      if (!result.success) {
        throw new Error(result.error || "Failed to update timeline item");
      }
      return result.data!;
    },
    // Optimistic update - apply changes immediately
    onMutate: async ({ timelineId, input }) => {
      await queryClient.cancelQueries({ queryKey: timelineKeys.list(projectId) });

      const previousItems = queryClient.getQueryData<TimelineItem[]>(
        timelineKeys.list(projectId)
      );

      queryClient.setQueryData<TimelineItem[]>(
        timelineKeys.list(projectId),
        (old) => {
          if (!old) return old;
          return old.map((item) =>
            item.id === timelineId
              ? {
                  ...item,
                  name: input.name ?? item.name,
                  item_type: input.item_type ?? item.item_type,
                  start_date: input.start_date ?? item.start_date,
                  end_date: input.end_date ?? item.end_date,
                  parent_id: input.parent_id ?? item.parent_id,
                  color: input.color ?? item.color,
                  priority: input.priority ?? item.priority,
                  progress_override: input.progress_override ?? item.progress_override,
                  is_completed: input.is_completed ?? item.is_completed,
                  linked_scope_item_ids: input.linked_scope_item_ids ?? item.linked_scope_item_ids,
                }
              : item
          );
        }
      );

      return { previousItems };
    },
    onError: (error: Error, _, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(timelineKeys.list(projectId), context.previousItems);
      }
      toast.error(error.message);
    },
    onSuccess: () => {
      toast.success("Timeline item updated");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: timelineKeys.list(projectId) });
    },
  });
}

/**
 * Hook for deleting a timeline item
 */
export function useDeleteTimelineItem(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (timelineId: string) => {
      const result = await deleteTimelineItem(timelineId);
      if (!result.success) {
        throw new Error(result.error || "Failed to delete timeline item");
      }
    },
    // Optimistic update - remove immediately
    onMutate: async (timelineId) => {
      await queryClient.cancelQueries({ queryKey: timelineKeys.list(projectId) });

      const previousItems = queryClient.getQueryData<TimelineItem[]>(
        timelineKeys.list(projectId)
      );

      queryClient.setQueryData<TimelineItem[]>(
        timelineKeys.list(projectId),
        (old) => {
          if (!old) return old;
          return old.filter((item) => item.id !== timelineId);
        }
      );

      return { previousItems };
    },
    onError: (error: Error, _, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(timelineKeys.list(projectId), context.previousItems);
      }
      toast.error(error.message);
    },
    onSuccess: () => {
      toast.success("Timeline item deleted");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: timelineKeys.list(projectId) });
      // Also invalidate dependencies as they may reference the deleted item
      queryClient.invalidateQueries({ queryKey: timelineKeys.dependencyList(projectId) });
    },
  });
}

/**
 * Hook for duplicating a timeline item
 */
// Duplicate removed in rewrite (can be added later if needed)

// ============================================================================
// Mutation Hooks - Hierarchy (Indent/Outdent)
// ============================================================================

/**
 * Hook for indenting a timeline item (make it a child of previous sibling)
 * Includes optimistic updates for instant visual feedback
 */
// Indent/outdent removed in rewrite (parent selection handled in form)

// ============================================================================
// Mutation Hooks - Dependencies
// ============================================================================

/**
 * Hook for creating a dependency link
 * Includes optimistic updates for instant visual feedback
 */
export function useCreateTimelineDependency(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TimelineDependencyInput) => {
      const result = await createTimelineDependency(input);
      if (!result.success) {
        throw new Error(result.error || "Failed to create dependency");
      }
      return result.data!;
    },
    // Optimistic update - add temporary dependency immediately
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: timelineKeys.dependencyList(projectId) });

      const previousDeps = queryClient.getQueryData<TimelineDependency[]>(
        timelineKeys.dependencyList(projectId)
      );

      // Create optimistic dependency with temp ID
      const tempDep: TimelineDependency = {
        id: `temp-${Date.now()}`,
        project_id: projectId,
        source_id: input.source_id,
        target_id: input.target_id,
        dependency_type: input.dependency_type ?? 0,
        lag_days: input.lag_days ?? 0,
        created_at: new Date().toISOString(),
        created_by: null,
      };

      queryClient.setQueryData<TimelineDependency[]>(
        timelineKeys.dependencyList(projectId),
        (old) => [...(old || []), tempDep]
      );

      return { previousDeps };
    },
    onError: (error: Error, _, context) => {
      if (context?.previousDeps) {
        queryClient.setQueryData(timelineKeys.dependencyList(projectId), context.previousDeps);
      }
      toast.error(error.message);
    },
    onSuccess: () => {
      toast.success("Dependency created");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: timelineKeys.dependencyList(projectId) });
    },
  });
}

/**
 * Hook for updating a dependency
 * Includes optimistic updates for instant visual feedback
 */
export function useUpdateTimelineDependency(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dependencyId,
      updates,
    }: {
      dependencyId: string;
      updates: { dependency_type?: DependencyType; lag_days?: number };
    }) => {
      const result = await updateTimelineDependency(dependencyId, updates);
      if (!result.success) {
        throw new Error(result.error || "Failed to update dependency");
      }
      return result.data!;
    },
    // Optimistic update - apply changes immediately
    onMutate: async ({ dependencyId, updates }) => {
      await queryClient.cancelQueries({ queryKey: timelineKeys.dependencyList(projectId) });

      const previousDeps = queryClient.getQueryData<TimelineDependency[]>(
        timelineKeys.dependencyList(projectId)
      );

      queryClient.setQueryData<TimelineDependency[]>(
        timelineKeys.dependencyList(projectId),
        (old) => {
          if (!old) return old;
          return old.map((dep) =>
            dep.id === dependencyId
              ? {
                  ...dep,
                  dependency_type: updates.dependency_type ?? dep.dependency_type,
                  lag_days: updates.lag_days ?? dep.lag_days,
                }
              : dep
          );
        }
      );

      return { previousDeps };
    },
    onError: (error: Error, _, context) => {
      if (context?.previousDeps) {
        queryClient.setQueryData(timelineKeys.dependencyList(projectId), context.previousDeps);
      }
      toast.error(error.message);
    },
    onSuccess: () => {
      toast.success("Dependency updated");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: timelineKeys.dependencyList(projectId) });
    },
  });
}

/**
 * Hook for deleting a dependency
 */
export function useDeleteTimelineDependency(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dependencyId: string) => {
      const result = await deleteTimelineDependency(dependencyId);
      if (!result.success) {
        throw new Error(result.error || "Failed to delete dependency");
      }
    },
    // Optimistic update - remove immediately
    onMutate: async (dependencyId) => {
      await queryClient.cancelQueries({ queryKey: timelineKeys.dependencyList(projectId) });

      const previousDeps = queryClient.getQueryData<TimelineDependency[]>(
        timelineKeys.dependencyList(projectId)
      );

      queryClient.setQueryData<TimelineDependency[]>(
        timelineKeys.dependencyList(projectId),
        (old) => {
          if (!old) return old;
          return old.filter((dep) => dep.id !== dependencyId);
        }
      );

      return { previousDeps };
    },
    onError: (error: Error, _, context) => {
      if (context?.previousDeps) {
        queryClient.setQueryData(timelineKeys.dependencyList(projectId), context.previousDeps);
      }
      toast.error(error.message);
    },
    onSuccess: () => {
      toast.success("Dependency deleted");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: timelineKeys.dependencyList(projectId) });
    },
  });
}

// ============================================================================
// Baseline Hooks
// ============================================================================

export function useBaselines(projectId: string) {
  return useQuery({
    queryKey: timelineKeys.baselineList(projectId),
    queryFn: () => getBaselines(projectId),
    staleTime: 60_000,
  });
}

export function useBaselineItems(baselineId: string | null) {
  return useQuery({
    queryKey: timelineKeys.baselineItems(baselineId ?? "none"),
    queryFn: () => (baselineId ? getBaselineItems(baselineId) : Promise.resolve([])),
    enabled: !!baselineId,
    staleTime: 60_000,
  });
}

export function useSaveBaseline(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => saveBaseline(projectId, name),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Baseline saved");
        queryClient.invalidateQueries({ queryKey: timelineKeys.baselineList(projectId) });
      } else {
        toast.error(result.error || "Failed to save baseline");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteBaseline(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (baselineId: string) => deleteBaseline(baselineId),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Baseline deleted");
        queryClient.invalidateQueries({ queryKey: timelineKeys.baselineList(projectId) });
      } else {
        toast.error(result.error || "Failed to delete baseline");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
