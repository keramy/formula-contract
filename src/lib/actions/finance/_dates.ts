/**
 * Finance Date Helpers
 *
 * Pure date utilities used by reports and notifications to compute the
 * weekly digest window. Lives outside of any "use server" file because
 * server actions must be async — these are intentionally sync so callers
 * can use them inline without await ceremony.
 */

export function getStartOfWeek(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff);
  return monday.toISOString().split("T")[0];
}

export function getEndOfWeek(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? 0 : 7);
  const sunday = new Date(now);
  sunday.setDate(diff);
  return sunday.toISOString().split("T")[0];
}
