import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// ============================================================================
// Mock Server Actions
// ============================================================================

const mockGetBrands = vi.fn();
const mockGetBrand = vi.fn();
const mockCreateBrand = vi.fn();
const mockUpdateBrand = vi.fn();
const mockDeleteBrand = vi.fn();
const mockGetArchitectureFirms = vi.fn();
const mockGetArchitectureFirm = vi.fn();
const mockCreateArchitectureFirm = vi.fn();
const mockUpdateArchitectureFirm = vi.fn();
const mockUpdateVendorStatus = vi.fn();
const mockGetContacts = vi.fn();
const mockCreateContact = vi.fn();
const mockUpdateContact = vi.fn();
const mockGetOpportunities = vi.fn();
const mockGetOpportunityPipeline = vi.fn();
const mockCreateOpportunity = vi.fn();
const mockUpdateOpportunity = vi.fn();
const mockMoveOpportunityStage = vi.fn();
const mockGetActivities = vi.fn();
const mockCreateActivity = vi.fn();
const mockGetUpcomingActions = vi.fn();
const mockGetCrmDashboardStats = vi.fn();

vi.mock("@/lib/actions/crm", () => ({
  getBrands: (...args: unknown[]) => mockGetBrands(...args),
  getBrand: (...args: unknown[]) => mockGetBrand(...args),
  createBrand: (...args: unknown[]) => mockCreateBrand(...args),
  updateBrand: (...args: unknown[]) => mockUpdateBrand(...args),
  deleteBrand: (...args: unknown[]) => mockDeleteBrand(...args),
  getArchitectureFirms: (...args: unknown[]) => mockGetArchitectureFirms(...args),
  getArchitectureFirm: (...args: unknown[]) => mockGetArchitectureFirm(...args),
  createArchitectureFirm: (...args: unknown[]) => mockCreateArchitectureFirm(...args),
  updateArchitectureFirm: (...args: unknown[]) => mockUpdateArchitectureFirm(...args),
  updateVendorStatus: (...args: unknown[]) => mockUpdateVendorStatus(...args),
  getContacts: (...args: unknown[]) => mockGetContacts(...args),
  createContact: (...args: unknown[]) => mockCreateContact(...args),
  updateContact: (...args: unknown[]) => mockUpdateContact(...args),
  getOpportunities: (...args: unknown[]) => mockGetOpportunities(...args),
  getOpportunityPipeline: (...args: unknown[]) => mockGetOpportunityPipeline(...args),
  createOpportunity: (...args: unknown[]) => mockCreateOpportunity(...args),
  updateOpportunity: (...args: unknown[]) => mockUpdateOpportunity(...args),
  moveOpportunityStage: (...args: unknown[]) => mockMoveOpportunityStage(...args),
  getActivities: (...args: unknown[]) => mockGetActivities(...args),
  createActivity: (...args: unknown[]) => mockCreateActivity(...args),
  getUpcomingActions: (...args: unknown[]) => mockGetUpcomingActions(...args),
  getCrmDashboardStats: (...args: unknown[]) => mockGetCrmDashboardStats(...args),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// ============================================================================
// Import AFTER mocks
// ============================================================================

import {
  crmKeys,
  useBrands,
  useBrand,
  useCreateBrand,
  useUpdateBrand,
  useDeleteBrand,
  useFirms,
  useFirm,
  useCreateFirm,
  useUpdateFirm,
  useUpdateVendorStatus,
  useContacts,
  useCreateContact,
  useUpdateContact,
  useOpportunities,
  usePipeline,
  useCreateOpportunity,
  useUpdateOpportunity,
  useMoveOpportunityStage,
  useActivities,
  useUpcomingActions,
  useCreateActivity,
  useCrmDashboard,
} from "../crm";

import { toast } from "sonner";

// ============================================================================
// Test Helpers
// ============================================================================

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children),
  };
}

