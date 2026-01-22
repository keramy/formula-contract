// Action types for consistency
export const ACTIVITY_ACTIONS = {
  // Project actions
  PROJECT_CREATED: "project_created",
  PROJECT_UPDATED: "project_updated",
  PROJECT_STATUS_CHANGED: "project_status_changed",
  PROJECT_DELETED: "project_deleted",

  // User actions
  USER_CREATED: "user_created",
  USER_UPDATED: "user_updated",
  USER_DEACTIVATED: "user_deactivated",
  USER_ASSIGNED: "user_assigned",
  USER_UNASSIGNED: "user_unassigned",

  // Scope item actions
  ITEM_CREATED: "item_created",
  ITEM_UPDATED: "item_updated",
  ITEM_DELETED: "item_deleted",
  ITEM_STATUS_CHANGED: "item_status_changed",

  // Drawing actions
  DRAWING_UPLOADED: "drawing_uploaded",
  DRAWING_SENT_TO_CLIENT: "drawing_sent_to_client",
  DRAWING_APPROVED: "drawing_approved",
  DRAWING_REJECTED: "drawing_rejected",
  DRAWING_PM_OVERRIDE: "drawing_pm_override",

  // Material actions
  MATERIAL_CREATED: "material_created",
  MATERIAL_UPDATED: "material_updated",
  MATERIAL_SENT_TO_CLIENT: "material_sent_to_client",
  MATERIAL_APPROVED: "material_approved",
  MATERIAL_REJECTED: "material_rejected",

  // Report actions
  REPORT_CREATED: "report_created",
  REPORT_PUBLISHED: "report_published",

  // Client actions
  CLIENT_CREATED: "client_created",
  CLIENT_UPDATED: "client_updated",

  // Auth actions
  USER_LOGIN: "user_login",
  PASSWORD_CHANGED: "password_changed",

  // Milestone actions
  MILESTONE_CREATED: "milestone_created",
  MILESTONE_UPDATED: "milestone_updated",
  MILESTONE_COMPLETED: "milestone_completed",
  MILESTONE_DELETED: "milestone_deleted",

  // Bulk actions
  ITEMS_IMPORTED: "items_imported",
} as const;

export type ActivityAction = (typeof ACTIVITY_ACTIONS)[keyof typeof ACTIVITY_ACTIONS];
