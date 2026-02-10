import { describe, expect, it } from "vitest";
import { generateSlug, isUUID } from "@/lib/slug";

describe("generateSlug", () => {
  it("converts plain text into lowercase hyphenated slug", () => {
    expect(generateSlug("Hello World")).toBe("hello-world");
  });

  it("strips special characters", () => {
    expect(generateSlug("Special!@# Chars")).toBe("special-chars");
  });
});

describe("isUUID", () => {
  it("returns true for valid UUID", () => {
    expect(isUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("returns false for invalid inputs", () => {
    expect(isUUID("not-a-uuid")).toBe(false);
    expect(isUUID("")).toBe(false);
  });
});
