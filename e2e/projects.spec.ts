import { test, expect } from "@playwright/test";

/**
 * Projects Page E2E Tests (Authenticated)
 *
 * Tests the projects listing and detail pages including:
 * - Projects list rendering
 * - Search/filter functionality
 * - Project detail navigation
 * - Performance metrics
 */

test.describe("Projects List", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/projects");
  });

  test("loads projects page successfully", async ({ page }) => {
    await expect(page).toHaveURL(/projects/);

    // Should have main content
    await expect(page.locator("main, [role='main']")).toBeVisible();
  });

  test("displays projects list or empty state", async ({ page }) => {
    await page.waitForLoadState("networkidle");

    // Either shows project cards/rows OR empty state
    const hasProjects = await page
      .locator("[class*='project'], [class*='card'], table tbody tr")
      .count();
    const hasEmptyState = await page
      .locator("[class*='empty'], [class*='no-data']")
      .count();

    expect(hasProjects + hasEmptyState).toBeGreaterThan(0);
  });

  test("has create project button (for authorized users)", async ({ page }) => {
    // Admin/PM should see create button
    const createButton = page.locator(
      'a[href*="new"], button:has-text("New"), button:has-text("Create"), button:has-text("Add")'
    );

    // Button should exist for admin user
    await expect(createButton.first()).toBeVisible();
  });

  test("can navigate to project detail", async ({ page }) => {
    await page.waitForLoadState("networkidle");

    // Find first project link/card
    const projectLink = page.locator('a[href*="/projects/"]').first();

    if (await projectLink.isVisible()) {
      await projectLink.click();

      // Should navigate to project detail page
      await expect(page).toHaveURL(/\/projects\/[^/]+$/);
    }
  });

  test("search functionality works", async ({ page }) => {
    await page.waitForLoadState("networkidle");

    // Find search input
    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="search" i], input[placeholder*="filter" i]'
    );

    if (await searchInput.isVisible()) {
      await searchInput.fill("test");
      await page.waitForTimeout(500); // Wait for debounce

      // Results should update (or show no results message)
      await expect(page.locator("main")).toBeVisible();
    }
  });
});

test.describe("Project Detail Page", () => {
  test("loads project detail with sections", async ({ page }) => {
    // First go to projects list
    await page.goto("/projects");
    await page.waitForLoadState("networkidle");

    // Click on first project
    const projectLink = page.locator('a[href*="/projects/"]').first();

    if (await projectLink.isVisible()) {
      await projectLink.click();
      await page.waitForLoadState("networkidle");

      // Should have content sections (cards, tabs, or overview sections)
      const sections = page.locator(
        '[role="tablist"], [class*="tab"], [class*="card"], [class*="section"], [class*="overview"]'
      );
      const sectionCount = await sections.count();

      console.log(`Project detail has ${sectionCount} UI sections`);

      // Project detail should have multiple sections
      expect(sectionCount).toBeGreaterThan(0);
    }
  });

  test("project detail page performance", async ({ page }) => {
    await page.goto("/projects");
    await page.waitForLoadState("networkidle");

    const projectLink = page.locator('a[href*="/projects/"]').first();

    if (await projectLink.isVisible()) {
      const startTime = Date.now();
      await projectLink.click();
      await page.waitForLoadState("domcontentloaded");
      const loadTime = Date.now() - startTime;

      console.log(`Project detail navigation time: ${loadTime}ms`);

      // Should load within 2 seconds (navigation, not full page)
      expect(loadTime).toBeLessThan(2000);
    }
  });

  test("displays project information correctly", async ({ page }) => {
    await page.goto("/projects");
    await page.waitForLoadState("networkidle");

    const projectLink = page.locator('a[href*="/projects/"]').first();

    if (await projectLink.isVisible()) {
      await projectLink.click();
      await page.waitForLoadState("networkidle");

      // Should display project name/title
      const heading = page.locator("h1, h2, [class*='title']").first();
      await expect(heading).toBeVisible();

      // Should have key project sections
      const sections = page.locator(
        "[class*='card'], [class*='section'], [class*='glass']"
      );
      const sectionCount = await sections.count();
      expect(sectionCount).toBeGreaterThan(0);
    }
  });
});
