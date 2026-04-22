// ============================================================================
// GANTT CHART — TYPES, CONSTANTS & LAYOUT ENGINE
//
// The #1 rule: ONE ganttRows array used by BOTH sidebar and timeline.
// Both columns use position:absolute with row.y — alignment is guaranteed.
// ============================================================================

// ---------------------------------------------------------------------------
// Fixed dimensions (from Figma + implementation guide)
// ---------------------------------------------------------------------------

/** Task/milestone row height in pixels */
export const ROW_HEIGHT = 28;
/** Phase (category) row height in pixels */
export const CATEGORY_HEIGHT = 28;
/** Task bar height within a row */
export const TASK_BAR_HEIGHT = 14;
/** Header height — MUST be identical in sidebar and timeline */
export const HEADER_HEIGHT = 48;
/** Left sidebar width */
export const SIDEBAR_WIDTH = 320;

/** Column widths per view mode (before zoom multiplier) */
export const BASE_COLUMN_WIDTHS: Record<GanttViewMode, number> = {
  day: 52,
  week: 80,
  month: 93, // ~1120px / 12 months in Figma
};

export const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2];
export const DEFAULT_ZOOM_INDEX = 2; // 1x

// ---------------------------------------------------------------------------
// View modes
// ---------------------------------------------------------------------------

export type GanttViewMode = "day" | "week" | "month";
export type GanttPanel = "timeline" | "table";

// ---------------------------------------------------------------------------
// Item types & enums
// ---------------------------------------------------------------------------

export type GanttItemType = "phase" | "task" | "milestone";
export type PhaseKey = "design" | "production" | "procurement" | "shipping" | "installation";
export type DependencyType = 0 | 1 | 2 | 3;
export type Priority = 1 | 2 | 3 | 4;

// ---------------------------------------------------------------------------
// Phase colors (from Figma design)
// ---------------------------------------------------------------------------

export const PHASE_COLORS: Record<string, string> = {
  design: "#0d9488",       // teal-600
  production: "#3b82f6",   // blue-500
  procurement: "#f97316",  // orange-500
  shipping: "#64748b",     // slate-500
  installation: "#16a34a", // green-600
};

export const PHASE_LABELS: Record<string, string> = {
  design: "Design/Shopdrawing",
  production: "Production",
  procurement: "Procurement",
  shipping: "Shipment",
  installation: "Installation",
};

/** Ordered list for picker UIs — matches project flow */
export const PHASE_ORDER: PhaseKey[] = [
  "design",
  "production",
  "procurement",
  "shipping",
  "installation",
];

/** Resolve color for any item — explicit color → phase color → default */
export function resolveItemColor(item: GanttItem): string {
  if (item.color) return item.color;
  if (item.phaseKey && PHASE_COLORS[item.phaseKey]) return PHASE_COLORS[item.phaseKey];
  // Walk up the hierarchy to find a phase color
  return "#3b82f6"; // default blue-500 (visible against white bg)
}

// ---------------------------------------------------------------------------
// Priority
// ---------------------------------------------------------------------------

export const PRIORITY_LABELS: Record<Priority, string> = {
  1: "Low",
  2: "Normal",
  3: "High",
  4: "Critical",
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  1: "#94a3b8",
  2: "#3b82f6",
  3: "#f59e0b",
  4: "#ef4444",
};

// ---------------------------------------------------------------------------
// Dependency types
// ---------------------------------------------------------------------------

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

/** Unified arrow color — type is shown in the dialog, not via color coding */
export const DEPENDENCY_COLOR = "#94a3b8"; // slate-400

export const DEPENDENCY_COLORS: Record<DependencyType, string> = {
  0: DEPENDENCY_COLOR,
  1: DEPENDENCY_COLOR,
  2: DEPENDENCY_COLOR,
  3: DEPENDENCY_COLOR,
};

// ---------------------------------------------------------------------------
// Core data interfaces
// ---------------------------------------------------------------------------

export interface GanttItem {
  id: string;
  name: string;
  type: GanttItemType;
  startDate: Date;
  endDate: Date;
  progress: number; // 0-100
  /** User-set color override. null means "inherit phase color from hierarchy". */
  color: string | null;
  phaseKey?: PhaseKey;
  priority: Priority;
  isEditable: boolean;
  timelineId?: string; // Original DB id for CRUD
  parentId: string | null;
  children: GanttItem[];
  description?: string | null;
  isCompleted: boolean;
  status?: string;
}

