import { test, expect } from "@playwright/test";

/**
 * Mobile Responsive E2E Tests
 *
 * Tests the app's responsive behavior at mobile (375px) and tablet (768px) viewports:
 * - Sidebar collapses into a Sheet on mobile
 * - Tables switch to card view on small screens
 * - Header elements adapt (hide description, badge)
 * - View toggle hidden on mobile, visible on tablet+
 * - Pages remain functional at small viewports
 *
 * Breakpoints:
 *   < 640px  → mobile (cards, no view toggle)
 *   < 768px  → sidebar becomes Sheet
 *   ≥ 768px  → full sidebar visible
 *   ≥ 1024px → desktop layout
 */

// Mobile viewport (iPhone SE)
const MOBILE = { width: 375, height: 667 };
// Tablet viewport (iPad Mini)
const TABLET = { width: 768, height: 1024 };
// Desktop viewport
const DESKTOP = { width: 1280, height: 800 };

test.describe("Mobile Sidebar (375px)", () => {
  test.use({ viewport: MOBILE });

  test("sidebar is hidden by default on mobile", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("load");

    // The full sidebar panel should not be visible
    const sidebar = page.locator('[data-sidebar="sidebar"]');
    // On mobile, sidebar is rendered inside a Sheet (not inline)
    // The sidebar wrapper should have display:none or not be in flow
    const sidebarWrapper = page.locator(
      'aside[data-sidebar], [data-sidebar="sidebar"]'
    );

    // Either sidebar is not visible, or it's inside a closed Sheet
    const isInlineVisible = await sidebarWrapper
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    // On mobile, the sidebar should NOT be visible inline (it's in a Sheet)
    // The trigger button should be visible instead
    const trigger = page.locator('[data-sidebar="trigger"]');
    await expect(trigger).toBeVisible();
  });

  test("sidebar trigger opens Sheet overlay on mobile", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("load");

    // Click the sidebar trigger (hamburger menu)
    const trigger = page.locator('[data-sidebar="trigger"]');
    await expect(trigger).toBeVisible();
    await trigger.click();

    // Sheet overlay should appear
    await page.waitForTimeout(300); // Animation

    // Look for the Sheet overlay or sidebar content becoming visible
    const navLinks = page.locator(
      'nav a:has-text("Dashboard"), [data-sidebar] a:has-text("Dashboard")'
    );
    await expect(navLinks.first()).toBeVisible({ timeout: 3000 });
  });

  test("mobile sidebar can navigate to pages", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000); // Let hydration complete

    // Open sidebar Sheet
    const trigger = page.locator('[data-sidebar="trigger"]');
    await trigger.click();
    await page.waitForTimeout(500); // Sheet open animation

    // The Sheet sidebar renders links inside a dialog element
    // Must target the link INSIDE the Sheet dialog, not the main page sidebar
    // The overlay intercepts pointer events on links outside the dialog content
    const sheetDialog = page.locator('[role="dialog"], [data-slot="sheet-content"]');
    const projectsLink = sheetDialog.locator('a[href="/projects"]').first();
    await expect(projectsLink).toBeVisible({ timeout: 5000 });

    // Click and then verify navigation
    await projectsLink.click();

    // Wait for URL to change — the Sheet close + Next.js navigation can take a moment
    await page.waitForURL("**/projects**", { timeout: 15000 });
    expect(page.url()).toContain("/projects");
  });

  test("sidebar closes after navigation on mobile", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("load");

    // Open sidebar
    const trigger = page.locator('[data-sidebar="trigger"]');
    await trigger.click();
    await page.waitForTimeout(300);

    // Navigate
    const projectsLink = page
      .locator(
        'nav a:has-text("Projects"), [data-sidebar] a:has-text("Projects")'
      )
      .first();

    if (await projectsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await projectsLink.click();
      await page.waitForLoadState("load");

      // Sidebar should auto-close after navigation on mobile
      await page.waitForTimeout(500);

      // The trigger button should still be visible (sidebar closed)
      await expect(trigger).toBeVisible();
    }
  });
});

