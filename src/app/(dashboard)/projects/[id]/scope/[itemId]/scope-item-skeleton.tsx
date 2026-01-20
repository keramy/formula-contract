"use client";

import { CardContent, CardHeader } from "@/components/ui/card";
import { GlassCard } from "@/components/ui/ui-helpers";

/**
 * Scope Item Detail Skeleton Component
 *
 * Shows a loading skeleton that matches the scope item detail layout.
 * This page was previously taking 18 seconds to load - the skeleton
 * provides instant feedback while the optimized queries run.
 */
export function ScopeItemSkeleton() {
  return (
    <div className="p-6">
      {/* Back Link */}
      <div className="flex items-center gap-2 mb-4">
        <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
      </div>

      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 bg-gray-200 rounded-xl animate-pulse" />
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-6 w-20 bg-gray-100 rounded-full animate-pulse" />
          </div>
          <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-10 bg-gray-100 rounded animate-pulse" />
          <div className="h-10 w-20 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="bg-white/80 backdrop-blur border rounded-lg shadow-sm p-1 mb-6 flex gap-1">
        {["Details", "Drawings", "Materials"].map((tab, i) => (
          <div
            key={tab}
            className={`h-9 px-4 rounded flex items-center ${i === 0 ? "bg-gray-100" : ""}`}
          >
            <div className={`h-4 w-16 bg-gray-200 rounded animate-pulse`} />
          </div>
        ))}
      </div>

      {/* Details Content Skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Basic Info Card */}
          <GlassCard>
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="h-8 w-8 bg-gray-200 rounded-xl animate-pulse" />
              <div className="h-5 w-28 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </CardContent>
          </GlassCard>

          {/* Dimensions Card */}
          <GlassCard>
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="h-8 w-8 bg-gray-200 rounded-xl animate-pulse" />
              <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="h-3 w-12 mx-auto bg-gray-200 rounded animate-pulse" />
                    <div className="h-6 w-16 mx-auto bg-gray-100 rounded mt-2 animate-pulse" />
                  </div>
                ))}
              </div>
            </CardContent>
          </GlassCard>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Pricing Card */}
          <GlassCard>
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="h-8 w-8 bg-gray-200 rounded-xl animate-pulse" />
              <div className="h-5 w-20 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                  <div className="h-5 w-20 bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </CardContent>
          </GlassCard>

          {/* Progress Card */}
          <GlassCard>
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="h-8 w-8 bg-gray-200 rounded-xl animate-pulse" />
              <div className="h-5 w-36 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
                  <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="h-3 w-full bg-gray-100 rounded-full animate-pulse" />
                <div className="flex gap-2 mt-4">
                  <div className="h-8 w-16 bg-gray-100 rounded animate-pulse" />
                  <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            </CardContent>
          </GlassCard>
        </div>
      </div>

      {/* Notes Card */}
      <div className="mt-6">
        <GlassCard>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div className="h-8 w-8 bg-gray-200 rounded-xl animate-pulse" />
            <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-2/3 bg-gray-100 rounded animate-pulse" />
            </div>
          </CardContent>
        </GlassCard>
      </div>
    </div>
  );
}
