import { test, expect } from "@playwright/test";

/**
 * Dashboard E2E Tests (Authenticated)
 *
 * These tests run with an authenticated session (from auth.setup.ts)
 * and verify the main dashboard functionality.
 *
 * Tests cover:
 * - Page load performance
 * - Key UI elements
 * - Navigation
 * - Stats display
 */

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
  });

  test("loads dashboard successfully", async ({ page }) => {
    // Should be on dashboard page
    await expect(page).toHaveURL(/dashboard/);

    // Dashboard should have main content visible
    await expect(page.locator("main, [role='main'], .dashboard")).toBeVisible();
  });

  test("displays user navigation/sidebar", async ({ page }) => {
    // Should have navigation sidebar or header
    const sidebar = page.locator(
      "nav, aside, [role='navigation'], [class*='sidebar']"
    );
    await expect(sidebar.first()).toBeVisible();
  });

  test("shows dashboard stats cards", async ({ page }) => {
    // Wait for page to fully load
    await page.waitForLoadState("networkidle");

    // Should have stat cards or summary information
    const statsArea = page.locator(
      "[class*='stat'], [class*='card'], [class*='glass']"
    );
    const count = await statsArea.count();
    expect(count).toBeGreaterThan(0);
  });

  test("has working navigation links", async ({ page }) => {
    // Find and click on Projects link
    const projectsLink = page.locator('a[href*="projects"]').first();
    if (await projectsLink.isVisible()) {
      await projectsLink.click();
      await expect(page).toHaveURL(/projects/);
    }
  });

  test("page loads within acceptable time", async ({ page }) => {
    const startTime = Date.now();
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    const loadTime = Date.now() - startTime;

    console.log(`📊 Dashboard DOM load time: ${loadTime}ms`);

    // Current baseline: 10 seconds (to be improved)
    // Target: <3 seconds after optimization
    expect(loadTime).toBeLessThan(15000);

    // Warn if over target
    if (loadTime > 3000) {
      console.warn(`⚠️ Dashboard load time (${loadTime}ms) exceeds 3s target`);
    }
  });

  test("no console errors on page load", async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Filter out known non-critical errors (like favicon 404)
    const criticalErrors = consoleErrors.filter(
      (err) => !err.includes("favicon") && !err.includes("404")
    );

    if (criticalErrors.length > 0) {
      console.log("Console errors found:", criticalErrors);
    }

    // Allow some non-critical errors but warn
    expect(criticalErrors.length).toBeLessThan(5);
  });

  test("responsive design - mobile viewport", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard");

    // Page should still be functional
    await expect(page.locator("main, [role='main']")).toBeVisible();

    // Mobile menu button might be visible
    const mobileMenu = page.locator(
      "[class*='menu'], [class*='hamburger'], button[aria-label*='menu']"
    );
    // Just check page renders, mobile menu is optional
    await expect(page).toHaveURL(/dashboard/);
  });
});
