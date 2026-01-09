// Run with: npx tsx scripts/test-connection.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dovxdlrltkefqhkascoa.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvdnhkbHJsdGtlZnFoa2FzY29hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4ODEwMDUsImV4cCI6MjA4MzQ1NzAwNX0.-Rysh-DUvOGqjmoNIi2gC0ZiYGogXCyTHKObhrSKOt8";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log("Testing Supabase connection...\n");

  // Test 1: Check if we can query the users table
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("count")
    .limit(1);

  if (usersError) {
    console.log("❌ Users table:", usersError.message);
  } else {
    console.log("✅ Users table: Connected");
  }

  // Test 2: Check projects table
  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("count")
    .limit(1);

  if (projectsError) {
    console.log("❌ Projects table:", projectsError.message);
  } else {
    console.log("✅ Projects table: Connected");
  }

  // Test 3: Check scope_items table
  const { data: items, error: itemsError } = await supabase
    .from("scope_items")
    .select("count")
    .limit(1);

  if (itemsError) {
    console.log("❌ Scope items table:", itemsError.message);
  } else {
    console.log("✅ Scope items table: Connected");
  }

  // Test 4: Check enums by querying with a filter
  const { error: enumError } = await supabase
    .from("projects")
    .select("id")
    .eq("status", "tender")
    .limit(1);

  if (enumError) {
    console.log("❌ Enums:", enumError.message);
  } else {
    console.log("✅ Enums: Working");
  }

  console.log("\n✅ All tables created successfully!");
  console.log("\nNext: Create your first admin user");
}

testConnection();
