import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Mock Setup — Supabase chainable query builder
// ============================================================================

// Terminal result that all chains eventually resolve to
let mockTerminalResult: { data: unknown; error: unknown; count?: number | null } = {
  data: null,
  error: null,
};

// Track what methods were called and with what args
const mockCalls: { method: string; args: unknown[] }[] = [];

// Auth mock state
let mockUser: { id: string; email: string } | null = {
  id: "test-user-id",
  email: "admin@test.com",
};

// Role mock state (getUserRoleFromJWT)
let mockUserRole = "admin";

/**
 * Creates a chainable mock that records method calls and returns itself
 * until a terminal method is called (which returns the result).
 */
function createChainMock(
  callLog: typeof mockCalls,
  terminalResultFn: () => { data: unknown; error: unknown; count?: number | null }
) {
  const chain: Record<string, unknown> = {};

  const methods = [
    "select",
    "insert",
    "update",
    "delete",
    "eq",
    "in",
    "order",
    "single",
    "maybeSingle",
    "is",
    "neq",
    "gte",
    "lte",
    "like",
    "ilike",
    "match",
    "filter",
    "limit",
    "range",
    "head",
    "not",
  ];

  for (const method of methods) {
    chain[method] = vi.fn((...args: unknown[]) => {
      callLog.push({ method, args });
      // "single", "maybeSingle", and "head" are terminal — return a Promise
      if (method === "single" || method === "maybeSingle" || method === "head") {
        return Promise.resolve(terminalResultFn());
      }
      // Otherwise return the chain (and also make it thenable for terminal-less queries)
      return Object.assign(chain, {
        then: (resolve: (v: unknown) => void) => resolve(terminalResultFn()),
      });
    });
  }

  return chain;
}

// The mock Supabase client factory
function createMockClient(
  callLog: typeof mockCalls,
  terminalResultFn: () => { data: unknown; error: unknown; count?: number | null }
) {
  return {
    from: vi.fn((_table: string) => {
      callLog.push({ method: "from", args: [_table] });
      return createChainMock(callLog, terminalResultFn);
    }),
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({
          data: { user: mockUser },
          error: null,
        })
      ),
    },
  };
}

// Mock @/lib/supabase/server
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve(
      createMockClient(mockCalls, () => mockTerminalResult)
    )
  ),
  getUserRoleFromJWT: vi.fn(() => Promise.resolve(mockUserRole)),
}));

// Mock sanitize (passthrough — sanitize.test.ts tests this separately)
vi.mock("@/lib/sanitize", () => ({
  sanitizeText: vi.fn((v: string) => v),
}));

// Mock activity logging (no-op)
vi.mock("@/lib/activity-log/actions", () => ({
  logActivity: vi.fn(() => Promise.resolve()),
}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// ============================================================================
// Import server actions AFTER mocks are set up
// ============================================================================

import {
  getBrands,
  getBrand,
  createBrand,
  updateBrand,
  deleteBrand,
  getBrandOpportunities,
  getBrandActivities,
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
} from "../crm";

import { logActivity } from "@/lib/activity-log/actions";
import { revalidatePath } from "next/cache";

// ============================================================================
// Test Data Factories
// ============================================================================

const BRAND_ID = "brand-001";
const FIRM_ID = "firm-001";
const CONTACT_ID = "contact-001";
const OPPORTUNITY_ID = "opp-001";
const ACTIVITY_ID = "activity-001";

function makeBrand(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: BRAND_ID,
    brand_code: "BRD-001",
    name: "Gucci",
    parent_group: "Kering",
    tier: "luxury",
    segment: "Fashion",
    store_count: 500,
    expansion_rate: "5%",
    creative_director: "Sabato De Sarno",
    cd_changed_recently: true,
    headquarters: "Florence, Italy",
    website: "https://gucci.com",
    annual_revenue: "10B EUR",
    notes: null,
    priority: "high",
    is_deleted: false,
    created_at: "2026-01-15T10:00:00Z",
    updated_at: "2026-01-15T10:00:00Z",
    ...overrides,
  };
}

function makeFirm(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: FIRM_ID,
    firm_code: "FRM-001",
    name: "Foster + Partners",
    location: "London, UK",
    specialty: "Luxury retail",
    key_clients: "Apple, Hermès",
    vendor_list_status: "approved",
    vendor_application_date: "2025-06-01",
    website: "https://fosterandpartners.com",
    connection_strength: "warm",
    connection_notes: "Met at trade show",
    notes: null,
    priority: "high",
    is_deleted: false,
    created_at: "2026-01-15T10:00:00Z",
    updated_at: "2026-01-15T10:00:00Z",
    ...overrides,
  };
}

