"use client";

import { CardContent } from "@/components/ui/card";
import { GlassCard } from "@/components/ui/ui-helpers";

/**
 * Dashboard Skeleton Component
 *
 * Shows a loading skeleton that matches the dashboard layout.
 * This provides better perceived performance while data loads.
 */
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50/50 via-white to-gray-50/50">
      <div className="p-6 space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-32 bg-gray-100 rounded mt-2 animate-pulse" />
          </div>
        </div>

        {/* Stats Row Skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <GlassCard key={i}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                    <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                  </div>
                  <div className="h-10 w-10 bg-gray-200 rounded-xl animate-pulse" />
                </div>
              </CardContent>
            </GlassCard>
          ))}
        </div>

        {/* Main Content Grid Skeleton */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Projects Skeleton */}
          <GlassCard>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="p-3 rounded-lg bg-gray-50/50">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                        <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
                      </div>
                      <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>

          {/* Activity Feed Skeleton */}
          <GlassCard>
            <div className="p-4">
              <div className="h-5 w-28 bg-gray-200 rounded mb-4 animate-pulse" />
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
                    <div className="flex-1 space-y-1">
                      <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                      <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Status Overview Skeleton */}
        <GlassCard>
          <div className="p-4">
            <div className="h-5 w-40 bg-gray-200 rounded mb-4 animate-pulse" />
            <div className="grid gap-4 sm:grid-cols-5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-4 rounded-lg bg-gray-50/70 text-center">
                  <div className="h-5 w-16 mx-auto bg-gray-200 rounded-full animate-pulse" />
                  <div className="h-7 w-8 mx-auto mt-2 bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
