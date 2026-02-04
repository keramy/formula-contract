# Formula Contract - Design Handbook

> **Version:** 1.0.0
> **Last Updated:** February 3, 2026
> **Status:** Living Document

---

## 1. Design Principles

### The Core Feeling

**"These guys are professional and they know what they are doing."**

Formula Contract should feel:

| Principle | Description | What This Means |
|-----------|-------------|-----------------|
| **Professional** | Serious business tool, not a toy | No playful animations, no flashy gradients, no gimmicks |
| **Calm** | Quiet confidence, not shouting | Muted colors, generous whitespace, subtle interactions |
| **Trustworthy** | Clients trust us with their projects | Clean data presentation, clear status indicators |
| **Organized** | Information has a clear home | Grouped content, visual hierarchy, consistent patterns |
| **Efficient** | Respects user's time | Quick to scan, easy to find, minimal clicks |

### What We Avoid

- ❌ Bright, saturated colors everywhere
- ❌ Gradients on buttons (except rare primary CTAs)
- ❌ Playful icons or illustrations
- ❌ "AI-generated" aesthetic (rainbow gradients, glass effects)
- ❌ Visual clutter or competing elements
- ❌ Animations that delay the user

### What We Embrace

- ✅ Whitespace as a design element
- ✅ Subtle borders over heavy shadows
- ✅ Muted, professional color palette
- ✅ Clear typography hierarchy
- ✅ Consistent, predictable patterns
- ✅ Information density when appropriate (tables)

---

## 2. Color System

### Philosophy

> "Color should inform, not decorate."

We use color sparingly and with purpose:
- **Primary (Teal)** - Interactive elements, links, primary actions
- **Semantic colors** - Status indicators only (success, warning, error)
- **Neutrals** - Everything else (90% of the interface)

### The Palette

#### Base Colors (Neutrals)
Our foundation. Used for backgrounds, text, borders.

```
base-50:   Background (very light)
base-100:  Card backgrounds, subtle fills
base-200:  Borders, dividers
base-300:  Disabled states, placeholder backgrounds
base-400:  Placeholder text
base-500:  Secondary text
base-600:  Body text (muted)
base-700:  Body text (default)
base-800:  Headings, emphasis
base-900:  High contrast text
```

#### Primary Colors (Teal)
Used sparingly for interactive elements.

```
primary-100:  Soft background (active states, highlights)
primary-500:  Lighter interactive (hover states)
primary-700:  Main interactive color (links, buttons)
primary-800:  Pressed/active states
```

#### Semantic Colors
Only for status communication.

| Color | Usage | Example |
|-------|-------|---------|
| **Emerald/Green** | Success, Completed, Approved | ✓ Approved, Completed status |
| **Amber/Yellow** | Warning, Pending, Attention | ⚠ On Hold, Pending approval |
| **Red/Rose** | Error, Danger, Overdue | ✗ Rejected, Overdue milestone |
| **Blue** | Info, Scheduled, Tender | ℹ Tender status, Scheduled |

### Color Rules