export interface GanttDependency {
  id: string;
  projectId: string;
  sourceId: string;
  targetId: string;
  type: DependencyType;
  lagDays: number;
}

// ---------------------------------------------------------------------------
// GanttRow — THE single source of truth for alignment
// ---------------------------------------------------------------------------

export interface GanttRow {
  type: GanttItemType;
  id: string;
  y: number;           // Absolute Y position in pixels
  height: number;      // ROW_HEIGHT or CATEGORY_HEIGHT
  item: GanttItem;
  depth: number;       // Hierarchy indent level (0, 1, 2...)
  hasChildren: boolean;
  isCollapsed: boolean;
  phaseColor: string;  // Resolved color for this row's phase
  rowIndex: number;    // 0-based index in the visible flat list
}

// ---------------------------------------------------------------------------
// Date range & columns
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Bar position (for dependency arrow calculations)
// ---------------------------------------------------------------------------

export interface BarPosition {
  id: string;
  left: number;
  width: number;
  y: number; // center Y of the bar
  rowIndex: number;
}

// ---------------------------------------------------------------------------
// Layout engine: buildGanttRows()
// ---------------------------------------------------------------------------

/**
 * Build a flat array of GanttRow with pre-computed Y positions.
 * Used by BOTH sidebar and timeline — this is the alignment guarantee.
 *
 * Children of collapsed parents are excluded.
 */
export function buildGanttRows(
  items: GanttItem[],
  collapsedIds: Set<string>
): GanttRow[] {
  const rows: GanttRow[] = [];
  let currentY = 0;
  let rowIndex = 0;

  function walk(list: GanttItem[], depth: number, parentPhaseColor: string) {
    for (const item of list) {
      const isPhase = item.type === "phase";
      const height = isPhase ? CATEGORY_HEIGHT : ROW_HEIGHT;
      const phaseColor = isPhase
        ? resolveItemColor(item)
        : parentPhaseColor;
      const hasChildren = item.children.length > 0;
      const isCollapsed = collapsedIds.has(item.id);

      rows.push({
        type: item.type,
        id: item.id,
        y: currentY,
        height,
        item,
        depth,
        hasChildren,
        isCollapsed,
        phaseColor,
        rowIndex,
      });

      currentY += height;
      rowIndex++;

      // Recurse into children if not collapsed
      if (hasChildren && !isCollapsed) {
        walk(item.children, depth + 1, phaseColor);
      }
    }
  }

  walk(items, 0, "#64748b");
  return rows;
}

/**
 * Total height of all visible rows (for scroll container sizing).
 */
export function totalRowsHeight(rows: GanttRow[]): number {
  if (rows.length === 0) return 0;
  const last = rows[rows.length - 1];
  return last.y + last.height;
}

// ---------------------------------------------------------------------------
// Stats computation
// ---------------------------------------------------------------------------

export interface GanttStats {
  total: number;
  completed: number;
  milestones: number;
  avgProgress: number;
}

export function computeStats(rows: GanttRow[]): GanttStats {
  const tasks = rows.filter((r) => r.type !== "phase");
  const total = tasks.length;
  const completed = tasks.filter((r) => r.item.progress >= 100 || r.item.isCompleted).length;
  const milestones = tasks.filter((r) => r.type === "milestone").length;
  const avgProgress =
    total > 0 ? Math.round(tasks.reduce((sum, r) => sum + r.item.progress, 0) / total) : 0;

  return { total, completed, milestones, avgProgress };
}

// ---------------------------------------------------------------------------
// Date utilities
// ---------------------------------------------------------------------------

/** Calendar days between two dates (inclusive) */
export function daysBetween(start: Date, end: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((end.getTime() - start.getTime()) / oneDay)) + 1;
}

/** Working days (Mon-Fri) between two dates (inclusive), used when a project
 *  is configured to skip weekends. When skipWeekends is false, falls back to
 *  calendar-day counting for consistency. */
