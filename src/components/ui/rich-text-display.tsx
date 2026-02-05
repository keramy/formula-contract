"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// RICH TEXT DISPLAY - Renders HTML content from rich text editor
// ============================================================================

interface RichTextDisplayProps {
  /** HTML content to display */
  content: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show a compact version with less spacing */
  compact?: boolean;
  /** Maximum height with overflow scroll */
  maxHeight?: string;
}

/**
 * Displays rich text content (HTML) in a styled, read-only format.
 * Used to render content created with the RichTextEditor component.
 *
 * @example
 * <RichTextDisplay
 *   content={report.description}
 *   className="mt-2"
 * />
 */
export function RichTextDisplay({
  content,
  className,
  compact = false,
  maxHeight,
}: RichTextDisplayProps) {
  // Return null or placeholder for empty content
  if (!content || content === "<p></p>") {
    return (
      <p className={cn("text-sm text-muted-foreground italic", className)}>
        No content
      </p>
    );
  }

  return (
    <div
      className={cn(
        "rich-text-display",
        // Base prose styling
        "prose prose-sm max-w-none",
        // Headings
        "prose-headings:font-semibold prose-headings:text-foreground",
        compact
          ? "prose-headings:mb-1 prose-headings:mt-2"
          : "prose-headings:mb-2 prose-headings:mt-4",
        // Paragraphs
        "prose-p:text-foreground prose-p:leading-relaxed",
        compact ? "prose-p:my-1" : "prose-p:my-2",
        // Strong/Bold
        "prose-strong:text-foreground prose-strong:font-semibold",
        // Lists
        "prose-ul:list-disc prose-ol:list-decimal",
        compact
          ? "prose-ul:my-1 prose-ol:my-1"
          : "prose-ul:my-2 prose-ol:my-2",
        "prose-li:text-foreground",
        compact ? "prose-li:my-0" : "prose-li:my-1",
        // Blockquotes
        "prose-blockquote:border-l-4 prose-blockquote:border-primary/30",
        "prose-blockquote:pl-4 prose-blockquote:italic",
        "prose-blockquote:text-muted-foreground",
        // Code
        "prose-code:bg-base-100 prose-code:px-1.5 prose-code:py-0.5",
        "prose-code:rounded prose-code:text-sm prose-code:font-mono",
        "prose-code:before:content-none prose-code:after:content-none",
        // Links
        "prose-a:text-primary prose-a:underline prose-a:underline-offset-2",
        "prose-a:hover:text-primary/80",
        // Horizontal rule
        "prose-hr:border-base-200",
        compact ? "prose-hr:my-2" : "prose-hr:my-4",
        className
      )}
      style={maxHeight ? { maxHeight, overflow: "auto" } : undefined}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

/**
 * Strips HTML tags from content for plain text display
 * Useful for previews or truncated content
 */
export function stripHtml(html: string): string {
  if (!html) return "";

  // Create a temporary element to parse HTML
  if (typeof document !== "undefined") {
    const temp = document.createElement("div");
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || "";
  }

  // Fallback for SSR: basic regex stripping
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Truncates HTML content while preserving valid HTML structure
 * Returns plain text truncated version
 */
export function truncateHtml(html: string, maxLength: number): string {
  const text = stripHtml(html);
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

/**
 * Checks if HTML content is effectively empty
 */
export function isEmptyHtml(html: string | null | undefined): boolean {
  if (!html) return true;
  const stripped = stripHtml(html);
  return stripped.trim().length === 0;
}

export default RichTextDisplay;
