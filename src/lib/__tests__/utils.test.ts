import { describe, expect, it } from "vitest";
import {
  calculateProgress,
  formatCurrency,
  generateAvatarFallback,
  getNextRevision,
} from "@/lib/utils";

describe("formatCurrency", () => {
  it("formats TRY, USD and EUR correctly", () => {
    expect(formatCurrency(1234.5, "TRY")).toBe("₺1,234.50");
    expect(formatCurrency(1234.5, "USD")).toBe("$1,234.50");
    expect(formatCurrency(1234.5, "EUR")).toBe("€1,234.50");
  });

  it("handles null and zero", () => {
    expect(formatCurrency(null, "TRY")).toBe("-");
    expect(formatCurrency(0, "USD")).toBe("$0.00");
  });
});

describe("getNextRevision", () => {
  it("returns A for null and increments alphabetic revisions", () => {
    expect(getNextRevision(null)).toBe("A");
    expect(getNextRevision("A")).toBe("B");
    expect(getNextRevision("Y")).toBe("Z");
  });

  it("increments past Z using char codes", () => {
    expect(getNextRevision("Z")).toBe("[");
  });
});

describe("calculateProgress", () => {
  it("calculates percentage progress", () => {
    expect(calculateProgress(0, 10)).toBe(0);
    expect(calculateProgress(5, 10)).toBe(50);
    expect(calculateProgress(10, 10)).toBe(100);
  });

  it("returns 0 when total is 0", () => {
    expect(calculateProgress(0, 0)).toBe(0);
  });
});

describe("generateAvatarFallback", () => {
  it("returns initials for full names", () => {
    expect(generateAvatarFallback("John Doe")).toBe("JD");
  });

  it("handles single names and empty strings", () => {
    expect(generateAvatarFallback("Alice")).toBe("A");
    expect(generateAvatarFallback("")).toBe("");
  });
});
