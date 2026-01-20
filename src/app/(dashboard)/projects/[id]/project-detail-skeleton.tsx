"use client";

import { CardContent, CardHeader } from "@/components/ui/card";
import { GlassCard } from "@/components/ui/ui-helpers";

/**
 * Project Detail Skeleton Component
 *
 * Shows a loading skeleton that matches the project detail layout.
 * Includes: header with status, tabs, stat cards, and content area.
 */
export function ProjectDetailSkeleton() {
  return (
    <div className="p-6">
      {/* Header Skeleton */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
          <div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse" />
        </div>
        <div className="h-4 w-24 bg-gray-100 rounded mt-2 animate-pulse" />
      </div>

      {/* Tabs Skeleton */}
      <div className="bg-white/80 backdrop-blur border rounded-lg shadow-sm p-1 mb-4 flex gap-1 flex-wrap">
        {["Overview", "Scope Items", "Drawings", "Materials", "Snagging", "Milestones", "Reports", "Team", "Activity"].map((tab, i) => (
          <div
            key={tab}
            className={`h-9 px-3 rounded flex items-center ${i === 0 ? "bg-gray-100" : ""}`}
          >
            <div className={`h-4 bg-gray-200 rounded animate-pulse ${i === 0 ? "w-16" : "w-14"}`} />
            {i > 0 && i < 7 && (
              <div className="h-4 w-6 bg-gray-100 rounded-full ml-2 animate-pulse" />
            )}
          </div>
        ))}
      </div>

      {/* Overview Content Skeleton */}
      <div className="space-y-4">
        {/* Edit Button */}
        <div className="flex justify-end">
          <div className="h-10 w-28 bg-gray-200 rounded-lg animate-pulse" />
        </div>

        {/* Stats Cards Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <GlassCard key={i}>
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className="h-8 w-8 bg-gray-200 rounded-xl animate-pulse" />
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-24 bg-gray-100 rounded mt-2 animate-pulse" />
              </CardContent>
            </GlassCard>
          ))}
        </div>

        {/* Description Skeleton */}
        <GlassCard>
          <CardHeader>
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-gray-100 rounded animate-pulse" />
            </div>
          </CardContent>
        </GlassCard>
      </div>
    </div>
  );
}