function makeContact(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: CONTACT_ID,
    contact_code: "CNT-001",
    first_name: "Marco",
    last_name: "Bizzarri",
    title: "CEO",
    company: "Gucci",
    email: "marco@gucci.com",
    phone: "+39 055 7592",
    linkedin_url: "https://linkedin.com/in/marcobizzarri",
    brand_id: BRAND_ID,
    architecture_firm_id: null,
    relationship_status: "active_relationship",
    source: "Trade Show",
    last_interaction_date: "2026-02-15",
    notes: null,
    is_deleted: false,
    created_at: "2026-01-15T10:00:00Z",
    updated_at: "2026-01-15T10:00:00Z",
    ...overrides,
  };
}

function makeOpportunity(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: OPPORTUNITY_ID,
    opportunity_code: "OPP-001",
    title: "Gucci Istanbul Flagship",
    description: "New flagship store in Istanbul",
    brand_id: BRAND_ID,
    architecture_firm_id: FIRM_ID,
    stage: "proposal",
    estimated_value: 500000,
    currency: "USD",
    probability: 60,
    expected_close_date: "2026-06-01",
    assigned_to: "test-user-id",
    source: "Referral",
    loss_reason: null,
    notes: null,
    priority: "high",
    is_deleted: false,
    created_at: "2026-01-15T10:00:00Z",
    updated_at: "2026-01-15T10:00:00Z",
    ...overrides,
  };
}

function makeActivity(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: ACTIVITY_ID,
    activity_type: "meeting",
    title: "Site visit with Gucci team",
    description: "Visit the proposed store location",
    activity_date: "2026-02-20",
    brand_id: BRAND_ID,
    architecture_firm_id: null,
    contact_id: CONTACT_ID,
    opportunity_id: OPPORTUNITY_ID,
    user_id: "test-user-id",
    outcome: "Positive feedback",
    next_action: "Send proposal",
    next_action_date: "2026-03-01",
    is_deleted: false,
    created_at: "2026-02-20T10:00:00Z",
    updated_at: "2026-02-20T10:00:00Z",
    ...overrides,
  };
}

// ============================================================================
// Reset mocks before each test
// ============================================================================

beforeEach(() => {
  mockTerminalResult = { data: null, error: null };
  mockCalls.length = 0;
  mockUser = { id: "test-user-id", email: "admin@test.com" };
  mockUserRole = "admin";
  vi.clearAllMocks();
});

// ============================================================================
// Auth / Role Enforcement
// ============================================================================

describe("Auth / Role Enforcement", () => {
  it("getBrands returns error when not authenticated", async () => {
    mockUser = null;

    const result = await getBrands();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });

  it("getBrands returns error when user is 'production' role", async () => {
    mockUserRole = "production";

    const result = await getBrands();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authorized");
  });

  it("getBrands returns error when user is 'client' role", async () => {
    mockUserRole = "client";

    const result = await getBrands();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authorized");
  });

  it("getBrands succeeds for 'admin' role", async () => {
    mockUserRole = "admin";
    mockTerminalResult = { data: [], error: null, count: 0 };

    const result = await getBrands();

    expect(result.success).toBe(true);
  });

  it("getBrands succeeds for 'management' role", async () => {
    mockUserRole = "management";
    mockTerminalResult = { data: [], error: null, count: 0 };

    const result = await getBrands();

    expect(result.success).toBe(true);
  });

  it("createBrand returns error for 'management' role (read-only)", async () => {
    mockUserRole = "management";

    const result = await createBrand({ name: "Test Brand", tier: "luxury", priority: "high" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authorized");
  });

  it("createBrand succeeds for 'admin' role", async () => {
    mockUserRole = "admin";
    mockTerminalResult = { data: { id: "new-brand-001" }, error: null };

    const result = await createBrand({
      name: "Test Brand",
      tier: "luxury",
      priority: "high",
      cd_changed_recently: false,
    });

    expect(result.success).toBe(true);
    expect(result.data?.id).toBe("new-brand-001");
  });

  it("createBrand returns error when user is 'pm' role (no write access)", async () => {
    mockUserRole = "pm";

    const result = await createBrand({ name: "Test Brand", tier: "luxury", priority: "high" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authorized");
  });
});

// ============================================================================
// Brand CRUD
// ============================================================================

describe("getBrands", () => {
  it("returns list of brands from DB", async () => {
    const brands = [makeBrand(), makeBrand({ id: "brand-002", brand_code: "BRD-002", name: "Prada" })];
    mockTerminalResult = { data: brands, error: null, count: 0 };

    const result = await getBrands();

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.length).toBe(2);
    expect(result.data![0].name).toBe("Gucci");
    expect(result.data![1].name).toBe("Prada");
  });

  it("queries the v_crm_brands view (not raw table)", async () => {
    mockTerminalResult = { data: [], error: null, count: 0 };

    await getBrands();

    const fromCall = mockCalls.find((c) => c.method === "from");
    expect(fromCall).toBeDefined();
    expect(fromCall!.args).toEqual(["v_crm_brands"]);
  });

  it("returns error on database failure", async () => {
    mockTerminalResult = { data: null, error: { message: "DB connection lost" } };

    const result = await getBrands();

    expect(result.success).toBe(false);
    expect(result.error).toBe("DB connection lost");
  });
});

describe("getBrand", () => {
  it("returns single brand by ID", async () => {
    const brand = makeBrand();
    mockTerminalResult = { data: brand, error: null };

    const result = await getBrand(BRAND_ID);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(brand);

    // Verify .single() is called (terminal)
    const singleCall = mockCalls.find((c) => c.method === "single");
    expect(singleCall).toBeTruthy();

    // Verify eq was called with the brand ID
    const eqCalls = mockCalls.filter((c) => c.method === "eq");
    expect(eqCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ args: ["id", BRAND_ID] }),
      ])
    );
  });

  it("returns error when brand not found", async () => {
    mockTerminalResult = { data: null, error: { message: "not found" } };

    const result = await getBrand("nonexistent-id");

    expect(result.success).toBe(false);
    expect(result.error).toBe("not found");
  });
});