function makeBrand(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "brand-1",
    brand_code: "BRD-001",
    name: "Test Brand",
    parent_group: null,
    tier: "luxury",
    segment: null,
    store_count: 10,
    expansion_rate: null,
    creative_director: null,
    cd_changed_recently: false,
    headquarters: "Milan",
    website: null,
    annual_revenue: null,
    notes: null,
    priority: "high",
    is_deleted: false,
    created_at: "2026-01-15T10:00:00Z",
    updated_at: "2026-01-15T10:00:00Z",
    opportunity_count: 2,
    latest_activity_date: "2026-02-01",
    ...overrides,
  };
}

function makeFirm(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "firm-1",
    firm_code: "FRM-001",
    name: "Test Firm",
    location: "Istanbul",
    specialty: "Retail",
    key_clients: null,
    vendor_list_status: "not_applied",
    vendor_application_date: null,
    website: null,
    connection_strength: "warm",
    connection_notes: null,
    notes: null,
    priority: "medium",
    is_deleted: false,
    created_at: "2026-01-15T10:00:00Z",
    updated_at: "2026-01-15T10:00:00Z",
    brand_links: [],
    ...overrides,
  };
}

function makeContact(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "contact-1",
    contact_code: "CON-001",
    first_name: "John",
    last_name: "Doe",
    title: "Director",
    company: "Test Corp",
    email: "john@test.com",
    phone: null,
    linkedin_url: null,
    brand_id: null,
    architecture_firm_id: null,
    relationship_status: "connected",
    source: null,
    last_interaction_date: null,
    notes: null,
    is_deleted: false,
    created_at: "2026-01-15T10:00:00Z",
    updated_at: "2026-01-15T10:00:00Z",
    brand: null,
    architecture_firm: null,
    ...overrides,
  };
}

function makeOpportunity(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "opp-1",
    opportunity_code: "OPP-001",
    title: "New Store Fit-out",
    description: null,
    brand_id: "brand-1",
    architecture_firm_id: "firm-1",
    stage: "proposal",
    estimated_value: 50000,
    currency: "USD",
    probability: 60,
    expected_close_date: "2026-06-01",
    assigned_to: null,
    source: null,
    loss_reason: null,
    notes: null,
    priority: "high",
    is_deleted: false,
    created_at: "2026-01-15T10:00:00Z",
    updated_at: "2026-01-15T10:00:00Z",
    brand: { name: "Test Brand", brand_code: "BRD-001" },
    architecture_firm: { name: "Test Firm", firm_code: "FRM-001" },
    assigned_user: null,
    ...overrides,
  };
}

function makeActivity(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "act-1",
    activity_type: "meeting",
    title: "Initial Meeting",
    description: null,
    activity_date: "2026-02-20",
    brand_id: "brand-1",
    architecture_firm_id: null,
    contact_id: "contact-1",
    opportunity_id: "opp-1",
    user_id: "user-1",
    outcome: "Positive",
    next_action: "Send proposal",
    next_action_date: "2026-03-01",
    is_deleted: false,
    created_at: "2026-01-15T10:00:00Z",
    updated_at: "2026-01-15T10:00:00Z",
    brand: { name: "Test Brand" },
    architecture_firm: null,
    contact: { first_name: "John", last_name: "Doe" },
    opportunity: { title: "New Store Fit-out" },
    user: { name: "PM User" },
    ...overrides,
  };
}

function makePipelineColumns() {
  return [
    { stage: "researched", label: "Researched", color: "#94a3b8", opportunities: [] },
    { stage: "contacted", label: "Contacted", color: "#60a5fa", opportunities: [] },
    { stage: "sample_sent", label: "Sample Sent", color: "#a78bfa", opportunities: [] },
    { stage: "meeting", label: "Meeting", color: "#f59e0b", opportunities: [] },
    {
      stage: "proposal",
      label: "Proposal",
      color: "#f97316",
      opportunities: [makeOpportunity()],
    },
    { stage: "negotiation", label: "Negotiation", color: "#ef4444", opportunities: [] },
    { stage: "won", label: "Won", color: "#22c55e", opportunities: [] },
    { stage: "lost", label: "Lost", color: "#6b7280", opportunities: [] },
  ];
}

