"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Get the next available project code (preview without consuming)
 * Returns the next sequential number that will be assigned
 * Current sequence: 2601, 2602, 2603, 2604... next is 2605
 */
export async function getNextProjectCode(): Promise<string> {
  const supabase = await createClient();

  // Use the database function to preview next project code
  const { data, error } = await supabase.rpc("preview_next_project_code");

  if (!error && data) {
    return data as string;
  }

  // Fallback: query max numeric code and add 1
  console.warn("RPC fallback: querying max project code");
  const { data: projects } = await supabase
    .from("projects")
    .select("project_code")
    .eq("is_deleted", false);

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

  return "2605"; // Default based on current data
}