describe("createBrand", () => {
  it("sanitizes input and inserts to DB, returns { id }", async () => {
    mockTerminalResult = { data: { id: "new-brand-001" }, error: null };

    const input = {
      name: " Versace ",
      parent_group: " Capri Holdings ",
      tier: "luxury",
      segment: " Fashion & Accessories ",
      store_count: 200,
      expansion_rate: " 3% ",
      creative_director: " Donatella Versace ",
      cd_changed_recently: false,
      headquarters: " Milan, Italy ",
      website: "https://versace.com",
      annual_revenue: " 1B EUR ",
      notes: " Expanding in MENA ",
      priority: "high",
    };

    const result = await createBrand(input);

    expect(result.success).toBe(true);
    expect(result.data?.id).toBe("new-brand-001");

    // Verify insert was called
    const insertCall = mockCalls.find((c) => c.method === "insert");
    expect(insertCall).toBeTruthy();

    // Verify logActivity was called
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "crm_brand_created",
        entityType: "crm_brand",
        entityId: "new-brand-001",
      })
    );

    // Verify revalidatePath was called
    expect(revalidatePath).toHaveBeenCalledWith("/crm");
  });

  it("returns error on DB error", async () => {
    mockTerminalResult = { data: null, error: { message: "Duplicate key violation" } };

    const result = await createBrand({
      name: "Test",
      tier: "luxury",
      priority: "high",
      cd_changed_recently: false,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Duplicate key violation");
  });
});

describe("updateBrand", () => {
  it("updates by ID and revalidates path", async () => {
    mockTerminalResult = { data: null, error: null };

    const input = {
      name: "Updated Gucci",
      tier: "luxury",
      store_count: 550,
    };

    const result = await updateBrand(BRAND_ID, input);

    expect(result.success).toBe(true);

    // Verify update was called
    const updateCall = mockCalls.find((c) => c.method === "update");
    expect(updateCall).toBeTruthy();

    const updateData = updateCall?.args[0] as Record<string, unknown>;
    expect(updateData.name).toBe("Updated Gucci");
    expect(updateData.store_count).toBe(550);

    // Verify eq was called with the brand ID
    const eqCalls = mockCalls.filter((c) => c.method === "eq");
    expect(eqCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ args: ["id", BRAND_ID] }),
      ])
    );

    // Verify revalidatePath
    expect(revalidatePath).toHaveBeenCalledWith("/crm");
  });

  it("returns error on DB failure", async () => {
    mockTerminalResult = { data: null, error: { message: "Update failed" } };

    const result = await updateBrand(BRAND_ID, { name: "Test" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Update failed");
  });
});

describe("deleteBrand", () => {
  it("sets is_deleted = true (soft delete)", async () => {
    mockTerminalResult = { data: null, error: null };

    const result = await deleteBrand(BRAND_ID);

    expect(result.success).toBe(true);

    // Verify update was called with is_deleted: true
    const updateCall = mockCalls.find((c) => c.method === "update");
    expect(updateCall).toBeTruthy();

    const updateData = updateCall?.args[0] as Record<string, unknown>;
    expect(updateData.is_deleted).toBe(true);

    // Verify eq with brand ID
    const eqCalls = mockCalls.filter((c) => c.method === "eq");
    expect(eqCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ args: ["id", BRAND_ID] }),
      ])
    );

    // Verify activity logged
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "crm_brand_deleted",
        entityType: "crm_brand",
        entityId: BRAND_ID,
      })
    );
  });

  it("returns error on DB failure", async () => {
    mockTerminalResult = { data: null, error: { message: "Delete failed" } };

    const result = await deleteBrand(BRAND_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Delete failed");
  });

  it("requires admin role", async () => {
    mockUserRole = "management";

    const result = await deleteBrand(BRAND_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authorized");
  });
});

