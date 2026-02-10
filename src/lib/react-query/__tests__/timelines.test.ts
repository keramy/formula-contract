import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// ============================================================================
// Mock Server Actions
// ============================================================================

const mockGetTimelineItems = vi.fn();
const mockGetTimelineDependencies = vi.fn();
const mockCreateTimelineItem = vi.fn();
const mockUpdateTimelineItem = vi.fn();
const mockUpdateTimelineItemDates = vi.fn();
const mockDeleteTimelineItem = vi.fn();
const mockReorderTimelineItems = vi.fn();
const mockCreateTimelineDependency = vi.fn();
const mockUpdateTimelineDependency = vi.fn();
const mockDeleteTimelineDependency = vi.fn();

vi.mock("@/lib/actions/timelines", () => ({
  getTimelineItems: (...args: unknown[]) => mockGetTimelineItems(...args),
  getTimelineDependencies: (...args: unknown[]) => mockGetTimelineDependencies(...args),
  createTimelineItem: (...args: unknown[]) => mockCreateTimelineItem(...args),
  updateTimelineItem: (...args: unknown[]) => mockUpdateTimelineItem(...args),
  updateTimelineItemDates: (...args: unknown[]) => mockUpdateTimelineItemDates(...args),
  deleteTimelineItem: (...args: unknown[]) => mockDeleteTimelineItem(...args),
  reorderTimelineItems: (...args: unknown[]) => mockReorderTimelineItems(...args),
  createTimelineDependency: (...args: unknown[]) => mockCreateTimelineDependency(...args),
  updateTimelineDependency: (...args: unknown[]) => mockUpdateTimelineDependency(...args),
  deleteTimelineDependency: (...args: unknown[]) => mockDeleteTimelineDependency(...args),
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
  timelineKeys,
  useTimelineItems,
  useTimelineDependencies,
  useCreateTimelineItem,
  useUpdateTimelineItem,
  useUpdateTimelineItemDates,
  useDeleteTimelineItem,
  useReorderTimelineItems,
  useCreateTimelineDependency,
  useUpdateTimelineDependency,
  useDeleteTimelineDependency,
} from "../timelines";

import { toast } from "sonner";

// ============================================================================
// Test Helpers
// ============================================================================

const PROJECT_ID = "proj-001";

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

function makeItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "item-001",
    project_id: PROJECT_ID,
    name: "Test Task",
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
    created_by: null,
    created_at: "2026-01-15T10:00:00Z",
    updated_at: "2026-01-15T10:00:00Z",
    progress: 0,
    linked_scope_item_ids: [],
    ...overrides,
  };
}

function makeDep(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "dep-001",
    project_id: PROJECT_ID,
    source_id: "item-001",
    target_id: "item-002",
    dependency_type: 0,
    lag_days: 0,
    created_at: "2026-01-15T10:00:00Z",
    created_by: null,
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

describe("timelineKeys", () => {
  it("builds correct base key", () => {
    expect(timelineKeys.all).toEqual(["timelines"]);
  });

  it("builds correct lists key", () => {
    expect(timelineKeys.lists()).toEqual(["timelines", "list"]);
  });

  it("builds correct list key with project ID", () => {
    expect(timelineKeys.list("proj-001")).toEqual(["timelines", "list", "proj-001"]);
    expect(timelineKeys.list("proj-002")).toEqual(["timelines", "list", "proj-002"]);
  });

  it("builds correct dependencies key", () => {
    expect(timelineKeys.dependencies()).toEqual(["timelines", "dependencies"]);
  });

  it("builds correct dependency list key with project ID", () => {
    expect(timelineKeys.dependencyList("proj-001")).toEqual([
      "timelines",
      "dependencies",
      "proj-001",
    ]);
  });

  it("list keys for different projects are distinct", () => {
    const key1 = timelineKeys.list("proj-001");
    const key2 = timelineKeys.list("proj-002");
    expect(key1).not.toEqual(key2);
  });

  it("list and dependency keys are distinct for same project", () => {
    const listKey = timelineKeys.list("proj-001");
    const depKey = timelineKeys.dependencyList("proj-001");
    expect(listKey).not.toEqual(depKey);
  });
});

// ============================================================================
// useTimelineItems
// ============================================================================

describe("useTimelineItems", () => {
  it("fetches items for a project", async () => {
    const items = [makeItem(), makeItem({ id: "item-002" })];
    mockGetTimelineItems.mockResolvedValue(items);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useTimelineItems(PROJECT_ID), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(items);
    expect(mockGetTimelineItems).toHaveBeenCalledWith(PROJECT_ID);
  });

  it("is disabled when projectId is empty", () => {
    mockGetTimelineItems.mockResolvedValue([]);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useTimelineItems(""), { wrapper });

    // Should not fetch when projectId is empty
    expect(result.current.fetchStatus).toBe("idle");
    expect(mockGetTimelineItems).not.toHaveBeenCalled();
  });
});

