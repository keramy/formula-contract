"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getBrands,
  getBrand,
  createBrand,
  updateBrand,
  deleteBrand,
  getArchitectureFirms,
  getArchitectureFirm,
  createArchitectureFirm,
  updateArchitectureFirm,
  updateVendorStatus,
  getContacts,
  createContact,
  updateContact,
  getOpportunities,
  getOpportunityPipeline,
  createOpportunity,
  updateOpportunity,
  moveOpportunityStage,
  getActivities,
  createActivity,
  getUpcomingActions,
  getCrmDashboardStats,
} from "@/lib/actions/crm";
import type {
  CrmBrandWithStats,
  CrmOpportunityWithRelations,
  OpportunityStage,
  PipelineColumn,
} from "@/types/crm";

// ============================================================================
// Query Keys
// ============================================================================

export const crmKeys = {
  all: ["crm"] as const,
  // Brands
  brands: () => [...crmKeys.all, "brands"] as const,
  brandList: (filters?: Record<string, unknown>) =>
    [...crmKeys.brands(), "list", filters] as const,
  brandDetail: (id: string) => [...crmKeys.brands(), "detail", id] as const,
  // Firms
  firms: () => [...crmKeys.all, "firms"] as const,
  firmList: () => [...crmKeys.firms(), "list"] as const,
  firmDetail: (id: string) => [...crmKeys.firms(), "detail", id] as const,
  // Contacts
  contacts: () => [...crmKeys.all, "contacts"] as const,
  contactList: () => [...crmKeys.contacts(), "list"] as const,
  // Opportunities
  opportunities: () => [...crmKeys.all, "opportunities"] as const,
  opportunityList: () => [...crmKeys.opportunities(), "list"] as const,
  pipeline: () => [...crmKeys.opportunities(), "pipeline"] as const,
  // Activities
  activities: () => [...crmKeys.all, "activities"] as const,
  activityList: () => [...crmKeys.activities(), "list"] as const,
  upcomingActions: () => [...crmKeys.activities(), "upcoming"] as const,
  // Dashboard
  dashboard: () => [...crmKeys.all, "dashboard"] as const,
};

const STALE_TIME = 60_000; // 60 seconds

// ============================================================================
// BRAND Hooks
// ============================================================================

export function useBrands() {
  return useQuery({
    queryKey: crmKeys.brandList(),
    queryFn: async () => {
      const result = await getBrands();
      if (!result.success) throw new Error(result.error || "Failed to fetch brands");
      return result.data!;
    },
    staleTime: STALE_TIME,
  });
}

export function useBrand(brandId: string) {
  return useQuery({
    queryKey: crmKeys.brandDetail(brandId),
    queryFn: async () => {
      const result = await getBrand(brandId);
      if (!result.success) throw new Error(result.error || "Failed to fetch brand");
      return result.data!;
    },
    enabled: !!brandId,
    staleTime: STALE_TIME,
  });
}

export function useCreateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const result = await createBrand(input);
      if (!result.success) throw new Error(result.error || "Failed to create brand");
      return result.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmKeys.brands() });
      queryClient.invalidateQueries({ queryKey: crmKeys.dashboard() });
      toast.success("Brand created successfully");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Record<string, unknown> }) => {
      const result = await updateBrand(id, input);
      if (!result.success) throw new Error(result.error || "Failed to update brand");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmKeys.brands() });
      toast.success("Brand updated successfully");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (brandId: string) => {
      const result = await deleteBrand(brandId);
      if (!result.success) throw new Error(result.error || "Failed to delete brand");
    },
    // Optimistic remove
    onMutate: async (brandId) => {
      await queryClient.cancelQueries({ queryKey: crmKeys.brandList() });
      const previous = queryClient.getQueryData(crmKeys.brandList());
      queryClient.setQueryData(
        crmKeys.brandList(),
        (old: CrmBrandWithStats[] | undefined) =>
          old ? old.filter((b) => b.id !== brandId) : old
      );
      return { previous };
    },
    onError: (error: Error, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(crmKeys.brandList(), context.previous);
      }
      toast.error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmKeys.dashboard() });
      toast.success("Brand deleted");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: crmKeys.brands() });
    },
  });
}

// ============================================================================
// FIRM Hooks
// ============================================================================

export function useFirms() {
  return useQuery({
    queryKey: crmKeys.firmList(),
    queryFn: async () => {
      const result = await getArchitectureFirms();
      if (!result.success) throw new Error(result.error || "Failed to fetch firms");
      return result.data!;
    },
    staleTime: STALE_TIME,
  });
}

export function useFirm(firmId: string) {
  return useQuery({
    queryKey: crmKeys.firmDetail(firmId),
    queryFn: async () => {
      const result = await getArchitectureFirm(firmId);
      if (!result.success) throw new Error(result.error || "Failed to fetch firm");
      return result.data!;
    },
    enabled: !!firmId,
    staleTime: STALE_TIME,
  });
}

