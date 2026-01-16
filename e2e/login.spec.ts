import { test, expect } from "@playwright/test";

/**
 * Login Page E2E Tests
 *
 * Tests the login flow including:
 * - Form validation
 * - Error handling
 * - Successful login redirect
 * - UI elements and accessibility
 */

test.describe("Login Page", () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session for login tests
    await page.context().clearCookies();
    await page.goto("/login");
  });

  test("displays login form correctly", async ({ page }) => {
    // Check page title/heading
    await expect(page.locator("h1, h2").first()).toBeVisible();

    // Check form elements exist
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Check forgot password link
    await expect(page.locator('a[href*="forgot"]')).toBeVisible();
  });

  test("shows validation error for empty fields", async ({ page }) => {
    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Should show validation error or HTML5 validation
    const emailInput = page.locator('input[type="email"]');
    const isInvalid = await emailInput.evaluate(
      (el) => !(el as HTMLInputElement).validity.valid
    );
    expect(isInvalid).toBe(true);
  });

  test("shows error for invalid credentials", async ({ page }) => {
    // Enter invalid credentials
    await page.fill('input[type="email"]', "invalid@test.com");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    // Wait for error message - look for toast or specific error container
    // The app uses sonner for toasts
    await expect(
      page.locator('[data-sonner-toast], [class*="toast"], .text-destructive, [role="status"]').first()
    ).toBeVisible({ timeout: 15000 });
  });

  test("successfully logs in with valid credentials", async ({ page }) => {
    // Enter valid credentials
    await page.fill('input[type="email"]', "admin@formulacontract.com");
    await page.fill('input[type="password"]', "Admin123!");
    await page.click('button[type="submit"]');

    // Should redirect away from login page
    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 30000,
    });

    // Verify we're on an authenticated page
    expect(page.url()).not.toContain("/login");
  });

  test("password field masks input", async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill("testpassword");

    // Verify it's still type="password" (masked)
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("forgot password link navigates correctly", async ({ page }) => {
    await page.click('a[href*="forgot"]');
    await expect(page).toHaveURL(/forgot/);
  });
});
