// Bootstrap the first admin user for a fresh Supabase environment.
//
// Usage:
//   ADMIN_EMAIL=you@example.com \
//   ADMIN_PASSWORD='SomeStrongPassword!' \
//   ADMIN_NAME='Your Name' \
//   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=sb_service_... \
//   npx tsx scripts/create-admin.ts
//
// Reads everything from env. Never hardcode credentials in this file —
// it lives in version control.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;
const adminName = process.env.ADMIN_NAME ?? "System Admin";

const missing: string[] = [];
if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
if (!adminEmail) missing.push("ADMIN_EMAIL");
if (!adminPassword) missing.push("ADMIN_PASSWORD");

if (missing.length > 0) {
  console.error(`Missing required env vars: ${missing.join(", ")}`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl!, serviceRoleKey!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function createAdminUser() {
  console.log(`Creating admin user ${adminEmail}...`);

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: adminEmail!,
    password: adminPassword!,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    console.error("Auth user creation failed:", authError?.message);
    process.exit(1);
  }

  const { error: profileError } = await supabase
    .from("users")
    .insert({
      id: authData.user.id,
      email: adminEmail!,
      name: adminName,
      role: "admin",
      is_active: true,
    });

  if (profileError) {
    console.error("Profile insert failed:", profileError.message);
    await supabase.auth.admin.deleteUser(authData.user.id);
    process.exit(1);
  }

  console.log(`Admin created: ${adminEmail} (id ${authData.user.id})`);
  console.log("Sign in and rotate the password immediately.");
}

createAdminUser();
