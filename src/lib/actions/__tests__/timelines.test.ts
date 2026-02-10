import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Mock Setup — Supabase chainable query builder
// ============================================================================

let mockTerminalResult: { data: unknown; error: unknown } = {
  data: null,
  error: null,
};

const mockCalls: { method: string; args: unknown[] }[] = [];

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
    "select", "insert", "update", "delete", "eq", "in", "order",
    "single", "is", "neq", "limit", "range", "maybeSingle",
  ];

  for (const method of methods) {
    chain[method] = vi.fn((...args: unknown[]) => {
      callLog.push({ method, args });
      if (method === "single" || method === "maybeSingle") {
        return Promise.resolve(terminalResultFn());
      }
      return Object.assign(chain, {
        then: (resolve: (v: unknown) => void) => resolve(terminalResultFn()),
      });
    });
  }

  return chain;
}

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

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve(
      createMockClient(mockCalls, () => mockTerminalResult)
    )
  ),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// ============================================================================
// Import server actions AFTER mocks
// ============================================================================

import {
  getTimelineItems,
  getTimelineDependencies,
  createTimelineItem,
  updateTimelineItem,
  updateTimelineItemDates,
  deleteTimelineItem,
  reorderTimelineItems,
  createTimelineDependency,
  updateTimelineDependency,
  deleteTimelineDependency,
} from "../timelines";

// ============================================================================
// Test Data
// ============================================================================

const PROJECT_ID = "proj-001";
const ITEM_ID = "timeline-001";
const DEP_ID = "dep-001";

function makeGanttItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: ITEM_ID,
    project_id: PROJECT_ID,
    name: "Design Phase",
    item_type: "task",
    phase_key: null,
    parent_id: null,
    sort_order: 1,
    start_date: "2026-03-01",
    end_date: "2026-04-01",
    priority: 2,
    progress_override: null,
    is_completed: false,
    completed_at: null,
    color: null,
    created_by: "test-user-id",
    created_at: "2026-01-15T10:00:00Z",
    updated_at: "2026-01-15T10:00:00Z",
    ...overrides,
  };
}

function makeDependency(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: DEP_ID,
    project_id: PROJECT_ID,
    source_id: "timeline-001",
    target_id: "timeline-002",
    dependency_type: 0,
    lag_days: 0,
    created_at: "2026-01-15T10:00:00Z",
    created_by: "test-user-id",
    ...overrides,
  };
}

// ============================================================================
// Reset
// ============================================================================

beforeEach(() => {
  mockTerminalResult = { data: null, error: null };
  mockCalls.length = 0;
  mockUser = { id: "test-user-id", email: "pm@test.com" };
});

// ============================================================================
// getTimelineItems
// ============================================================================

describe("getTimelineItems", () => {
  it("returns empty array when not authenticated", async () => {
    mockUser = null;

    const result = await getTimelineItems(PROJECT_ID);

    expect(result).toEqual([]);
  });

  it("returns empty array on database error", async () => {
    mockTerminalResult = { data: null, error: { message: "DB error" } };

    const result = await getTimelineItems(PROJECT_ID);

    expect(result).toEqual([]);
  });

  it("queries gantt_items table with project_id", async () => {
    mockTerminalResult = { data: [], error: null };

    await getTimelineItems(PROJECT_ID);

    const fromCalls = mockCalls.filter((c) => c.method === "from");
    expect(fromCalls[0]?.args[0]).toBe("gantt_items");

    const eqCalls = mockCalls.filter((c) => c.method === "eq");
    expect(eqCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ args: ["project_id", PROJECT_ID] }),
      ])
    );
  });
});

// ============================================================================
// getTimelineDependencies
// ============================================================================

describe("getTimelineDependencies", () => {
  it("returns dependencies for a project", async () => {
    const deps = [makeDependency(), makeDependency({ id: "dep-002" })];
    mockTerminalResult = { data: deps, error: null };

    const result = await getTimelineDependencies(PROJECT_ID);

    expect(result).toEqual(deps);
  });

  it("returns empty array when not authenticated", async () => {
    mockUser = null;

    const result = await getTimelineDependencies(PROJECT_ID);

    expect(result).toEqual([]);
  });

  it("returns empty array on error", async () => {
    mockTerminalResult = { data: null, error: { message: "DB error" } };

    const result = await getTimelineDependencies(PROJECT_ID);

    expect(result).toEqual([]);
  });
});

// ============================================================================
// createTimelineItem
// ============================================================================

