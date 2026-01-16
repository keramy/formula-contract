/**
 * Server Actions - Centralized Exports
 *
 * All server actions are consolidated here for easy imports.
 * Use: import { loginAction, createMaterial } from '@/lib/actions';
 *
 * Module Structure:
 * - auth.ts: Authentication (login, password reset, etc.)
 * - users.ts: User management (invite, update, toggle active)
 * - materials.ts: Material CRUD and assignments
 * - scope-items.ts: Scope item updates and bulk operations
 * - reports.ts: Report CRUD, lines, publishing, sharing
 * - project-assignments.ts: Team member assignments
 */

// Authentication
export {
  loginAction,
  requestPasswordResetAction,
  updatePasswordAction,
  checkAuthStatusAction,
  type AuthResult,
  type AuthStatusResult,
} from "./auth";

// User Management
export {
  inviteUser,
  updateUser,
  toggleUserActive,
  type InviteUserResult,
} from "./users";

// Materials
export {
  getMaterials,
  getMaterial,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  updateItemMaterialAssignments,
  removeItemMaterial,
  bulkImportMaterials,
  updateMaterialStatus,
  uploadMaterialImages,
  type Material,
  type MaterialWithAssignments,
  type MaterialInput,
  type BulkMaterialImportItem,
} from "./materials";

// Scope Items
export {
  getScopeItems,
  getScopeItem,
  bulkUpdateScopeItems,
  bulkAssignMaterials,
  updateScopeItemField,
  updateProductionPercentage,
  updateInstallationStatus,
  deleteScopeItem,
  type ScopeItem,
  type ScopeItemWithMaterials,
  type ScopeItemField,
} from "./scope-items";

// Reports
export {
  getProjectReports,
  getReportDetail,
  getProjectTeamMembers,
  createReport,
  updateReport,
  deleteReport,
  publishReport,
  unpublishReport,
  addReportLine,
  updateReportLine,
  deleteReportLine,
  reorderReportLines,
  uploadReportPhoto,
  updateReportShares,
  type Report,
  type ReportLine,
  type SharedUser,
} from "./reports";

// Project Assignments
export {
  getProjectAssignments,
  getAvailableUsers,
  assignUserToProject,
  removeUserFromProject,
  type ProjectAssignment,
  type AvailableUser,
} from "./project-assignments";