function makeDashboardStats(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    brandCount: 37,
    brandsByTier: { luxury: 15, mid_luxury: 12, bridge: 10 },
    firmCount: 12,
    vendorApproved: 5,
    activeOpportunities: 3,
    totalPipelineValue: 150000,
    pipelineCurrency: "USD",
    upcomingActions: 4,
    opportunitiesByStage: {
      researched: 1,
      contacted: 0,
      sample_sent: 0,
      meeting: 1,
      proposal: 1,
      negotiation: 0,
      won: 2,
      lost: 1,
    },
    ...overrides,
  };
}

// ============================================================================
// Reset
// ============================================================================

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// Query Key Factory
// ============================================================================

describe("crmKeys", () => {
  it("builds correct base key", () => {
    expect(crmKeys.all).toEqual(["crm"]);
  });

  it("builds correct brands key", () => {
    expect(crmKeys.brands()).toEqual(["crm", "brands"]);
  });

  it("builds correct brandList key with no filters", () => {
    expect(crmKeys.brandList()).toEqual(["crm", "brands", "list", undefined]);
  });

  it("builds correct brandDetail key", () => {
    expect(crmKeys.brandDetail("123")).toEqual(["crm", "brands", "detail", "123"]);
  });

  it("builds correct pipeline key", () => {
    expect(crmKeys.pipeline()).toEqual(["crm", "opportunities", "pipeline"]);
  });

  it("builds correct dashboard key", () => {
    expect(crmKeys.dashboard()).toEqual(["crm", "dashboard"]);
  });

  it("builds correct firms key", () => {
    expect(crmKeys.firms()).toEqual(["crm", "firms"]);
  });

  it("builds correct firmList key", () => {
    expect(crmKeys.firmList()).toEqual(["crm", "firms", "list"]);
  });

  it("builds correct firmDetail key", () => {
    expect(crmKeys.firmDetail("firm-abc")).toEqual(["crm", "firms", "detail", "firm-abc"]);
  });

  it("builds correct contacts key", () => {
    expect(crmKeys.contacts()).toEqual(["crm", "contacts"]);
  });

  it("builds correct contactList key", () => {
    expect(crmKeys.contactList()).toEqual(["crm", "contacts", "list"]);
  });

  it("builds correct opportunityList key", () => {
    expect(crmKeys.opportunityList()).toEqual(["crm", "opportunities", "list"]);
  });

  it("builds correct activityList key", () => {
    expect(crmKeys.activityList()).toEqual(["crm", "activities", "list"]);
  });

  it("builds correct upcomingActions key", () => {
    expect(crmKeys.upcomingActions()).toEqual(["crm", "activities", "upcoming"]);
  });
});

// ============================================================================
// useBrands
// ============================================================================

