import { ScopeItemSkeleton } from "./scope-item-skeleton";

/**
 * Scope Item Detail Loading State
 *
 * Shows a skeleton that matches the scope item detail layout while data loads.
 * This page previously took 18 seconds to load - now with parallel queries
 * it's much faster, but the skeleton still provides instant visual feedback.
 */
export default function ScopeItemLoading() {
  return <ScopeItemSkeleton />;
}
