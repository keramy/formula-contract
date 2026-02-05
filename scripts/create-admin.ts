// Run with: npx tsx scripts/create-admin.ts
// Creates the first admin user for Formula Contract

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dovxdlrltkefqhkascoa.supabase.co";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvdnhkbHJsdGtlZnFoa2FzY29hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzg4MTAwNSwiZXhwIjoyMDgzNDU3MDA1fQ.7gM9k7lbGNfIZrvbMxrwsHHj99UH_7zyNw9UhKQ5Sbo";

// Admin client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Configure your admin user here
const ADMIN_EMAIL = "admin@formulacontract.com";
const ADMIN_PASSWORD = "Admin123!"; // Change this after first login!
const ADMIN_NAME = "System Admin";

async function createAdminUser() {
  console.log("Creating admin user...\n");

  // Step 1: Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true, // Skip email verification
  });

  if (authError) {
    console.log("❌ Auth user creation failed:", authError.message);
    return;
  }

  console.log("✅ Auth user created:", authData.user.id);

  // Step 2: Insert into users table
  const { data: _userData, error: userError } = await supabase
    .from("users")
    .insert({
      id: authData.user.id,
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      role: "admin",
      is_active: true,
    })
    .select()
    .single();

  if (userError) {
    console.log("❌ Users table insert failed:", userError.message);
    // Cleanup: delete the auth user
    await supabase.auth.admin.deleteUser(authData.user.id);
    return;
  }

  console.log("✅ User profile created");

  console.log("\n========================================");
  console.log("Admin user created successfully!");
  console.log("========================================");
  console.log(`Email:    ${ADMIN_EMAIL}`);
  console.log(`Password: ${ADMIN_PASSWORD}`);
  console.log(`Role:     admin`);
  console.log("========================================");
  console.log("\n⚠️  Change this password after first login!");
}

createAdminUser();
