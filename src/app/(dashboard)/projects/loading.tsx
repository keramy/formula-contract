import { ProjectsSkeleton } from "./projects-skeleton";

/**
 * Projects List Loading State
 *
 * Shows a skeleton that matches the projects list layout while data loads.
 * This provides better perceived performance than a spinner.
 */
export default function ProjectsLoading() {
  return <ProjectsSkeleton />;
}
