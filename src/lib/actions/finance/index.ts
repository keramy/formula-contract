/**
 * Finance — Public Barrel
 *
 * Imports anywhere in the app that resolved to `@/lib/actions/finance`
 * (the old monolithic file) now resolve here. The split into per-module
 * files is purely organizational; the public surface is unchanged.
 *
 * Auth helpers (requireFinanceAccess, requireAdmin) live in ./_shared
 * and are intentionally NOT re-exported — they are folder-private and
 * should only be imported by sibling finance modules.
 */

export type { ActionResult } from "./_shared";

export {
  getProjectsForFinance,
  getApprovers,
  getAvailableUsers,
  checkFinanceAccess,
} from "./_shared";

export * from "./catalog";
export * from "./invoices";
export * from "./receivables";
export * from "./reports";
export * from "./notifications";
