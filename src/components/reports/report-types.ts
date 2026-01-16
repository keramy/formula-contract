/**
 * Shared Types and Constants for Report Components
 *
 * This module contains shared types, interfaces, and constants
 * used across report creation, editing, and display components.
 */

// ============================================================================
// Constants
// ============================================================================

export const REPORT_TYPES = [
  { value: "progress", label: "Progress Report" },
  { value: "weekly", label: "Weekly Report" },
  { value: "monthly", label: "Monthly Report" },
  { value: "milestone", label: "Milestone Report" },
  { value: "final", label: "Final Report" },
] as const;

export type ReportTypeValue = (typeof REPORT_TYPES)[number]["value"];

export const REPORT_TYPE_LABELS: Record<ReportTypeValue, string> = {
  progress: "Progress Report",
  weekly: "Weekly Report",
  monthly: "Monthly Report",
  milestone: "Milestone Report",
  final: "Final Report",
};

// ============================================================================
// Types
// ============================================================================

/**
 * Local section state used during report creation/editing
 * Before saving to the database, sections are managed locally
 */
export interface LocalSection {
  id: string; // Can be temp local ID or existing database ID
  originalId?: string; // Original database ID when editing existing section
  title: string;
  description: string;
  photos: string[];
  isNew?: boolean; // Flag for newly added sections (edit mode only)
}

/**
 * Team member representation for sharing functionality
 */
export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Generate a temporary local ID for new sections
 * These IDs are replaced with database IDs after saving
 */
export function generateLocalId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Format role string for display (capitalize and replace underscores)
 */
export function formatRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1).replace("_", " ");
}
