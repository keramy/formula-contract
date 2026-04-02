"use client";

/**
 * React Query hooks for project tab data.
 *
 * PURPOSE: Lazy-load tab data instead of fetching everything in the server component's
 * Promise.all. Each tab fetches its own data when activated — reducing project page
 * load from 9 parallel queries to 2 (project + scope items).
 *
 * These hooks call existing server actions which handle auth + RLS internally.
 */

import { useQuery } from "@tanstack/react-query";
import {
  getProjectReports,
  type Report,
} from "@/lib/actions/reports";
import {
  getProjectAssignments,
  type ProjectAssignment,
} from "@/lib/actions/project-assignments";
import { getProjectAreas, type ProjectArea } from "@/lib/actions/project-areas";

// ============================================================================
// Query Keys
// ============================================================================

export const projectTabKeys = {
  all: ["project-tabs"] as const,
  reports: (projectId: string) => [...projectTabKeys.all, "reports", projectId] as const,
  assignments: (projectId: string) => [...projectTabKeys.all, "assignments", projectId] as const,
  milestones: (projectId: string) => [...projectTabKeys.all, "milestones", projectId] as const,
  snagging: (projectId: string) => [...projectTabKeys.all, "snagging", projectId] as const,
  areas: (projectId: string) => [...projectTabKeys.all, "areas", projectId] as const,
  activities: (projectId: string) => [...projectTabKeys.all, "activities", projectId] as const,
  materials: (projectId: string) => [...projectTabKeys.all, "materials", projectId] as const,
  drawings: (projectId: string) => [...projectTabKeys.all, "drawings", projectId] as const,
};

// ============================================================================
// Hooks — each calls existing server actions
// ============================================================================

/** Reports for a project — fetches via getProjectReports server action */
export function useProjectReports(projectId: string) {
  return useQuery({
    queryKey: projectTabKeys.reports(projectId),
    queryFn: () => getProjectReports(projectId),
    staleTime: 60_000, // 1 minute
  });
}

/** Team assignments — fetches via getProjectAssignments server action */
export function useProjectAssignments(projectId: string) {
  return useQuery({
    queryKey: projectTabKeys.assignments(projectId),
    queryFn: () => getProjectAssignments(projectId),
    staleTime: 60_000,
  });
}

/** Project areas — fetches via getProjectAreas server action */
export function useProjectAreas(projectId: string) {
  return useQuery({
    queryKey: projectTabKeys.areas(projectId),
    queryFn: () => getProjectAreas(projectId),
    staleTime: 60_000,
  });
}

/** Milestones for a project */
export function useProjectMilestones(projectId: string) {
  return useQuery({
    queryKey: projectTabKeys.milestones(projectId),
    queryFn: async () => {
      const { getMilestones } = await import("@/lib/actions/milestones");
      return getMilestones(projectId);
    },
    staleTime: 60_000,
  });
}

/** Snagging items for a project */
export function useProjectSnagging(projectId: string) {
  return useQuery({
    queryKey: projectTabKeys.snagging(projectId),
    queryFn: async () => {
      const { getSnaggingItems } = await import("@/lib/actions/snagging");
      return getSnaggingItems(projectId);
    },
    staleTime: 60_000,
  });
}

/** Drawings for a project's production items */
export function useProjectDrawings(projectId: string) {
  return useQuery({
    queryKey: projectTabKeys.drawings(projectId),
    queryFn: async () => {
      const { getProjectDrawings } = await import("@/lib/actions/drawings");
      return getProjectDrawings(projectId);
    },
    staleTime: 60_000,
  });
}

/** Recent activities for a project (last 5) */
export function useProjectActivities(projectId: string) {
  return useQuery({
    queryKey: projectTabKeys.activities(projectId),
    queryFn: async () => {
      const { getRecentActivities } = await import("@/lib/actions/activity-log-queries");
      return getRecentActivities(projectId);
    },
    staleTime: 60_000,
  });
}
