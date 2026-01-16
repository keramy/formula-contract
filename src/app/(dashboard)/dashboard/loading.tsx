import { DashboardSkeleton } from "./dashboard-skeleton";

/**
 * Dashboard Loading State
 *
 * Shows a skeleton that matches the dashboard layout while data loads.
 * This is automatically used by Next.js during server rendering.
 */
export default function DashboardLoading() {
  return <DashboardSkeleton />;
}