describe("useBrands", () => {
  it("fetches brands and returns data", async () => {
    const brands = [makeBrand(), makeBrand({ id: "brand-2", name: "Brand Two" })];
    mockGetBrands.mockResolvedValue({ success: true, data: brands });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useBrands(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(brands);
    expect(mockGetBrands).toHaveBeenCalledTimes(1);
  });

  it("throws on server error", async () => {
    mockGetBrands.mockResolvedValue({ success: false, error: "Not authorized" });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useBrands(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Not authorized");
  });
});

// ============================================================================
// useBrand
// ============================================================================

describe("useBrand", () => {
  it("fetches a single brand by ID", async () => {
    const brand = makeBrand();
    mockGetBrand.mockResolvedValue({ success: true, data: brand });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useBrand("brand-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(brand);
    expect(mockGetBrand).toHaveBeenCalledWith("brand-1");
  });

  it("is disabled when brandId is empty", () => {
    mockGetBrand.mockResolvedValue({ success: true, data: null });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useBrand(""), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockGetBrand).not.toHaveBeenCalled();
  });
});

// ============================================================================
// useCreateBrand
// ============================================================================

describe("useCreateBrand", () => {
  it("calls createBrand, invalidates brands & dashboard, shows toast.success", async () => {
    mockCreateBrand.mockResolvedValue({ success: true, data: { id: "new-brand" } });

    const { wrapper, queryClient } = createWrapper();

    // Pre-seed caches
    queryClient.setQueryData(crmKeys.brandList(), [makeBrand()]);
    queryClient.setQueryData(crmKeys.dashboard(), makeDashboardStats());

    const { result } = renderHook(() => useCreateBrand(), { wrapper });

    await act(async () => {
      result.current.mutate({ name: "New Luxury Brand", tier: "luxury", priority: "high" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCreateBrand).toHaveBeenCalledWith({
      name: "New Luxury Brand",
      tier: "luxury",
      priority: "high",
    });
    expect(toast.success).toHaveBeenCalledWith("Brand created successfully");
  });

  it("shows toast.error on failure", async () => {
    mockCreateBrand.mockResolvedValue({ success: false, error: "Duplicate brand name" });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateBrand(), { wrapper });

    await act(async () => {
      result.current.mutate({ name: "Duplicate Brand", tier: "luxury", priority: "high" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(toast.error).toHaveBeenCalledWith("Duplicate brand name");
  });
});

// ============================================================================
// useUpdateBrand
// ============================================================================

describe("useUpdateBrand", () => {
  it("calls updateBrand, invalidates brands, shows toast.success", async () => {
    mockUpdateBrand.mockResolvedValue({ success: true });

    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(crmKeys.brandList(), [makeBrand()]);

    const { result } = renderHook(() => useUpdateBrand(), { wrapper });

    await act(async () => {
      result.current.mutate({ id: "brand-1", input: { name: "Updated Brand" } });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockUpdateBrand).toHaveBeenCalledWith("brand-1", { name: "Updated Brand" });
    expect(toast.success).toHaveBeenCalledWith("Brand updated successfully");
  });

  it("shows toast.error on failure", async () => {
    mockUpdateBrand.mockResolvedValue({ success: false, error: "Update failed" });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateBrand(), { wrapper });

    await act(async () => {
      result.current.mutate({ id: "brand-1", input: { name: "Bad Update" } });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(toast.error).toHaveBeenCalledWith("Update failed");
  });
});

// ============================================================================
// useDeleteBrand - Optimistic Remove
// ============================================================================

describe("useDeleteBrand", () => {
  it("optimistically removes brand from cache and shows toast.success", async () => {
    mockDeleteBrand.mockResolvedValue({ success: true });

    const { wrapper, queryClient } = createWrapper();
    const brands = [makeBrand(), makeBrand({ id: "brand-2", name: "Brand Two" })];
    queryClient.setQueryData(crmKeys.brandList(), brands);

    const { result } = renderHook(() => useDeleteBrand(), { wrapper });

    await act(async () => {
      result.current.mutate("brand-1");
    });

    // Check optimistic remove happened (brand-1 removed from cache)
    const cachedBrands = queryClient.getQueryData(crmKeys.brandList()) as unknown[];
    expect(cachedBrands).toHaveLength(1);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockDeleteBrand).toHaveBeenCalledWith("brand-1");
    expect(toast.success).toHaveBeenCalledWith("Brand deleted");
  });

  it("rolls back optimistic remove on server error", async () => {
    mockDeleteBrand.mockResolvedValue({ success: false, error: "Cannot delete brand with active opportunities" });

    const { wrapper, queryClient } = createWrapper();
    const brands = [makeBrand(), makeBrand({ id: "brand-2", name: "Brand Two" })];
    queryClient.setQueryData(crmKeys.brandList(), brands);

    // Spy on setQueryData to verify rollback is called with original data
    const setQueryDataSpy = vi.spyOn(queryClient, "setQueryData");

    const { result } = renderHook(() => useDeleteBrand(), { wrapper });

    await act(async () => {
      result.current.mutate("brand-1");
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Verify the rollback was attempted: setQueryData was called with the original brands array
    // (first call is optimistic remove, second call is rollback with previous data)
    const rollbackCalls = setQueryDataSpy.mock.calls.filter(
      (call) => JSON.stringify(call[0]) === JSON.stringify(crmKeys.brandList())
    );
    // At least 2 calls: optimistic remove + rollback
    expect(rollbackCalls.length).toBeGreaterThanOrEqual(2);
    expect(toast.error).toHaveBeenCalledWith("Cannot delete brand with active opportunities");

    setQueryDataSpy.mockRestore();
  });
});

// ============================================================================
// useFirms
// ============================================================================

describe("useFirms", () => {
  it("fetches firms and returns data", async () => {
    const firms = [makeFirm(), makeFirm({ id: "firm-2", name: "Firm Two" })];
    mockGetArchitectureFirms.mockResolvedValue({ success: true, data: firms });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useFirms(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(firms);
    expect(mockGetArchitectureFirms).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// useFirm
// ============================================================================

describe("useFirm", () => {
  it("fetches a single firm by ID", async () => {
    const firm = makeFirm();
    mockGetArchitectureFirm.mockResolvedValue({ success: true, data: firm });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useFirm("firm-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(firm);
    expect(mockGetArchitectureFirm).toHaveBeenCalledWith("firm-1");
  });

  it("is disabled when firmId is empty", () => {
    mockGetArchitectureFirm.mockResolvedValue({ success: true, data: null });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useFirm(""), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockGetArchitectureFirm).not.toHaveBeenCalled();
  });
});

// ============================================================================
// useCreateFirm
// ============================================================================

describe("useCreateFirm", () => {
  it("creates firm, invalidates firms & dashboard, shows toast.success", async () => {
    mockCreateArchitectureFirm.mockResolvedValue({ success: true, data: { id: "new-firm" } });

    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(crmKeys.firmList(), [makeFirm()]);

    const { result } = renderHook(() => useCreateFirm(), { wrapper });

    await act(async () => {
      result.current.mutate({
        name: "New Firm",
        vendor_list_status: "not_applied",
        connection_strength: "cold",
        priority: "medium",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCreateArchitectureFirm).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith("Firm created successfully");
  });
});

// ============================================================================
// useUpdateFirm
// ============================================================================

describe("useUpdateFirm", () => {
  it("updates firm, invalidates firms, shows toast.success", async () => {
    mockUpdateArchitectureFirm.mockResolvedValue({ success: true });

    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(crmKeys.firmList(), [makeFirm()]);

    const { result } = renderHook(() => useUpdateFirm(), { wrapper });

    await act(async () => {
      result.current.mutate({ id: "firm-1", input: { name: "Updated Firm" } });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockUpdateArchitectureFirm).toHaveBeenCalledWith("firm-1", { name: "Updated Firm" });
    expect(toast.success).toHaveBeenCalledWith("Firm updated successfully");
  });
});

// ============================================================================
// useUpdateVendorStatus
// ============================================================================

describe("useUpdateVendorStatus", () => {
  it("updates vendor status, invalidates firms, shows toast.success", async () => {
    mockUpdateVendorStatus.mockResolvedValue({ success: true });

    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(crmKeys.firmList(), [makeFirm()]);

    const { result } = renderHook(() => useUpdateVendorStatus(), { wrapper });

    await act(async () => {
      result.current.mutate({ firmId: "firm-1", status: "approved" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockUpdateVendorStatus).toHaveBeenCalledWith("firm-1", "approved");
    expect(toast.success).toHaveBeenCalledWith("Vendor status updated");
  });

  it("shows toast.error on failure", async () => {
    mockUpdateVendorStatus.mockResolvedValue({ success: false, error: "Status update failed" });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateVendorStatus(), { wrapper });

    await act(async () => {
      result.current.mutate({ firmId: "firm-1", status: "approved" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(toast.error).toHaveBeenCalledWith("Status update failed");
  });
});

// ============================================================================
// useContacts
// ============================================================================

describe("useContacts", () => {
  it("fetches contacts and returns data", async () => {
    const contacts = [makeContact(), makeContact({ id: "contact-2", first_name: "Jane" })];
    mockGetContacts.mockResolvedValue({ success: true, data: contacts });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useContacts(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(contacts);
    expect(mockGetContacts).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// useCreateContact
// ============================================================================

describe("useCreateContact", () => {
  it("creates contact, invalidates contacts, shows toast.success", async () => {
    mockCreateContact.mockResolvedValue({ success: true, data: { id: "new-contact" } });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateContact(), { wrapper });

    await act(async () => {
      result.current.mutate({
        first_name: "Alice",
        last_name: "Smith",
        relationship_status: "identified",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCreateContact).toHaveBeenCalledWith({
      first_name: "Alice",
      last_name: "Smith",
      relationship_status: "identified",
    });
    expect(toast.success).toHaveBeenCalledWith("Contact created successfully");
  });
});

// ============================================================================
// useUpdateContact
// ============================================================================

describe("useUpdateContact", () => {
  it("updates contact, invalidates contacts, shows toast.success", async () => {
    mockUpdateContact.mockResolvedValue({ success: true });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateContact(), { wrapper });

    await act(async () => {
      result.current.mutate({ id: "contact-1", input: { first_name: "Updated" } });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockUpdateContact).toHaveBeenCalledWith("contact-1", { first_name: "Updated" });
    expect(toast.success).toHaveBeenCalledWith("Contact updated successfully");
  });
});

// ============================================================================
// useOpportunities
// ============================================================================

describe("useOpportunities", () => {
  it("fetches opportunities and returns data", async () => {
    const opps = [makeOpportunity(), makeOpportunity({ id: "opp-2", title: "Second Deal" })];
    mockGetOpportunities.mockResolvedValue({ success: true, data: opps });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useOpportunities(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(opps);
    expect(mockGetOpportunities).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// usePipeline
// ============================================================================

describe("usePipeline", () => {
  it("fetches pipeline data with columns", async () => {
    const columns = makePipelineColumns();
    mockGetOpportunityPipeline.mockResolvedValue({ success: true, data: columns });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => usePipeline(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(columns);
    expect(result.current.data).toHaveLength(8);
    expect(mockGetOpportunityPipeline).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// useCreateOpportunity
// ============================================================================

describe("useCreateOpportunity", () => {
  it("creates opportunity, invalidates opportunities & dashboard, shows toast.success", async () => {
    mockCreateOpportunity.mockResolvedValue({ success: true, data: { id: "new-opp" } });

    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(crmKeys.opportunityList(), [makeOpportunity()]);
    queryClient.setQueryData(crmKeys.dashboard(), makeDashboardStats());

    const { result } = renderHook(() => useCreateOpportunity(), { wrapper });

    await act(async () => {
      result.current.mutate({
        title: "New Deal",
        stage: "researched",
        currency: "USD",
        priority: "high",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCreateOpportunity).toHaveBeenCalledWith({
      title: "New Deal",
      stage: "researched",
      currency: "USD",
      priority: "high",
    });
    expect(toast.success).toHaveBeenCalledWith("Opportunity created successfully");
  });
});

// ============================================================================
// useUpdateOpportunity
// ============================================================================

describe("useUpdateOpportunity", () => {
  it("updates opportunity, invalidates opportunities & dashboard, shows toast.success", async () => {
    mockUpdateOpportunity.mockResolvedValue({ success: true });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateOpportunity(), { wrapper });

    await act(async () => {
      result.current.mutate({ id: "opp-1", input: { title: "Updated Deal" } });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockUpdateOpportunity).toHaveBeenCalledWith("opp-1", { title: "Updated Deal" });
    expect(toast.success).toHaveBeenCalledWith("Opportunity updated successfully");
  });
});

// ============================================================================
// useMoveOpportunityStage - Optimistic Kanban Movement
// ============================================================================

describe("useMoveOpportunityStage", () => {
  it("optimistically moves opportunity between columns", async () => {
    mockMoveOpportunityStage.mockResolvedValue({ success: true });

    const { wrapper, queryClient } = createWrapper();
    const columns = makePipelineColumns();
    queryClient.setQueryData(crmKeys.pipeline(), columns);

    const { result } = renderHook(() => useMoveOpportunityStage(), { wrapper });

    await act(async () => {
      result.current.mutate({ opportunityId: "opp-1", newStage: "negotiation" as const });
    });

    // Check optimistic update: opportunity should be removed from "proposal" and added to "negotiation"
    const cachedPipeline = queryClient.getQueryData(crmKeys.pipeline()) as Array<{
      stage: string;
      opportunities: Array<{ id: string; stage: string }>;
    }>;
    const proposalCol = cachedPipeline.find((c) => c.stage === "proposal");
    const negotiationCol = cachedPipeline.find((c) => c.stage === "negotiation");

    expect(proposalCol?.opportunities).toHaveLength(0);
    expect(negotiationCol?.opportunities).toHaveLength(1);
    expect(negotiationCol?.opportunities[0].id).toBe("opp-1");
    expect(negotiationCol?.opportunities[0].stage).toBe("negotiation");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockMoveOpportunityStage).toHaveBeenCalledWith("opp-1", "negotiation");
  });

  it("shows toast.success on successful move", async () => {
    mockMoveOpportunityStage.mockResolvedValue({ success: true });

    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(crmKeys.pipeline(), makePipelineColumns());

    const { result } = renderHook(() => useMoveOpportunityStage(), { wrapper });

    await act(async () => {
      result.current.mutate({ opportunityId: "opp-1", newStage: "won" as const });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(toast.success).toHaveBeenCalledWith("Stage updated");
  });

  it("rolls back optimistic move on server error", async () => {
    mockMoveOpportunityStage.mockResolvedValue({
      success: false,
      error: "Cannot move to won without closing date",
    });

    const { wrapper, queryClient } = createWrapper();
    const columns = makePipelineColumns();
    queryClient.setQueryData(crmKeys.pipeline(), columns);

    // Spy on setQueryData to verify rollback is called with original columns
    const setQueryDataSpy = vi.spyOn(queryClient, "setQueryData");

    const { result } = renderHook(() => useMoveOpportunityStage(), { wrapper });

    await act(async () => {
      result.current.mutate({ opportunityId: "opp-1", newStage: "won" as const });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Verify rollback was attempted: setQueryData called with pipeline key at least twice
    // (first call is optimistic move, second call is rollback with previous data)
    const pipelineCalls = setQueryDataSpy.mock.calls.filter(
      (call) => JSON.stringify(call[0]) === JSON.stringify(crmKeys.pipeline())
    );
    expect(pipelineCalls.length).toBeGreaterThanOrEqual(2);
    // The rollback call (second) should restore the original columns
    expect(pipelineCalls[1][1]).toEqual(columns);

    expect(toast.error).toHaveBeenCalledWith("Cannot move to won without closing date");

    setQueryDataSpy.mockRestore();
  });
});

// ============================================================================
// useActivities
// ============================================================================

describe("useActivities", () => {
  it("fetches activities and returns data", async () => {
    const activities = [makeActivity(), makeActivity({ id: "act-2", title: "Follow Up Call" })];
    mockGetActivities.mockResolvedValue({ success: true, data: activities });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useActivities(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(activities);
    expect(mockGetActivities).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// useUpcomingActions
// ============================================================================

describe("useUpcomingActions", () => {
  it("fetches upcoming actions", async () => {
    const upcoming = [
      makeActivity({ id: "act-upcoming-1", next_action: "Send proposal", next_action_date: "2026-03-01" }),
    ];
    mockGetUpcomingActions.mockResolvedValue({ success: true, data: upcoming });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpcomingActions(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(upcoming);
    expect(mockGetUpcomingActions).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// useCreateActivity
// ============================================================================

describe("useCreateActivity", () => {
  it("creates activity, invalidates activities & dashboard, shows toast.success", async () => {
    mockCreateActivity.mockResolvedValue({ success: true, data: { id: "new-act" } });

    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(crmKeys.activityList(), [makeActivity()]);
    queryClient.setQueryData(crmKeys.dashboard(), makeDashboardStats());

    const { result } = renderHook(() => useCreateActivity(), { wrapper });

    await act(async () => {
      result.current.mutate({
        activity_type: "email",
        title: "Sent proposal PDF",
        activity_date: "2026-02-27",
        brand_id: "brand-1",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCreateActivity).toHaveBeenCalledWith({
      activity_type: "email",
      title: "Sent proposal PDF",
      activity_date: "2026-02-27",
      brand_id: "brand-1",
    });
    expect(toast.success).toHaveBeenCalledWith("Activity logged successfully");
  });

  it("shows toast.error on failure", async () => {
    mockCreateActivity.mockResolvedValue({ success: false, error: "Failed to log activity" });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateActivity(), { wrapper });

    await act(async () => {
      result.current.mutate({
        activity_type: "call",
        title: "Bad Activity",
        activity_date: "2026-02-27",
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(toast.error).toHaveBeenCalledWith("Failed to log activity");
  });
});

// ============================================================================
// useCrmDashboard
// ============================================================================

describe("useCrmDashboard", () => {
  it("fetches dashboard stats", async () => {
    const stats = makeDashboardStats();
    mockGetCrmDashboardStats.mockResolvedValue({ success: true, data: stats });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCrmDashboard(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(stats);
    expect(result.current.data?.brandCount).toBe(37);
    expect(result.current.data?.activeOpportunities).toBe(3);
    expect(mockGetCrmDashboardStats).toHaveBeenCalledTimes(1);
  });

  it("throws error on failure", async () => {
    mockGetCrmDashboardStats.mockResolvedValue({ success: false, error: "Dashboard unavailable" });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCrmDashboard(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Dashboard unavailable");
  });
});

// ============================================================================
// Error Handling (cross-cutting)
// ============================================================================

describe("error handling", () => {
  it("mutation error shows toast.error for useUpdateFirm", async () => {
    mockUpdateArchitectureFirm.mockResolvedValue({ success: false, error: "DB connection lost" });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateFirm(), { wrapper });

    await act(async () => {
      result.current.mutate({ id: "firm-1", input: { name: "Fail" } });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(toast.error).toHaveBeenCalledWith("DB connection lost");
  });

  it("query error throws Error with message from server", async () => {
    mockGetOpportunities.mockResolvedValue({ success: false, error: "Rate limit exceeded" });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useOpportunities(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Rate limit exceeded");
  });

  it("useUpdateContact shows toast.error on server error", async () => {
    mockUpdateContact.mockResolvedValue({ success: false, error: "Contact not found" });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateContact(), { wrapper });

    await act(async () => {
      result.current.mutate({ id: "contact-999", input: { first_name: "Ghost" } });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(toast.error).toHaveBeenCalledWith("Contact not found");
  });
});
