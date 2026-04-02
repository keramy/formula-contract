// Gantt Chart — barrel exports
export { GanttChart, type GanttChartProps } from "./gantt-chart";
export { GanttDependencyDialog, type GanttDependencyDialogProps } from "./gantt-dependency-dialog";
export type {
  GanttItem,
  GanttDependency,
  GanttRow,
  GanttViewMode,
  GanttPanel,
  GanttDateRange,
  GanttStats,
  BarPosition,
  DependencyType,
  Priority,
  PhaseKey,
  GanttItemType,
} from "./gantt-types";
export {
  PHASE_COLORS,
  DEPENDENCY_LABELS,
  DEPENDENCY_SHORT_LABELS,
  DEPENDENCY_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  ROW_HEIGHT,
  CATEGORY_HEIGHT,
  SIDEBAR_WIDTH,
  buildGanttRows,
  computeStats,
  computeDateRange,
  daysBetween,
  formatDuration,
  resolveItemColor,
} from "./gantt-types";
