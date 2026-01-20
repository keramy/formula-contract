import { ProjectDetailSkeleton } from "./project-detail-skeleton";

/**
 * Project Detail Loading State
 *
 * Shows a skeleton that matches the project detail layout while data loads.
 * Includes tabs, stat cards, and content placeholders.
 */
export default function ProjectDetailLoading() {
  return <ProjectDetailSkeleton />;
}
