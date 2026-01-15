/**
 * Rate Limiting Utility
 *
 * In-memory rate limiter for protecting auth endpoints from brute force attacks.
 * Can be upgraded to Upstash Redis for production multi-server deployments.
 *
 * Rate limits applied:
 * - Login: 5 attempts per 15 minutes per IP
 * - Password Reset: 3 requests per hour per IP
 * - Password Change: 5 attempts per hour per user
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (cleared on server restart)
// For production with multiple servers, use Upstash Redis instead
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  /** Maximum number of requests allowed */
  limit: number;
  /** Time window in milliseconds */
  window: number;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  success: boolean;
  /** Number of remaining requests in the window */
  remaining: number;
  /** Time until the rate limit resets (in ms) */
  resetIn: number;
  /** Error message if rate limited */
  error?: string;
}

/**
 * Check rate limit for a given identifier
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // If no entry exists or window expired, create new entry
  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + config.window,
    });

    return {
      success: true,
      remaining: config.limit - 1,
      resetIn: config.window,
    };
  }

  // Check if limit exceeded
  if (entry.count >= config.limit) {
    return {
      success: false,
      remaining: 0,
      resetIn: entry.resetAt - now,
      error: `Too many requests. Please try again in ${Math.ceil(
        (entry.resetAt - now) / 1000 / 60
      )} minutes.`,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(identifier, entry);

  return {
    success: true,
    remaining: config.limit - entry.count,
    resetIn: entry.resetAt - now,
  };
}

// ============================================================================
// Preset Rate Limiters for Auth Operations
// ============================================================================

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/**
 * Rate limit configuration for different auth operations
 */
export const rateLimitConfigs = {
  // Login: 5 attempts per 15 minutes per IP
  login: {
    limit: 5,
    window: 15 * MINUTE,
  },
  // Password reset request: 3 per hour per IP
  passwordReset: {
    limit: 3,
    window: HOUR,
  },
  // Password change: 5 per hour per user
  passwordChange: {
    limit: 5,
    window: HOUR,
  },
  // User creation: 10 per hour per admin
  userCreation: {
    limit: 10,
    window: HOUR,
  },
} as const;

/**
 * Check login rate limit
 * @param ip - Client IP address
 */
export function checkLoginRateLimit(ip: string): RateLimitResult {
  return checkRateLimit(`login:${ip}`, rateLimitConfigs.login);
}

/**
 * Check password reset rate limit
 * @param ip - Client IP address
 */
export function checkPasswordResetRateLimit(ip: string): RateLimitResult {
  return checkRateLimit(`password-reset:${ip}`, rateLimitConfigs.passwordReset);
}

/**
 * Check password change rate limit
 * @param userId - User ID
 */
export function checkPasswordChangeRateLimit(userId: string): RateLimitResult {
  return checkRateLimit(`password-change:${userId}`, rateLimitConfigs.passwordChange);
}

/**
 * Check user creation rate limit
 * @param adminId - Admin user ID
 */
export function checkUserCreationRateLimit(adminId: string): RateLimitResult {
  return checkRateLimit(`user-creation:${adminId}`, rateLimitConfigs.userCreation);
}

// ============================================================================
// Utility to get client IP (for use in server actions)
// ============================================================================

import { headers } from "next/headers";

/**
 * Get the client IP address from request headers
 * Works with various proxy setups (Vercel, Cloudflare, etc.)
 */
export async function getClientIP(): Promise<string> {
  const headersList = await headers();

  // Try various headers in order of preference
  const forwarded = headersList.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(",")[0].trim();
  }

  const realIP = headersList.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  // Vercel-specific header
  const vercelIP = headersList.get("x-vercel-forwarded-for");
  if (vercelIP) {
    return vercelIP.split(",")[0].trim();
  }

  // Cloudflare-specific header
  const cfIP = headersList.get("cf-connecting-ip");
  if (cfIP) {
    return cfIP;
  }

  // Fallback
  return "unknown";
}
