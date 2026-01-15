"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

/**
 * React Query Provider
 *
 * Wraps the application with QueryClientProvider for client-side data fetching
 * with automatic caching, deduplication, and background refetching.
 *
 * Default Configuration:
 * - staleTime: 1 minute (data considered fresh for 1 minute)
 * - gcTime: 5 minutes (unused data garbage collected after 5 minutes)
 * - refetchOnWindowFocus: false (disabled to reduce unnecessary requests)
 * - retry: 1 (only retry failed requests once)
 */
export function ReactQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data considered fresh for 1 minute
            staleTime: 60 * 1000,
            // Garbage collect unused data after 5 minutes
            gcTime: 5 * 60 * 1000,
            // Don't refetch on window focus (reduces unnecessary requests)
            refetchOnWindowFocus: false,
            // Only retry once on failure
            retry: 1,
            // Retry after 1 second
            retryDelay: 1000,
          },
          mutations: {
            // Don't retry mutations
            retry: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
