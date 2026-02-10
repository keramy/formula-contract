// ============================================================================
// GANTT CHART TYPES
// ============================================================================

export type GanttViewMode = "day" | "week" | "month";

export type GanttItemType = "milestone" | "phase" | "task";

// ============================================================================
// PRIORITY TYPES AND CONSTANTS
// ============================================================================

export type Priority = 1 | 2 | 3 | 4;

export const PRIORITY_LEVELS = {
  LOW: 1,
  NORMAL: 2,
  HIGH: 3,
  CRITICAL: 4,
} as const;

export const PRIORITY_LABELS: Record<Priority, string> = {
  1: "Low",
  2: "Normal",
  3: "High",
  4: "Critical",
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  1: "#94a3b8", // slate-400 (gray)
  2: "#3b82f6", // blue-500
  3: "#f59e0b", // amber-500
  4: "#ef4444", // red-500
};

// ============================================================================
// WEEKEND SETTINGS
// ============================================================================

export interface WeekendSettings {
  includeSaturday: boolean;
  includeSunday: boolean;
}

export const DEFAULT_WEEKEND_SETTINGS: WeekendSettings = {
  includeSaturday: true,
  includeSunday: true,
};

// ============================================================================
// DEPENDENCY TYPES
// ============================================================================

/**
 * Dependency type between timeline items:
 * - 0: Finish-to-Start (FS) - target starts after source ends (most common)
 * - 1: Start-to-Start (SS) - target starts when source starts
 * - 2: Finish-to-Finish (FF) - target ends when source ends
 * - 3: Start-to-Finish (SF) - target ends when source starts (rare)
 */
export type DependencyType = 0 | 1 | 2 | 3;

export const DEPENDENCY_TYPES = {
  FINISH_TO_START: 0,
  START_TO_START: 1,
  FINISH_TO_FINISH: 2,
  START_TO_FINISH: 3,
} as const;

export const DEPENDENCY_LABELS: Record<DependencyType, string> = {
  0: "Finish to Start (FS)",
  1: "Start to Start (SS)",
  2: "Finish to Finish (FF)",
  3: "Start to Finish (SF)",
};

export const DEPENDENCY_SHORT_LABELS: Record<DependencyType, string> = {
  0: "FS",
  1: "SS",
  2: "FF",
  3: "SF",
};

/**
 * Dependency link between two timeline items
 */
export interface GanttDependency {
  id: string;
  projectId: string;
  sourceId: string;
  targetId: string;
  type: DependencyType;
  lagDays: number; // positive = delay, negative = lead time
}

// ============================================================================
// GANTT ITEM
// ============================================================================

export interface GanttItem {
  id: string;
  name: string;
  type: GanttItemType;
  startDate: Date;
  endDate: Date;
  progress: number; // 0-100
  color: string;
  dependencies?: string[]; // IDs of items this depends on (legacy field)
  // Optional metadata
  status?: string;
  phaseKey?: "design" | "production" | "shipping" | "installation";
  priority?: number; // 1=Low, 2=Normal, 3=High, 4=Critical
  // For editable timeline items
  isEditable?: boolean;
  timelineId?: string; // Original timeline item ID for CRUD operations
  // Hierarchy fields
  parentId?: string | null;
  hierarchyLevel: number;
  children?: GanttItem[]; // For tree rendering (populated client-side)
  isCollapsed?: boolean; // Whether children are hidden
}

export interface GanttDateRange {
  start: Date;
  end: Date;
}

export interface GanttColumn {
  date: Date;
  label: string;
  isToday: boolean;
  isWeekend: boolean;
}

// Utility to calculate days between dates (calendar days, inclusive)
export function daysBetween(start: Date, end: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((end.getTime() - start.getTime()) / oneDay)) + 1;
}

// Utility to calculate work days (excluding weekends based on settings)
export function calculateWorkDays(
  start: Date,
  end: Date,
  settings: WeekendSettings
): number {
  // If both weekend days are included, return calendar days
  if (settings.includeSaturday && settings.includeSunday) {
    return daysBetween(start, end);
  }

  let days = 0;
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);

  const endDate = new Date(end);
  endDate.setHours(0, 0, 0, 0);

  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    const isSaturday = dayOfWeek === 6;
    const isSunday = dayOfWeek === 0;

    // Count the day if:
    // - It's a weekday (Mon-Fri), OR
    // - It's Saturday and Saturday is included, OR
    // - It's Sunday and Sunday is included
    if (
      (!isSaturday && !isSunday) ||
      (isSaturday && settings.includeSaturday) ||
      (isSunday && settings.includeSunday)
    ) {
      days++;
    }

    current.setDate(current.getDate() + 1);
  }

  return days;
}

// Utility to check if a date is today
export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

// Utility to check if a date is a weekend
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

// Generate columns for the timeline
export function generateColumns(
  dateRange: GanttDateRange,
  viewMode: GanttViewMode
): GanttColumn[] {
  const columns: GanttColumn[] = [];
  const current = new Date(dateRange.start);

  while (current <= dateRange.end) {
    let label: string;

    switch (viewMode) {
      case "day":
        label = current.getDate().toString();
        break;
      case "week":
        label = `W${getWeekNumber(current)}`;
        break;
      case "month":
        label = current.toLocaleDateString("en-US", { month: "short" });
        break;
    }

    columns.push({
      date: new Date(current),
      label,
      isToday: isToday(current),
      isWeekend: isWeekend(current),
    });

    // Increment based on view mode
    switch (viewMode) {
      case "day":
        current.setDate(current.getDate() + 1);
        break;
      case "week":
        current.setDate(current.getDate() + 7);
        break;
      case "month":
        current.setMonth(current.getMonth() + 1);
        break;
    }
  }

  return columns;
}

// Get week number of year
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// Calculate position and width for a bar
export function calculateBarPosition(
  item: GanttItem,
  dateRange: GanttDateRange,
  totalWidth: number
): { left: number; width: number } {
  const totalDays = daysBetween(dateRange.start, dateRange.end) || 1;
  const startOffset = daysBetween(dateRange.start, item.startDate);
  const duration = daysBetween(item.startDate, item.endDate) || 1;

  const pixelsPerDay = totalWidth / totalDays;
  const left = startOffset * pixelsPerDay;
  const width = Math.max(duration * pixelsPerDay, 20); // Minimum 20px width

  return { left, width };
}
