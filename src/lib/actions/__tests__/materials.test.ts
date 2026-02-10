import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Mock Setup — Supabase chainable query builder
// ============================================================================

// Terminal result that all chains eventually resolve to
let mockTerminalResult: { data: unknown; error: unknown } = {
  data: null,
  error: null,
};

// Separate result for service role client (used by deleteMaterial)
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

// Role mock state (getUserRoleFromJWT)
let mockUserRole = "pm";

// Storage mock state
let mockUploadResult: { error: unknown } = { error: null };
let mockPublicUrl = "https://storage.example.com/materials/test.jpg";

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
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve(mockUploadResult)),
        getPublicUrl: vi.fn(() => ({
          data: { publicUrl: mockPublicUrl },
        })),
      })),
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
  getMaterials,
  getMaterial,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  updateItemMaterialAssignments,
  removeItemMaterial,
  bulkImportMaterials,
  updateMaterialStatus,
  uploadMaterialImages,
} from "../materials";

// ============================================================================
// Test Data Factories
// ============================================================================

const PROJECT_ID = "proj-001";
const MATERIAL_ID = "mat-001";

function makeMaterial(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: MATERIAL_ID,
    project_id: PROJECT_ID,
    material_code: "MAT-001",
    name: "Oak Veneer",
    specification: "Grade A, 2mm thickness",
    supplier: "WoodCraft Ltd",
    status: "pending",
    images: null,
    is_deleted: false,
    created_at: "2026-01-15T10:00:00Z",
    updated_at: "2026-01-15T10:00:00Z",
    item_materials: [{ item_id: "item-001" }],
    ...overrides,
  };
}

// ============================================================================
// Reset mocks before each test
// ============================================================================

beforeEach(() => {
  mockTerminalResult = { data: null, error: null };
  mockServiceTerminalResult = { data: null, error: null };
  mockCalls.length = 0;
  mockServiceCalls.length = 0;
  mockUser = { id: "test-user-id", email: "pm@test.com" };
  mockUserRole = "pm";
  mockUploadResult = { error: null };
  mockPublicUrl = "https://storage.example.com/materials/test.jpg";
});

// ============================================================================
// getMaterials
// ============================================================================

describe("getMaterials", () => {
  it("returns materials for a project", async () => {
    const materials = [makeMaterial(), makeMaterial({ id: "mat-002", material_code: "MAT-002" })];
    mockTerminalResult = { data: materials, error: null };

    const result = await getMaterials(PROJECT_ID);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(materials);

    // Verify query chain
    const fromCall = mockCalls.find((c) => c.method === "from");
    expect(fromCall?.args[0]).toBe("materials");

    const eqCalls = mockCalls.filter((c) => c.method === "eq");
    expect(eqCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ args: ["project_id", PROJECT_ID] }),
        expect.objectContaining({ args: ["is_deleted", false] }),
      ])
    );
  });

  it("returns error when not authenticated", async () => {
    mockUser = null;

    const result = await getMaterials(PROJECT_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });

  it("returns error on database failure", async () => {
    mockTerminalResult = { data: null, error: { message: "DB error" } };

    const result = await getMaterials(PROJECT_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe("DB error");
  });
});

// ============================================================================
// getMaterial
// ============================================================================

