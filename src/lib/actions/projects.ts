"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Get the next available project code (preview without consuming)
 * Returns the next sequential number that will be assigned
 * Current sequence: 2601, 2602, 2603, 2604... next is 2605
 */
export async function getNextProjectCode(): Promise<string> {
  const supabase = await createClient();

  // Query ALL projects (including soft-deleted) to find the true max code.
  // This avoids the sequence desync issue where manually-entered codes
  // don't advance the PostgreSQL sequence.
  const { data: projects } = await supabase
    .from("projects")
    .select("project_code");

  if (projects && projects.length > 0) {
    let maxCode = 2600;
    for (const project of projects) {
      const code = project.project_code;
      if (/^\d+$/.test(code)) {
        const num = parseInt(code, 10);
        if (num > maxCode) maxCode = num;
      }
    }
    return String(maxCode + 1);
  }

  // Fallback: try the database sequence
  const { data, error } = await supabase.rpc("preview_next_project_code");
  if (!error && data) {
    return data as string;
  }

  return "2605";
}
