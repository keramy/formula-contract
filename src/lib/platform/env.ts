/**
 * Resolves the absolute site URL for use in outbound links (emails,
 * notifications, OAuth callbacks). Single source of truth — every action
 * and route should call this rather than duplicating the env fallback,
 * which previously diverged across files (some defaulted to localhost,
 * others to the production Vercel URL).
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_SITE_URL — explicit, used in production
 *   2. VERCEL_URL — auto-set by Vercel on preview deployments
 *   3. http://localhost:3000 — local dev fallback
 */
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}