1. **Backgrounds should be neutral** - No colored page backgrounds
2. **Text should be base-700 or base-800** - Never pure black (#000)
3. **Borders should be base-200** - Subtle, not prominent
4. **Primary color for actions only** - Links, buttons, active states
5. **Semantic colors for status only** - Not decoration

---

## 3. Spacing System

### Philosophy

> "Generous spacing creates calm. Consistent spacing creates order."

### The Scale

We use a **4px base unit** with a consistent scale:

```
0:    0px      (none)
1:    4px      (tight)
2:    8px      (compact)
3:    12px     (default small)
4:    16px     (default)
5:    20px     (comfortable)
6:    24px     (relaxed)
8:    32px     (spacious)
10:   40px     (section gap)
12:   48px     (large section)
16:   64px     (page section)
```

### Application

| Context | Spacing | Tailwind |
|---------|---------|----------|
| Inside buttons | 8px vertical, 16px horizontal | `py-2 px-4` |
| Between form fields | 16px-24px | `gap-4` or `gap-6` |
| Card padding | 24px | `p-6` |
| Between cards | 20px-24px | `gap-5` or `gap-6` |
| Section gaps | 32px-48px | `gap-8` or `gap-12` |
| Page padding | 24px | `p-6` |

### Rules

1. **Use the scale** - Don't use arbitrary values like 13px or 27px
2. **More space = more importance** - Sections need breathing room
3. **Consistent gaps** - Same spacing between similar elements
4. **Cards are containers** - Always have internal padding (p-6)

---

## 4. Typography

### Philosophy

> "Typography creates hierarchy. Hierarchy creates clarity."

### Font Stack

```css
--font-sans: "Inter", system-ui, -apple-system, sans-serif;
```

Inter is professional, highly legible, and works well at all sizes.

### Type Scale

| Name | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| **Page Title** | 24px (text-2xl) | 600 (semibold) | 1.2 | Page headers |
| **Section Title** | 18px (text-lg) | 600 (semibold) | 1.3 | Card titles, sections |
| **Card Title** | 16px (text-base) | 600 (semibold) | 1.4 | Smaller card headers |
| **Body** | 14px (text-sm) | 400 (normal) | 1.5 | Default text |
| **Body Small** | 13px (text-[13px]) | 400 (normal) | 1.5 | Secondary info |
| **Caption** | 12px (text-xs) | 500 (medium) | 1.4 | Labels, timestamps |
| **Overline** | 11px (text-[11px]) | 500 (medium) | 1.2 | Section labels, uppercase |

### Rules

1. **Two weights maximum per page** - Regular (400) and Semibold (600)
2. **Headings are semibold, not bold** - Bold (700) is too heavy
3. **Body text is 14px** - Readable without being large
4. **Use text color for hierarchy** - base-800 for headings, base-600 for secondary
5. **Uppercase sparingly** - Only for small labels (SECTION, STATUS)

---

## 5. Shadows & Borders

### Philosophy

> "Prefer borders over shadows. When using shadows, make them subtle."

### Border System

```css
/* Default border */
border: 1px solid var(--base-200);

/* Subtle border (dividers) */
border: 1px solid var(--base-100);

/* Emphasis border (focus, active) */
border: 1px solid var(--primary-700);
```

### Shadow System

We have 3 shadow levels:

| Level | Usage | CSS |
|-------|-------|-----|
| **None** | Default cards, tables | `shadow-none` |
| **Subtle** | Elevated cards, dropdowns | `shadow-sm` |
| **Medium** | Modals, popovers | `shadow-md` |

### Rules

1. **Default to borders, not shadows** - Cards should use `border` not `shadow`
2. **Shadows indicate elevation** - Dropdowns, modals float above
3. **Never use shadow-lg or shadow-xl** - Too dramatic
4. **Borders are base-200** - Consistent, subtle

---

## 6. Component Patterns

### Cards

**Standard Card:**
```
- Background: white (bg-card)
- Border: 1px solid base-200
- Border radius: 12px (rounded-xl)
- Padding: 24px (p-6)
- Shadow: none or shadow-sm
```

**Card Sections:**
```
Header:  Border-bottom, pb-4
Content: py-0 (uses card padding)
Footer:  Border-top, pt-4
```

### Buttons

**Primary Button:**
```
- Background: primary-700
- Text: white
- Border radius: 8px (rounded-lg)
- Padding: 8px 16px
- NO gradients (solid color only)
```

**Secondary Button:**
```
- Background: transparent
- Border: 1px solid base-200
- Text: base-700
- Hover: bg-base-50
```

**Ghost Button:**
```
- Background: transparent
- Border: none
- Text: base-600
- Hover: bg-base-100
```

### Status Badges

**Shape:** Pill (fully rounded)
**Size:** Small (text-xs, px-2.5 py-0.5)
**Style:** Soft background with matching text

| Status | Background | Text |
|--------|------------|------|
| Active/Success | emerald-100 | emerald-700 |
| Pending/Warning | amber-100 | amber-700 |
| Error/Overdue | rose-100 | rose-700 |
| Info/Default | base-100 | base-600 |
| Primary | primary-100 | primary-700 |

---

## 7. Layout Patterns

### Page Structure

```
┌─────────────────────────────────────────────────┐
│ Header (h-14, border-bottom)                    │
├─────────────────────────────────────────────────┤
│                                                 │
│   Page Content (p-6)                            │
│                                                 │
│   ┌─────────────────────────────────────────┐   │
│   │ Section / Card                          │   │
│   └─────────────────────────────────────────┘   │
│                                                 │
│   gap-6 between sections                        │
│                                                 │
│   ┌─────────────────────────────────────────┐   │
│   │ Section / Card                          │   │
│   └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Sidebar Structure

```
┌──────────────────────┐
│ Logo + App Name      │
├──────────────────────┤
│                      │
│ MAIN                 │  ← Section label (uppercase, xs, muted)
│ ○ Dashboard          │
│ ○ Projects           │  ← Active: bg-primary-100, text-primary-700
│ ○ Clients            │
│                      │
│ MANAGEMENT           │
│ ○ Users              │
│ ○ Reports            │
│ ○ Settings           │
│                      │
├──────────────────────┤
│                      │
│ User Menu            │
│ Version              │
└──────────────────────┘
```

### Detail Page (Multi-Column)

```
┌─────────────────────────────────────────────────────────────┐
│ Breadcrumb: Projects > Project Name                         │
├─────────────────────────────────────────────────────────────┤
│ Page Title                              [Action Buttons]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────────────┐  ┌─────────────┐  │
│  │             │  │                     │  │             │  │
│  │   Info      │  │    Main Content     │  │   Sidebar   │  │
│  │   Panel     │  │    (Activity,       │  │   (Quick    │  │
│  │             │  │     Details)        │  │    Info)    │  │
│  │             │  │                     │  │             │  │
│  └─────────────┘  └─────────────────────┘  └─────────────┘  │
│                                                             │
│     ~250px            flex-1                 ~280px         │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Interactive States

### Hover States

| Element | Hover Effect |
|---------|--------------|
| Table row | bg-primary/5 (very subtle teal tint) |
| Card (clickable) | border-primary-200, subtle shadow |
| Button (primary) | Slightly darker (primary-800) |
| Button (secondary) | bg-base-50 |
| Link | Underline + slightly lighter color |

### Focus States

- Always visible focus ring for accessibility
- Ring color: primary-700
- Ring offset: 2px

### Active States

- Sidebar item: bg-primary-100, text-primary-700
- Tab: Border-bottom primary-700
- Toggle: bg-primary-700

---

## 9. Icons

### Philosophy

> "Icons support text, they don't replace it."

### Style

- **Lucide Icons** - Our icon library
- **Stroke width:** 1.5px (default) - Not too thick
- **Size:** 16px (size-4) for inline, 20px (size-5) for standalone

### Usage Rules

1. **Icons + text together** - Don't use icon-only buttons without tooltips
2. **Consistent sizing** - 16px in tables/lists, 20px in headers
3. **Muted by default** - Icons should be base-500 or base-600
4. **Color for meaning** - Only color icons that indicate status

---

## 10. Implementation Checklist

When building a new page/component, verify:

- [ ] Using spacing from the scale (4, 8, 12, 16, 24, 32...)
- [ ] Text colors are base-600, base-700, or base-800 (not black)
- [ ] Borders are base-200 (not gray-300 or darker)
- [ ] Cards have border, not shadow (unless elevated)
- [ ] Buttons are solid colors, not gradients
- [ ] Status badges use semantic colors only
- [ ] Generous whitespace between sections
- [ ] Typography follows the scale
- [ ] Interactive states are subtle, not dramatic

---

*This handbook is a living document. Update it as we refine the design system.*
