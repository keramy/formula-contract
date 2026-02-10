import { describe, expect, it } from "vitest";
import {
  calculateBarPosition,
  calculateWorkDays,
  daysBetween,
  generateColumns,
  isToday,
  isWeekend,
  type GanttDateRange,
  type GanttItem,
} from "@/components/gantt/types";

function makeDate(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

describe("daysBetween", () => {
  it("returns inclusive day count for same day", () => {
    expect(daysBetween(makeDate("2026-01-01"), makeDate("2026-01-01"))).toBe(1);
  });

  it("returns inclusive day count across a range", () => {
    expect(daysBetween(makeDate("2026-01-01"), makeDate("2026-01-10"))).toBe(10);
  });
});

describe("calculateWorkDays", () => {
  const start = makeDate("2026-01-01");
  const end = makeDate("2026-01-10");

  it("matches calendar days when both weekend days are included", () => {
    expect(
      calculateWorkDays(start, end, { includeSaturday: true, includeSunday: true })
    ).toBe(daysBetween(start, end));
  });

  it("excludes Saturdays when includeSaturday is false", () => {
    expect(
      calculateWorkDays(start, end, { includeSaturday: false, includeSunday: true })
    ).toBe(8);
  });

  it("excludes both weekend days when both are false", () => {
    expect(
      calculateWorkDays(start, end, { includeSaturday: false, includeSunday: false })
    ).toBe(7);
  });
});

describe("isToday", () => {
  it("returns true for current date", () => {
    expect(isToday(new Date())).toBe(true);
  });

  it("returns false for yesterday", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isToday(yesterday)).toBe(false);
  });
});

describe("isWeekend", () => {
  it("returns true for Saturday", () => {
    expect(isWeekend(makeDate("2026-01-03"))).toBe(true);
  });

  it("returns false for Monday", () => {
    expect(isWeekend(makeDate("2026-01-05"))).toBe(false);
  });
});

describe("generateColumns", () => {
  it("generates day columns with one column per day", () => {
    const range: GanttDateRange = { start: makeDate("2026-01-01"), end: makeDate("2026-01-03") };
    const cols = generateColumns(range, "day");

    expect(cols).toHaveLength(3);
    expect(cols.map((c) => c.label)).toEqual(["1", "2", "3"]);
  });

  it("generates week columns with week labels", () => {
    const range: GanttDateRange = { start: makeDate("2026-01-01"), end: makeDate("2026-01-22") };
    const cols = generateColumns(range, "week");

    expect(cols).toHaveLength(4);
    expect(cols.every((c) => c.label.startsWith("W"))).toBe(true);
  });

  it("generates month columns with month labels", () => {
    const range: GanttDateRange = { start: makeDate("2026-01-01"), end: makeDate("2026-03-01") };
    const cols = generateColumns(range, "month");

    expect(cols).toHaveLength(3);
    expect(cols.map((c) => c.label)).toEqual(["Jan", "Feb", "Mar"]);
  });
});

describe("calculateBarPosition", () => {
  it("calculates left offset and width relative to date range", () => {
    const range: GanttDateRange = { start: makeDate("2026-01-01"), end: makeDate("2026-01-10") };
    const item: GanttItem = {
      id: "1",
      name: "Task",
      type: "task",
      startDate: makeDate("2026-01-03"),
      endDate: makeDate("2026-01-05"),
      progress: 0,
      color: "#000",
      hierarchyLevel: 0,
    };

    const result = calculateBarPosition(item, range, 1000);

    expect(result.left).toBe(300);
    expect(result.width).toBe(300);
  });
});
