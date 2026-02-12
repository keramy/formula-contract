/**
 * Generate a URL-friendly slug from text
 *
 * Examples:
 * - "Moodup Project" -> "moodup-project"
 * - "JAMOA TASHKENT" -> "jamoa-tashkent"
 * - "Sirali Kebap!" -> "sirali-kebap"
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Check if a string looks like a UUID
 */
export function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Resolve a project identifier (slug or UUID) to actual project data
 * Returns { projectId, projectSlug } for use in queries and URLs
 */
export async function resolveProjectIdentifier(
  supabase: Pick<import("@supabase/supabase-js").SupabaseClient, "from">,
  identifier: string
): Promise<{ projectId: string; projectSlug: string | null } | null> {
  // If it's a UUID, query by id
  if (isUUID(identifier)) {
    const { data } = await supabase
      .from("projects")
      .select("id, slug")
      .eq("id", identifier)
      .single();

    if (!data) return null;
    return { projectId: data.id, projectSlug: data.slug };
  }

  // Otherwise, it's a slug - query by slug
  const { data } = await supabase
    .from("projects")
    .select("id, slug")
    .eq("slug", identifier)
    .single();

  if (!data) return null;
  return { projectId: data.id, projectSlug: data.slug };
}
