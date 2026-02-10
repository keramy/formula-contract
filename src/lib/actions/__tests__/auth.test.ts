import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Mock Setup
// ============================================================================

// Supabase auth mock results
let mockSignInResult: { data: { user: unknown; session: unknown }; error: unknown } = {
  data: { user: null, session: null },
  error: null,
};

let mockResetPasswordResult: { error: unknown } = { error: null };

let mockUpdateUserResult: { error: unknown } = { error: null };

let mockUser: {
  id: string;
  email: string;
  user_metadata?: Record<string, unknown>;
} | null = {
  id: "test-user-id",
  email: "pm@test.com",
  user_metadata: {},
};

// Track calls to the Supabase client
const mockCalls: { method: string; args: unknown[] }[] = [];

// Rate limit mock results
let mockLoginRateLimit = { success: true, remaining: 4, resetIn: 900000 };
let mockResetRateLimit = { success: true, remaining: 2, resetIn: 3600000 };
let mockChangeRateLimit = { success: true, remaining: 4, resetIn: 3600000 };

/**
 * Creates a chainable mock for .from().update().eq() chains
 */
function createChainMock() {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "insert", "update", "delete", "eq", "single", "order"];

  for (const method of methods) {
    chain[method] = vi.fn((...args: unknown[]) => {
      mockCalls.push({ method, args });
      if (method === "single") {
        return Promise.resolve({ data: null, error: null });
      }
      return Object.assign(chain, {
        then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }),
      });
    });
  }

  return chain;
}

// Mock @/lib/supabase/server
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: vi.fn(() =>
          Promise.resolve({
            data: { user: mockUser },
            error: null,
          })
        ),
        signInWithPassword: vi.fn(() => Promise.resolve(mockSignInResult)),
        resetPasswordForEmail: vi.fn(() => Promise.resolve(mockResetPasswordResult)),
        updateUser: vi.fn((data: unknown) => {
          mockCalls.push({ method: "updateUser", args: [data] });
          return Promise.resolve(mockUpdateUserResult);
        }),
      },
      from: vi.fn((_table: string) => {
        mockCalls.push({ method: "from", args: [_table] });
        return createChainMock();
      }),
    })
  ),
}));

// Mock rate-limit module
vi.mock("@/lib/rate-limit", () => ({
  checkLoginRateLimit: vi.fn(() => mockLoginRateLimit),
  checkPasswordResetRateLimit: vi.fn(() => mockResetRateLimit),
  checkPasswordChangeRateLimit: vi.fn(() => mockChangeRateLimit),
  getClientIP: vi.fn(() => Promise.resolve("127.0.0.1")),
}));

// ============================================================================
// Import server actions AFTER mocks
// ============================================================================

import {
  loginAction,
  requestPasswordResetAction,
  updatePasswordAction,
  checkAuthStatusAction,
} from "../auth";

// ============================================================================
// Reset state before each test
// ============================================================================

beforeEach(() => {
  mockCalls.length = 0;
  mockUser = {
    id: "test-user-id",
    email: "pm@test.com",
    user_metadata: {},
  };
  mockSignInResult = {
    data: { user: null, session: null },
    error: null,
  };
  mockResetPasswordResult = { error: null };
  mockUpdateUserResult = { error: null };
  mockLoginRateLimit = { success: true, remaining: 4, resetIn: 900000 };
  mockResetRateLimit = { success: true, remaining: 2, resetIn: 3600000 };
  mockChangeRateLimit = { success: true, remaining: 4, resetIn: 3600000 };
});

// ============================================================================
// loginAction
// ============================================================================

describe("loginAction", () => {
  it("logs in successfully and updates last_login_at", async () => {
    mockSignInResult = {
      data: {
        user: { id: "user-1", email: "pm@test.com", user_metadata: {} },
        session: { access_token: "token" },
      },
      error: null,
    };

    const result = await loginAction("pm@test.com", "password123");

    expect(result.success).toBe(true);
    expect(result.mustChangePassword).toBe(false);
    expect(result.remaining).toBe(4);

    // Verify last_login_at was updated
    const fromCall = mockCalls.find((c) => c.method === "from");
    expect(fromCall?.args[0]).toBe("users");

    const updateCall = mockCalls.find((c) => c.method === "update");
    expect(updateCall).toBeTruthy();
    const updateData = updateCall?.args[0] as Record<string, unknown>;
    expect(updateData.last_login_at).toBeDefined();
  });

  it("returns must_change_password when flag is set", async () => {
    mockSignInResult = {
      data: {
        user: {
          id: "user-1",
          email: "pm@test.com",
          user_metadata: { must_change_password: true },
        },
        session: { access_token: "token" },
      },
      error: null,
    };

    const result = await loginAction("pm@test.com", "password123");

    expect(result.success).toBe(true);
    expect(result.mustChangePassword).toBe(true);
  });

  it("returns false for must_change_password when flag is not set", async () => {
    mockSignInResult = {
      data: {
        user: {
          id: "user-1",
          email: "pm@test.com",
          user_metadata: {},
        },
        session: { access_token: "token" },
      },
      error: null,
    };

    const result = await loginAction("pm@test.com", "password123");

    expect(result.success).toBe(true);
    expect(result.mustChangePassword).toBe(false);
  });

  it("returns error when credentials are wrong", async () => {
    mockSignInResult = {
      data: { user: null, session: null },
      error: { message: "Invalid login credentials" },
    };

    const result = await loginAction("wrong@test.com", "wrong");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid login credentials");
  });

  it("returns error when user data is null (no user returned)", async () => {
    mockSignInResult = {
      data: { user: null, session: null },
      error: null,
    };

    const result = await loginAction("pm@test.com", "password123");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Login failed. Please try again.");
  });

  it("blocks login when rate limited", async () => {
    mockLoginRateLimit = {
      success: false,
      remaining: 0,
      resetIn: 600000, // 10 minutes left
      error: "Too many requests. Please try again in 10 minutes.",
    } as typeof mockLoginRateLimit;

    const result = await loginAction("pm@test.com", "password123");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Too many requests");
    expect(result.remaining).toBe(0);
    expect(result.resetIn).toBe(600000);
  });

  it("includes remaining count in successful response", async () => {
    mockLoginRateLimit = { success: true, remaining: 2, resetIn: 900000 };
    mockSignInResult = {
      data: {
        user: { id: "user-1", email: "pm@test.com", user_metadata: {} },
        session: { access_token: "token" },
      },
      error: null,
    };

    const result = await loginAction("pm@test.com", "password123");

    expect(result.success).toBe(true);
    expect(result.remaining).toBe(2);
  });
});