// ============================================================================
// Brand Relations
// ============================================================================

describe("getBrandOpportunities", () => {
  it("returns opportunities for a brand", async () => {
    const opps = [
      { id: "opp-1", opportunity_code: "OPP-001", title: "Flagship", stage: "proposal", estimated_value: 500000, currency: "USD", priority: "high" },
    ];
    mockTerminalResult = { data: opps, error: null };

    const result = await getBrandOpportunities(BRAND_ID);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(opps);

    // Verify querying crm_opportunities
    const fromCall = mockCalls.find((c) => c.method === "from" && c.args[0] === "crm_opportunities");
    expect(fromCall).toBeTruthy();

    // Verify brand_id filter
    const eqCalls = mockCalls.filter((c) => c.method === "eq");
    expect(eqCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ args: ["brand_id", BRAND_ID] }),
      ])
    );
  });
});

describe("getBrandActivities", () => {
  it("returns activities for a brand", async () => {
    const activities = [
      { id: "act-1", activity_type: "meeting", title: "Site visit", activity_date: "2026-02-20", outcome: "Positive" },
    ];
    mockTerminalResult = { data: activities, error: null };

    const result = await getBrandActivities(BRAND_ID);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(activities);

    // Verify querying crm_activities
    const fromCall = mockCalls.find((c) => c.method === "from" && c.args[0] === "crm_activities");
    expect(fromCall).toBeTruthy();
  });
});

// ============================================================================
// Architecture Firm CRUD
// ============================================================================

describe("getArchitectureFirms", () => {
  it("returns firms with brand_links join", async () => {
    const firms = [
      {
        ...makeFirm(),
        crm_brand_firm_links: [
          { relationship_type: "preferred", brand: { id: BRAND_ID, name: "Gucci", brand_code: "BRD-001" } },
        ],
      },
    ];
    mockTerminalResult = { data: firms, error: null };

    const result = await getArchitectureFirms();

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.length).toBe(1);

    // Verify the brand_links transformation happened
    expect(result.data![0].brand_links).toBeDefined();
    expect(result.data![0].brand_links![0].brand.name).toBe("Gucci");
    expect(result.data![0].brand_links![0].relationship_type).toBe("preferred");

    // Verify querying crm_architecture_firms
    const fromCall = mockCalls.find((c) => c.method === "from" && c.args[0] === "crm_architecture_firms");
    expect(fromCall).toBeTruthy();
  });

  it("returns error on DB failure", async () => {
    mockTerminalResult = { data: null, error: { message: "DB error" } };

    const result = await getArchitectureFirms();

    expect(result.success).toBe(false);
    expect(result.error).toBe("DB error");
  });
});

describe("getArchitectureFirm", () => {
  it("returns single firm by ID", async () => {
    const firm = makeFirm();
    mockTerminalResult = { data: firm, error: null };

    const result = await getArchitectureFirm(FIRM_ID);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(firm);

    const singleCall = mockCalls.find((c) => c.method === "single");
    expect(singleCall).toBeTruthy();
  });
});

describe("createArchitectureFirm", () => {
  it("inserts firm and logs activity", async () => {
    mockTerminalResult = { data: { id: "new-firm-001" }, error: null };

    const input = {
      name: " Gensler ",
      location: " New York, USA ",
      specialty: " Commercial ",
      key_clients: " Nike, Louis Vuitton ",
      vendor_list_status: "not_applied",
      website: "https://gensler.com",
      connection_strength: "cold",
      priority: "medium",
    };

    const result = await createArchitectureFirm(input);

    expect(result.success).toBe(true);
    expect(result.data?.id).toBe("new-firm-001");

    // Verify insert was called on crm_architecture_firms
    const fromCall = mockCalls.find((c) => c.method === "from" && c.args[0] === "crm_architecture_firms");
    expect(fromCall).toBeTruthy();

    const insertCall = mockCalls.find((c) => c.method === "insert");
    expect(insertCall).toBeTruthy();

    // Verify activity logged
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "crm_firm_created",
        entityType: "crm_firm",
        entityId: "new-firm-001",
      })
    );

    expect(revalidatePath).toHaveBeenCalledWith("/crm");
  });

  it("returns error on DB failure", async () => {
    mockTerminalResult = { data: null, error: { message: "Insert failed" } };

    const result = await createArchitectureFirm({
      name: "Test Firm",
      vendor_list_status: "not_applied",
      connection_strength: "none",
      priority: "low",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Insert failed");
  });
});

