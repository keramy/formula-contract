"use server";

import { createClient } from "@/lib/supabase/server";
import {
  checkLoginRateLimit,
  checkPasswordResetRateLimit,
  checkPasswordChangeRateLimit,
  getClientIP,
} from "@/lib/rate-limit";

// ============================================================================
// Types
// ============================================================================

export interface AuthResult {
  success: boolean;
  error?: string;
  mustChangePassword?: boolean;
  remaining?: number;
  resetIn?: number;
}

// ============================================================================
// Login Action
// ============================================================================

export async function loginAction(
  email: string,
  password: string
): Promise<AuthResult> {
  // Get client IP for rate limiting
  const ip = await getClientIP();

  // Check rate limit
  const rateLimit = checkLoginRateLimit(ip);
  if (!rateLimit.success) {
    return {
      success: false,
      error: rateLimit.error,
      remaining: rateLimit.remaining,
      resetIn: rateLimit.resetIn,
    };
  }

  try {
    const supabase = await createClient();

    // Attempt login
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return {
        success: false,
        error: signInError.message,
        remaining: rateLimit.remaining,
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: "Login failed. Please try again.",
        remaining: rateLimit.remaining,
      };
    }

    // Update last login timestamp
    await supabase
      .from("users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", data.user.id);

    // Check if user needs to change password
    const mustChangePassword = data.user.user_metadata?.must_change_password === true;

    return {
      success: true,
      mustChangePassword,
      remaining: rateLimit.remaining,
    };
  } catch (err) {
    console.error("Login error:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

// ============================================================================
// Password Reset Request Action
// ============================================================================

export async function requestPasswordResetAction(
  email: string,
  redirectUrl: string
): Promise<AuthResult> {
  // Get client IP for rate limiting
  const ip = await getClientIP();

  // Check rate limit
  const rateLimit = checkPasswordResetRateLimit(ip);
  if (!rateLimit.success) {
    return {
      success: false,
      error: rateLimit.error,
      remaining: rateLimit.remaining,
      resetIn: rateLimit.resetIn,
    };
  }

  try {
    const supabase = await createClient();

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: redirectUrl }
    );

    if (resetError) {
      return {
        success: false,
        error: resetError.message,
        remaining: rateLimit.remaining,
      };
    }

    // Always return success to prevent email enumeration
    // (even if email doesn't exist)
    return {
      success: true,
      remaining: rateLimit.remaining,
    };
  } catch (err) {
    console.error("Password reset error:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

// ============================================================================
// Update Password Action (for password reset and change password)
// ============================================================================

export async function updatePasswordAction(
  newPassword: string,
  clearMustChangeFlag: boolean = false
): Promise<AuthResult> {
  try {
    const supabase = await createClient();

    // Get current user for rate limiting
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "You must be logged in to change your password.",
      };
    }

    // Check rate limit for password change
    const rateLimit = checkPasswordChangeRateLimit(user.id);
    if (!rateLimit.success) {
      return {
        success: false,
        error: rateLimit.error,
        remaining: rateLimit.remaining,
        resetIn: rateLimit.resetIn,
      };
    }

    // Prepare update data
    interface UpdateUserData {
      password: string;
      data?: { must_change_password: boolean };
    }

    const updateData: UpdateUserData = {
      password: newPassword,
    };

    // Clear the must_change_password flag if requested
    if (clearMustChangeFlag) {
      updateData.data = { must_change_password: false };
    }

    const { error: updateError } = await supabase.auth.updateUser(updateData);

    if (updateError) {
      return {
        success: false,
        error: updateError.message,
        remaining: rateLimit.remaining,
      };
    }

    return {
      success: true,
      remaining: rateLimit.remaining,
    };
  } catch (err) {
    console.error("Password update error:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

// ============================================================================
// Check Auth Status Action (for change-password page)
// ============================================================================

export interface AuthStatusResult {
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  email?: string;
}

export async function checkAuthStatusAction(): Promise<AuthStatusResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return {
        isAuthenticated: false,
        mustChangePassword: false,
      };
    }

    return {
      isAuthenticated: true,
      mustChangePassword: user.user_metadata?.must_change_password === true,
      email: user.email,
    };
  } catch {
    return {
      isAuthenticated: false,
      mustChangePassword: false,
    };
  }
}