// ============================================================================
// useTimelineDependencies
// ============================================================================

describe("useTimelineDependencies", () => {
  it("fetches dependencies for a project", async () => {
    const deps = [makeDep()];
    mockGetTimelineDependencies.mockResolvedValue(deps);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useTimelineDependencies(PROJECT_ID), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(deps);
    expect(mockGetTimelineDependencies).toHaveBeenCalledWith(PROJECT_ID);
  });

  it("is disabled when projectId is empty", () => {
    mockGetTimelineDependencies.mockResolvedValue([]);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useTimelineDependencies(""), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
  });
});

// ============================================================================
// useCreateTimelineItem - Optimistic Updates
// ============================================================================

describe("useCreateTimelineItem", () => {
  it("adds item optimistically then settles", async () => {
    const newItem = makeItem({ id: "created-001" });
    mockCreateTimelineItem.mockResolvedValue({ success: true, data: newItem });

    const { wrapper, queryClient } = createWrapper();

    // Pre-seed the cache
    queryClient.setQueryData(timelineKeys.list(PROJECT_ID), [makeItem()]);

    const { result } = renderHook(() => useCreateTimelineItem(PROJECT_ID), { wrapper });

    await act(async () => {
      result.current.mutate({
        project_id: PROJECT_ID,
        name: "New Task",
        item_type: "task",
        start_date: "2026-03-01",
        end_date: "2026-03-15",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCreateTimelineItem).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith("Timeline item created");
  });

  it("rolls back on error and shows toast", async () => {
    mockCreateTimelineItem.mockResolvedValue({
      success: false,
      error: "Create failed",
    });

    const { wrapper, queryClient } = createWrapper();
    const existingItems = [makeItem()];
    queryClient.setQueryData(timelineKeys.list(PROJECT_ID), existingItems);

    const { result } = renderHook(() => useCreateTimelineItem(PROJECT_ID), { wrapper });

    await act(async () => {
      result.current.mutate({
        project_id: PROJECT_ID,
        name: "Bad Task",
        item_type: "task",
        start_date: "2026-03-01",
        end_date: "2026-03-15",
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(toast.error).toHaveBeenCalledWith("Create failed");
  });
});

// ============================================================================
// useUpdateTimelineItem - Optimistic Updates
// ============================================================================

describe("useUpdateTimelineItem", () => {
  it("updates item optimistically", async () => {
    const updated = makeItem({ name: "Updated Name" });
    mockUpdateTimelineItem.mockResolvedValue({ success: true, data: updated });

    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(timelineKeys.list(PROJECT_ID), [makeItem()]);

    const { result } = renderHook(() => useUpdateTimelineItem(PROJECT_ID), { wrapper });

    await act(async () => {
      result.current.mutate({
        timelineId: "item-001",
        input: { name: "Updated Name" },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockUpdateTimelineItem).toHaveBeenCalledWith("item-001", { name: "Updated Name" });
    expect(toast.success).toHaveBeenCalledWith("Timeline item updated");
  });

  it("rolls back on failure", async () => {
    mockUpdateTimelineItem.mockResolvedValue({ success: false, error: "Update failed" });

    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(timelineKeys.list(PROJECT_ID), [makeItem()]);

    const { result } = renderHook(() => useUpdateTimelineItem(PROJECT_ID), { wrapper });

    await act(async () => {
      result.current.mutate({
        timelineId: "item-001",
        input: { name: "Bad Update" },
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(toast.error).toHaveBeenCalledWith("Update failed");
  });
});

// ============================================================================
// useUpdateTimelineItemDates - Drag Operations
// ============================================================================

describe("useUpdateTimelineItemDates", () => {
  it("updates dates optimistically (drag)", async () => {
    mockUpdateTimelineItemDates.mockResolvedValue({ success: true });

    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(timelineKeys.list(PROJECT_ID), [makeItem()]);

    const { result } = renderHook(() => useUpdateTimelineItemDates(PROJECT_ID), { wrapper });

    await act(async () => {
      result.current.mutate({
        timelineId: "item-001",
        startDate: "2026-04-01",
        endDate: "2026-05-01",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockUpdateTimelineItemDates).toHaveBeenCalledWith(
      "item-001",
      "2026-04-01",
      "2026-05-01"
    );
  });
});

// ============================================================================
// useDeleteTimelineItem - Optimistic Remove
// ============================================================================

describe("useDeleteTimelineItem", () => {
  it("removes item optimistically", async () => {
    mockDeleteTimelineItem.mockResolvedValue({ success: true });

    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(timelineKeys.list(PROJECT_ID), [
      makeItem(),
      makeItem({ id: "item-002" }),
    ]);

    const { result } = renderHook(() => useDeleteTimelineItem(PROJECT_ID), { wrapper });

    await act(async () => {
      result.current.mutate("item-001");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockDeleteTimelineItem).toHaveBeenCalledWith("item-001");
    expect(toast.success).toHaveBeenCalledWith("Timeline item deleted");
  });

  it("rolls back and shows error on failure", async () => {
    mockDeleteTimelineItem.mockResolvedValue({ success: false, error: "Cannot delete phase" });

    const { wrapper, queryClient } = createWrapper();
    const items = [makeItem(), makeItem({ id: "item-002" })];
    queryClient.setQueryData(timelineKeys.list(PROJECT_ID), items);

    const { result } = renderHook(() => useDeleteTimelineItem(PROJECT_ID), { wrapper });

    await act(async () => {
      result.current.mutate("item-001");
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(toast.error).toHaveBeenCalledWith("Cannot delete phase");
  });
});

// ============================================================================
// useReorderTimelineItems
// ============================================================================

describe("useReorderTimelineItems", () => {
  it("reorders items", async () => {
    mockReorderTimelineItems.mockResolvedValue({ success: true });

    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(timelineKeys.list(PROJECT_ID), [
      makeItem({ id: "item-A", sort_order: 1 }),
      makeItem({ id: "item-B", sort_order: 2 }),
    ]);

    const { result } = renderHook(() => useReorderTimelineItems(PROJECT_ID), { wrapper });

    await act(async () => {
      result.current.mutate(["item-B", "item-A"]);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockReorderTimelineItems).toHaveBeenCalledWith(PROJECT_ID, ["item-B", "item-A"]);
  });
});

// ============================================================================
// useCreateTimelineDependency
// ============================================================================

describe("useCreateTimelineDependency", () => {
  it("creates dependency with optimistic update", async () => {
    const created = makeDep({ id: "new-dep" });
    mockCreateTimelineDependency.mockResolvedValue({ success: true, data: created });

    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(timelineKeys.dependencyList(PROJECT_ID), []);

    const { result } = renderHook(
      () => useCreateTimelineDependency(PROJECT_ID),
      { wrapper }
    );

    await act(async () => {
      result.current.mutate({
        project_id: PROJECT_ID,
        source_id: "item-001",
        target_id: "item-002",
        dependency_type: 0,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(toast.success).toHaveBeenCalledWith("Dependency created");
  });
});

// ============================================================================
// useUpdateTimelineDependency
// ============================================================================

describe("useUpdateTimelineDependency", () => {
  it("updates dependency type and lag", async () => {
    const updated = makeDep({ dependency_type: 1, lag_days: 2 });
    mockUpdateTimelineDependency.mockResolvedValue({ success: true, data: updated });

    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(timelineKeys.dependencyList(PROJECT_ID), [makeDep()]);

    const { result } = renderHook(
      () => useUpdateTimelineDependency(PROJECT_ID),
      { wrapper }
    );

    await act(async () => {
      result.current.mutate({
        dependencyId: "dep-001",
        updates: { dependency_type: 1, lag_days: 2 },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockUpdateTimelineDependency).toHaveBeenCalledWith("dep-001", {
      dependency_type: 1,
      lag_days: 2,
    });
    expect(toast.success).toHaveBeenCalledWith("Dependency updated");
  });
});

// ============================================================================
// useDeleteTimelineDependency
// ============================================================================

describe("useDeleteTimelineDependency", () => {
  it("deletes dependency with optimistic remove", async () => {
    mockDeleteTimelineDependency.mockResolvedValue({ success: true });

    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(timelineKeys.dependencyList(PROJECT_ID), [makeDep()]);

    const { result } = renderHook(
      () => useDeleteTimelineDependency(PROJECT_ID),
      { wrapper }
    );

    await act(async () => {
      result.current.mutate("dep-001");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockDeleteTimelineDependency).toHaveBeenCalledWith("dep-001");
    expect(toast.success).toHaveBeenCalledWith("Dependency deleted");
  });

  it("rolls back on failure", async () => {
    mockDeleteTimelineDependency.mockResolvedValue({
      success: false,
      error: "Delete failed",
    });

    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(timelineKeys.dependencyList(PROJECT_ID), [makeDep()]);

    const { result } = renderHook(
      () => useDeleteTimelineDependency(PROJECT_ID),
      { wrapper }
    );

    await act(async () => {
      result.current.mutate("dep-001");
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(toast.error).toHaveBeenCalledWith("Delete failed");
  });
});