describe("updateArchitectureFirm", () => {
  it("updates firm by ID", async () => {
    mockTerminalResult = { data: null, error: null };

    const input = {
      name: "Updated Foster + Partners",
      location: "London, UK (HQ)",
    };

    const result = await updateArchitectureFirm(FIRM_ID, input);

    expect(result.success).toBe(true);

    const updateCall = mockCalls.find((c) => c.method === "update");
    expect(updateCall).toBeTruthy();

    const updateData = updateCall?.args[0] as Record<string, unknown>;
    expect(updateData.name).toBe("Updated Foster + Partners");
    expect(updateData.location).toBe("London, UK (HQ)");

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "crm_firm_updated",
        entityType: "crm_firm",
        entityId: FIRM_ID,
      })
    );
  });
});

describe("updateVendorStatus", () => {
  it("updates vendor_list_status field", async () => {
    mockTerminalResult = { data: null, error: null };

    const result = await updateVendorStatus(FIRM_ID, "approved");

    expect(result.success).toBe(true);

    const updateCall = mockCalls.find((c) => c.method === "update");
    expect(updateCall).toBeTruthy();

    const updateData = updateCall?.args[0] as Record<string, unknown>;
    expect(updateData.vendor_list_status).toBe("approved");

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "crm_vendor_status_updated",
        entityType: "crm_firm",
        entityId: FIRM_ID,
        details: { vendor_list_status: "approved" },
      })
    );
  });

  it("sets vendor_application_date when status is 'applied'", async () => {
    mockTerminalResult = { data: null, error: null };

    const result = await updateVendorStatus(FIRM_ID, "applied");

    expect(result.success).toBe(true);

    const updateCall = mockCalls.find((c) => c.method === "update");
    const updateData = updateCall?.args[0] as Record<string, unknown>;
    expect(updateData.vendor_list_status).toBe("applied");
    expect(updateData.vendor_application_date).toBeDefined();
    // Should be a date string like "2026-02-27"
    expect(typeof updateData.vendor_application_date).toBe("string");
  });

  it("returns error on DB failure", async () => {
    mockTerminalResult = { data: null, error: { message: "Update failed" } };

    const result = await updateVendorStatus(FIRM_ID, "approved");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Update failed");
  });
});

// ============================================================================
// Contact CRUD
// ============================================================================

describe("getContacts", () => {
  it("returns contacts with brand/firm joins", async () => {
    const contacts = [
      {
        ...makeContact(),
        brand: { name: "Gucci", brand_code: "BRD-001" },
        architecture_firm: null,
      },
    ];
    mockTerminalResult = { data: contacts, error: null };

    const result = await getContacts();

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.length).toBe(1);
    expect(result.data![0].first_name).toBe("Marco");

    // Verify select includes joins
    const selectCall = mockCalls.find((c) => c.method === "select");
    expect(selectCall).toBeTruthy();
    const selectArg = selectCall?.args[0] as string;
    expect(selectArg).toContain("brand:crm_brands");
    expect(selectArg).toContain("architecture_firm:crm_architecture_firms");
  });

  it("returns error on DB failure", async () => {
    mockTerminalResult = { data: null, error: { message: "DB error" } };

    const result = await getContacts();

    expect(result.success).toBe(false);
    expect(result.error).toBe("DB error");
  });
});

describe("createContact", () => {
  it("inserts contact and logs activity", async () => {
    mockTerminalResult = { data: { id: "new-contact-001" }, error: null };

    const input = {
      first_name: " Anna ",
      last_name: " Wintour ",
      title: " Editor-in-Chief ",
      company: " Condé Nast ",
      email: "anna@condenast.com",
      phone: " +1 212 286 2860 ",
      linkedin_url: "https://linkedin.com/in/annawintour",
      brand_id: BRAND_ID,
      architecture_firm_id: null,
      relationship_status: "connected",
      source: " Referral ",
      notes: " Met through Gucci team ",
    };

    const result = await createContact(input);

    expect(result.success).toBe(true);
    expect(result.data?.id).toBe("new-contact-001");

    // Verify insert was called on crm_contacts
    const fromCall = mockCalls.find((c) => c.method === "from" && c.args[0] === "crm_contacts");
    expect(fromCall).toBeTruthy();

    const insertCall = mockCalls.find((c) => c.method === "insert");
    expect(insertCall).toBeTruthy();

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "crm_contact_created",
        entityType: "crm_contact",
        entityId: "new-contact-001",
      })
    );
  });

  it("returns error on DB failure", async () => {
    mockTerminalResult = { data: null, error: { message: "Insert failed" } };

    const result = await createContact({
      first_name: "Test",
      last_name: "User",
      relationship_status: "identified",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Insert failed");
  });
});

describe("updateContact", () => {
  it("updates contact by ID", async () => {
    mockTerminalResult = { data: null, error: null };

    const input = {
      first_name: "Updated Marco",
      title: "Former CEO",
    };

    const result = await updateContact(CONTACT_ID, input);

    expect(result.success).toBe(true);

    const updateCall = mockCalls.find((c) => c.method === "update");
    expect(updateCall).toBeTruthy();

    const updateData = updateCall?.args[0] as Record<string, unknown>;
    expect(updateData.first_name).toBe("Updated Marco");
    expect(updateData.title).toBe("Former CEO");

    const eqCalls = mockCalls.filter((c) => c.method === "eq");
    expect(eqCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ args: ["id", CONTACT_ID] }),
      ])
    );

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "crm_contact_updated",
        entityType: "crm_contact",
        entityId: CONTACT_ID,
      })
    );
  });

  it("returns error when not authenticated", async () => {
    mockUser = null;

    const result = await updateContact(CONTACT_ID, { first_name: "Test" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });
});

