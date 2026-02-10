import React from "react";
import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { GanttSidebar } from "@/components/gantt/gantt-sidebar";
import type { GanttItem } from "@/components/gantt/types";
import { renderUI } from "@/test/utils";

const baseItem = {
  startDate: new Date("2026-02-10"),
  endDate: new Date("2026-02-12"),
  progress: 0,
  color: "#3b82f6",
  hierarchyLevel: 0,
};

let idCounter = 0;
const makeItem = (overrides: Partial<GanttItem>): GanttItem => ({
  id: `item-${idCounter++}`,
  name: "Item",
  type: "task",
  ...baseItem,
  ...overrides,
});

describe("GanttSidebar", () => {
  it("shows collapse button when a parent has one or more children", () => {
    const parentOne = makeItem({ id: "p1", name: "Parent One", type: "task", hierarchyLevel: 0 });
    const childOne = makeItem({ id: "c1", name: "Child One", parentId: "p1", hierarchyLevel: 1 });

    const parentTwo = makeItem({ id: "p2", name: "Parent Two", type: "task", hierarchyLevel: 0 });
    const childTwoA = makeItem({ id: "c2a", name: "Child Two A", parentId: "p2", hierarchyLevel: 1 });
    const childTwoB = makeItem({ id: "c2b", name: "Child Two B", parentId: "p2", hierarchyLevel: 1 });

    renderUI(
      <GanttSidebar
        items={[parentOne, childOne, parentTwo, childTwoA, childTwoB]}
        rowHeight={36}
        headerHeight={48}
        onToggleCollapse={vi.fn()}
      />
    );

    const collapseButtons = screen.queryAllByLabelText(/collapse|expand/i);
    // Both parents should have collapse buttons (each has at least one child)
    expect(collapseButtons.length).toBe(2);
  });

  it("calls onToggleCollapse when collapse is clicked", () => {
    const onToggleCollapse = vi.fn();
    const parent = makeItem({ id: "p1", name: "Parent", type: "task", hierarchyLevel: 0 });
    const childA = makeItem({ id: "c1", name: "Child A", parentId: "p1", hierarchyLevel: 1 });
    const childB = makeItem({ id: "c2", name: "Child B", parentId: "p1", hierarchyLevel: 1 });

    renderUI(
      <GanttSidebar
        items={[parent, childA, childB]}
        rowHeight={36}
        headerHeight={48}
        onToggleCollapse={onToggleCollapse}
      />
    );

    const collapseButton = screen.getByLabelText(/collapse|expand/i);
    fireEvent.click(collapseButton);
    expect(onToggleCollapse).toHaveBeenCalledWith("p1");
  });
});