export function workingDaysBetween(start: Date, end: Date, skipWeekends: boolean): number {
  if (!skipWeekends) return daysBetween(start, end);
  const a = new Date(start);
  a.setHours(0, 0, 0, 0);
  const b = new Date(end);
  b.setHours(0, 0, 0, 0);
  if (a > b) return 0;
  let count = 0;
  const cursor = new Date(a);
  while (cursor <= b) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

/** Add N working days to a date, skipping Sat/Sun when skipWeekends is true.
 *  Supports negative offsets. When skipWeekends is false, falls back to
 *  calendar-day addition. */
export function addWorkingDays(date: Date, days: number, skipWeekends: boolean): Date {
  const result = new Date(date);
  if (!skipWeekends || days === 0) {
    result.setDate(result.getDate() + days);
    return result;
  }
  const direction = days > 0 ? 1 : -1;
  let remaining = Math.abs(days);
  while (remaining > 0) {
    result.setDate(result.getDate() + direction);
    const day = result.getDay();
    if (day !== 0 && day !== 6) remaining--;
  }
  return result;
}

export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/** ISO week number */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Get health-based color override for a task bar.
 * Returns a color string or null (use default phase color).
 */
export function getBarHealthColor(item: GanttItem): string | null {
  if (item.type === "phase" || item.type === "milestone") return null;
  if (item.progress >= 100 || item.isCompleted) return "#10b981"; // green — complete

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(item.endDate);
  endDate.setHours(0, 0, 0, 0);

  const daysUntilEnd = Math.round((endDate.getTime() - today.getTime()) / 86400000);

  if (daysUntilEnd < 0) return "#ef4444"; // red — overdue
  if (daysUntilEnd <= 7 && item.progress < 80) return "#f59e0b"; // amber — at risk
  return null; // on track — use default color
}

/** Format duration: "45d" for tasks, "M" for milestones.
 *  When skipWeekends is true, the number reflects working days only. */
export function formatDuration(item: GanttItem, skipWeekends = false): string {
  if (item.type === "milestone") return "M";
  return `${workingDaysBetween(item.startDate, item.endDate, skipWeekends)}d`;
}

// ---------------------------------------------------------------------------
// Column generation
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Bar position calculation
// ---------------------------------------------------------------------------

/**
 * Convert a date to an X pixel position within the timeline.
 */
export function dateToX(
  date: Date,
  dateRange: GanttDateRange,
  totalWidth: number
): number {
  const totalMs = dateRange.end.getTime() - dateRange.start.getTime();
  if (totalMs <= 0) return 0;
  const offsetMs = date.getTime() - dateRange.start.getTime();
  return (offsetMs / totalMs) * totalWidth;
}

/**
 * Calculate pixel position and width for a task bar.
 */
export function calculateBarPosition(
  item: GanttItem,
  dateRange: GanttDateRange,
  totalWidth: number
): { left: number; width: number } {
  const left = dateToX(item.startDate, dateRange, totalWidth);
  const right = dateToX(item.endDate, dateRange, totalWidth);
  const width = Math.max(right - left, 20); // minimum 20px

  return { left, width };
}

/**
 * Compute date range from all items with view-mode-appropriate padding.
 */
export function computeDateRange(
  items: GanttItem[],
  viewMode: GanttViewMode
): GanttDateRange {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (items.length === 0) {
    const start = new Date(today);
    start.setDate(start.getDate() - 14);
    const end = new Date(today);
    end.setMonth(end.getMonth() + 3);
    return { start, end };
  }

  let minDate = new Date(items[0].startDate);
  let maxDate = new Date(items[0].endDate);

  const collectDates = (list: GanttItem[]) => {
    for (const item of list) {
      if (item.startDate < minDate) minDate = new Date(item.startDate);
      if (item.endDate > maxDate) maxDate = new Date(item.endDate);
      if (item.children.length > 0) collectDates(item.children);
    }
  };
  collectDates(items);

  // Padding by view mode
  const startPad = viewMode === "day" ? 14 : viewMode === "week" ? 21 : 30;
  const endPad = viewMode === "day" ? 60 : viewMode === "week" ? 90 : 180;
  minDate.setDate(minDate.getDate() - startPad);
  maxDate.setDate(maxDate.getDate() + endPad);

  // Ensure at least 12 months into the future for month view, 6 for others
  const futureMonths = viewMode === "month" ? 12 : 6;
  const futureMin = new Date(today);
  futureMin.setMonth(futureMin.getMonth() + futureMonths);
  if (futureMin > maxDate) maxDate = futureMin;

  return { start: minDate, end: maxDate };
}