// ============================================================================
// Opportunity CRUD
// ============================================================================

describe("getOpportunities", () => {
  it("returns opportunities with joins", async () => {
    const opps = [
      {
        ...makeOpportunity(),
        brand: { name: "Gucci", brand_code: "BRD-001" },
        architecture_firm: { name: "Foster + Partners", firm_code: "FRM-001" },
        assigned_user: { name: "Admin User" },
      },
    ];
    mockTerminalResult = { data: opps, error: null };

    const result = await getOpportunities();

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.length).toBe(1);
    expect(result.data![0].title).toBe("Gucci Istanbul Flagship");

    // Verify select includes joined relations
    const selectCall = mockCalls.find((c) => c.method === "select");
    expect(selectCall).toBeTruthy();
    const selectArg = selectCall?.args[0] as string;
    expect(selectArg).toContain("brand:crm_brands");
    expect(selectArg).toContain("architecture_firm:crm_architecture_firms");
    expect(selectArg).toContain("assigned_user:users");
  });

  it("returns error on DB failure", async () => {
    mockTerminalResult = { data: null, error: { message: "Connection timeout" } };

    const result = await getOpportunities();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Connection timeout");
  });
});

describe("getOpportunityPipeline", () => {
  it("groups opportunities by stage", async () => {
    const opps = [
      { ...makeOpportunity({ stage: "proposal" }), brand: null, architecture_firm: null, assigned_user: null },
      { ...makeOpportunity({ id: "opp-002", stage: "negotiation" }), brand: null, architecture_firm: null, assigned_user: null },
      { ...makeOpportunity({ id: "opp-003", stage: "proposal" }), brand: null, architecture_firm: null, assigned_user: null },
    ];
    mockTerminalResult = { data: opps, error: null };

    const result = await getOpportunityPipeline();

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    // Should return all 8 stages
    expect(result.data!.length).toBe(8);

    // Find the proposal column
    const proposalColumn = result.data!.find((c) => c.stage === "proposal");
    expect(proposalColumn).toBeDefined();
    expect(proposalColumn!.opportunities.length).toBe(2);

    // Find the negotiation column
    const negotiationColumn = result.data!.find((c) => c.stage === "negotiation");
    expect(negotiationColumn).toBeDefined();
    expect(negotiationColumn!.opportunities.length).toBe(1);

    // Empty stages should have empty arrays
    const researchedColumn = result.data!.find((c) => c.stage === "researched");
    expect(researchedColumn!.opportunities.length).toBe(0);
  });

  it("returns error on DB failure", async () => {
    mockTerminalResult = { data: null, error: { message: "Query failed" } };

    const result = await getOpportunityPipeline();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Query failed");
  });
});

describe("createOpportunity", () => {
  it("inserts opportunity and logs activity", async () => {
    mockTerminalResult = { data: { id: "new-opp-001" }, error: null };

    const input = {
      title: " Prada Rome Renovation ",
      description: " Full store renovation ",
      brand_id: BRAND_ID,
      architecture_firm_id: FIRM_ID,
      stage: "contacted",
      estimated_value: 300000,
      currency: "EUR",
      probability: 40,
      expected_close_date: "2026-09-01",
      assigned_to: "test-user-id",
      source: " Direct ",
      notes: " Initial discussions ",
      priority: "medium",
    };

    const result = await createOpportunity(input);

    expect(result.success).toBe(true);
    expect(result.data?.id).toBe("new-opp-001");

    // Verify insert on crm_opportunities
    const fromCall = mockCalls.find((c) => c.method === "from" && c.args[0] === "crm_opportunities");
    expect(fromCall).toBeTruthy();

    const insertCall = mockCalls.find((c) => c.method === "insert");
    expect(insertCall).toBeTruthy();

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "crm_opportunity_created",
        entityType: "crm_opportunity",
        entityId: "new-opp-001",
        details: expect.objectContaining({ title: "Prada Rome Renovation", stage: "contacted" }),
      })
    );

    expect(revalidatePath).toHaveBeenCalledWith("/crm");
  });

  it("returns error on DB failure", async () => {
    mockTerminalResult = { data: null, error: { message: "Insert failed" } };

    const result = await createOpportunity({
      title: "Test",
      stage: "researched",
      currency: "USD",
      priority: "low",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Insert failed");
  });
});

