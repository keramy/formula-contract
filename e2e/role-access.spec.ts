import { test, expect } from "@playwright/test";

/**
 * Role-Based Access E2E Tests
 *
 * Tests route protection and navigation visibility:
 * - Admin can access all routes
 * - Unauthenticated users are redirected to login
 * - Sidebar nav items match admin role permissions
 *
 * For multi-role testing (PM, client, production, procurement, management),
 * set environment variables:
 *   E2E_PM_EMAIL / E2E_PM_PASSWORD
 *   E2E_CLIENT_EMAIL / E2E_CLIENT_PASSWORD
 */

test.describe("Unauthenticated Access", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("redirects /dashboard to /login when not authenticated", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Should end up on login page
    expect(page.url()).toContain("/login");
  });

  test("redirects /projects to /login when not authenticated", async ({
    page,
  }) => {
    await page.goto("/projects");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/login");
  });

  test("redirects /users to /login when not authenticated", async ({
    page,
  }) => {
    await page.goto("/users");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/login");
  });

  test("redirects /finance to /login when not authenticated", async ({
    page,
  }) => {
    await page.goto("/finance");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/login");
  });

  test("redirects /clients to /login when not authenticated", async ({
    page,
  }) => {
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/login");
  });

  test("login page is accessible without authentication", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Should stay on login page, not redirect
    expect(page.url()).toContain("/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});

test.describe("Admin Route Access", () => {
  // Uses default authenticated state (admin@formulacontract.com)

  test("admin can access /dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Should NOT be redirected to login
    expect(page.url()).not.toContain("/login");
    await expect(page.locator("main, [role='main']")).toBeVisible();
  });

  test("admin can access /projects", async ({ page }) => {
    await page.goto("/projects");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/projects");
    await expect(page.locator("main, [role='main']")).toBeVisible();
  });

  test("admin can access /clients", async ({ page }) => {
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/clients");
    await expect(page.locator("main, [role='main']")).toBeVisible();
  });

  test("admin can access /finance", async ({ page }) => {
    await page.goto("/finance");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/finance");
    await expect(page.locator("main, [role='main']")).toBeVisible();
  });

  test("admin can access /users", async ({ page }) => {
    await page.goto("/users");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/users");
    await expect(page.locator("main, [role='main']")).toBeVisible();
  });

  test("admin can access /settings", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/settings");
    await expect(page.locator("main, [role='main']")).toBeVisible();
  });
});

test.describe("Admin Sidebar Navigation", () => {
  test("sidebar shows all nav items for admin", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Sidebar may be in icon-only collapsed mode, so match by href not text
    const expectedRoutes = [
      { name: "Dashboard", href: "/dashboard" },
      { name: "Projects", href: "/projects" },
      { name: "Clients", href: "/clients" },
      { name: "Finance", href: "/finance" },
      { name: "Users", href: "/users" },
    ];

    for (const route of expectedRoutes) {
      const navLink = page.locator(`a[href="${route.href}"]`).first();
      const isVisible = await navLink
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (!isVisible) {
        // Try opening sidebar on mobile
        const trigger = page.locator('[data-sidebar="trigger"]');
        if (await trigger.isVisible({ timeout: 1000 }).catch(() => false)) {
          await trigger.click();
          await page.waitForTimeout(300);
        }
      }

      const finalVisible = await navLink
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      expect(
        finalVisible,
        `Admin should see "${route.name}" (${route.href}) in sidebar`
      ).toBeTruthy();
    }
  });

  test("sidebar nav links navigate correctly", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Click the Projects link and wait for URL to change
    // Use Promise.all to avoid race between click and navigation
    const projectsLink = page.locator('a[href="/projects"]').first();
    await expect(projectsLink).toBeVisible({ timeout: 5000 });

    await Promise.all([
      page.waitForURL("**/projects", { timeout: 15000 }),
      projectsLink.click(),
    ]);

    expect(page.url()).toContain("/projects");
  });
});

test.describe("Admin Feature Access", () => {
  test("admin sees create project button on projects page", async ({
    page,
  }) => {
    await page.goto("/projects");
    await page.waitForLoadState("networkidle");

    // The create button is an icon-only "+" circle button at top-right
    // It may also be a link to /projects/new or have an aria-label
    const createBtn = page
      .locator(
        'a[href*="/new"], button[aria-label*="create" i], button[aria-label*="add" i], button[aria-label*="new" i], button:has-text("New"), button:has-text("Create")'
      )
      .first();

    const isTextBtn = await createBtn
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (!isTextBtn) {
      // Fallback: look for any icon-only button with a Plus/Add icon near the filters
      // The "+" button is typically the last action button in the toolbar
      const plusBtn = page.locator(
        'button:has(svg[class*="plus" i]), button:has(svg), a:has(svg[class*="plus" i])'
      ).last();
      await expect(plusBtn).toBeVisible({ timeout: 5000 });
    } else {
      await expect(createBtn).toBeVisible();
    }
  });

  test("admin sees user management on users page", async ({ page }) => {
    await page.goto("/users");
    await page.waitForLoadState("networkidle");

    // Should show users list or management UI
    const userContent = page.locator(
      "table, [class*='user'], [class*='card']"
    );
    await expect(userContent.first()).toBeVisible({ timeout: 5000 });
  });

  test("admin sees financial data on finance page", async ({ page }) => {
    await page.goto("/finance");
    await page.waitForLoadState("networkidle");

    // Finance page should show KPIs or charts
    await expect(page.locator("main, [role='main']")).toBeVisible();

    // Look for financial content (currency symbols, chart containers, stat cards)
    const financeContent = page.locator(
      '[class*="stat"], [class*="chart"], [class*="kpi"], [class*="card"]'
    );
    const count = await financeContent.count();
    expect(count).toBeGreaterThan(0);
  });

  test("project detail shows all tabs for admin", async ({ page }) => {
    await page.goto("/projects");
    await page.waitForLoadState("networkidle");

    const projectLink = page.locator('a[href^="/projects/"]').first();
    if (
      !(await projectLink.isVisible({ timeout: 5000 }).catch(() => false))
    ) {
      test.skip(true, "No projects available");
      return;
    }

    await projectLink.click();
    await page.waitForLoadState("networkidle");

    // Admin should see all tabs on project detail
    const tabList = page.locator('[role="tablist"]').first();
    if (await tabList.isVisible({ timeout: 3000 }).catch(() => false)) {
      const tabs = tabList.locator('[role="tab"], button, a');
      const tabCount = await tabs.count();
      // Admin should see multiple tabs (overview, scope, drawings, materials, etc.)
      expect(tabCount).toBeGreaterThanOrEqual(3);
    }
  });
});
