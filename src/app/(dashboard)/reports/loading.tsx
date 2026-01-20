import { ReportsSkeleton } from "./reports-skeleton";

/**
 * Reports Page Loading State
 *
 * Shows a skeleton that matches the reports & analytics layout while data loads.
 * Includes stat cards, chart placeholders, and detail cards.
 */
export default function ReportsLoading() {
  return <ReportsSkeleton />;
}