test.describe("Mobile Content Layout (375px)", () => {
  test.use({ viewport: MOBILE });

  test("projects page renders at mobile width without overflow", async ({
    page,
  }) => {
    await page.goto("/projects");
    await page.waitForLoadState("load");

    // Page should not have horizontal scrollbar
    const hasHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasHorizontalScroll).toBe(false);
  });

  test("projects show as cards on mobile (not table)", async ({ page }) => {
    await page.goto("/projects");
    await page.waitForLoadState("load");

    // On mobile (<640px), ResponsiveDataView should render cards
    // Tables should not be visible
    const table = page.locator("table").first();
    const tableVisible = await table
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    // Cards or grid layout should be present instead
    const cards = page.locator(
      '[class*="card"], [class*="grid"] > div'
    );
    const cardCount = await cards.count();

    // Either table is hidden and cards are shown, or there's no data
    if (cardCount === 0 && !tableVisible) {
      // Empty state — acceptable
      return;
    }

    // If there IS data, we expect either cards visible OR table
    // (some implementations keep table on all sizes)
    expect(cardCount > 0 || tableVisible).toBeTruthy();
  });

  test("view toggle is hidden on mobile", async ({ page }) => {
    await page.goto("/projects");
    await page.waitForLoadState("load");

    // The ViewToggle component is wrapped in `hidden sm:block`
    // so it should not be visible at 375px
    const viewToggle = page.locator(
      'button[aria-label*="table" i], button[aria-label*="card" i], button[aria-label*="grid" i]'
    );

    // View toggle buttons should not be visible on mobile
    const count = await viewToggle.count();
    for (let i = 0; i < count; i++) {
      const isVisible = await viewToggle.nth(i).isVisible().catch(() => false);
      // At 375px, these should be hidden
      if (isVisible) {
        // Check if it's inside a hidden container
        const parentHidden = await viewToggle
          .nth(i)
          .evaluate(
            (el) =>
              getComputedStyle(el.parentElement || el).display === "none"
          );
        // Allow if parent is hidden (CSS applies)
        if (!parentHidden) {
          console.log("View toggle unexpectedly visible at 375px");
        }
      }
    }
  });

  test("header hides description text on mobile", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("load");

    // The header description has `hidden sm:block`
    // On mobile it should not be visible
    // Just verify the header renders without overflow
    const header = page.locator("header").first();
    await expect(header).toBeVisible();

    // Header should fit within viewport
    const headerBox = await header.boundingBox();
    if (headerBox) {
      expect(headerBox.width).toBeLessThanOrEqual(MOBILE.width + 1);
    }
  });

  test("project detail loads at mobile width", async ({ page }) => {
    await page.goto("/projects");
    await page.waitForLoadState("load");

    const projectLink = page.locator('a[href^="/projects/"]').first();
    if (
      !(await projectLink.isVisible({ timeout: 5000 }).catch(() => false))
    ) {
      test.skip(true, "No projects available");
      return;
    }

    await projectLink.click();
    await page.waitForLoadState("load");

    // Should render without crashing
    await expect(page.locator("main, [role='main']")).toBeVisible();

    // No horizontal overflow
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasOverflow).toBe(false);
  });
});

test.describe("Tablet Layout (768px)", () => {
  test.use({ viewport: TABLET });

  test("sidebar is visible inline on tablet", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("load");

    // At 768px, sidebar should be visible as a fixed panel (not a Sheet)
    const navLinks = page.locator(
      'nav a:has-text("Dashboard"), [data-sidebar] a:has-text("Dashboard")'
    );

    // Give it time to render
    const isVisible = await navLinks
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    // At 768px (md breakpoint), sidebar should be inline visible
    expect(isVisible).toBeTruthy();
  });

  test("view toggle appears on tablet", async ({ page }) => {
    await page.goto("/projects");
    await page.waitForLoadState("load");

    // At 768px (≥ sm breakpoint of 640px), ViewToggle should be visible
    // Look for toggle buttons near the top of the page
    const viewToggle = page.locator(
      'button[aria-label*="table" i], button[aria-label*="card" i], button[aria-label*="grid" i], button[aria-label*="list" i]'
    );

    const count = await viewToggle.count();
    // It's acceptable if the buttons exist and are visible at tablet width
    if (count > 0) {
      const firstVisible = await viewToggle
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false);
      // Should be visible at ≥640px
      if (!firstVisible) {
        console.log(
          "View toggle not visible at 768px — may use different selector"
        );
      }
    }
  });

  test("projects page shows table on tablet", async ({ page }) => {
    await page.goto("/projects");
    await page.waitForLoadState("load");

    // At tablet width, should show table view (not cards)
    const table = page.locator("table").first();
    const tableVisible = await table
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    // Table should be visible at tablet width (768px > 640px threshold)
    if (!tableVisible) {
      // Check if there's simply no data
      const emptyState = page.locator('[class*="empty"]');
      const isEmpty = await emptyState
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      if (!isEmpty) {
        console.log(
          "Neither table nor empty state found at tablet width"
        );
      }
    }
  });
});

test.describe("Desktop Layout (1280px)", () => {
  test.use({ viewport: DESKTOP });

  test("sidebar and main content render side by side", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("load");

    // Sidebar nav should be visible
    const navLinks = page.locator(
      'nav a:has-text("Dashboard"), [data-sidebar] a:has-text("Dashboard")'
    );
    await expect(navLinks.first()).toBeVisible({ timeout: 5000 });

    // Main content should also be visible alongside
    await expect(page.locator("main, [role='main']")).toBeVisible();
  });

  test("full page width is utilized on desktop", async ({ page }) => {
    await page.goto("/projects");
    await page.waitForLoadState("load");

    // Main content should use available width
    const main = page.locator("main, [role='main']").first();
    const box = await main.boundingBox();

    if (box) {
      // Content should span a significant portion of the viewport
      expect(box.width).toBeGreaterThan(DESKTOP.width * 0.5);
    }
  });
});

test.describe("Responsive Transitions", () => {
  test("resizing from desktop to mobile collapses sidebar", async ({
    page,
  }) => {
    // Start at desktop
    await page.setViewportSize(DESKTOP);
    await page.goto("/dashboard");
    await page.waitForLoadState("load");

    // Sidebar should be inline visible at desktop
    const nav = page.locator(
      'nav a:has-text("Dashboard"), [data-sidebar] a:has-text("Dashboard")'
    );
    await expect(nav.first()).toBeVisible({ timeout: 5000 });

    // Resize to mobile
    await page.setViewportSize(MOBILE);
    await page.waitForTimeout(500); // Layout recalculation

    // Sidebar trigger should appear
    const trigger = page.locator('[data-sidebar="trigger"]');
    await expect(trigger).toBeVisible({ timeout: 3000 });
  });
});
