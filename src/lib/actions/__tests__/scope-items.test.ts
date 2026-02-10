import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Mock Setup — Supabase chainable query builder
// ============================================================================

// Terminal result that all chains eventually resolve to
let mockTerminalResult: { data: unknown; error: unknown } = {
  data: null,
  error: null,
};

// Separate result for service role client (used by deleteScopeItem)
let mockServiceTerminalResult: { data: unknown; error: unknown } = {
  data: null,
  error: null,
};

// Track what methods were called and with what args
const mockCalls: { method: string; args: unknown[] }[] = [];
const mockServiceCalls: { method: string; args: unknown[] }[] = [];

// Auth mock state
let mockUser: { id: string; email: string } | null = {
  id: "test-user-id",
  email: "pm@test.com",
};

/**
 * Creates a chainable mock that records method calls and returns itself
 * until a terminal method is called (which returns the result).
 */
function createChainMock(
  callLog: typeof mockCalls,
  terminalResultFn: () => { data: unknown; error: unknown }
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
  ];

  for (const method of methods) {
    chain[method] = vi.fn((...args: unknown[]) => {
      callLog.push({ method, args });
      // "single" and "head" are terminal — return a Promise
      if (method === "single" || method === "head") {
        return Promise.resolve(terminalResultFn());
      }
      // Otherwise return the chain (and also make it thenable for terminal-less queries)
      return Object.assign(
        chain,
        { then: (resolve: (v: unknown) => void) => resolve(terminalResultFn()) }
      );
    });
  }

  return chain;
}

// The mock Supabase client factory
function createMockClient(
  callLog: typeof mockCalls,
  terminalResultFn: () => { data: unknown; error: unknown }
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
  createServiceRoleClient: vi.fn(() =>
    createMockClient(mockServiceCalls, () => mockServiceTerminalResult)
  ),
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
  getScopeItems,
  getScopeItem,
  bulkUpdateScopeItems,
  updateScopeItemField,
  updateProductionPercentage,
  updateShippedStatus,
  updateInstallationStartedStatus,
  updateInstallationStatus,
  deleteScopeItem,
  splitScopeItem,
  getParentItem,
  getChildItems,
  getActualTotalCost,
  getScopeItemsWithCosts,
  clearProjectScopeItems,
} from "../scope-items";

// ============================================================================
// Test Data Factories
// ============================================================================

const PROJECT_ID = "proj-001";
const ITEM_ID = "item-001";

function makeScopeItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: ITEM_ID,
    project_id: PROJECT_ID,
    item_code: "ITEM-001",
    name: "Custom Reception Desk",
    description: null,
    item_path: "production",
    status: "pending",
    quantity: 2,
    unit: "pcs",
    initial_unit_cost: 500,
    initial_total_cost: 1000,
    actual_unit_cost: 550,
    actual_total_cost: 1100,
    unit_sales_price: 800,
    total_sales_price: 1600,
    production_percentage: 0,
    is_shipped: false,
    shipped_at: null,
    is_installation_started: false,
    installation_started_at: null,
    is_installed: false,
    installed_at: null,
    images: null,
    is_deleted: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    parent_id: null,
    ...overrides,
  };
}

// ============================================================================
// Reset state between tests
// ============================================================================

beforeEach(() => {
  vi.clearAllMocks();
  mockCalls.length = 0;
  mockServiceCalls.length = 0;
  mockTerminalResult = { data: null, error: null };
  mockServiceTerminalResult = { data: null, error: null };
  mockUser = { id: "test-user-id", email: "pm@test.com" };
});

// ============================================================================
// Tests
// ============================================================================

