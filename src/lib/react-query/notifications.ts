"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  type Notification,
} from "@/lib/notifications/actions";

// Query keys for cache management
export const notificationKeys = {
  all: ["notifications"] as const,
  list: (limit?: number) => [...notificationKeys.all, "list", limit] as const,
  unreadCount: () => [...notificationKeys.all, "unreadCount"] as const,
};

/**
 * Hook for fetching notifications with automatic caching and background refetching
 *
 * Features:
 * - Automatic polling every 30 seconds for unread count
 * - Deduplicated requests (multiple components won't cause multiple fetches)
 * - Stale-while-revalidate pattern for instant UI with fresh data
 */
export function useNotifications(limit: number = 20) {
  return useQuery({
    queryKey: notificationKeys.list(limit),
    queryFn: () => getNotifications(limit),
    // Don't refetch in background for the list (triggered manually on dropdown open)
    refetchInterval: false,
    // Keep stale data while refetching
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook for fetching unread notification count with polling
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: getUnreadCount,
    // Poll every 30 seconds for real-time unread count
    refetchInterval: 30 * 1000,
    // Keep data fresh for 15 seconds
    staleTime: 15 * 1000,
  });
}

/**
 * Hook for marking a single notification as read
 * Includes optimistic updates for instant UI feedback
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => markAsRead(notificationId),
    // Optimistic update for instant UI feedback
    onMutate: async (notificationId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      // Snapshot the previous values
      const previousNotifications = queryClient.getQueriesData({
        queryKey: notificationKeys.list(),
      });
      const previousUnreadCount = queryClient.getQueryData(
        notificationKeys.unreadCount()
      );

      // Optimistically update notifications list
      queryClient.setQueriesData(
        { queryKey: notificationKeys.list() },
        (old: Notification[] | undefined) => {
          if (!old) return old;
          return old.map((n) =>
            n.id === notificationId ? { ...n, is_read: true } : n
          );
        }
      );

      // Optimistically decrement unread count
      queryClient.setQueryData(
        notificationKeys.unreadCount(),
        (old: number | undefined) => (old && old > 0 ? old - 1 : 0)
      );

      return { previousNotifications, previousUnreadCount };
    },
    // Rollback on error
    onError: (err, notificationId, context) => {
      if (context?.previousNotifications) {
        context.previousNotifications.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousUnreadCount !== undefined) {
        queryClient.setQueryData(
          notificationKeys.unreadCount(),
          context.previousUnreadCount
        );
      }
    },
    // Always refetch after success or error
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * Hook for marking all notifications as read
 * Includes optimistic updates for instant UI feedback
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllAsRead,
    // Optimistic update
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      const previousNotifications = queryClient.getQueriesData({
        queryKey: notificationKeys.list(),
      });
      const previousUnreadCount = queryClient.getQueryData(
        notificationKeys.unreadCount()
      );

      // Mark all as read optimistically
      queryClient.setQueriesData(
        { queryKey: notificationKeys.list() },
        (old: Notification[] | undefined) => {
          if (!old) return old;
          return old.map((n) => ({ ...n, is_read: true }));
        }
      );

      // Set unread count to 0
      queryClient.setQueryData(notificationKeys.unreadCount(), 0);

      return { previousNotifications, previousUnreadCount };
    },
    onError: (err, variables, context) => {
      if (context?.previousNotifications) {
        context.previousNotifications.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousUnreadCount !== undefined) {
        queryClient.setQueryData(
          notificationKeys.unreadCount(),
          context.previousUnreadCount
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
