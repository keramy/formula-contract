/**
 * Input Sanitization Utility
 *
 * Provides XSS protection for user-generated content.
 * Uses pure JavaScript implementation that works on both server and client.
 *
 * Usage:
 * - sanitizeText(): For plain text fields (removes ALL HTML)
 * - sanitizeHTML(): For rich text fields (allows safe HTML)
 * - sanitizeURL(): For URL validation and sanitization
 * - sanitizeObject(): For sanitizing entire form data objects
 */

// ============================================================================
// Pure JavaScript Sanitization (No DOM required - works on Vercel!)
// ============================================================================

/**
 * HTML entity map for encoding
 */
const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;",
};

/**
 * Reverse HTML entity map for decoding
 */
const HTML_DECODE_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#039;": "'",
  "&#x27;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

/**
 * Dangerous patterns to remove
 */
const DANGEROUS_PATTERNS = [
  // Script tags and content
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  // Event handlers
  /\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi,
  // JavaScript URLs
  /javascript\s*:/gi,
  // Data URLs (can contain scripts)
  /data\s*:\s*text\/html/gi,
  // VBScript
  /vbscript\s*:/gi,
  // Expression (IE)
  /expression\s*\(/gi,
];

/**
 * Strip all HTML tags from a string
 */
function stripHtmlTags(input: string): string {
  // Remove all HTML tags
  return input
    .replace(/<[^>]*>/g, " ") // Replace tags with space
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

/**
 * Decode HTML entities
 */
function decodeHTMLEntities(input: string): string {
  let result = input;
  for (const [entity, char] of Object.entries(HTML_DECODE_MAP)) {
    result = result.replace(new RegExp(entity, "gi"), char);
  }
  // Handle numeric entities
  result = result.replace(/&#(\d+);/g, (_, num) =>
    String.fromCharCode(parseInt(num, 10))
  );
  result = result.replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
  return result;
}

/**
 * Remove dangerous patterns from HTML
 */
function removeDangerousPatterns(input: string): string {
  let result = input;
  for (const pattern of DANGEROUS_PATTERNS) {
    result = result.replace(pattern, "");
  }
  return result;
}

// ============================================================================
// Sanitization Functions
// ============================================================================

/**
 * Sanitize plain text - removes ALL HTML tags but keeps text content
 * Use for: names, titles, codes, descriptions that should be plain text
 */
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return "";

  // Decode HTML entities first
  let result = decodeHTMLEntities(input);

  // Strip all HTML tags
  result = stripHtmlTags(result);

  // Remove any remaining dangerous patterns
  result = removeDangerousPatterns(result);

  // Normalize whitespace and trim
  result = result.replace(/\s+/g, " ").trim();

  return result;
}

/**
 * Sanitize HTML content - removes dangerous tags/attributes but keeps safe formatting
 * Use for: rich text editors, formatted descriptions
 */
export function sanitizeHTML(input: string | null | undefined): string {
  if (!input) return "";

  let result = input;

  // Remove dangerous patterns
  result = removeDangerousPatterns(result);

  // Remove dangerous tags completely
  const dangerousTags = [
    "script",
    "style",
    "iframe",
    "frame",
    "frameset",
    "object",
    "embed",
    "applet",
    "form",
    "input",
    "button",
    "select",
    "textarea",
    "meta",
    "link",
    "base",
  ];

  for (const tag of dangerousTags) {
    // Remove opening and closing tags with content
    const tagRegex = new RegExp(
      `<${tag}\\b[^<]*(?:(?!<\\/${tag}>)<[^<]*)*<\\/${tag}>`,
      "gi"
    );
    result = result.replace(tagRegex, "");

    // Remove self-closing tags
    const selfClosingRegex = new RegExp(`<${tag}\\b[^>]*\\/?>`, "gi");
    result = result.replace(selfClosingRegex, "");
  }

  // Remove all event handlers from remaining tags
  result = result.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "");

  // Remove javascript: and data: URLs from href/src attributes
  result = result.replace(
    /(href|src)\s*=\s*["']?\s*(javascript|data|vbscript)\s*:/gi,
    '$1=""'
  );

  return result.trim();
}

/**
 * Sanitize URL - validates and sanitizes URLs
 * Only allows http, https, and mailto protocols
 */
export function sanitizeURL(input: string | null | undefined): string {
  if (!input) return "";

  const trimmed = input.trim();

  // Check for dangerous protocols
  const lowercased = trimmed.toLowerCase();
  if (
    lowercased.startsWith("javascript:") ||
    lowercased.startsWith("data:") ||
    lowercased.startsWith("vbscript:")
  ) {
    return "";
  }

  // Only allow safe protocols
  const safeProtocols = ["http://", "https://", "mailto:"];
  const hasProtocol = safeProtocols.some((p) => lowercased.startsWith(p));

  // If no protocol, assume https
  if (!hasProtocol && trimmed.length > 0) {
    // Validate it looks like a URL (has a dot)
    if (!trimmed.includes(".")) {
      return "";
    }
    return `https://${trimmed}`;
  }

  return trimmed;
}

/**
 * Sanitize an entire object's string values
 * Useful for sanitizing form data before saving
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options: {
    htmlFields?: string[]; // Fields that should allow safe HTML
    urlFields?: string[]; // Fields that should be validated as URLs
    skipFields?: string[]; // Fields to skip entirely
  } = {}
): T {
  const { htmlFields = [], urlFields = [], skipFields = [] } = options;

  const result = { ...obj };

  for (const [key, value] of Object.entries(result)) {
    if (skipFields.includes(key)) {
      continue;
    }

    if (typeof value === "string") {
      if (urlFields.includes(key)) {
        (result as Record<string, unknown>)[key] = sanitizeURL(value);
      } else if (htmlFields.includes(key)) {
        (result as Record<string, unknown>)[key] = sanitizeHTML(value);
      } else {
        (result as Record<string, unknown>)[key] = sanitizeText(value);
      }
    } else if (Array.isArray(value)) {
      // Sanitize string arrays
      (result as Record<string, unknown>)[key] = value.map((item) =>
        typeof item === "string" ? sanitizeText(item) : item
      );
    }
  }

  return result;
}

/**
 * Escape HTML for safe display (converts special chars to entities)
 * Use when you want to DISPLAY HTML as text, not render it
 */
export function escapeHTML(input: string | null | undefined): string {
  if (!input) return "";
  return input.replace(/[&<>"']/g, (char) => HTML_ENTITIES[char] || char);
}

// ============================================================================
// Zod Schema Helpers
// ============================================================================

import { z } from "zod";

/**
 * Zod schema transformer that sanitizes text input
 */
export const sanitizedText = z.string().transform(sanitizeText);

/**
 * Zod schema transformer that sanitizes HTML input
 */
export const sanitizedHTML = z.string().transform(sanitizeHTML);

/**
 * Zod schema transformer that sanitizes URL input
 */
export const sanitizedURL = z.string().transform(sanitizeURL);

/**
 * Create a sanitized string schema with validation
 */
export function createSanitizedString(
  options: {
    minLength?: number;
    maxLength?: number;
    required?: boolean;
  } = {}
) {
  const { minLength, maxLength, required = true } = options;

  let schema = z.string();

  if (required) {
    schema = schema.min(1, "This field is required");
  }

  if (minLength) {
    schema = schema.min(minLength, `Must be at least ${minLength} characters`);
  }

  if (maxLength) {
    schema = schema.max(maxLength, `Must be at most ${maxLength} characters`);
  }

  return schema.transform(sanitizeText);
}
