/**
 * React Query Hooks
 *
 * This module exports all React Query hooks for client-side data fetching
 * with automatic caching, deduplication, and optimistic updates.
 *
 * Usage:
 * ```tsx
 * import { useMaterials, useCreateMaterial } from '@/lib/react-query';
 *
 * function MyComponent({ projectId }) {
 *   const { data: materials, isLoading } = useMaterials(projectId);
 *   const createMaterial = useCreateMaterial(projectId);
 *
 *   const handleCreate = () => {
 *     createMaterial.mutate({ input: { name: 'New Material', ... } });
 *   };
 * }
 * ```
 */

// Provider
export { ReactQueryProvider } from "./provider";

// Notifications
export {
  notificationKeys,
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
} from "./notifications";

// Materials
export {
  materialKeys,
  useMaterials,
  useMaterial,
  useCreateMaterial,
  useUpdateMaterial,
  useDeleteMaterial,
  useUpdateMaterialStatus,
  useUpdateItemMaterialAssignments,
  useRemoveItemMaterial,
  useBulkImportMaterials,
} from "./materials";

// Scope Items
export {
  scopeItemKeys,
  useScopeItems,
  useScopeItem,
  useBulkUpdateScopeItems,
  useBulkAssignMaterials,
  useUpdateScopeItemField,
  useUpdateProductionPercentage,
  useUpdateInstallationStatus,
  useDeleteScopeItem,
} from "./scope-items";

// Timelines
export {
  timelineKeys,
  useTimelineItems,
  useTimelineDependencies,
  useCreateTimelineItem,
  useUpdateTimelineItem,
  useUpdateTimelineItemDates,
  useDeleteTimelineItem,
  useReorderTimelineItems,
  useCreateTimelineDependency,
  useUpdateTimelineDependency,
  useDeleteTimelineDependency,
} from "./timelines";