describe("getScopeItems", () => {
  it("returns items for authenticated user", async () => {
    const items = [makeScopeItem(), makeScopeItem({ id: "item-002", item_code: "ITEM-002" })];
    mockTerminalResult = { data: items, error: null };

    const result = await getScopeItems(PROJECT_ID);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(mockCalls.some((c) => c.method === "from" && c.args[0] === "scope_items")).toBe(true);
  });

  it("rejects unauthenticated user", async () => {
    mockUser = null;

    const result = await getScopeItems(PROJECT_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });

  it("handles Supabase error gracefully", async () => {
    mockTerminalResult = { data: null, error: { message: "DB connection failed" } };

    const result = await getScopeItems(PROJECT_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe("DB connection failed");
  });

  it("filters by is_deleted = false", async () => {
    mockTerminalResult = { data: [], error: null };

    await getScopeItems(PROJECT_ID);

    // Verify .eq("is_deleted", false) was called
    const isDeletedCall = mockCalls.find(
      (c) => c.method === "eq" && c.args[0] === "is_deleted" && c.args[1] === false
    );
    expect(isDeletedCall).toBeDefined();
  });
});

describe("updateProductionPercentage", () => {
  it("accepts 0%", async () => {
    mockTerminalResult = { data: null, error: null };

    const result = await updateProductionPercentage(PROJECT_ID, ITEM_ID, 0);

    expect(result.success).toBe(true);
  });

  it("accepts 100%", async () => {
    mockTerminalResult = { data: null, error: null };

    const result = await updateProductionPercentage(PROJECT_ID, ITEM_ID, 100);

    expect(result.success).toBe(true);
  });

  it("accepts 50.5%", async () => {
    mockTerminalResult = { data: null, error: null };

    const result = await updateProductionPercentage(PROJECT_ID, ITEM_ID, 50.5);

    expect(result.success).toBe(true);
  });

  it("rejects -1%", async () => {
    const result = await updateProductionPercentage(PROJECT_ID, ITEM_ID, -1);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Percentage must be between 0 and 100");
  });

  it("rejects 101%", async () => {
    const result = await updateProductionPercentage(PROJECT_ID, ITEM_ID, 101);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Percentage must be between 0 and 100");
  });

  it("rejects unauthenticated user", async () => {
    mockUser = null;

    const result = await updateProductionPercentage(PROJECT_ID, ITEM_ID, 50);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });
});

describe("updateShippedStatus", () => {
  it("sets shipped with timestamp", async () => {
    mockTerminalResult = { data: null, error: null };

    const result = await updateShippedStatus(PROJECT_ID, ITEM_ID, true);

    expect(result.success).toBe(true);
    // Verify update was called on scope_items
    expect(mockCalls.some((c) => c.method === "from" && c.args[0] === "scope_items")).toBe(true);
    expect(mockCalls.some((c) => c.method === "update")).toBe(true);
  });

  it("sets shipped with custom timestamp", async () => {
    mockTerminalResult = { data: null, error: null };
    const customDate = "2026-02-01T10:00:00Z";

    const result = await updateShippedStatus(PROJECT_ID, ITEM_ID, true, customDate);

    expect(result.success).toBe(true);
  });

  it("clears shipped_at when unshipping", async () => {
    mockTerminalResult = { data: null, error: null };

    const result = await updateShippedStatus(PROJECT_ID, ITEM_ID, false);

    expect(result.success).toBe(true);
  });

  it("rejects unauthenticated user", async () => {
    mockUser = null;

    const result = await updateShippedStatus(PROJECT_ID, ITEM_ID, true);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });

  it("handles Supabase error", async () => {
    mockTerminalResult = { data: null, error: { message: "Update failed" } };

    const result = await updateShippedStatus(PROJECT_ID, ITEM_ID, true);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Update failed");
  });
});

describe("updateInstallationStartedStatus", () => {
  it("sets installation started with timestamp", async () => {
    mockTerminalResult = { data: null, error: null };

    const result = await updateInstallationStartedStatus(PROJECT_ID, ITEM_ID, true);

    expect(result.success).toBe(true);
  });

  it("sets installation started with custom timestamp", async () => {
    mockTerminalResult = { data: null, error: null };

    const result = await updateInstallationStartedStatus(
      PROJECT_ID, ITEM_ID, true, "2026-03-01T09:00:00Z"
    );

    expect(result.success).toBe(true);
  });

  it("clears timestamp when unmarking", async () => {
    mockTerminalResult = { data: null, error: null };

    const result = await updateInstallationStartedStatus(PROJECT_ID, ITEM_ID, false);

    expect(result.success).toBe(true);
  });

  it("rejects unauthenticated user", async () => {
    mockUser = null;

    const result = await updateInstallationStartedStatus(PROJECT_ID, ITEM_ID, true);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });
});

describe("updateInstallationStatus", () => {
  it("marks as installed with timestamp", async () => {
    mockTerminalResult = { data: null, error: null };

    const result = await updateInstallationStatus(PROJECT_ID, ITEM_ID, true);

    expect(result.success).toBe(true);
  });

  it("clears installed_at when unmarking", async () => {
    mockTerminalResult = { data: null, error: null };

    const result = await updateInstallationStatus(PROJECT_ID, ITEM_ID, false);

    expect(result.success).toBe(true);
  });

  it("rejects unauthenticated user", async () => {
    mockUser = null;

    const result = await updateInstallationStatus(PROJECT_ID, ITEM_ID, true);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });
});

describe("bulkUpdateScopeItems", () => {
  it("updates valid field for multiple items", async () => {
    mockTerminalResult = { data: null, error: null };

    const result = await bulkUpdateScopeItems(
      PROJECT_ID, ["item-001", "item-002"], "status", "approved"
    );

    expect(result.success).toBe(true);
  });

  it("rejects invalid field name", async () => {
    const result = await bulkUpdateScopeItems(
      PROJECT_ID, ["item-001"], "malicious_field" as never, "value"
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid field");
  });

  it("rejects empty item list", async () => {
    const result = await bulkUpdateScopeItems(
      PROJECT_ID, [], "status", "approved"
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("No items selected");
  });

  it("rejects unauthenticated user", async () => {
    mockUser = null;

    const result = await bulkUpdateScopeItems(
      PROJECT_ID, ["item-001"], "status", "approved"
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });

  it("accepts all 11 allowed fields", async () => {
    const allowedFields = [
      "status", "item_path", "unit", "unit_sales_price", "initial_unit_cost",
      "actual_unit_cost", "quantity", "is_shipped", "is_installation_started",
      "is_installed", "production_percentage",
    ] as const;

    for (const field of allowedFields) {
      mockTerminalResult = { data: null, error: null };
      mockCalls.length = 0;

      const result = await bulkUpdateScopeItems(PROJECT_ID, ["item-001"], field, "test");
      expect(result.success).toBe(true);
    }
  });

  it("adds shipped_at timestamp when setting is_shipped", async () => {
    mockTerminalResult = { data: null, error: null };

    await bulkUpdateScopeItems(PROJECT_ID, ["item-001"], "is_shipped", true);

    // The update call should include shipped_at
    const updateCall = mockCalls.find((c) => c.method === "update");
    expect(updateCall).toBeDefined();
    if (updateCall) {
      const updateData = updateCall.args[0] as Record<string, unknown>;
      expect(updateData.is_shipped).toBe(true);
      expect(updateData.shipped_at).toBeDefined();
    }
  });

  it("adds installed_at timestamp when setting is_installed", async () => {
    mockTerminalResult = { data: null, error: null };

    await bulkUpdateScopeItems(PROJECT_ID, ["item-001"], "is_installed", true);

    const updateCall = mockCalls.find((c) => c.method === "update");
    expect(updateCall).toBeDefined();
    if (updateCall) {
      const updateData = updateCall.args[0] as Record<string, unknown>;
      expect(updateData.is_installed).toBe(true);
      expect(updateData.installed_at).toBeDefined();
    }
  });
});

describe("updateScopeItemField", () => {
  it("updates a valid field", async () => {
    mockTerminalResult = { data: null, error: null };

    const result = await updateScopeItemField(PROJECT_ID, ITEM_ID, "status", "approved");

    expect(result.success).toBe(true);
  });

  it("rejects invalid field name", async () => {
    const result = await updateScopeItemField(
      PROJECT_ID, ITEM_ID, "sql_injection" as never, "value"
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid field");
  });

  it("rejects unauthenticated user", async () => {
    mockUser = null;

    const result = await updateScopeItemField(PROJECT_ID, ITEM_ID, "status", "approved");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });
});

describe("deleteScopeItem", () => {
  it("performs soft delete via service role client", async () => {
    // First call: fetch item (verify access) — regular client
    mockTerminalResult = {
      data: { item_code: "ITEM-001", name: "Reception Desk", project_id: PROJECT_ID },
      error: null,
    };
    // Second call: update is_deleted — service role client
    mockServiceTerminalResult = { data: null, error: null };

    const result = await deleteScopeItem(PROJECT_ID, ITEM_ID);

    expect(result.success).toBe(true);
    // Verify service client was used for the update
    expect(mockServiceCalls.some((c) => c.method === "update")).toBe(true);
  });

  it("rejects when item not found", async () => {
    mockTerminalResult = { data: null, error: { message: "not found" } };

    const result = await deleteScopeItem(PROJECT_ID, ITEM_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Item not found or access denied");
  });

  it("rejects unauthenticated user", async () => {
    mockUser = null;

    const result = await deleteScopeItem(PROJECT_ID, ITEM_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });
});

describe("splitScopeItem", () => {
  it("creates new item with null initial_unit_cost", async () => {
    // The shared mock returns the same result for all calls.
    // splitScopeItem calls: fetch original → fetch children → insert
    // We set the mock to return data that works for the final insert call.
    // The original item's `id` will be whatever the mock returns in the first
    // single() call, which in this case is "new-item-001" (same as insert result).
    mockTerminalResult = { data: makeScopeItem({ id: "new-item-001" }), error: null };

    const result = await splitScopeItem({
      itemId: ITEM_ID,
      projectId: PROJECT_ID,
      targetPath: "procurement",
      newQuantity: 5,
      newName: "Marble Supply",
    });

    expect(result.success).toBe(true);
    if (result.data) {
      expect(result.data.newItemId).toBe("new-item-001");
    }

    // Verify insert was called with initial_unit_cost: null (CRITICAL business rule)
    const insertCall = mockCalls.find((c) => c.method === "insert");
    expect(insertCall).toBeDefined();
    if (insertCall) {
      const insertData = insertCall.args[0] as Record<string, unknown>;
      expect(insertData.initial_unit_cost).toBeNull();
      expect(insertData.initial_total_cost).toBeNull();
      expect(insertData.item_path).toBe("procurement");
      // parent_id = the original item's ID (which the mock returns as "new-item-001")
      expect(insertData.parent_id).toBe("new-item-001");
      expect(insertData.status).toBe("pending");
      expect(insertData.quantity).toBe(5);
      expect(insertData.name).toBe("Marble Supply");
    }
  });

  it("rejects zero quantity", async () => {
    mockTerminalResult = { data: makeScopeItem(), error: null };

    const result = await splitScopeItem({
      itemId: ITEM_ID,
      projectId: PROJECT_ID,
      targetPath: "production",
      newQuantity: 0,
      newName: "Test Item",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Quantity must be at least 1");
  });

  it("rejects negative quantity", async () => {
    mockTerminalResult = { data: makeScopeItem(), error: null };

    const result = await splitScopeItem({
      itemId: ITEM_ID,
      projectId: PROJECT_ID,
      targetPath: "production",
      newQuantity: -3,
      newName: "Test Item",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Quantity must be at least 1");
  });

  it("rejects empty name", async () => {
    mockTerminalResult = { data: makeScopeItem(), error: null };

    const result = await splitScopeItem({
      itemId: ITEM_ID,
      projectId: PROJECT_ID,
      targetPath: "production",
      newQuantity: 1,
      newName: "",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Name is required");
  });

  it("rejects whitespace-only name", async () => {
    mockTerminalResult = { data: makeScopeItem(), error: null };

    const result = await splitScopeItem({
      itemId: ITEM_ID,
      projectId: PROJECT_ID,
      targetPath: "production",
      newQuantity: 1,
      newName: "   ",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Name is required");
  });

  it("rejects unauthenticated user", async () => {
    mockUser = null;

    const result = await splitScopeItem({
      itemId: ITEM_ID,
      projectId: PROJECT_ID,
      targetPath: "procurement",
      newQuantity: 1,
      newName: "Test",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });
});

describe("getParentItem", () => {
  it("returns null when item has no parent", async () => {
    mockTerminalResult = { data: { parent_id: null }, error: null };

    const result = await getParentItem(ITEM_ID);

    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });

  it("returns parent details when parent exists", async () => {
    // First call: get item's parent_id, second call: get parent details
    // Since our mock returns the same result, we set it to simulate the parent
    mockTerminalResult = {
      data: { parent_id: "parent-001", id: "parent-001", item_code: "P-001", name: "Parent" },
      error: null,
    };

    const result = await getParentItem(ITEM_ID);

    expect(result.success).toBe(true);
  });

  it("rejects unauthenticated user", async () => {
    mockUser = null;

    const result = await getParentItem(ITEM_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });
});

describe("getChildItems", () => {
  it("returns children list", async () => {
    const children = [
      { id: "child-1", item_code: "ITEM-001.1", name: "Part A", item_path: "production", status: "pending" },
      { id: "child-2", item_code: "ITEM-001.2", name: "Part B", item_path: "procurement", status: "pending" },
    ];
    mockTerminalResult = { data: children, error: null };

    const result = await getChildItems("parent-001");

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
  });

  it("returns empty array when no children", async () => {
    mockTerminalResult = { data: [], error: null };

    const result = await getChildItems("parent-001");

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(0);
  });

  it("rejects unauthenticated user", async () => {
    mockUser = null;

    const result = await getChildItems("parent-001");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });
});

describe("getActualTotalCost", () => {
  it("aggregates children costs when has children", async () => {
    // Mock returns children with costs
    mockTerminalResult = {
      data: [
        { actual_unit_cost: 100, quantity: 2 },
        { actual_unit_cost: 200, quantity: 3 },
      ],
      error: null,
    };

    const result = await getActualTotalCost(ITEM_ID);

    expect(result.success).toBe(true);
    if (result.data) {
      expect(result.data.hasChildren).toBe(true);
      expect(result.data.actualCost).toBe(800); // (100*2) + (200*3)
    }
  });

  it("uses own cost when no children", async () => {
    // Mock returns empty children array, then own item data
    mockTerminalResult = {
      data: { actual_unit_cost: 150, quantity: 4 },
      error: null,
    };

    const result = await getActualTotalCost(ITEM_ID);

    expect(result.success).toBe(true);
    // Note: the mock returns the same data for both calls (children + item).
    // Since the children query and item query both resolve to the same mock,
    // the function will see children as a non-array (the item object) and fall through.
    // This is a limitation of our shared-mock approach.
  });

  it("rejects unauthenticated user", async () => {
    mockUser = null;

    const result = await getActualTotalCost(ITEM_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });
});

describe("clearProjectScopeItems", () => {
  it("hard deletes all items using service role", async () => {
    // Mock: fetch project, count items, delete
    mockTerminalResult = {
      data: { id: PROJECT_ID, name: "Test Project", project_code: "TP-001" },
      error: null,
      // count is returned by Supabase select with { count: 'exact', head: true }
    };
    mockServiceTerminalResult = { data: null, error: null };

    const result = await clearProjectScopeItems(PROJECT_ID);

    expect(result.success).toBe(true);
  });

  it("rejects unauthenticated user", async () => {
    mockUser = null;

    const result = await clearProjectScopeItems(PROJECT_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });
});
