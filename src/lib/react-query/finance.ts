"use client";

/**
 * Finance React Query Hooks
 *
 * Query key factory + hooks for all finance entities.
 * Follows the CRM pattern: query keys, staleTime, toast feedback, cache invalidation.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  // Access
  checkFinanceAccess,
  getProjectsForFinance,
  getApprovers,
  getAvailableUsers,
  getFinanceAccessList,
  grantFinanceAccess,
  revokeFinanceAccess,
  updateFinanceApproval,
  // Categories
  getCategories,
  createCategory,
  deleteCategory,
  // Suppliers
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  // Invoices
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  approveInvoice,
  bulkApproveInvoices,
  rejectInvoice,
  // Receivables
  getReceivables,
  getReceivable,
  createReceivable,
  updateReceivable,
  deleteReceivable,
  // Payments
  recordPayment,
  deletePayment,
  // Recurring
  getRecurringTemplates,
  createRecurringTemplate,
  updateRecurringTemplate,
  deleteRecurringTemplate,
  processRecurringTemplates,
  // Documents
  uploadFinanceDocument,
  deleteFinanceDocument,
  // Cron
  getDigestSchedule,
  updateDigestSchedule,
  // Notifications
  sendManualSummary,
  notifyTeamUrgent,
  // Export
  exportInvoicesToExcel,
  exportReceivablesToExcel,
  exportPaymentScheduleToExcel,
  // Dashboard
  getFinanceDashboardStats,
  getAgingReport,
  getCashFlowData,
} from "@/lib/actions/finance";
import type { InvoiceFilters, ReceivableFilters } from "@/types/finance";

// ============================================================================
// Query Key Factory
// ============================================================================

const STALE_TIME = 60_000; // 60 seconds

export const financeKeys = {
  all: ["finance"] as const,
  access: () => [...financeKeys.all, "access"] as const,
  hasAccess: () => [...financeKeys.all, "hasAccess"] as const,
  projects: () => [...financeKeys.all, "projects"] as const,
  approvers: () => [...financeKeys.all, "approvers"] as const,
  availableUsers: () => [...financeKeys.all, "availableUsers"] as const,
  categories: () => [...financeKeys.all, "categories"] as const,
  suppliers: () => [...financeKeys.all, "suppliers"] as const,
  supplierList: () => [...financeKeys.suppliers(), "list"] as const,
  supplierDetail: (id: string) => [...financeKeys.suppliers(), "detail", id] as const,
  invoices: () => [...financeKeys.all, "invoices"] as const,
  invoiceList: (filters?: InvoiceFilters) => [...financeKeys.invoices(), "list", filters] as const,
  invoiceDetail: (id: string) => [...financeKeys.invoices(), "detail", id] as const,
  receivables: () => [...financeKeys.all, "receivables"] as const,
  receivableList: (filters?: ReceivableFilters) => [...financeKeys.receivables(), "list", filters] as const,
  receivableDetail: (id: string) => [...financeKeys.receivables(), "detail", id] as const,
  recurring: () => [...financeKeys.all, "recurring"] as const,
  dashboard: () => [...financeKeys.all, "dashboard"] as const,
  aging: (direction: string) => [...financeKeys.all, "aging", direction] as const,
  cashFlow: () => [...financeKeys.all, "cashFlow"] as const,
};

// ============================================================================
// Access Hooks
// ============================================================================

export function useHasFinanceAccess() {
  return useQuery({
    queryKey: financeKeys.hasAccess(),
    queryFn: async () => {
      return await checkFinanceAccess();
    },
    staleTime: STALE_TIME,
  });
}

export function useProjectsForFinance() {
  return useQuery({
    queryKey: financeKeys.projects(),
    queryFn: async () => {
      const result = await getProjectsForFinance();
      if (!result.success) throw new Error(result.error || "Failed to fetch projects");
      return result.data!;
    },
    staleTime: STALE_TIME,
  });
}

export function useApprovers() {
  return useQuery({
    queryKey: financeKeys.approvers(),
    queryFn: async () => {
      const result = await getApprovers();
      if (!result.success) throw new Error(result.error || "Failed to fetch approvers");
      return result.data!;
    },
    staleTime: STALE_TIME,
  });
}

export function useAvailableUsers() {
  return useQuery({
    queryKey: financeKeys.availableUsers(),
    queryFn: async () => {
      const result = await getAvailableUsers();
      if (!result.success) throw new Error(result.error || "Failed to fetch users");
      return result.data!;
    },
    staleTime: STALE_TIME,
  });
}

export function useFinanceAccessList() {
  return useQuery({
    queryKey: financeKeys.access(),
    queryFn: async () => {
      const result = await getFinanceAccessList();
      if (!result.success) throw new Error(result.error || "Failed to fetch access list");
      return result.data!;
    },
    staleTime: STALE_TIME,
  });
}

export function useGrantFinanceAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, canApprove }: { userId: string; canApprove: boolean }) => {
      const result = await grantFinanceAccess(userId, canApprove);
      if (!result.success) throw new Error(result.error || "Failed to grant access");
      return result.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.access() });
      toast.success("Finance access granted");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useRevokeFinanceAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const result = await revokeFinanceAccess(userId);
      if (!result.success) throw new Error(result.error || "Failed to revoke access");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.access() });
      toast.success("Finance access revoked");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateFinanceApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, canApprove }: { userId: string; canApprove: boolean }) => {
      const result = await updateFinanceApproval(userId, canApprove);
      if (!result.success) throw new Error(result.error || "Failed to update approval permission");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.access() });
      toast.success("Approval permission updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// ============================================================================
// Category Hooks
// ============================================================================

export function useCategories() {
  return useQuery({
    queryKey: financeKeys.categories(),
    queryFn: async () => {
      const result = await getCategories();
      if (!result.success) throw new Error(result.error || "Failed to fetch categories");
      return result.data!;
    },
    staleTime: STALE_TIME,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const result = await createCategory(input);
      if (!result.success) throw new Error(result.error || "Failed to create category");
      return result.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.categories() });
      toast.success("Category created");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteCategory(id);
      if (!result.success) throw new Error(result.error || "Failed to delete category");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.categories() });
      toast.success("Category deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// ============================================================================
// Supplier Hooks
// ============================================================================

export function useSuppliers() {
  return useQuery({
    queryKey: financeKeys.supplierList(),
    queryFn: async () => {
      const result = await getSuppliers();
      if (!result.success) throw new Error(result.error || "Failed to fetch suppliers");
      return result.data!;
    },
    staleTime: STALE_TIME,
  });
}

export function useSupplier(id: string) {
  return useQuery({
    queryKey: financeKeys.supplierDetail(id),
    queryFn: async () => {
      const result = await getSupplier(id);
      if (!result.success) throw new Error(result.error || "Failed to fetch supplier");
      return result.data!;
    },
    enabled: !!id,
    staleTime: STALE_TIME,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const result = await createSupplier(input);
      if (!result.success) throw new Error(result.error || "Failed to create supplier");
      return result.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.suppliers() });
      toast.success("Supplier created");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Record<string, unknown> & { id: string }) => {
      const result = await updateSupplier(id, input);
      if (!result.success) throw new Error(result.error || "Failed to update supplier");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.suppliers() });
      toast.success("Supplier updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteSupplier(id);
      if (!result.success) throw new Error(result.error || "Failed to delete supplier");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.suppliers() });
      queryClient.invalidateQueries({ queryKey: financeKeys.dashboard() });
      toast.success("Supplier deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// ============================================================================
// Invoice Hooks
// ============================================================================

export function useInvoices(filters?: InvoiceFilters) {
  return useQuery({
    queryKey: financeKeys.invoiceList(filters),
    queryFn: async () => {
      const result = await getInvoices(filters);
      if (!result.success) throw new Error(result.error || "Failed to fetch invoices");
      return result.data!;
    },
    staleTime: STALE_TIME,
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: financeKeys.invoiceDetail(id),
    queryFn: async () => {
      const result = await getInvoice(id);
      if (!result.success) throw new Error(result.error || "Failed to fetch invoice");
      return result.data!;
    },
    enabled: !!id,
    staleTime: STALE_TIME,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const result = await createInvoice(input);
      if (!result.success) throw new Error(result.error || "Failed to create invoice");
      return result.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.invoices() });
      queryClient.invalidateQueries({ queryKey: financeKeys.dashboard() });
      toast.success("Invoice created");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Record<string, unknown> & { id: string }) => {
      const result = await updateInvoice(id, input);
      if (!result.success) throw new Error(result.error || "Failed to update invoice");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.invoices() });
      queryClient.invalidateQueries({ queryKey: financeKeys.dashboard() });
      toast.success("Invoice updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteInvoice(id);
      if (!result.success) throw new Error(result.error || "Failed to delete invoice");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.invoices() });
      queryClient.invalidateQueries({ queryKey: financeKeys.dashboard() });
      toast.success("Invoice deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useBulkApproveInvoices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const result = await bulkApproveInvoices(ids);
      if (!result.success) throw new Error(result.error || "Failed to approve invoices");
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: financeKeys.invoices() });
      queryClient.invalidateQueries({ queryKey: financeKeys.dashboard() });
      toast.success(`${data.approved} invoice${data.approved !== 1 ? "s" : ""} approved`);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useApproveInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await approveInvoice(id);
      if (!result.success) throw new Error(result.error || "Failed to approve invoice");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.invoices() });
      queryClient.invalidateQueries({ queryKey: financeKeys.dashboard() });
      toast.success("Invoice approved");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useRejectInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const result = await rejectInvoice(id, reason);
      if (!result.success) throw new Error(result.error || "Failed to reject invoice");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.invoices() });
      queryClient.invalidateQueries({ queryKey: financeKeys.dashboard() });
      toast.success("Invoice rejected");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// ============================================================================
// Receivable Hooks
// ============================================================================

export function useReceivables(filters?: ReceivableFilters) {
  return useQuery({
    queryKey: financeKeys.receivableList(filters),
    queryFn: async () => {
      const result = await getReceivables(filters);
      if (!result.success) throw new Error(result.error || "Failed to fetch receivables");
      return result.data!;
    },
    staleTime: STALE_TIME,
  });
}

export function useReceivable(id: string) {
  return useQuery({
    queryKey: financeKeys.receivableDetail(id),
    queryFn: async () => {
      const result = await getReceivable(id);
      if (!result.success) throw new Error(result.error || "Failed to fetch receivable");
      return result.data!;
    },
    enabled: !!id,
    staleTime: STALE_TIME,
  });
}

export function useCreateReceivable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const result = await createReceivable(input);
      if (!result.success) throw new Error(result.error || "Failed to create receivable");
      return result.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.receivables() });
      queryClient.invalidateQueries({ queryKey: financeKeys.dashboard() });
      toast.success("Receivable created");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateReceivable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Record<string, unknown> & { id: string }) => {
      const result = await updateReceivable(id, input);
      if (!result.success) throw new Error(result.error || "Failed to update receivable");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.receivables() });
      queryClient.invalidateQueries({ queryKey: financeKeys.dashboard() });
      toast.success("Receivable updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteReceivable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteReceivable(id);
      if (!result.success) throw new Error(result.error || "Failed to delete receivable");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.receivables() });
      queryClient.invalidateQueries({ queryKey: financeKeys.dashboard() });
      toast.success("Receivable deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// ============================================================================
// Payment Hooks
// ============================================================================

export function useRecordPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      direction: "outgoing" | "incoming";
      invoice_id?: string;
      receivable_id?: string;
      amount: number;
      currency: string;
      payment_date: string;
      payment_method: string;
      reference_number?: string;
      notes?: string;
    }) => {
      const result = await recordPayment(input);
      if (!result.success) throw new Error(result.error || "Failed to record payment");
      return result.data!;
    },
    onSuccess: (_, variables) => {
      if (variables.invoice_id) {
        queryClient.invalidateQueries({ queryKey: financeKeys.invoiceDetail(variables.invoice_id) });
      }
      if (variables.receivable_id) {
        queryClient.invalidateQueries({ queryKey: financeKeys.receivableDetail(variables.receivable_id) });
      }
      queryClient.invalidateQueries({ queryKey: financeKeys.invoices() });
      queryClient.invalidateQueries({ queryKey: financeKeys.receivables() });
      queryClient.invalidateQueries({ queryKey: financeKeys.dashboard() });
      queryClient.invalidateQueries({ queryKey: financeKeys.cashFlow() });
      toast.success("Payment recorded");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deletePayment(id);
      if (!result.success) throw new Error(result.error || "Failed to delete payment");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.invoices() });
      queryClient.invalidateQueries({ queryKey: financeKeys.receivables() });
      queryClient.invalidateQueries({ queryKey: financeKeys.dashboard() });
      queryClient.invalidateQueries({ queryKey: financeKeys.cashFlow() });
      toast.success("Payment deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// ============================================================================
// Recurring Template Hooks
// ============================================================================

export function useRecurringTemplates() {
  return useQuery({
    queryKey: financeKeys.recurring(),
    queryFn: async () => {
      const result = await getRecurringTemplates();
      if (!result.success) throw new Error(result.error || "Failed to fetch recurring templates");
      return result.data!;
    },
    staleTime: STALE_TIME,
  });
}

export function useCreateRecurringTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const result = await createRecurringTemplate(input);
      if (!result.success) throw new Error(result.error || "Failed to create recurring template");
      return result.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.recurring() });
      toast.success("Recurring template created");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateRecurringTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Record<string, unknown> & { id: string }) => {
      const result = await updateRecurringTemplate(id, input);
      if (!result.success) throw new Error(result.error || "Failed to update recurring template");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.recurring() });
      toast.success("Recurring template updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteRecurringTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteRecurringTemplate(id);
      if (!result.success) throw new Error(result.error || "Failed to delete recurring template");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.recurring() });
      toast.success("Recurring template deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useProcessRecurringTemplates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const result = await processRecurringTemplates();
      if (!result.success) throw new Error(result.error || "Failed to process recurring templates");
      return result.data!;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: financeKeys.recurring() });
      queryClient.invalidateQueries({ queryKey: financeKeys.invoices() });
      queryClient.invalidateQueries({ queryKey: financeKeys.dashboard() });
      toast.success(`${data.created} invoice${data.created !== 1 ? "s" : ""} created from recurring templates`);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// ============================================================================
// Document Hooks
// ============================================================================

export function useUploadFinanceDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      entityType,
      entityId,
      files,
    }: {
      entityType: "invoice" | "receivable";
      entityId: string;
      files: { name: string; type: string; data: string }[];
    }) => {
      const result = await uploadFinanceDocument(entityType, entityId, files);
      if (!result.success) throw new Error(result.error || "Failed to upload document");
      return result.data!;
    },
    onSuccess: (_, variables) => {
      if (variables.entityType === "invoice") {
        queryClient.invalidateQueries({ queryKey: financeKeys.invoiceDetail(variables.entityId) });
      } else {
        queryClient.invalidateQueries({ queryKey: financeKeys.receivableDetail(variables.entityId) });
      }
      toast.success("Document uploaded");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteFinanceDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteFinanceDocument(id);
      if (!result.success) throw new Error(result.error || "Failed to delete document");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.invoices() });
      queryClient.invalidateQueries({ queryKey: financeKeys.receivables() });
      toast.success("Document deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// ============================================================================
// Cron Schedule Hooks
// ============================================================================

export function useDigestSchedule() {
  return useQuery({
    queryKey: [...financeKeys.all, "digestSchedule"] as const,
    queryFn: async () => {
      const result = await getDigestSchedule();
      if (!result.success) throw new Error(result.error || "Failed to fetch schedule");
      return result.data;
    },
    staleTime: STALE_TIME,
  });
}

export function useUpdateDigestSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ day, hourUtc }: { day: number; hourUtc: number }) => {
      const result = await updateDigestSchedule(day, hourUtc);
      if (!result.success) throw new Error(result.error || "Failed to update schedule");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...financeKeys.all, "digestSchedule"] });
      toast.success("Digest schedule updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// ============================================================================
// Notification Hooks
// ============================================================================

export function useSendManualSummary() {
  return useMutation({
    mutationFn: async (options: {
      dateRange: "this_week" | "rest_of_week" | "next_week" | "custom";
      customStart?: string;
      customEnd?: string;
      includeOverdue: boolean;
      includeIncoming: boolean;
      note?: string;
    }) => {
      const result = await sendManualSummary(options);
      if (!result.success) throw new Error(result.error || "Failed to send summary");
      return result.data!;
    },
    onSuccess: (data) => {
      toast.success(`Payment summary sent to ${data.sent} recipient${data.sent !== 1 ? "s" : ""}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useNotifyTeamUrgent() {
  return useMutation({
    mutationFn: async ({ invoiceIds, note }: { invoiceIds: string[]; note?: string }) => {
      const result = await notifyTeamUrgent(invoiceIds, note);
      if (!result.success) throw new Error(result.error || "Failed to notify team");
      return result.data!;
    },
    onSuccess: (data) => {
      toast.success(`Urgent notification sent to ${data.sent} recipient${data.sent !== 1 ? "s" : ""}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// ============================================================================
// Excel Export Hooks
// ============================================================================

function downloadExcel(base64: string, filename: string) {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function useExportInvoices() {
  return useMutation({
    mutationFn: async (filters?: InvoiceFilters) => {
      const result = await exportInvoicesToExcel(filters);
      if (!result.success) throw new Error(result.error || "Failed to export invoices");
      return result.data!;
    },
    onSuccess: (data) => {
      const date = new Date().toISOString().split("T")[0];
      downloadExcel(data, `Formula_Invoices_${date}.xlsx`);
      toast.success("Invoices exported");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useExportReceivables() {
  return useMutation({
    mutationFn: async (filters?: ReceivableFilters) => {
      const result = await exportReceivablesToExcel(filters);
      if (!result.success) throw new Error(result.error || "Failed to export receivables");
      return result.data!;
    },
    onSuccess: (data) => {
      const date = new Date().toISOString().split("T")[0];
      downloadExcel(data, `Formula_Receivables_${date}.xlsx`);
      toast.success("Receivables exported");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useExportPaymentSchedule() {
  return useMutation({
    mutationFn: async () => {
      const result = await exportPaymentScheduleToExcel();
      if (!result.success) throw new Error(result.error || "Failed to export payment schedule");
      return result.data!;
    },
    onSuccess: (data) => {
      const date = new Date().toISOString().split("T")[0];
      downloadExcel(data, `Formula_Payment_Schedule_${date}.xlsx`);
      toast.success("Payment schedule exported");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

// ============================================================================
// Dashboard Hooks
// ============================================================================

export function useFinanceDashboard() {
  return useQuery({
    queryKey: financeKeys.dashboard(),
    queryFn: async () => {
      const result = await getFinanceDashboardStats();
      if (!result.success) throw new Error(result.error || "Failed to fetch dashboard stats");
      return result.data!;
    },
    staleTime: STALE_TIME,
  });
}

export function useAgingReport(direction: "payable" | "receivable") {
  return useQuery({
    queryKey: financeKeys.aging(direction),
    queryFn: async () => {
      const result = await getAgingReport(direction);
      if (!result.success) throw new Error(result.error || "Failed to fetch aging report");
      return result.data!;
    },
    staleTime: STALE_TIME,
  });
}

export function useCashFlowData() {
  return useQuery({
    queryKey: financeKeys.cashFlow(),
    queryFn: async () => {
      const result = await getCashFlowData();
      if (!result.success) throw new Error(result.error || "Failed to fetch cash flow data");
      return result.data!;
    },
    staleTime: STALE_TIME,
  });
}
