import { describe, expect, it } from "vitest";
import {
  createSanitizedString,
  escapeHTML,
  sanitizeHTML,
  sanitizeObject,
  sanitizeText,
  sanitizeURL,
  sanitizedText,
} from "@/lib/sanitize";

describe("sanitizeText", () => {
  it("strips script tags", () => {
    expect(sanitizeText('<script>alert("x")</script>Hello')).toBe('alert("x") Hello');
  });

  it("strips inline event handlers", () => {
    expect(sanitizeText('<img src="x" onerror="alert(1)">Safe')).toBe("Safe");
  });

  it("preserves plain text", () => {
    expect(sanitizeText("Hello world")).toBe("Hello world");
  });

  it("handles null and undefined", () => {
    expect(sanitizeText(null)).toBe("");
    expect(sanitizeText(undefined)).toBe("");
  });
});

describe("sanitizeHTML", () => {
  it("removes script and iframe tags", () => {
    const input = '<p>ok</p><script>alert(1)</script><iframe src="x"></iframe>';
    expect(sanitizeHTML(input)).toBe("<p>ok</p>");
  });

  it("keeps safe formatting tags", () => {
    const input = "<p><b>Bold</b> and <em>emphasis</em></p>";
    expect(sanitizeHTML(input)).toBe(input);
  });
});

describe("sanitizeURL", () => {
  it("allows https urls", () => {
    expect(sanitizeURL("https://example.com")).toBe("https://example.com");
  });

  it("blocks javascript urls", () => {
    expect(sanitizeURL("javascript:alert(1)")).toBe("");
  });

  it("adds https to bare domains", () => {
    expect(sanitizeURL("example.com/path")).toBe("https://example.com/path");
  });
});

describe("escapeHTML", () => {
  it("escapes special characters", () => {
    expect(escapeHTML('<div class="a">Tom & Jerry\'s</div>')).toBe(
      "&lt;div class=&quot;a&quot;&gt;Tom &amp; Jerry&#039;s&lt;/div&gt;"
    );
  });
});

describe("sanitizeObject", () => {
  it("sanitizes object string fields and arrays", () => {
    const result = sanitizeObject(
      {
        name: '<img src="x" onerror="alert(1)">John',
        description: '<p>Hello<script>bad()</script></p>',
        website: "example.com",
        tags: ["<b>one</b>", "<script>two</script>"],
      },
      {
        htmlFields: ["description"],
        urlFields: ["website"],
      }
    );

    expect(result.name).toBe("John");
    expect(result.description).toBe("<p>Hello</p>");
    expect(result.website).toBe("https://example.com");
    expect(result.tags).toEqual(["one", "two"]);
  });
});

describe("sanitizedText schema", () => {
  it("transforms html input into clean text", () => {
    expect(sanitizedText.parse('<b>Hello</b> <script>alert(1)</script>World')).toBe(
      "Hello alert(1) World"
    );
  });
});

describe("createSanitizedString", () => {
  it("supports minLength, maxLength, and required validation", () => {
    const schema = createSanitizedString({ minLength: 3, maxLength: 10, required: true });

    expect(schema.safeParse("ab").success).toBe(false);
    expect(schema.safeParse("abcdefghijk").success).toBe(false);
    expect(schema.safeParse("").success).toBe(false);
    expect(schema.parse("valid")).toBe("valid");
  });

  it("allows empty values when required is false", () => {
    const schema = createSanitizedString({ required: false });
    expect(schema.safeParse("").success).toBe(true);
  });
});
