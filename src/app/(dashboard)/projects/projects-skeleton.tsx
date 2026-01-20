"use client";

import { CardContent } from "@/components/ui/card";
import { GlassCard } from "@/components/ui/ui-helpers";

/**
 * Projects List Skeleton Component
 *
 * Shows a loading skeleton that matches the projects list layout.
 * Includes: search bar, filter dropdown, results count, and table rows.
 */
export function ProjectsSkeleton() {
  return (
    <div className="p-6">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-64 bg-gray-100 rounded mt-2 animate-pulse" />
        </div>
        <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse" />
      </div>

      {/* Filters Skeleton */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <div className="h-10 w-full bg-gray-100 rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <div className="h-10 w-[160px] bg-gray-100 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Results count */}
      <div className="h-4 w-40 bg-gray-100 rounded mb-4 animate-pulse" />

      {/* Table Skeleton */}
      <GlassCard>
        <div className="overflow-x-auto">
          {/* Table Header */}
          <div className="border-b border-gray-100 p-4">
            <div className="grid grid-cols-6 gap-4">
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>

          {/* Table Rows */}
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="border-b border-gray-50 p-4">
              <div className="grid grid-cols-6 gap-4 items-center">
                <div className="h-5 w-20 bg-gray-100 rounded animate-pulse" />
                <div className="space-y-1">
                  <div className="h-5 w-32 bg-gray-100 rounded animate-pulse" />
                  <div className="h-3 w-24 bg-gray-50 rounded animate-pulse" />
                </div>
                <div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse" />
                <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                <div className="space-y-1">
                  <div className="h-2 w-full bg-gray-100 rounded animate-pulse" />
                  <div className="h-3 w-12 bg-gray-50 rounded animate-pulse" />
                </div>
                <div className="h-8 w-16 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
