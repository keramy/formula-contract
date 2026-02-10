import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkLoginRateLimit, checkRateLimit } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests up to limit and blocks after limit", () => {
    const config = { limit: 3, window: 60_000 };
    const id = "test:user:allow-block";

    const first = checkRateLimit(id, config);
    const second = checkRateLimit(id, config);
    const third = checkRateLimit(id, config);
    const fourth = checkRateLimit(id, config);

    expect(first.success).toBe(true);
    expect(first.remaining).toBe(2);
    expect(second.success).toBe(true);
    expect(second.remaining).toBe(1);
    expect(third.success).toBe(true);
    expect(third.remaining).toBe(0);

    expect(fourth.success).toBe(false);
    expect(fourth.remaining).toBe(0);
    expect(fourth.error).toContain("Too many requests");
  });

  it("resets after the configured window", () => {
    const config = { limit: 2, window: 10_000 };
    const id = "test:user:window-reset";

    expect(checkRateLimit(id, config).success).toBe(true);
    expect(checkRateLimit(id, config).success).toBe(true);
    expect(checkRateLimit(id, config).success).toBe(false);

    vi.advanceTimersByTime(10_001);

    const afterReset = checkRateLimit(id, config);
    expect(afterReset.success).toBe(true);
    expect(afterReset.remaining).toBe(1);
  });
});

describe("checkLoginRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows 5 attempts per 15 minutes and blocks the 6th", () => {
    const ip = "203.0.113.10";

    for (let i = 0; i < 5; i++) {
      expect(checkLoginRateLimit(ip).success).toBe(true);
    }

    const blocked = checkLoginRateLimit(ip);
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("decrements remaining count and allows again after window expires", () => {
    const ip = "203.0.113.11";

    const attempts = [
      checkLoginRateLimit(ip),
      checkLoginRateLimit(ip),
      checkLoginRateLimit(ip),
      checkLoginRateLimit(ip),
      checkLoginRateLimit(ip),
    ];

    expect(attempts.map((a) => a.remaining)).toEqual([4, 3, 2, 1, 0]);
    expect(checkLoginRateLimit(ip).success).toBe(false);

    vi.advanceTimersByTime(15 * 60 * 1000 + 1);

    const resetAttempt = checkLoginRateLimit(ip);
    expect(resetAttempt.success).toBe(true);
    expect(resetAttempt.remaining).toBe(4);
  });
});
