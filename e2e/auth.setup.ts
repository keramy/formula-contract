import { test as setup, expect } from "@playwright/test";
import path from "path";

/**
 * Authentication Setup for E2E Tests
 *
 * This file runs BEFORE all other tests and saves the authenticated
 * session state to a file. Other tests can then reuse this state
 * to skip the login process.
 *
 * Benefits:
 * - Tests run faster (no repeated logins)
 * - More realistic testing of authenticated pages
 * - Session state is cached between test runs
 */

const authFile = path.join(__dirname, "../.auth/user.json");

// Test credentials - in production, use environment variables
const TEST_EMAIL = process.env.E2E_TEST_EMAIL || "admin@formulacontract.com";
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || "Admin123!";

setup("authenticate", async ({ page }) => {
  // Navigate to login page
  await page.goto("/login");

  // Wait for the login form to be visible
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });

  // Fill in credentials
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);

  // Click login button
  await page.click('button[type="submit"]');

  // Wait for navigation to dashboard or any authenticated page
  // The app might redirect to /dashboard or stay on current page
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 30000,
  });

  // Verify we're logged in by checking for authenticated UI elements
  // This could be a user menu, logout button, or dashboard content
  await expect(page.locator("body")).not.toContainText("Sign in");

  // Save the authenticated state
  await page.context().storageState({ path: authFile });

  console.log("✅ Authentication successful, session saved to", authFile);
});
