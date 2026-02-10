"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getTimelineItems,
  getTimelineDependencies,
  createTimelineItem,
  updateTimelineItem,
  updateTimelineItemDates,
  deleteTimelineItem,
  reorderTimelineItems,
  createTimelineDependency,
  updateTimelineDependency,
  deleteTimelineDependency,
  type GanttItem as TimelineItem,
  type GanttItemInput as TimelineItemInput,
  type GanttDependency as TimelineDependency,
  type GanttDependencyInput as TimelineDependencyInput,
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
 * Hook for updating timeline item dates (drag operations)
 * Includes optimistic updates for instant feedback
 */
export function useUpdateTimelineItemDates(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      timelineId,
      startDate,
      endDate,
    }: {
      timelineId: string;
      startDate: string;
      endDate: string;
    }) => {
      const result = await updateTimelineItemDates(timelineId, startDate, endDate);
      if (!result.success) {
        throw new Error(result.error || "Failed to update dates");
      }
    },
    // Optimistic update for instant drag feedback
    onMutate: async ({ timelineId, startDate, endDate }) => {
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
              ? { ...item, start_date: startDate, end_date: endDate }
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

/**
 * Hook for reordering timeline items
 * Includes optimistic updates for instant reorder feedback
 */
export function useReorderTimelineItems(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemIds: string[]) => {
      const result = await reorderTimelineItems(projectId, itemIds);
      if (!result.success) {
        throw new Error(result.error || "Failed to reorder items");
      }
    },
    // Optimistic update for instant reorder
    onMutate: async (itemIds) => {
      await queryClient.cancelQueries({ queryKey: timelineKeys.list(projectId) });

      const previousItems = queryClient.getQueryData<TimelineItem[]>(
        timelineKeys.list(projectId)
      );

      // Reorder items according to new IDs order
      queryClient.setQueryData<TimelineItem[]>(
        timelineKeys.list(projectId),
        (old) => {
          if (!old) return old;

          const itemMap = new Map(old.map((item) => [item.id, item]));
          const reorderSet = new Set(itemIds);
          let cursor = 0;

          // Reorder only the subset, keeping other items in place
          return old.map((item) => {
            if (!reorderSet.has(item.id)) return item;
            const nextId = itemIds[cursor++];
            return itemMap.get(nextId) || item;
          });
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
    // No success toast for reorder - feels more natural
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: timelineKeys.list(projectId) });
    },
  });
}

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
