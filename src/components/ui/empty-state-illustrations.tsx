"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// EMPTY STATE ILLUSTRATIONS - SVG illustrations for empty states
// ============================================================================

interface IllustrationProps {
  className?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

/**
 * No Projects Illustration - Shows an empty folder/dashboard
 */
export function NoProjectsIllustration({
  className,
  primaryColor = "var(--primary)",
  secondaryColor = "var(--base-300)",
}: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-48 h-auto", className)}
    >
      {/* Background shapes */}
      <rect x="30" y="40" width="140" height="100" rx="8" fill={secondaryColor} opacity="0.3" />
      <rect x="40" y="50" width="120" height="80" rx="6" fill="white" stroke={secondaryColor} strokeWidth="2" />

      {/* Folder tab */}
      <path
        d="M40 50 L40 45 C40 42.2386 42.2386 40 45 40 L75 40 L85 50 L40 50Z"
        fill={primaryColor}
        opacity="0.2"
      />

      {/* Empty state lines */}
      <rect x="55" y="70" width="90" height="8" rx="4" fill={secondaryColor} opacity="0.5" />
      <rect x="55" y="88" width="60" height="8" rx="4" fill={secondaryColor} opacity="0.3" />
      <rect x="55" y="106" width="75" height="8" rx="4" fill={secondaryColor} opacity="0.2" />

      {/* Plus icon circle */}
      <circle cx="155" cy="125" r="18" fill={primaryColor} opacity="0.15" />
      <path
        d="M155 117 L155 133 M147 125 L163 125"
        stroke={primaryColor}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * No Scope Items Illustration - Shows an empty list/table
 */
export function NoScopeItemsIllustration({
  className,
  primaryColor = "var(--primary)",
  secondaryColor = "var(--base-300)",
}: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-48 h-auto", className)}
    >
      {/* Table background */}
      <rect x="25" y="30" width="150" height="110" rx="8" fill="white" stroke={secondaryColor} strokeWidth="2" />

      {/* Table header */}
      <rect x="25" y="30" width="150" height="25" rx="8" fill={primaryColor} opacity="0.1" />
      <rect x="25" y="47" width="150" height="8" fill={primaryColor} opacity="0.05" />

      {/* Header columns */}
      <rect x="35" y="38" width="30" height="10" rx="2" fill={primaryColor} opacity="0.3" />
      <rect x="75" y="38" width="45" height="10" rx="2" fill={primaryColor} opacity="0.3" />
      <rect x="130" y="38" width="35" height="10" rx="2" fill={primaryColor} opacity="0.3" />

      {/* Empty rows (dashed) */}
      <rect x="35" y="65" width="130" height="1" fill={secondaryColor} opacity="0.5" strokeDasharray="4 4" />
      <rect x="35" y="85" width="130" height="1" fill={secondaryColor} opacity="0.4" strokeDasharray="4 4" />
      <rect x="35" y="105" width="130" height="1" fill={secondaryColor} opacity="0.3" strokeDasharray="4 4" />

      {/* Empty state icon */}
      <circle cx="100" cy="95" r="20" fill={secondaryColor} opacity="0.2" />
      <path
        d="M92 95 L108 95 M100 87 L100 103"
        stroke={secondaryColor}
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}

/**
 * No Reports Illustration - Shows document/report icon
 */
export function NoReportsIllustration({
  className,
  primaryColor = "var(--primary)",
  secondaryColor = "var(--base-300)",
}: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-48 h-auto", className)}
    >
      {/* Main document */}
      <path
        d="M55 25 L125 25 L145 45 L145 135 C145 138.314 142.314 141 139 141 L61 141 C57.6863 141 55 138.314 55 135 L55 25Z"
        fill="white"
        stroke={secondaryColor}
        strokeWidth="2"
      />

      {/* Document fold */}
      <path
        d="M125 25 L125 39 C125 42.3137 127.686 45 131 45 L145 45"
        fill="none"
        stroke={secondaryColor}
        strokeWidth="2"
      />
      <path d="M125 25 L145 45 L125 45 L125 25Z" fill={secondaryColor} opacity="0.2" />

      {/* Document lines */}
      <rect x="70" y="60" width="60" height="6" rx="3" fill={primaryColor} opacity="0.3" />
      <rect x="70" y="75" width="50" height="6" rx="3" fill={secondaryColor} opacity="0.4" />
      <rect x="70" y="90" width="55" height="6" rx="3" fill={secondaryColor} opacity="0.3" />
      <rect x="70" y="105" width="40" height="6" rx="3" fill={secondaryColor} opacity="0.2" />

      {/* Chart icon on document */}
      <rect x="70" y="115" width="30" height="18" rx="2" fill={primaryColor} opacity="0.15" />
      <rect x="75" y="125" width="4" height="5" fill={primaryColor} opacity="0.4" />
      <rect x="82" y="122" width="4" height="8" fill={primaryColor} opacity="0.4" />
      <rect x="89" y="119" width="4" height="11" fill={primaryColor} opacity="0.4" />
    </svg>
  );
}

/**
 * No Milestones Illustration - Shows a timeline/calendar
 */
export function NoMilestonesIllustration({
  className,
  primaryColor = "var(--primary)",
  secondaryColor = "var(--base-300)",
}: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-48 h-auto", className)}
    >
      {/* Timeline line */}
      <line x1="40" y1="80" x2="160" y2="80" stroke={secondaryColor} strokeWidth="3" strokeLinecap="round" />

      {/* Empty milestone markers */}
      <circle cx="60" cy="80" r="12" fill="white" stroke={secondaryColor} strokeWidth="2" strokeDasharray="4 3" />
      <circle cx="100" cy="80" r="12" fill="white" stroke={secondaryColor} strokeWidth="2" strokeDasharray="4 3" />
      <circle cx="140" cy="80" r="12" fill="white" stroke={secondaryColor} strokeWidth="2" strokeDasharray="4 3" />

      {/* Date labels */}
      <rect x="48" y="100" width="24" height="6" rx="3" fill={secondaryColor} opacity="0.3" />
      <rect x="88" y="100" width="24" height="6" rx="3" fill={secondaryColor} opacity="0.3" />
      <rect x="128" y="100" width="24" height="6" rx="3" fill={secondaryColor} opacity="0.3" />

      {/* Title placeholders */}
      <rect x="45" y="55" width="30" height="6" rx="3" fill={secondaryColor} opacity="0.4" />
      <rect x="85" y="55" width="30" height="6" rx="3" fill={secondaryColor} opacity="0.4" />
      <rect x="125" y="55" width="30" height="6" rx="3" fill={secondaryColor} opacity="0.4" />

      {/* Add milestone hint */}
      <circle cx="100" cy="130" r="14" fill={primaryColor} opacity="0.15" />
      <path
        d="M100 124 L100 136 M94 130 L106 130"
        stroke={primaryColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * No Drawings Illustration - Shows blueprint/design icon
 */
export function NoDrawingsIllustration({
  className,
  primaryColor = "var(--primary)",
  secondaryColor = "var(--base-300)",
}: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-48 h-auto", className)}
    >
      {/* Blueprint background */}
      <rect x="35" y="25" width="130" height="110" rx="6" fill={primaryColor} opacity="0.08" stroke={secondaryColor} strokeWidth="2" />

      {/* Grid lines */}
      <line x1="35" y1="55" x2="165" y2="55" stroke={secondaryColor} strokeWidth="1" opacity="0.3" />
      <line x1="35" y1="85" x2="165" y2="85" stroke={secondaryColor} strokeWidth="1" opacity="0.3" />
      <line x1="35" y1="115" x2="165" y2="115" stroke={secondaryColor} strokeWidth="1" opacity="0.3" />
      <line x1="75" y1="25" x2="75" y2="135" stroke={secondaryColor} strokeWidth="1" opacity="0.3" />
      <line x1="115" y1="25" x2="115" y2="135" stroke={secondaryColor} strokeWidth="1" opacity="0.3" />

      {/* Placeholder shapes */}
      <rect x="50" y="40" width="40" height="25" rx="2" fill="none" stroke={secondaryColor} strokeWidth="1.5" strokeDasharray="4 2" opacity="0.5" />
      <circle cx="135" cy="52" r="12" fill="none" stroke={secondaryColor} strokeWidth="1.5" strokeDasharray="4 2" opacity="0.5" />
      <rect x="50" y="95" width="55" height="20" rx="2" fill="none" stroke={secondaryColor} strokeWidth="1.5" strokeDasharray="4 2" opacity="0.5" />

      {/* Pencil icon */}
      <g transform="translate(130, 95)">
        <rect x="0" y="0" width="24" height="24" rx="12" fill={primaryColor} opacity="0.2" />
        <path
          d="M7 14 L10 17 L17 10 M7 14 L6 18 L10 17"
          stroke={primaryColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
    </svg>
  );
}

/**
 * No Materials Illustration - Shows material samples/swatches
 */
export function NoMaterialsIllustration({
  className,
  primaryColor = "var(--primary)",
  secondaryColor = "var(--base-300)",
}: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-48 h-auto", className)}
    >
      {/* Swatch cards */}
      <g transform="rotate(-5, 70, 80)">
        <rect x="40" y="35" width="60" height="80" rx="6" fill="white" stroke={secondaryColor} strokeWidth="2" />
        <rect x="40" y="35" width="60" height="45" rx="6" fill={secondaryColor} opacity="0.15" />
        <rect x="48" y="90" width="44" height="6" rx="3" fill={secondaryColor} opacity="0.4" />
        <rect x="48" y="102" width="30" height="5" rx="2" fill={secondaryColor} opacity="0.25" />
      </g>

      <g transform="rotate(5, 130, 80)">
        <rect x="100" y="35" width="60" height="80" rx="6" fill="white" stroke={secondaryColor} strokeWidth="2" />
        <rect x="100" y="35" width="60" height="45" rx="6" fill={primaryColor} opacity="0.15" />
        <rect x="108" y="90" width="44" height="6" rx="3" fill={secondaryColor} opacity="0.4" />
        <rect x="108" y="102" width="30" height="5" rx="2" fill={secondaryColor} opacity="0.25" />
      </g>

      {/* Add material hint */}
      <circle cx="100" cy="135" r="14" fill={primaryColor} opacity="0.15" />
      <path
        d="M100 129 L100 141 M94 135 L106 135"
        stroke={primaryColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * No Data Illustration - Generic empty state
 */
export function NoDataIllustration({
  className,
  primaryColor = "var(--primary)",
  secondaryColor = "var(--base-300)",
}: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-48 h-auto", className)}
    >
      {/* Empty box */}
      <path
        d="M50 55 L100 30 L150 55 L150 115 L100 140 L50 115 Z"
        fill="white"
        stroke={secondaryColor}
        strokeWidth="2"
      />
      <path
        d="M50 55 L100 80 L150 55"
        fill="none"
        stroke={secondaryColor}
        strokeWidth="2"
      />
      <path
        d="M100 80 L100 140"
        stroke={secondaryColor}
        strokeWidth="2"
      />

      {/* Box shadows/depth */}
      <path d="M50 55 L100 80 L100 140 L50 115 Z" fill={secondaryColor} opacity="0.1" />

      {/* Question mark or search indicator */}
      <circle cx="100" cy="65" r="12" fill={primaryColor} opacity="0.15" />
      <text x="100" y="70" fontSize="14" fill={primaryColor} textAnchor="middle" fontWeight="bold">?</text>
    </svg>
  );
}

/**
 * Search No Results Illustration
 */
export function SearchNoResultsIllustration({
  className,
  primaryColor = "var(--primary)",
  secondaryColor = "var(--base-300)",
}: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-48 h-auto", className)}
    >
      {/* Magnifying glass */}
      <circle cx="85" cy="70" r="35" fill="white" stroke={secondaryColor} strokeWidth="3" />
      <circle cx="85" cy="70" r="25" fill={primaryColor} opacity="0.08" />
      <line x1="110" y1="95" x2="140" y2="125" stroke={secondaryColor} strokeWidth="4" strokeLinecap="round" />

      {/* X mark inside */}
      <path
        d="M75 60 L95 80 M95 60 L75 80"
        stroke={secondaryColor}
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.5"
      />

      {/* Document hints in background */}
      <rect x="135" y="40" width="30" height="40" rx="3" fill={secondaryColor} opacity="0.15" />
      <rect x="145" y="35" width="30" height="40" rx="3" fill={secondaryColor} opacity="0.1" />
    </svg>
  );
}

// Type-safe illustration selector
export type IllustrationType =
  | "projects"
  | "scope-items"
  | "reports"
  | "milestones"
  | "drawings"
  | "materials"
  | "no-data"
  | "search";

interface EmptyStateIllustrationProps extends IllustrationProps {
  type: IllustrationType;
}

export function EmptyStateIllustration({ type, ...props }: EmptyStateIllustrationProps) {
  switch (type) {
    case "projects":
      return <NoProjectsIllustration {...props} />;
    case "scope-items":
      return <NoScopeItemsIllustration {...props} />;
    case "reports":
      return <NoReportsIllustration {...props} />;
    case "milestones":
      return <NoMilestonesIllustration {...props} />;
    case "drawings":
      return <NoDrawingsIllustration {...props} />;
    case "materials":
      return <NoMaterialsIllustration {...props} />;
    case "search":
      return <SearchNoResultsIllustration {...props} />;
    case "no-data":
    default:
      return <NoDataIllustration {...props} />;
  }
}
