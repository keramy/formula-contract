/**
 * Input Sanitization Utility
 *
 * Provides XSS protection for user-generated content.
 * Uses DOMPurify for HTML sanitization with safe defaults.
 *
 * Usage:
 * - sanitizeText(): For plain text fields (removes ALL HTML)
 * - sanitizeHTML(): For rich text fields (allows safe HTML)
 * - sanitizeURL(): For URL validation and sanitization
 * - sanitizeObject(): For sanitizing entire form data objects
 */

import DOMPurify from "dompurify";

// ============================================================================
// Configuration
// ============================================================================

/**
 * Safe HTML configuration - allows basic formatting but no scripts/dangerous tags
 */
const SAFE_HTML_CONFIG = {
  ALLOWED_TAGS: [
    "p", "br", "strong", "b", "em", "i", "u", "s",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li",
    "a", "blockquote", "code", "pre",
    "table", "thead", "tbody", "tr", "th", "td",
    "span", "div",
  ] as string[],
  ALLOWED_ATTR: [
    "href", "target", "rel", "class", "style",
  ] as string[],
  ALLOW_DATA_ATTR: false,
  // Force all links to open in new tab and have safe rel
  ADD_ATTR: ["target", "rel"] as string[],
  FORBID_TAGS: ["script", "style", "iframe", "form", "input", "button"] as string[],
  FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"] as string[],
};

/**
 * Plain text configuration - strips ALL HTML
 */
const PLAIN_TEXT_CONFIG = {
  ALLOWED_TAGS: [] as string[],
  ALLOWED_ATTR: [] as string[],
  KEEP_CONTENT: true,
};

// ============================================================================
// Sanitization Functions
// ============================================================================

/**
 * Sanitize plain text - removes ALL HTML tags but keeps text content
 * Use for: names, titles, codes, descriptions that should be plain text
 */
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return "";
  // First decode HTML entities, then strip tags
  const decoded = decodeHTMLEntities(input);
  return DOMPurify.sanitize(decoded, PLAIN_TEXT_CONFIG).trim();
}

/**
 * Sanitize HTML content - allows safe HTML tags
 * Use for: rich text editors, formatted descriptions
 */
export function sanitizeHTML(input: string | null | undefined): string {
  if (!input) return "";
  return DOMPurify.sanitize(input, SAFE_HTML_CONFIG);
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
  const hasProtocol = safeProtocols.some((p) =>
    lowercased.startsWith(p)
  );

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
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Decode HTML entities
 */
function decodeHTMLEntities(input: string): string {
  const textarea = typeof document !== "undefined"
    ? document.createElement("textarea")
    : null;

  if (!textarea) {
    // Server-side fallback - handle common entities
    return input
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, " ");
  }

  textarea.innerHTML = input;
  return textarea.value;
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
export function createSanitizedString(options: {
  minLength?: number;
  maxLength?: number;
  required?: boolean;
} = {}) {
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