describe("updateOpportunity", () => {
  it("updates opportunity by ID", async () => {
    mockTerminalResult = { data: null, error: null };

    const input = {
      title: "Updated Gucci Istanbul",
      estimated_value: 600000,
      probability: 75,
    };

    const result = await updateOpportunity(OPPORTUNITY_ID, input);

    expect(result.success).toBe(true);

    const updateCall = mockCalls.find((c) => c.method === "update");
    expect(updateCall).toBeTruthy();

    const updateData = updateCall?.args[0] as Record<string, unknown>;
    expect(updateData.title).toBe("Updated Gucci Istanbul");
    expect(updateData.estimated_value).toBe(600000);
    expect(updateData.probability).toBe(75);

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "crm_opportunity_updated",
        entityType: "crm_opportunity",
        entityId: OPPORTUNITY_ID,
      })
    );
  });

  it("returns error on DB failure", async () => {
    mockTerminalResult = { data: null, error: { message: "Update failed" } };

    const result = await updateOpportunity(OPPORTUNITY_ID, { title: "Test" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Update failed");
  });

  it("requires admin role for writes", async () => {
    mockUserRole = "management";

    const result = await updateOpportunity(OPPORTUNITY_ID, { title: "Test" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authorized");
  });
});

describe("moveOpportunityStage", () => {
  it("updates stage and logs old->new transition", async () => {
    // First query returns current stage
    mockTerminalResult = { data: { stage: "proposal", title: "Gucci Istanbul" }, error: null };

    const result = await moveOpportunityStage(OPPORTUNITY_ID, "negotiation");

    expect(result.success).toBe(true);

    // Verify logActivity was called with stage transition details
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "crm_opportunity_stage_changed",
        entityType: "crm_opportunity",
        entityId: OPPORTUNITY_ID,
        details: expect.objectContaining({
          old_stage: "proposal",
          new_stage: "negotiation",
          title: "Gucci Istanbul",
        }),
      })
    );

    expect(revalidatePath).toHaveBeenCalledWith("/crm");
  });

  it("returns error on DB failure during update", async () => {
    // First call (select current) succeeds, but we only have one mock result
    // Since the chain resolves to the terminal result, we'll set a DB error
    mockTerminalResult = { data: null, error: { message: "Stage update failed" } };

    const result = await moveOpportunityStage(OPPORTUNITY_ID, "won");

    expect(result.success).toBe(false);
  });

  it("requires admin role", async () => {
    mockUserRole = "management";

    const result = await moveOpportunityStage(OPPORTUNITY_ID, "won");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authorized");
  });
});

// ============================================================================
// Activity
// ============================================================================

describe("getActivities", () => {
  it("returns activities with joins", async () => {
    const activities = [
      {
        ...makeActivity(),
        brand: { name: "Gucci" },
        architecture_firm: null,
        contact: { first_name: "Marco", last_name: "Bizzarri" },
        opportunity: { title: "Gucci Istanbul Flagship" },
        user: { name: "Admin User" },
      },
    ];
    mockTerminalResult = { data: activities, error: null };

    const result = await getActivities();

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.length).toBe(1);
    expect(result.data![0].title).toBe("Site visit with Gucci team");

    // Verify select includes all joins
    const selectCall = mockCalls.find((c) => c.method === "select");
    const selectArg = selectCall?.args[0] as string;
    expect(selectArg).toContain("brand:crm_brands");
    expect(selectArg).toContain("contact:crm_contacts");
    expect(selectArg).toContain("opportunity:crm_opportunities");
    expect(selectArg).toContain("user:users");
  });

  it("returns error on DB failure", async () => {
    mockTerminalResult = { data: null, error: { message: "Query failed" } };

    const result = await getActivities();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Query failed");
  });
});