describe("createTimelineItem", () => {
  it("creates a task successfully", async () => {
    // Mock returns the same object for ALL queries:
    // role check → sees { role: "pm" } → passes
    // max sort order → sees { sort_order: 1 } → nextOrder = 2
    // insert → sees the item → success
    const created = makeGanttItem({ id: "new-item", role: "pm" });
    mockTerminalResult = { data: created, error: null };

    const result = await createTimelineItem({
      project_id: PROJECT_ID,
      name: "New Task",
      item_type: "task",
      start_date: "2026-03-01",
      end_date: "2026-03-15",
    });

    expect(result.success).toBe(true);
  });

  it("rejects when not authenticated", async () => {
    mockUser = null;

    const result = await createTimelineItem({
      project_id: PROJECT_ID,
      name: "New Task",
      item_type: "task",
      start_date: "2026-03-01",
      end_date: "2026-03-15",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });

  it("rejects creating phases (fixed phases only)", async () => {
    // Mock returns role = "pm" for the user check
    mockTerminalResult = { data: { role: "pm" }, error: null };

    const result = await createTimelineItem({
      project_id: PROJECT_ID,
      name: "Custom Phase",
      item_type: "phase",
      start_date: "2026-03-01",
      end_date: "2026-06-01",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Phases are fixed and cannot be created manually");
  });

  it("rejects non-admin/non-pm roles", async () => {
    // Mock returns role = "production"
    mockTerminalResult = { data: { role: "production" }, error: null };

    const result = await createTimelineItem({
      project_id: PROJECT_ID,
      name: "New Task",
      item_type: "task",
      start_date: "2026-03-01",
      end_date: "2026-03-15",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Only PM and Admin can create timeline items");
  });

  it("creates a milestone", async () => {
    const created = makeGanttItem({ id: "new-milestone", item_type: "milestone", role: "admin" });
    mockTerminalResult = { data: created, error: null };

    const result = await createTimelineItem({
      project_id: PROJECT_ID,
      name: "Key Milestone",
      item_type: "milestone",
      start_date: "2026-05-01",
      end_date: "2026-05-01",
    });

    expect(result.success).toBe(true);
  });

  it("inserts scope item links when provided", async () => {
    const created = makeGanttItem({ id: "new-task", role: "pm" });
    mockTerminalResult = { data: created, error: null };

    await createTimelineItem({
      project_id: PROJECT_ID,
      name: "Linked Task",
      item_type: "task",
      start_date: "2026-03-01",
      end_date: "2026-03-15",
      linked_scope_item_ids: ["scope-001", "scope-002"],
    });

    // Verify gantt_item_scope_items insert
    const fromCalls = mockCalls.filter((c) => c.method === "from");
    const scopeLinkCalls = fromCalls.filter((c) => c.args[0] === "gantt_item_scope_items");
    expect(scopeLinkCalls.length).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// updateTimelineItem
// ============================================================================

describe("updateTimelineItem", () => {
  it("updates a timeline item successfully", async () => {
    const updated = makeGanttItem({ name: "Updated Task", role: "pm" });
    mockTerminalResult = { data: updated, error: null };

    const result = await updateTimelineItem(ITEM_ID, {
      name: "Updated Task",
      priority: 3,
    });

    expect(result.success).toBe(true);
  });

  it("rejects when not authenticated", async () => {
    mockUser = null;

    const result = await updateTimelineItem(ITEM_ID, { name: "Updated" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });

  it("rejects non-admin/non-pm roles", async () => {
    mockTerminalResult = { data: { role: "client" }, error: null };

    const result = await updateTimelineItem(ITEM_ID, { name: "Updated" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Only PM and Admin can update timeline items");
  });

  it("replaces scope item links when provided", async () => {
    const updated = makeGanttItem({ role: "pm" });
    mockTerminalResult = { data: updated, error: null };

    await updateTimelineItem(ITEM_ID, {
      linked_scope_item_ids: ["scope-003"],
    });

    // Should delete existing links + insert new
    const fromCalls = mockCalls.filter((c) => c.method === "from");
    const scopeLinkCalls = fromCalls.filter((c) => c.args[0] === "gantt_item_scope_items");
    expect(scopeLinkCalls.length).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// updateTimelineItemDates
// ============================================================================

describe("updateTimelineItemDates", () => {
  it("delegates to updateTimelineItem with start and end dates", async () => {
    const updated = makeGanttItem({ role: "pm" });
    mockTerminalResult = { data: updated, error: null };

    const result = await updateTimelineItemDates(
      ITEM_ID,
      "2026-04-01",
      "2026-05-01"
    );

    expect(result.success).toBe(true);
  });

  it("returns error when not authenticated", async () => {
    mockUser = null;

    const result = await updateTimelineItemDates(ITEM_ID, "2026-04-01", "2026-05-01");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });
});

// ============================================================================
// deleteTimelineItem
// ============================================================================

describe("deleteTimelineItem", () => {
  it("deletes a task successfully", async () => {
    mockTerminalResult = {
      data: { project_id: PROJECT_ID, parent_id: null, item_type: "task", role: "pm" },
      error: null,
    };

    const result = await deleteTimelineItem(ITEM_ID);

    expect(result.success).toBe(true);

    // Verify delete was called
    const deleteCalls = mockCalls.filter((c) => c.method === "delete");
    expect(deleteCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("rejects deleting fixed phases", async () => {
    mockTerminalResult = {
      data: { project_id: PROJECT_ID, parent_id: null, item_type: "phase", role: "admin" },
      error: null,
    };

    const result = await deleteTimelineItem(ITEM_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Fixed phases cannot be deleted");
  });

  it("reparents children before deleting", async () => {
    mockTerminalResult = {
      data: { project_id: PROJECT_ID, parent_id: "parent-phase", item_type: "task", role: "pm" },
      error: null,
    };

    const result = await deleteTimelineItem(ITEM_ID);

    expect(result.success).toBe(true);

    // Verify reparent update was called
    const updateCalls = mockCalls.filter((c) => c.method === "update");
    expect(updateCalls.length).toBeGreaterThanOrEqual(1);

    // First update should set parent_id to the deleted item's parent
    const reparentUpdate = updateCalls[0]?.args[0] as Record<string, unknown>;
    expect(reparentUpdate.parent_id).toBe("parent-phase");
  });

  it("rejects when not authenticated", async () => {
    mockUser = null;

    const result = await deleteTimelineItem(ITEM_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });

  it("rejects non-admin/non-pm roles", async () => {
    mockTerminalResult = { data: { role: "procurement" }, error: null };

    const result = await deleteTimelineItem(ITEM_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Only PM and Admin can delete timeline items");
  });
});

// ============================================================================
// reorderTimelineItems
// ============================================================================

describe("reorderTimelineItems", () => {
  it("updates sort_order for each item", async () => {
    mockTerminalResult = { data: null, error: null };

    const result = await reorderTimelineItems(PROJECT_ID, [
      "item-3",
      "item-1",
      "item-2",
    ]);

    expect(result.success).toBe(true);

    // Verify 3 update calls (one per item)
    const updateCalls = mockCalls.filter((c) => c.method === "update");
    expect(updateCalls.length).toBe(3);

    // Verify sort_order values (1-based)
    expect((updateCalls[0]?.args[0] as Record<string, unknown>).sort_order).toBe(1);
    expect((updateCalls[1]?.args[0] as Record<string, unknown>).sort_order).toBe(2);
    expect((updateCalls[2]?.args[0] as Record<string, unknown>).sort_order).toBe(3);
  });

  it("rejects when not authenticated", async () => {
    mockUser = null;

    const result = await reorderTimelineItems(PROJECT_ID, ["item-1"]);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });
});

// ============================================================================
// createTimelineDependency
// ============================================================================

describe("createTimelineDependency", () => {
  it("creates a Finish-to-Start dependency (type 0)", async () => {
    const created = makeDependency({ role: "pm" });
    mockTerminalResult = { data: created, error: null };

    const result = await createTimelineDependency({
      project_id: PROJECT_ID,
      source_id: "timeline-001",
      target_id: "timeline-002",
      dependency_type: 0,
      lag_days: 0,
    });

    expect(result.success).toBe(true);
  });

  it("creates a Start-to-Start dependency (type 1)", async () => {
    const created = makeDependency({ dependency_type: 1, role: "pm" });
    mockTerminalResult = { data: created, error: null };

    const result = await createTimelineDependency({
      project_id: PROJECT_ID,
      source_id: "timeline-001",
      target_id: "timeline-002",
      dependency_type: 1,
    });

    expect(result.success).toBe(true);
  });

  it("creates Finish-to-Finish dependency (type 2)", async () => {
    const created = makeDependency({ dependency_type: 2, role: "pm" });
    mockTerminalResult = { data: created, error: null };

    const result = await createTimelineDependency({
      project_id: PROJECT_ID,
      source_id: "timeline-001",
      target_id: "timeline-002",
      dependency_type: 2,
    });

    expect(result.success).toBe(true);
  });

  it("creates Start-to-Finish dependency (type 3)", async () => {
    const created = makeDependency({ dependency_type: 3, role: "pm" });
    mockTerminalResult = { data: created, error: null };

    const result = await createTimelineDependency({
      project_id: PROJECT_ID,
      source_id: "timeline-001",
      target_id: "timeline-002",
      dependency_type: 3,
    });

    expect(result.success).toBe(true);
  });

  it("rejects self-referencing dependency", async () => {
    // Mock returns role = "pm"
    mockTerminalResult = { data: { role: "pm" }, error: null };

    const result = await createTimelineDependency({
      project_id: PROJECT_ID,
      source_id: "timeline-001",
      target_id: "timeline-001", // same ID!
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Cannot create a dependency to itself");
  });

  it("defaults to FS (type 0) and lag 0 when not specified", async () => {
    const created = makeDependency();
    mockTerminalResult = { data: created, error: null };

    await createTimelineDependency({
      project_id: PROJECT_ID,
      source_id: "timeline-001",
      target_id: "timeline-002",
      // No dependency_type or lag_days specified
    });

    // Verify insert includes defaults
    const insertCall = mockCalls.find((c) => c.method === "insert");
    if (insertCall) {
      const data = insertCall.args[0] as Record<string, unknown>;
      expect(data.dependency_type).toBe(0);
      expect(data.lag_days).toBe(0);
    }
  });

  it("supports positive lag_days", async () => {
    const created = makeDependency({ lag_days: 5 });
    mockTerminalResult = { data: created, error: null };

    await createTimelineDependency({
      project_id: PROJECT_ID,
      source_id: "timeline-001",
      target_id: "timeline-002",
      lag_days: 5,
    });

    const insertCall = mockCalls.find((c) => c.method === "insert");
    if (insertCall) {
      const data = insertCall.args[0] as Record<string, unknown>;
      expect(data.lag_days).toBe(5);
    }
  });

  it("rejects when not authenticated", async () => {
    mockUser = null;

    const result = await createTimelineDependency({
      project_id: PROJECT_ID,
      source_id: "timeline-001",
      target_id: "timeline-002",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });

  it("rejects non-admin/non-pm roles", async () => {
    mockTerminalResult = { data: { role: "management" }, error: null };

    const result = await createTimelineDependency({
      project_id: PROJECT_ID,
      source_id: "timeline-001",
      target_id: "timeline-002",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Only PM and Admin can create dependencies");
  });
});

// ============================================================================
// updateTimelineDependency
// ============================================================================

describe("updateTimelineDependency", () => {
  it("updates dependency type and lag days", async () => {
    const updated = makeDependency({ dependency_type: 1, lag_days: 3, role: "pm" });
    mockTerminalResult = { data: updated, error: null };

    const result = await updateTimelineDependency(DEP_ID, {
      dependency_type: 1,
      lag_days: 3,
    });

    expect(result.success).toBe(true);
  });

  it("rejects when not authenticated", async () => {
    mockUser = null;

    const result = await updateTimelineDependency(DEP_ID, { lag_days: 1 });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });

  it("rejects non-admin/non-pm roles", async () => {
    mockTerminalResult = { data: { role: "client" }, error: null };

    const result = await updateTimelineDependency(DEP_ID, { lag_days: 1 });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Only PM and Admin can update dependencies");
  });
});

// ============================================================================
// deleteTimelineDependency
// ============================================================================

describe("deleteTimelineDependency", () => {
  it("deletes a dependency successfully", async () => {
    mockTerminalResult = {
      data: { project_id: PROJECT_ID, role: "pm" },
      error: null,
    };

    const result = await deleteTimelineDependency(DEP_ID);

    expect(result.success).toBe(true);

    // Verify delete was called on gantt_dependencies
    const fromCalls = mockCalls.filter(
      (c) => c.method === "from" && c.args[0] === "gantt_dependencies"
    );
    expect(fromCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("rejects when not authenticated", async () => {
    mockUser = null;

    const result = await deleteTimelineDependency(DEP_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });

  it("rejects non-admin/non-pm roles", async () => {
    mockTerminalResult = { data: { role: "production" }, error: null };

    const result = await deleteTimelineDependency(DEP_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Only PM and Admin can delete dependencies");
  });
});
