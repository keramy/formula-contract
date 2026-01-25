/**
 * Shared Tailwind configuration for all email templates
 *
 * Brand colors and styling consistent with the Formula Contract app
 */
import type { TailwindConfig } from "@react-email/tailwind";

export const emailTailwindConfig = {
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#7c3aed", // Violet-600
          secondary: "#a855f7", // Purple-500
          dark: "#5b21b6", // Violet-800
          light: "#f5f3ff", // Violet-50
          border: "#ddd6fe", // Violet-200
        },
        text: {
          primary: "#111827", // Gray-900
          secondary: "#374151", // Gray-700
          muted: "#6b7280", // Gray-500
          light: "#9ca3af", // Gray-400
        },
        background: {
          page: "#f3f4f6", // Gray-100
          card: "#ffffff",
          highlight: "#f9fafb", // Gray-50
        },
        status: {
          success: "#059669", // Emerald-600
          warning: "#d97706", // Amber-600
          error: "#dc2626", // Red-600
          info: "#0284c7", // Sky-600
        },
      },
      fontFamily: {
        sans: [
          "Segoe UI",
          "Tahoma",
          "Geneva",
          "Verdana",
          "sans-serif",
        ],
      },
    },
  },
} satisfies TailwindConfig;
