"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { checkUserCreationRateLimit } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/sanitize";

// Send welcome email to new user
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
      from: "Formula Contract <onboarding@resend.dev>", // Use your verified domain in production
      to: email,
      subject: "Welcome to Formula Contract - Your Account Details",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #1a1a2e; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">Formula Contract</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.8;">Project Management System</p>
          </div>

          <div style="padding: 30px; background-color: #f9f9f9;">
            <h2 style="color: #333; margin-top: 0;">Welcome, ${name}!</h2>
            <p style="color: #666;">An account has been created for you in Formula Contract. Use the credentials below to log in.</p>

            <div style="background-color: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Login URL:</strong><br/>
                <a href="${siteUrl}/login" style="color: #4f46e5;">${siteUrl}/login</a>
              </p>
              <p style="margin: 0 0 10px 0;"><strong>Email:</strong><br/>${email}</p>
              <p style="margin: 0;"><strong>Temporary Password:</strong><br/>
                <code style="background: #f0f0f0; padding: 5px 10px; border-radius: 4px; font-size: 14px;">${tempPassword}</code>
              </p>
            </div>

            <p style="color: #666; font-size: 14px;">
              Please change your password after your first login for security purposes.
            </p>

            <a href="${siteUrl}/login"
               style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">
              Log In Now
            </a>
          </div>

          <div style="padding: 20px; text-align: center; color: #999; font-size: 12px;">
            <p>This is an automated message from Formula Contract.</p>
          </div>
        </div>
      `,
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

// Admin client with service role key (server-side only)
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

export async function inviteUser(data: {
  email: string;
  name: string;
  phone: string | null;
  role: string;
}): Promise<{ success: boolean; error?: string; tempPassword?: string; emailSent?: boolean }> {
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
    // Generate a random temporary password
    const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!${Date.now().toString(36)}`;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: data.email.toLowerCase(),
      password: tempPassword,
      email_confirm: true, // Skip email confirmation
      user_metadata: {
        name: sanitizedName,
        role: data.role,
        must_change_password: true, // Force password change on first login
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

export async function updateUser(
  userId: string,
  data: {
    name: string;
    phone: string | null;
    role: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Sanitize user inputs
    const sanitizedName = sanitizeText(data.name);
    const sanitizedPhone = data.phone ? sanitizeText(data.phone) : null;

    const supabase = createAdminClient();

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

export async function toggleUserActive(
  userId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
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

    // Also ban/unban in Supabase Auth to fully block login
    if (!isActive) {
      // Ban user for ~100 years (effectively permanent)
      await supabase.auth.admin.updateUserById(userId, {
        ban_duration: "876000h",
      });
    } else {
      // Unban user
      await supabase.auth.admin.updateUserById(userId, {
        ban_duration: "none",
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