export function useCreateFirm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const result = await createArchitectureFirm(input);
      if (!result.success) throw new Error(result.error || "Failed to create firm");
      return result.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmKeys.firms() });
      queryClient.invalidateQueries({ queryKey: crmKeys.dashboard() });
      toast.success("Firm created successfully");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateFirm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Record<string, unknown> }) => {
      const result = await updateArchitectureFirm(id, input);
      if (!result.success) throw new Error(result.error || "Failed to update firm");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmKeys.firms() });
      toast.success("Firm updated successfully");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateVendorStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ firmId, status }: { firmId: string; status: string }) => {
      const result = await updateVendorStatus(firmId, status);
      if (!result.success) throw new Error(result.error || "Failed to update status");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmKeys.firms() });
      toast.success("Vendor status updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// ============================================================================
// CONTACT Hooks
// ============================================================================

export function useContacts() {
  return useQuery({
    queryKey: crmKeys.contactList(),
    queryFn: async () => {
      const result = await getContacts();
      if (!result.success) throw new Error(result.error || "Failed to fetch contacts");
      return result.data!;
    },
    staleTime: STALE_TIME,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const result = await createContact(input);
      if (!result.success) throw new Error(result.error || "Failed to create contact");
      return result.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmKeys.contacts() });
      toast.success("Contact created successfully");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Record<string, unknown> }) => {
      const result = await updateContact(id, input);
      if (!result.success) throw new Error(result.error || "Failed to update contact");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmKeys.contacts() });
      toast.success("Contact updated successfully");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// ============================================================================
// OPPORTUNITY Hooks
// ============================================================================

export function useOpportunities() {
  return useQuery({
    queryKey: crmKeys.opportunityList(),
    queryFn: async () => {
      const result = await getOpportunities();
      if (!result.success) throw new Error(result.error || "Failed to fetch opportunities");
      return result.data!;
    },
    staleTime: STALE_TIME,
  });
}

export function usePipeline() {
  return useQuery({
    queryKey: crmKeys.pipeline(),
    queryFn: async () => {
      const result = await getOpportunityPipeline();
      if (!result.success) throw new Error(result.error || "Failed to fetch pipeline");
      return result.data!;
    },
    staleTime: STALE_TIME,
  });
}

export function useCreateOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const result = await createOpportunity(input);
      if (!result.success) throw new Error(result.error || "Failed to create opportunity");
      return result.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmKeys.opportunities() });
      queryClient.invalidateQueries({ queryKey: crmKeys.dashboard() });
      toast.success("Opportunity created successfully");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Record<string, unknown> }) => {
      const result = await updateOpportunity(id, input);
      if (!result.success) throw new Error(result.error || "Failed to update opportunity");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmKeys.opportunities() });
      queryClient.invalidateQueries({ queryKey: crmKeys.dashboard() });
      toast.success("Opportunity updated successfully");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useMoveOpportunityStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      opportunityId,
      newStage,
    }: {
      opportunityId: string;
      newStage: OpportunityStage;
    }) => {
      const result = await moveOpportunityStage(opportunityId, newStage);
      if (!result.success) throw new Error(result.error || "Failed to move opportunity");
    },
    // Optimistic update for instant kanban movement
    onMutate: async ({ opportunityId, newStage }) => {
      await queryClient.cancelQueries({ queryKey: crmKeys.pipeline() });
      const previous = queryClient.getQueryData(crmKeys.pipeline());

      queryClient.setQueryData(
        crmKeys.pipeline(),
        (old: PipelineColumn[] | undefined) => {
          if (!old) return old;
          let movedOpp: CrmOpportunityWithRelations | undefined;

          // Remove from old column
          const updated = old.map((col) => ({
            ...col,
            opportunities: col.opportunities.filter((o) => {
              if (o.id === opportunityId) {
                movedOpp = { ...o, stage: newStage };
                return false;
              }
              return true;
            }),
          }));

          // Add to new column
          if (movedOpp) {
            return updated.map((col) =>
              col.stage === newStage
                ? { ...col, opportunities: [movedOpp!, ...col.opportunities] }
                : col
            );
          }
          return updated;
        }
      );

      return { previous };
    },
    onError: (error: Error, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(crmKeys.pipeline(), context.previous);
      }
      toast.error(error.message);
    },
    onSuccess: () => {
      toast.success("Stage updated");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: crmKeys.pipeline() });
      queryClient.invalidateQueries({ queryKey: crmKeys.opportunities() });
      queryClient.invalidateQueries({ queryKey: crmKeys.dashboard() });
    },
  });
}

// ============================================================================
// ACTIVITY Hooks
// ============================================================================

export function useActivities() {
  return useQuery({
    queryKey: crmKeys.activityList(),
    queryFn: async () => {
      const result = await getActivities();
      if (!result.success) throw new Error(result.error || "Failed to fetch activities");
      return result.data!;
    },
    staleTime: STALE_TIME,
  });
}

export function useUpcomingActions() {
  return useQuery({
    queryKey: crmKeys.upcomingActions(),
    queryFn: async () => {
      const result = await getUpcomingActions();
      if (!result.success) throw new Error(result.error || "Failed to fetch upcoming actions");
      return result.data!;
    },
    staleTime: STALE_TIME,
  });
}

export function useCreateActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const result = await createActivity(input);
      if (!result.success) throw new Error(result.error || "Failed to log activity");
      return result.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmKeys.activities() });
      queryClient.invalidateQueries({ queryKey: crmKeys.dashboard() });
      toast.success("Activity logged successfully");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// ============================================================================
// DASHBOARD Hook
// ============================================================================

export function useCrmDashboard() {
  return useQuery({
    queryKey: crmKeys.dashboard(),
    queryFn: async () => {
      const result = await getCrmDashboardStats();
      if (!result.success) throw new Error(result.error || "Failed to fetch dashboard");
      return result.data!;
    },
    staleTime: STALE_TIME,
  });
}
