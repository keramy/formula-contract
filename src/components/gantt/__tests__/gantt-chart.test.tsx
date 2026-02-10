import React from "react";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { GanttChart } from "@/components/gantt/gantt-chart";
import type { GanttItem } from "@/components/gantt/types";
import { renderUI } from "@/test/utils";

const makeItem = (overrides: Partial<GanttItem>): GanttItem => ({
  id: "task-1",
  name: "Task A",
  type: "task",
  startDate: new Date("2026-02-10"),
  endDate: new Date("2026-02-12"),
  progress: 0,
  color: "#3b82f6",
  hierarchyLevel: 0,
  isEditable: true,
  ...overrides,
});

describe("GanttChart", () => {
  it("opens edit on double click from sidebar row", () => {
    const onItemEdit = vi.fn();
    const item = makeItem({});

    renderUI(
      <GanttChart
        items={[item]}
        onItemEdit={onItemEdit}
        showSidebar
        showAddButton={false}
      />
    );

    const rowButton = screen.getByText("Task A");
    fireEvent.doubleClick(rowButton);

    expect(onItemEdit).toHaveBeenCalled();
  });
});