// ============================================================================
// requestPasswordResetAction
// ============================================================================

describe("requestPasswordResetAction", () => {
  it("sends reset email successfully", async () => {
    mockResetPasswordResult = { error: null };

    const result = await requestPasswordResetAction(
      "pm@test.com",
      "https://app.example.com/change-password"
    );

    expect(result.success).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("returns success even for non-existent email (prevents enumeration)", async () => {
    // The Supabase call may or may not error for non-existent emails,
    // but if it succeeds, the action always returns success
    mockResetPasswordResult = { error: null };

    const result = await requestPasswordResetAction(
      "nonexistent@test.com",
      "https://app.example.com/change-password"
    );

    expect(result.success).toBe(true);
  });

  it("returns error when Supabase fails", async () => {
    mockResetPasswordResult = { error: { message: "Rate limit exceeded" } };

    const result = await requestPasswordResetAction(
      "pm@test.com",
      "https://app.example.com/change-password"
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Rate limit exceeded");
  });

  it("blocks when rate limited (3 requests per hour)", async () => {
    mockResetRateLimit = {
      success: false,
      remaining: 0,
      resetIn: 1800000,
      error: "Too many requests. Please try again in 30 minutes.",
    } as typeof mockResetRateLimit;

    const result = await requestPasswordResetAction(
      "pm@test.com",
      "https://app.example.com/change-password"
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Too many requests");
    expect(result.remaining).toBe(0);
  });
});

// ============================================================================
// updatePasswordAction
// ============================================================================

describe("updatePasswordAction", () => {
  it("updates password successfully", async () => {
    mockUpdateUserResult = { error: null };

    const result = await updatePasswordAction("newPassword123!");

    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("clears must_change_password flag when requested", async () => {
    mockUpdateUserResult = { error: null };

    const result = await updatePasswordAction("newPassword123!", true);

    expect(result.success).toBe(true);

    // Verify updateUser was called with data to clear the flag
    const updateUserCall = mockCalls.find((c) => c.method === "updateUser");
    expect(updateUserCall).toBeTruthy();

    const updateData = updateUserCall?.args[0] as Record<string, unknown>;
    expect(updateData.password).toBe("newPassword123!");
    expect(updateData.data).toEqual({ must_change_password: false });
  });

  it("does not include data field when clearMustChangeFlag is false", async () => {
    mockUpdateUserResult = { error: null };

    await updatePasswordAction("newPassword123!", false);

    const updateUserCall = mockCalls.find((c) => c.method === "updateUser");
    const updateData = updateUserCall?.args[0] as Record<string, unknown>;
    expect(updateData.password).toBe("newPassword123!");
    expect(updateData.data).toBeUndefined();
  });

  it("returns error when not authenticated", async () => {
    mockUser = null;

    const result = await updatePasswordAction("newPassword123!");

    expect(result.success).toBe(false);
    expect(result.error).toBe("You must be logged in to change your password.");
  });

  it("returns error on Supabase update failure", async () => {
    mockUpdateUserResult = { error: { message: "Password too weak" } };

    const result = await updatePasswordAction("weak");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Password too weak");
  });

  it("blocks when rate limited (5 per hour per user)", async () => {
    mockChangeRateLimit = {
      success: false,
      remaining: 0,
      resetIn: 2400000,
      error: "Too many requests. Please try again in 40 minutes.",
    } as typeof mockChangeRateLimit;

    const result = await updatePasswordAction("newPassword123!");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Too many requests");
    expect(result.remaining).toBe(0);
  });
});

// ============================================================================
// checkAuthStatusAction
// ============================================================================

describe("checkAuthStatusAction", () => {
  it("returns authenticated status with email", async () => {
    mockUser = {
      id: "user-1",
      email: "pm@test.com",
      user_metadata: {},
    };

    const result = await checkAuthStatusAction();

    expect(result.isAuthenticated).toBe(true);
    expect(result.mustChangePassword).toBe(false);
    expect(result.email).toBe("pm@test.com");
  });

  it("returns must_change_password when flag is set", async () => {
    mockUser = {
      id: "user-1",
      email: "pm@test.com",
      user_metadata: { must_change_password: true },
    };

    const result = await checkAuthStatusAction();

    expect(result.isAuthenticated).toBe(true);
    expect(result.mustChangePassword).toBe(true);
  });

  it("returns unauthenticated when no user", async () => {
    mockUser = null;

    const result = await checkAuthStatusAction();

    expect(result.isAuthenticated).toBe(false);
    expect(result.mustChangePassword).toBe(false);
    expect(result.email).toBeUndefined();
  });
});