describe("getMaterial", () => {
  it("returns a single material by ID", async () => {
    const material = makeMaterial();
    mockTerminalResult = { data: material, error: null };

    const result = await getMaterial(MATERIAL_ID);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(material);

    // Verify .single() is called (terminal)
    const singleCall = mockCalls.find((c) => c.method === "single");
    expect(singleCall).toBeTruthy();
  });

  it("returns error when not authenticated", async () => {
    mockUser = null;

    const result = await getMaterial(MATERIAL_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });

  it("returns error when material not found", async () => {
    mockTerminalResult = { data: null, error: { message: "not found" } };

    const result = await getMaterial("nonexistent-id");

    expect(result.success).toBe(false);
    expect(result.error).toBe("not found");
  });
});

// ============================================================================
// createMaterial
// ============================================================================

describe("createMaterial", () => {
  it("creates a material with sanitized inputs", async () => {
    mockTerminalResult = { data: { id: "new-mat-001" }, error: null };

    const input = {
      material_code: " MAT-NEW ",
      name: " Marble Slab ",
      specification: " Italian Carrara ",
      supplier: " StoneWorks ",
      images: ["https://example.com/img1.jpg"],
    };

    const result = await createMaterial(PROJECT_ID, input);

    expect(result.success).toBe(true);
    expect(result.data?.id).toBe("new-mat-001");

    // Verify insert was called
    const insertCall = mockCalls.find((c) => c.method === "insert");
    expect(insertCall).toBeTruthy();

    const insertData = insertCall?.args[0] as Record<string, unknown>;
    expect(insertData.project_id).toBe(PROJECT_ID);
    expect(insertData.status).toBe("pending");
    expect(insertData.images).toEqual(["https://example.com/img1.jpg"]);
  });

  it("creates material with item assignments", async () => {
    mockTerminalResult = { data: { id: "new-mat-001" }, error: null };

    const input = {
      material_code: "MAT-NEW",
      name: "Marble Slab",
    };

    const result = await createMaterial(PROJECT_ID, input, ["item-001", "item-002"]);

    expect(result.success).toBe(true);

    // Verify item_materials insert was called
    const insertCalls = mockCalls.filter((c) => c.method === "insert");
    expect(insertCalls.length).toBeGreaterThanOrEqual(2); // material + assignments

    // The second insert should be the assignments array
    const assignmentInsert = insertCalls[1];
    const assignments = assignmentInsert?.args[0] as Array<Record<string, string>>;
    expect(assignments).toEqual([
      { item_id: "item-001", material_id: "new-mat-001" },
      { item_id: "item-002", material_id: "new-mat-001" },
    ]);
  });

  it("handles empty images array as null", async () => {
    mockTerminalResult = { data: { id: "new-mat-001" }, error: null };

    const input = {
      material_code: "MAT-NEW",
      name: "Test Material",
      images: [] as string[],
    };

    const result = await createMaterial(PROJECT_ID, input);

    expect(result.success).toBe(true);

    const insertCall = mockCalls.find((c) => c.method === "insert");
    const insertData = insertCall?.args[0] as Record<string, unknown>;
    expect(insertData.images).toBeNull();
  });

  it("returns error when not authenticated", async () => {
    mockUser = null;

    const result = await createMaterial(PROJECT_ID, {
      material_code: "MAT-001",
      name: "Test",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });

  it("returns error on insert failure", async () => {
    mockTerminalResult = { data: null, error: { message: "Duplicate code" } };

    const result = await createMaterial(PROJECT_ID, {
      material_code: "MAT-001",
      name: "Test",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Duplicate code");
  });
});

// ============================================================================
// updateMaterial
// ============================================================================

describe("updateMaterial", () => {
  it("updates material fields", async () => {
    mockTerminalResult = { data: null, error: null };

    const input = {
      material_code: "MAT-001-UPDATED",
      name: "Updated Oak Veneer",
      specification: "Grade B",
      supplier: null,
      images: ["https://example.com/new-img.jpg"],
    };

    const result = await updateMaterial(MATERIAL_ID, PROJECT_ID, input);

    expect(result.success).toBe(true);

    // Verify update was called
    const updateCall = mockCalls.find((c) => c.method === "update");
    expect(updateCall).toBeTruthy();

    const updateData = updateCall?.args[0] as Record<string, unknown>;
    expect(updateData.name).toBe("Updated Oak Veneer");
    expect(updateData.supplier).toBeNull();
  });

  it("replaces item assignments when provided", async () => {
    mockTerminalResult = { data: null, error: null };

    const input = {
      material_code: "MAT-001",
      name: "Oak Veneer",
    };

    const result = await updateMaterial(MATERIAL_ID, PROJECT_ID, input, ["item-003"]);

    expect(result.success).toBe(true);

    // Should delete old assignments, then insert new ones
    const deleteCalls = mockCalls.filter((c) => c.method === "delete");
    expect(deleteCalls.length).toBeGreaterThanOrEqual(1);

    const insertCalls = mockCalls.filter((c) => c.method === "insert");
    expect(insertCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("removes all assignments when empty array is provided", async () => {
    mockTerminalResult = { data: null, error: null };

    const input = {
      material_code: "MAT-001",
      name: "Oak Veneer",
    };

    const result = await updateMaterial(MATERIAL_ID, PROJECT_ID, input, []);

    expect(result.success).toBe(true);

    // Should delete old assignments but NOT insert new ones
    const deleteCalls = mockCalls.filter((c) => c.method === "delete");
    expect(deleteCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("skips assignment update when assignedItemIds is undefined", async () => {
    mockTerminalResult = { data: null, error: null };

    const input = {
      material_code: "MAT-001",
      name: "Oak Veneer",
    };

    // assignedItemIds is undefined (not passed)
    const result = await updateMaterial(MATERIAL_ID, PROJECT_ID, input);

    expect(result.success).toBe(true);

    // The only from() calls should be for materials update, NOT item_materials
    const fromCalls = mockCalls.filter((c) => c.method === "from");
    const itemMaterialCalls = fromCalls.filter((c) => c.args[0] === "item_materials");
    expect(itemMaterialCalls.length).toBe(0);
  });

  it("returns error when not authenticated", async () => {
    mockUser = null;

    const result = await updateMaterial(MATERIAL_ID, PROJECT_ID, {
      material_code: "MAT-001",
      name: "Test",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });
});

// ============================================================================
// deleteMaterial
// ============================================================================

describe("deleteMaterial", () => {
  it("soft-deletes material via service role client (pm role)", async () => {
    mockUserRole = "pm";
    mockTerminalResult = { data: { material_code: "MAT-001", name: "Oak" }, error: null };
    mockServiceTerminalResult = { data: null, error: null };

    const result = await deleteMaterial(MATERIAL_ID, PROJECT_ID);

    expect(result.success).toBe(true);

    // Verify service role client was used for the update
    const serviceUpdateCall = mockServiceCalls.find((c) => c.method === "update");
    expect(serviceUpdateCall).toBeTruthy();

    const updateData = serviceUpdateCall?.args[0] as Record<string, unknown>;
    expect(updateData.is_deleted).toBe(true);
  });

  it("allows admin role to delete", async () => {
    mockUserRole = "admin";
    mockTerminalResult = { data: { material_code: "MAT-001", name: "Oak" }, error: null };
    mockServiceTerminalResult = { data: null, error: null };

    const result = await deleteMaterial(MATERIAL_ID, PROJECT_ID);

    expect(result.success).toBe(true);
  });

  it("rejects deletion by production role", async () => {
    mockUserRole = "production";

    const result = await deleteMaterial(MATERIAL_ID, PROJECT_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authorized to delete materials");
  });

  it("rejects deletion by procurement role", async () => {
    mockUserRole = "procurement";

    const result = await deleteMaterial(MATERIAL_ID, PROJECT_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authorized to delete materials");
  });

  it("rejects deletion by client role", async () => {
    mockUserRole = "client";

    const result = await deleteMaterial(MATERIAL_ID, PROJECT_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authorized to delete materials");
  });

  it("rejects deletion by management role", async () => {
    mockUserRole = "management";

    const result = await deleteMaterial(MATERIAL_ID, PROJECT_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authorized to delete materials");
  });

  it("returns error when not authenticated", async () => {
    mockUser = null;

    const result = await deleteMaterial(MATERIAL_ID, PROJECT_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });

  it("returns error on service role failure", async () => {
    mockUserRole = "admin";
    mockTerminalResult = { data: { material_code: "MAT-001", name: "Oak" }, error: null };
    mockServiceTerminalResult = { data: null, error: { message: "Service error" } };

    const result = await deleteMaterial(MATERIAL_ID, PROJECT_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Service error");
  });
});

// ============================================================================
// updateItemMaterialAssignments
// ============================================================================

describe("updateItemMaterialAssignments", () => {
  it("adds new assignments and removes old ones", async () => {
    mockTerminalResult = { data: null, error: null };

    const result = await updateItemMaterialAssignments(
      "item-001",
      PROJECT_ID,
      ["mat-001", "mat-002"], // current
      ["mat-002", "mat-003"]  // selected — remove mat-001, add mat-003
    );

    expect(result.success).toBe(true);

    // Verify delete was called for removals (mat-001)
    const deleteCalls = mockCalls.filter((c) => c.method === "delete");
    expect(deleteCalls.length).toBeGreaterThanOrEqual(1);

    // Verify in() was called with toRemove IDs
    const inCalls = mockCalls.filter((c) => c.method === "in");
    expect(inCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ args: ["material_id", ["mat-001"]] }),
      ])
    );

    // Verify insert was called for additions (mat-003)
    const insertCalls = mockCalls.filter((c) => c.method === "insert");
    expect(insertCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("handles no changes (same sets)", async () => {
    mockTerminalResult = { data: null, error: null };

    const result = await updateItemMaterialAssignments(
      "item-001",
      PROJECT_ID,
      ["mat-001", "mat-002"],
      ["mat-001", "mat-002"]  // identical — no adds, no removes
    );

    expect(result.success).toBe(true);

    // No delete or insert calls for item_materials
    const deleteCalls = mockCalls.filter((c) => c.method === "delete");
    const insertCalls = mockCalls.filter((c) => c.method === "insert");
    expect(deleteCalls.length).toBe(0);
    expect(insertCalls.length).toBe(0);
  });

  it("handles adding all new (empty current)", async () => {
    mockTerminalResult = { data: null, error: null };

    const result = await updateItemMaterialAssignments(
      "item-001",
      PROJECT_ID,
      [],
      ["mat-001", "mat-002"]
    );

    expect(result.success).toBe(true);

    // Verify insert was called with 2 assignments
    const insertCall = mockCalls.find((c) => c.method === "insert");
    const assignments = insertCall?.args[0] as Array<Record<string, string>>;
    expect(assignments).toHaveLength(2);
  });

  it("returns error when not authenticated", async () => {
    mockUser = null;

    const result = await updateItemMaterialAssignments(
      "item-001",
      PROJECT_ID,
      [],
      ["mat-001"]
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });
});

// ============================================================================
// removeItemMaterial
// ============================================================================

describe("removeItemMaterial", () => {
  it("removes a single material-item assignment", async () => {
    mockTerminalResult = { data: null, error: null };

    const result = await removeItemMaterial("item-001", "mat-001", PROJECT_ID);

    expect(result.success).toBe(true);

    // Verify delete from item_materials
    const fromCall = mockCalls.find(
      (c) => c.method === "from" && c.args[0] === "item_materials"
    );
    expect(fromCall).toBeTruthy();

    const deleteCall = mockCalls.find((c) => c.method === "delete");
    expect(deleteCall).toBeTruthy();

    // Verify both eq constraints
    const eqCalls = mockCalls.filter((c) => c.method === "eq");
    expect(eqCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ args: ["item_id", "item-001"] }),
        expect.objectContaining({ args: ["material_id", "mat-001"] }),
      ])
    );
  });

  it("returns error when not authenticated", async () => {
    mockUser = null;

    const result = await removeItemMaterial("item-001", "mat-001", PROJECT_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });

  it("returns error on delete failure", async () => {
    mockTerminalResult = { data: null, error: { message: "FK constraint" } };

    const result = await removeItemMaterial("item-001", "mat-001", PROJECT_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe("FK constraint");
  });
});

// ============================================================================
// bulkImportMaterials
// ============================================================================

describe("bulkImportMaterials", () => {
  it("returns early for empty array", async () => {
    const result = await bulkImportMaterials(PROJECT_ID, []);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ inserted: 0, updated: 0 });
  });

  it("inserts new materials when none exist", async () => {
    // First query (existing lookup) returns empty, then insert returns new IDs
    mockTerminalResult = { data: [], error: null };

    const materials = [
      { material_code: "MAT-NEW-1", name: "New Material 1" },
      { material_code: "MAT-NEW-2", name: "New Material 2" },
    ];

    const result = await bulkImportMaterials(PROJECT_ID, materials);

    expect(result.success).toBe(true);

    // Verify insert was called
    const insertCalls = mockCalls.filter((c) => c.method === "insert");
    expect(insertCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("updates existing materials by code", async () => {
    // The lookup returns existing materials (match by code)
    mockTerminalResult = {
      data: [{ id: "existing-001", material_code: "MAT-EXIST" }],
      error: null,
    };

    const materials = [
      { material_code: "MAT-EXIST", name: "Updated Name", specification: "Updated Spec" },
    ];

    const result = await bulkImportMaterials(PROJECT_ID, materials);

    expect(result.success).toBe(true);

    // Verify update was called for existing material
    const updateCalls = mockCalls.filter((c) => c.method === "update");
    expect(updateCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("handles mixed insert and update", async () => {
    mockTerminalResult = {
      data: [{ id: "existing-001", material_code: "MAT-OLD" }],
      error: null,
    };

    const materials = [
      { material_code: "MAT-OLD", name: "Updated Old" },
      { material_code: "MAT-NEW", name: "Brand New" },
    ];

    const result = await bulkImportMaterials(PROJECT_ID, materials);

    expect(result.success).toBe(true);

    // Should have both insert and update calls
    const insertCalls = mockCalls.filter((c) => c.method === "insert");
    const updateCalls = mockCalls.filter((c) => c.method === "update");
    expect(insertCalls.length).toBeGreaterThanOrEqual(1);
    expect(updateCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("sanitizes all inputs", async () => {
    mockTerminalResult = { data: [], error: null };

    const materials = [
      {
        material_code: " MAT-DIRTY ",
        name: " Dirty Name ",
        specification: " Spec With Spaces ",
        supplier: " Supplier ",
      },
    ];

    const result = await bulkImportMaterials(PROJECT_ID, materials);

    expect(result.success).toBe(true);

    // Verify insert includes trimmed values (sanitizeText mock is passthrough but trim is called)
    const insertCall = mockCalls.find((c) => c.method === "insert");
    if (insertCall) {
      const insertData = insertCall.args[0] as Array<Record<string, unknown>>;
      // The function calls .trim() before sanitizeText
      expect(insertData[0].material_code).toBe("MAT-DIRTY");
    }
  });

  it("returns error when not authenticated", async () => {
    mockUser = null;

    const result = await bulkImportMaterials(PROJECT_ID, [
      { material_code: "MAT-001", name: "Test" },
    ]);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });
});

// ============================================================================
// updateMaterialStatus
// ============================================================================

describe("updateMaterialStatus", () => {
  it("updates status to approved", async () => {
    mockTerminalResult = { data: null, error: null };

    const result = await updateMaterialStatus(MATERIAL_ID, PROJECT_ID, "approved");

    expect(result.success).toBe(true);

    // Verify update was called with correct status
    const updateCall = mockCalls.find((c) => c.method === "update");
    expect(updateCall).toBeTruthy();

    const updateData = updateCall?.args[0] as Record<string, unknown>;
    expect(updateData.status).toBe("approved");
  });

  it("updates status to rejected", async () => {
    mockTerminalResult = { data: null, error: null };

    const result = await updateMaterialStatus(MATERIAL_ID, PROJECT_ID, "rejected");

    expect(result.success).toBe(true);

    const updateCall = mockCalls.find((c) => c.method === "update");
    const updateData = updateCall?.args[0] as Record<string, unknown>;
    expect(updateData.status).toBe("rejected");
  });

  it("updates status to pending", async () => {
    mockTerminalResult = { data: null, error: null };

    const result = await updateMaterialStatus(MATERIAL_ID, PROJECT_ID, "pending");

    expect(result.success).toBe(true);

    const updateCall = mockCalls.find((c) => c.method === "update");
    const updateData = updateCall?.args[0] as Record<string, unknown>;
    expect(updateData.status).toBe("pending");
  });

  it("returns error when not authenticated", async () => {
    mockUser = null;

    const result = await updateMaterialStatus(MATERIAL_ID, PROJECT_ID, "approved");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });

  it("returns error on update failure", async () => {
    mockTerminalResult = { data: null, error: { message: "Invalid status" } };

    const result = await updateMaterialStatus(MATERIAL_ID, PROJECT_ID, "approved");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid status");
  });
});

// ============================================================================
// uploadMaterialImages
// ============================================================================

describe("uploadMaterialImages", () => {
  it("uploads images and returns public URLs", async () => {
    const files = [
      { name: "photo1.jpg", type: "image/jpeg", data: "base64data" },
      { name: "photo2.png", type: "image/png", data: "data:image/png;base64,abc123" },
    ];

    const result = await uploadMaterialImages(PROJECT_ID, files);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.length).toBe(2);
    expect(result.data![0]).toBe(mockPublicUrl);
  });

  it("returns empty array when all uploads fail", async () => {
    mockUploadResult = { error: { message: "Upload failed" } };

    const files = [
      { name: "photo1.jpg", type: "image/jpeg", data: "base64data" },
    ];

    const result = await uploadMaterialImages(PROJECT_ID, files);

    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  it("returns error when not authenticated", async () => {
    mockUser = null;

    const result = await uploadMaterialImages(PROJECT_ID, []);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });
});
