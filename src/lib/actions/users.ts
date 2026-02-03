"use server";

/**
 * Users Server Actions
 *
 * Handles user management operations including:
 * - Inviting new users
 * - Updating user profiles
 * - Activating/deactivating users
 * - Sending welcome emails
 */

import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { randomBytes } from "crypto";
import { checkUserCreationRateLimit } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/sanitize";
import { WelcomeEmail } from "@/emails/welcome-email";

// ============================================================================
// Types
// ============================================================================

export interface InviteUserResult {
  success: boolean;
  error?: string;
  tempPassword?: string;
  emailSent?: boolean;
}

export interface ActionResult {
  success: boolean;
  error?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create Supabase admin client with service role key (server-side only)
 */
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Send welcome email to new user with credentials
 */
async function sendWelcomeEmail(
  email: string,
  name: string,
  tempPassword: string
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("RESEND_API_KEY not configured, skipping email");
    return { success: true }; // Not an error, just skip
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const resend = new Resend(apiKey);

  try {
    await resend.emails.send({
      from: "Formula Contract <noreply@formulacontractpm.com>",
      to: email,
      subject: "Welcome to Formula Contract - Your Account Details",
      react: WelcomeEmail({
        userName: name,
        userEmail: email,
        tempPassword,
        loginUrl: `${siteUrl}/login`,
      }),
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

// ============================================================================
// JWT Metadata Sync
// ============================================================================

/**
 * Sync user profile data to Supabase Auth user_metadata (JWT claims)
 *
 * This allows middleware to read role/is_active from the JWT token
 * instead of querying the database on every request.
 *
 * IMPORTANT: Call this whenever role or is_active changes!
 */
export async function syncUserAuthMetadata(
  userId: string,
  data: { role?: string; is_active?: boolean }
): Promise<ActionResult> {
  try {
    const supabase = createAdminClient();

    // Get current metadata to merge with new values
    const { data: userData, error: getUserError } = await supabase.auth.admin.getUserById(userId);

    if (getUserError || !userData.user) {
      console.error("Failed to get user for metadata sync:", getUserError);
      return { success: false, error: "User not found in auth system" };
    }

    // Merge new data with existing metadata
    const currentMetadata = userData.user.user_metadata || {};
    const newMetadata = {
      ...currentMetadata,
      ...(data.role !== undefined && { role: data.role }),
      ...(data.is_active !== undefined && { is_active: data.is_active }),
      metadata_synced_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: newMetadata,
    });

    if (updateError) {
      console.error("Failed to sync user metadata:", updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Sync user metadata error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to sync metadata",
    };
  }
}

/**
 * Bulk sync all users' metadata to JWT claims
 * Run this once to migrate existing users, or periodically as a safety net
 */
export async function syncAllUsersMetadata(): Promise<{
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}> {
  const supabase = createAdminClient();
  const results = { success: true, synced: 0, failed: 0, errors: [] as string[] };

  try {
    // Get all users from the users table
    const { data: users, error } = await supabase
      .from("users")
      .select("id, role, is_active");

    if (error || !users) {
      return { ...results, success: false, errors: [error?.message || "Failed to fetch users"] };
    }

    // Sync each user's metadata
    for (const user of users) {
      const syncResult = await syncUserAuthMetadata(user.id, {
        role: user.role,
        is_active: user.is_active,
      });

      if (syncResult.success) {
        results.synced++;
      } else {
        results.failed++;
        results.errors.push(`${user.id}: ${syncResult.error}`);
      }
    }

    results.success = results.failed === 0;
    return results;
  } catch (error) {
    return {
      ...results,
      success: false,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

// ============================================================================
// User Management Operations
// ============================================================================

/**
 * Invite a new user to the system
 * Creates auth user, profile, and sends welcome email
 */
export async function inviteUser(data: {
  email: string;
  name: string;
  phone: string | null;
  role: string;
}): Promise<InviteUserResult> {
  try {
    // Get current user (admin) for rate limiting
    const serverSupabase = await createServerClient();
    const { data: { user: currentUser } } = await serverSupabase.auth.getUser();

    if (!currentUser) {
      return { success: false, error: "You must be logged in to create users" };
    }

    // Check rate limit for user creation (10 per hour per admin)
    const rateLimit = checkUserCreationRateLimit(currentUser.id);
    if (!rateLimit.success) {
      return { success: false, error: rateLimit.error };
    }

    const supabase = createAdminClient();

    // Sanitize user inputs
    const sanitizedName = sanitizeText(data.name);
    const sanitizedPhone = data.phone ? sanitizeText(data.phone) : null;

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", data.email.toLowerCase())
      .single();

    if (existingUser) {
      return { success: false, error: "A user with this email already exists" };
    }

    // Create user with a temporary password
    // Generate a cryptographically secure random temporary password
    const tempPassword = `Temp${randomBytes(6).toString("base64url")}!${randomBytes(4).toString("hex")}`;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: data.email.toLowerCase(),
      password: tempPassword,
      email_confirm: true, // Skip email confirmation
      user_metadata: {
        name: sanitizedName,
        role: data.role,
        is_active: true, // Stored in JWT for middleware to read without DB query
        must_change_password: true, // Force password change on first login
        metadata_synced_at: new Date().toISOString(),
      },
    });

    if (authError) {
      console.error("Auth invite error:", authError);
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: "Failed to create user" };
    }

    // Create user profile (is_active: true since they have a password)
    const { error: profileError } = await supabase
      .from("users")
      .insert({
        id: authData.user.id,
        email: data.email.toLowerCase(),
        name: sanitizedName,
        phone: sanitizedPhone,
        role: data.role,
        is_active: true,
      });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      // Delete the orphaned auth user to keep things in sync
      await supabase.auth.admin.deleteUser(authData.user.id);
      return {
        success: false,
        error: `Profile creation failed: ${profileError.message}`
      };
    }

    // Send welcome email with credentials
    const emailResult = await sendWelcomeEmail(data.email.toLowerCase(), sanitizedName, tempPassword);
    if (!emailResult.success) {
      console.warn("Welcome email failed:", emailResult.error);
      // Don't fail the user creation if email fails
    }

    revalidatePath("/users");
    return { success: true, tempPassword, emailSent: emailResult.success };
  } catch (error) {
    console.error("Invite user error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to invite user",
    };
  }
}

/**
 * Update an existing user's profile
 * Also syncs role to JWT metadata for middleware performance
 */
export async function updateUser(
  userId: string,
  data: {
    name: string;
    phone: string | null;
    role: string;
  }
): Promise<ActionResult> {
  try {
    // Sanitize user inputs
    const sanitizedName = sanitizeText(data.name);
    const sanitizedPhone = data.phone ? sanitizeText(data.phone) : null;

    const supabase = createAdminClient();

    // Update users table
    const { error } = await supabase
      .from("users")
      .update({
        name: sanitizedName,
        phone: sanitizedPhone,
        role: data.role,
      })
      .eq("id", userId);

    if (error) {
      console.error("Update user error:", error);
      return { success: false, error: error.message };
    }

    // Sync role to JWT metadata (allows middleware to skip DB query)
    const syncResult = await syncUserAuthMetadata(userId, { role: data.role });
    if (!syncResult.success) {
      console.warn("Failed to sync user metadata, middleware will fall back to DB:", syncResult.error);
      // Don't fail the update if metadata sync fails - middleware has fallback
    }

    revalidatePath("/users");
    return { success: true };
  } catch (error) {
    console.error("Update user error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update user",
    };
  }
}

/**
 * Activate or deactivate a user
 * Also bans/unbans in Supabase Auth and syncs to JWT metadata
 */
export async function toggleUserActive(
  userId: string,
  isActive: boolean
): Promise<ActionResult> {
  try {
    const supabase = createAdminClient();

    // Update users table
    const { error } = await supabase
      .from("users")
      .update({ is_active: isActive })
      .eq("id", userId);

    if (error) {
      console.error("Toggle user error:", error);
      return { success: false, error: error.message };
    }

    // Sync is_active to JWT metadata AND handle ban status in one update
    // This allows middleware to check is_active from JWT without DB query
    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    const currentMetadata = userData?.user?.user_metadata || {};

    if (!isActive) {
      // Ban user AND update metadata
      await supabase.auth.admin.updateUserById(userId, {
        ban_duration: "876000h", // ~100 years (effectively permanent)
        user_metadata: {
          ...currentMetadata,
          is_active: false,
          metadata_synced_at: new Date().toISOString(),
        },
      });
    } else {
      // Unban user AND update metadata
      await supabase.auth.admin.updateUserById(userId, {
        ban_duration: "none",
        user_metadata: {
          ...currentMetadata,
          is_active: true,
          metadata_synced_at: new Date().toISOString(),
        },
      });
    }

    revalidatePath("/users");
    return { success: true };
  } catch (error) {
    console.error("Toggle user error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update user status",
    };
  }
}
