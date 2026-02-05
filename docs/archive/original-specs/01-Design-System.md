# Formula Contract - Design System
## Document 01: Design Tokens & Styling

**Version:** 1.0  
**UI Framework:** shadcn/ui + Tailwind CSS  
**Style:** Notion-inspired (clean, minimal, whitespace)

---

## Table of Contents

1. [Color Palette](#1-color-palette)
2. [Typography](#2-typography)
3. [Spacing](#3-spacing)
4. [Border Radius](#4-border-radius)
5. [Shadows](#5-shadows)
6. [CSS Variables Setup](#6-css-variables-setup)
7. [Tailwind Config](#7-tailwind-config)
8. [Dark Mode (Disabled)](#8-dark-mode)

---

## 1. Color Palette

### Primary Colors (Brand)

| Name | Hex | RGB | Tailwind Class | Usage |
|------|-----|-----|----------------|-------|
| Primary | `#2563eb` | 37, 99, 235 | `primary` | Main actions, links, active states |
| Primary Hover | `#1d4ed8` | 29, 78, 216 | `primary/90` | Button hover |
| Primary Light | `#dbeafe` | 219, 234, 254 | `primary/10` | Backgrounds, badges |

### Neutral Colors (Notion-style)

| Name | Hex | RGB | Tailwind Class | Usage |
|------|-----|-----|----------------|-------|
| Background | `#ffffff` | 255, 255, 255 | `background` | Page background |
| Foreground | `#1f2937` | 31, 41, 55 | `foreground` | Primary text |
| Card | `#ffffff` | 255, 255, 255 | `card` | Card backgrounds |
| Card Foreground | `#1f2937` | 31, 41, 55 | `card-foreground` | Card text |
| Muted | `#f9fafb` | 249, 250, 251 | `muted` | Subtle backgrounds |
| Muted Foreground | `#6b7280` | 107, 114, 128 | `muted-foreground` | Secondary text |
| Border | `#e5e7eb` | 229, 231, 235 | `border` | All borders |
| Input | `#e5e7eb` | 229, 231, 235 | `input` | Input borders |

### Semantic Colors

| Name | Hex | RGB | Tailwind Class | Usage |
|------|-----|-----|----------------|-------|
| Success | `#10b981` | 16, 185, 129 | `success` | Approved, complete, installed |
| Success Light | `#d1fae5` | 209, 250, 229 | `success/10` | Success backgrounds |
| Warning | `#f59e0b` | 245, 158, 11 | `warning` | Pending, on hold, attention |
| Warning Light | `#fef3c7` | 254, 243, 199 | `warning/10` | Warning backgrounds |
| Destructive | `#ef4444` | 239, 68, 68 | `destructive` | Rejected, cancelled, delete |
| Destructive Light | `#fee2e2` | 254, 226, 226 | `destructive/10` | Error backgrounds |

### Status Colors (Project & Item)

| Status | Background | Text | Border |
|--------|------------|------|--------|
| Tender | `#fef3c7` | `#92400e` | `#f59e0b` |
| Active | `#dbeafe` | `#1e40af` | `#2563eb` |
| On Hold | `#f3f4f6` | `#4b5563` | `#9ca3af` |
| Completed | `#d1fae5` | `#065f46` | `#10b981` |
| Cancelled | `#fee2e2` | `#991b1b` | `#ef4444` |

### Item Path Colors

| Path | Background | Text | Border |
|------|------------|------|--------|
| Production | `#dbeafe` | `#1e40af` | `#2563eb` |
| Procurement | `#f3e8ff` | `#6b21a8` | `#9333ea` |

### Approval Status Colors

| Status | Background | Text |
|--------|------------|------|
| Pending | `#f9fafb` | `#6b7280` |
| Sent to Client | `#fef3c7` | `#92400e` |
| Approved | `#d1fae5` | `#065f46` |
| Approved with Comments | `#fef9c3` | `#854d0e` |
| Rejected | `#fee2e2` | `#991b1b` |

---

## 2. Typography

### Font Family

```css
--font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
--font-mono: "JetBrains Mono", "Fira Code", monospace;
```

**Installation:**
```bash
npm install @fontsource/inter
```

**Import in layout.tsx:**
```tsx
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
```

### Font Sizes

| Name | Size | Line Height | Weight | Tailwind Class | Usage |
|------|------|-------------|--------|----------------|-------|
| xs | 12px | 16px | 400 | `text-xs` | Captions, metadata |
| sm | 14px | 20px | 400 | `text-sm` | Secondary text, table cells |
| base | 16px | 24px | 400 | `text-base` | Body text |
| lg | 18px | 28px | 500 | `text-lg` | Subheadings |
| xl | 20px | 28px | 600 | `text-xl` | Card titles |
| 2xl | 24px | 32px | 600 | `text-2xl` | Section titles |
| 3xl | 30px | 36px | 700 | `text-3xl` | Page titles |

### Font Weights

| Name | Weight | Tailwind Class | Usage |
|------|--------|----------------|-------|
| Regular | 400 | `font-normal` | Body text |
| Medium | 500 | `font-medium` | Labels, emphasis |
| Semibold | 600 | `font-semibold` | Headings, buttons |
| Bold | 700 | `font-bold` | Page titles |

### Text Colors

| Type | Color | Tailwind Class |
|------|-------|----------------|
| Primary | `#1f2937` | `text-foreground` |
| Secondary | `#6b7280` | `text-muted-foreground` |
| Disabled | `#9ca3af` | `text-gray-400` |
| Link | `#2563eb` | `text-primary` |
| Link Hover | `#1d4ed8` | `hover:text-primary/90` |

---

## 3. Spacing

### Spacing Scale (Notion-style: generous whitespace)

| Name | Size | Tailwind | Usage |
|------|------|----------|-------|
| 0 | 0px | `p-0`, `m-0` | Reset |
| 1 | 4px | `p-1`, `m-1` | Tight spacing |
| 2 | 8px | `p-2`, `m-2` | Icon padding |
| 3 | 12px | `p-3`, `m-3` | Small gaps |
| 4 | 16px | `p-4`, `m-4` | Standard padding |
| 5 | 20px | `p-5`, `m-5` | Medium padding |
| 6 | 24px | `p-6`, `m-6` | Card padding |
| 8 | 32px | `p-8`, `m-8` | Section spacing |
| 10 | 40px | `p-10`, `m-10` | Large gaps |
| 12 | 48px | `p-12`, `m-12` | Page margins |

### Component-Specific Spacing

| Component | Padding | Gap |
|-----------|---------|-----|
| Page container | `px-6 py-6` | - |
| Card | `p-6` | - |
| Card header | `pb-4` | - |
| Button | `px-4 py-2` | `gap-2` |
| Button (sm) | `px-3 py-1.5` | `gap-1.5` |
| Input | `px-3 py-2` | - |
| Table cell | `px-4 py-3` | - |
| Badge | `px-2.5 py-0.5` | - |
| Sidebar | `p-4` | `gap-1` |
| Form fields | - | `gap-6` (vertical) |

---

## 4. Border Radius

| Name | Size | Tailwind | Usage |
|------|------|----------|-------|
| none | 0px | `rounded-none` | - |
| sm | 4px | `rounded-sm` | Badges |
| default | 6px | `rounded-md` | Inputs, buttons |
| lg | 8px | `rounded-lg` | Cards |
| xl | 12px | `rounded-xl` | Modals |
| full | 9999px | `rounded-full` | Avatars, pills |

### Component Radius

| Component | Radius |
|-----------|--------|
| Button | `rounded-md` (6px) |
| Input | `rounded-md` (6px) |
| Card | `rounded-lg` (8px) |
| Modal | `rounded-xl` (12px) |
| Badge | `rounded-sm` (4px) |
| Avatar | `rounded-full` |
| Dropdown | `rounded-md` (6px) |

---

## 5. Shadows

### Shadow Scale (Notion-style: subtle)

| Name | Value | Tailwind | Usage |
|------|-------|----------|-------|
| none | none | `shadow-none` | Default |
| sm | `0 1px 2px rgba(0,0,0,0.05)` | `shadow-sm` | Subtle elevation |
| default | `0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)` | `shadow` | Cards, dropdowns |
| md | `0 4px 6px rgba(0,0,0,0.1)` | `shadow-md` | Modals, popovers |
| lg | `0 10px 15px rgba(0,0,0,0.1)` | `shadow-lg` | Focus states |

### Component Shadows

| Component | Shadow |
|-----------|--------|
| Card | `shadow-sm` (or none with border) |
| Card Hover | `shadow` |
| Dropdown | `shadow-md` |
| Modal | `shadow-lg` |
| Sidebar | `shadow-sm` (when floating) |
| Button | none |

---

## 6. CSS Variables Setup

Create/update `app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Background & Foreground */
    --background: 0 0% 100%;
    --foreground: 220 13% 13%;
    
    /* Card */
    --card: 0 0% 100%;
    --card-foreground: 220 13% 13%;
    
    /* Popover */
    --popover: 0 0% 100%;
    --popover-foreground: 220 13% 13%;
    
    /* Primary */
    --primary: 221 83% 53%;
    --primary-foreground: 210 40% 98%;
    
    /* Secondary */
    --secondary: 220 14% 96%;
    --secondary-foreground: 220 13% 13%;
    
    /* Muted */
    --muted: 220 14% 96%;
    --muted-foreground: 220 9% 46%;
    
    /* Accent */
    --accent: 220 14% 96%;
    --accent-foreground: 220 13% 13%;
    
    /* Destructive */
    --destructive: 0 84% 60%;
    --destructive-foreground: 210 40% 98%;
    
    /* Border & Input */
    --border: 220 13% 91%;
    --input: 220 13% 91%;
    --ring: 221 83% 53%;
    
    /* Radius */
    --radius: 0.5rem;
    
    /* Custom Colors */
    --success: 160 84% 39%;
    --success-foreground: 210 40% 98%;
    --warning: 38 92% 50%;
    --warning-foreground: 220 13% 13%;
    
    /* Sidebar (shadcn dashboard) */
    --sidebar-background: 0 0% 100%;
    --sidebar-foreground: 220 13% 13%;
    --sidebar-primary: 221 83% 53%;
    --sidebar-primary-foreground: 210 40% 98%;
    --sidebar-accent: 220 14% 96%;
    --sidebar-accent-foreground: 220 13% 13%;
    --sidebar-border: 220 13% 91%;
    --sidebar-ring: 221 83% 53%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}

/* Notion-style: Remove focus rings, use subtle indicators */
@layer components {
  .focus-ring {
    @apply focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2;
  }
  
  .link {
    @apply text-primary hover:text-primary/80 underline-offset-4 hover:underline;
  }
}
```

---

## 7. Tailwind Config

Create/update `tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

---

## 8. Dark Mode

**Status: DISABLED for MVP**

Dark mode is intentionally disabled to speed up development. The design system is structured to support it later.

To enable later:
1. Add dark mode values to CSS variables in `globals.css`
2. Ensure `darkMode: ["class"]` in Tailwind config
3. Add theme toggle component

---

## Usage Examples

### Status Badge
```tsx
// Approved status
<Badge className="bg-[#d1fae5] text-[#065f46] border-[#10b981]">
  Approved
</Badge>

// Pending status
<Badge className="bg-[#f9fafb] text-[#6b7280] border-[#e5e7eb]">
  Pending
</Badge>
```

### Path Badge
```tsx
// Production path
<Badge className="bg-[#dbeafe] text-[#1e40af]">
  Production
</Badge>

// Procurement path
<Badge className="bg-[#f3e8ff] text-[#6b21a8]">
  Procurement
</Badge>
```

### Card with Notion-style
```tsx
<Card className="shadow-sm hover:shadow transition-shadow">
  <CardHeader className="pb-4">
    <CardTitle className="text-xl font-semibold">Title</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

---

## Next Document

→ Continue to [02-Component-Library.md](./02-Component-Library.md) for component specifications.