describe("createActivity", () => {
  it("auto-fills user_id from auth context", async () => {
    mockTerminalResult = { data: { id: "new-activity-001" }, error: null };

    const input = {
      activity_type: "meeting",
      title: " Client meeting ",
      description: " Discuss project timeline ",
      activity_date: "2026-03-01",
      brand_id: BRAND_ID,
      contact_id: CONTACT_ID,
      opportunity_id: OPPORTUNITY_ID,
      outcome: " Agreed to proposal ",
      next_action: " Send contract ",
      next_action_date: "2026-03-05",
    };

    const result = await createActivity(input);

    expect(result.success).toBe(true);
    expect(result.data?.id).toBe("new-activity-001");

    // Verify insert was called with user_id from auth
    const insertCall = mockCalls.find((c) => c.method === "insert");
    expect(insertCall).toBeTruthy();

    const insertData = insertCall?.args[0] as Record<string, unknown>;
    expect(insertData.user_id).toBe("test-user-id"); // Auto-filled from mockUser

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "crm_activity_logged",
        entityType: "crm_activity",
        entityId: "new-activity-001",
      })
    );
  });

  it("returns error on DB failure", async () => {
    mockTerminalResult = { data: null, error: { message: "Insert failed" } };

    const result = await createActivity({
      activity_type: "email",
      title: "Test email",
      activity_date: "2026-03-01",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Insert failed");
  });

  it("requires admin role", async () => {
    mockUserRole = "management";

    const result = await createActivity({
      activity_type: "call",
      title: "Follow up",
      activity_date: "2026-03-01",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authorized");
  });
});

describe("getUpcomingActions", () => {
  it("filters by next_action_date >= today", async () => {
    const upcoming = [
      {
        ...makeActivity({ next_action_date: "2026-03-01" }),
        brand: { name: "Gucci" },
        architecture_firm: null,
        contact: { first_name: "Marco", last_name: "Bizzarri" },
        opportunity: { title: "Gucci Istanbul" },
        user: { name: "Admin" },
      },
    ];
    mockTerminalResult = { data: upcoming, error: null };

    const result = await getUpcomingActions();

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.length).toBe(1);

    // Verify .not() was called (filtering out null next_action)
    const notCall = mockCalls.find((c) => c.method === "not");
    expect(notCall).toBeTruthy();
    expect(notCall?.args[0]).toBe("next_action");
    expect(notCall?.args[1]).toBe("is");

    // Verify .gte() was called for next_action_date
    const gteCalls = mockCalls.filter((c) => c.method === "gte");
    expect(gteCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          args: expect.arrayContaining(["next_action_date"]),
        }),
      ])
    );
  });

  it("returns error on DB failure", async () => {
    mockTerminalResult = { data: null, error: { message: "Query failed" } };

    const result = await getUpcomingActions();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Query failed");
  });
});

// ============================================================================
// Dashboard
// ============================================================================

describe("getCrmDashboardStats", () => {
  it("returns stats object with computed values", async () => {
    // The dashboard runs 4 parallel queries, all resolve to the same mock
    // We need to set up data that works for all of them
    mockTerminalResult = {
      data: [
        { tier: "luxury", vendor_list_status: "approved", stage: "proposal", estimated_value: 500000, currency: "USD", next_action_date: "2026-03-01" },
        { tier: "mid_luxury", vendor_list_status: "not_applied", stage: "won", estimated_value: 300000, currency: "USD", next_action_date: "2026-03-05" },
      ],
      error: null,
      count: 2,
    };

    const result = await getCrmDashboardStats();

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    // Basic structure checks
    expect(typeof result.data!.brandCount).toBe("number");
    expect(typeof result.data!.firmCount).toBe("number");
    expect(typeof result.data!.activeOpportunities).toBe("number");
    expect(typeof result.data!.totalPipelineValue).toBe("number");
    expect(result.data!.pipelineCurrency).toBe("USD");
    expect(typeof result.data!.upcomingActions).toBe("number");
    expect(result.data!.brandsByTier).toBeDefined();
    expect(result.data!.opportunitiesByStage).toBeDefined();
  });

  it("handles empty data gracefully", async () => {
    mockTerminalResult = { data: [], error: null, count: 0 };

    const result = await getCrmDashboardStats();

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.brandCount).toBe(0);
    expect(result.data!.firmCount).toBe(0);
    expect(result.data!.activeOpportunities).toBe(0);
    expect(result.data!.totalPipelineValue).toBe(0);
    expect(result.data!.vendorApproved).toBe(0);
  });

  it("returns error when not authenticated", async () => {
    mockUser = null;

    const result = await getCrmDashboardStats();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });
});

// ============================================================================
// Error Handling
// ============================================================================

describe("Error handling", () => {
  it("createBrand handles unexpected exception in try/catch", async () => {
    // Force an exception by making name undefined (will throw on .trim())
    const result = await createBrand({
      name: undefined as unknown as string,
      tier: "luxury",
      priority: "high",
      cd_changed_recently: false,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to create brand");
  });

  it("updateBrand handles unexpected exception in try/catch", async () => {
    // Force an exception by passing name as null (null !== undefined so the guard passes,
    // then .trim() on null throws TypeError)
    const result = await updateBrand(BRAND_ID, {
      name: null as unknown as string,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to update brand");
  });

  it("createArchitectureFirm handles unexpected exception in try/catch", async () => {
    const result = await createArchitectureFirm({
      name: undefined as unknown as string,
      vendor_list_status: "not_applied",
      connection_strength: "none",
      priority: "low",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to create firm");
  });

  it("createContact handles unexpected exception in try/catch", async () => {
    const result = await createContact({
      first_name: undefined as unknown as string,
      last_name: "Test",
      relationship_status: "identified",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to create contact");
  });

  it("createOpportunity handles unexpected exception in try/catch", async () => {
    const result = await createOpportunity({
      title: undefined as unknown as string,
      stage: "researched",
      currency: "USD",
      priority: "low",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to create opportunity");
  });
});
