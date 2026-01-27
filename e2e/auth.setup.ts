import { test as setup, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

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
 * - Avoids rate limiting by reusing existing valid sessions
 */

const authFile = path.join(__dirname, "../.auth/user.json");

// Test credentials - in production, use environment variables
const TEST_EMAIL = process.env.E2E_TEST_EMAIL || "admin@formulacontract.com";
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || "Admin123!";

// Check if existing auth file has valid (non-expired) session
function hasValidAuthFile(): boolean {
  try {
    if (!fs.existsSync(authFile)) return false;

    const authData = JSON.parse(fs.readFileSync(authFile, "utf-8"));

    // Check if cookies exist
    if (!authData.cookies || authData.cookies.length === 0) return false;

    // Check if session cookie exists and hasn't expired
    const sessionCookie = authData.cookies.find((c: { name: string }) =>
      c.name.includes("auth-token")
    );

    if (!sessionCookie) return false;

    // If cookie has expiry, check if it's still valid (with 5 min buffer)
    if (sessionCookie.expires && sessionCookie.expires !== -1) {
      const expiryTime = sessionCookie.expires * 1000; // Convert to ms
      const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
      if (Date.now() > expiryTime - bufferTime) return false;
    }

    return true;
  } catch {
    return false;
  }
}

// Increase timeout for auth setup (rate limiting may require waiting)
setup.setTimeout(120000); // 2 minutes

setup("authenticate", async ({ page, context }) => {
  // Check if we already have a valid session
  if (hasValidAuthFile()) {
    console.log("📁 Found existing valid auth file, verifying session...");

    // Load the existing state and verify it works
    await context.addCookies(
      JSON.parse(fs.readFileSync(authFile, "utf-8")).cookies
    );

    // Navigate to dashboard to verify session is valid
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // If we're not redirected to login, session is valid
    if (!page.url().includes("/login")) {
      console.log("✅ Existing session is valid, skipping login");
      // Re-save the state (refreshes the file timestamp)
      await page.context().storageState({ path: authFile });
      return;
    }

    console.log("⚠️ Existing session expired, performing fresh login...");
  }

  // Navigate to login page
  await page.goto("/login");

  // Wait for the login form to be visible
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });

  // Check for rate limiting message
  const pageContent = await page.content();
  if (pageContent.toLowerCase().includes("too many requests")) {
    // Extract wait time if possible
    const match = pageContent.match(/try again in (\d+)/i);
    const waitTime = match ? parseInt(match[1]) : 5;
    console.log(`⏳ Rate limited - waiting ${waitTime} minutes...`);
    console.log(
      "💡 Tip: Run tests less frequently or increase rate limit on Supabase"
    );

    // Wait for rate limit to clear (convert minutes to ms)
    await page.waitForTimeout(waitTime * 60 * 1000 + 5000);

    // Reload the page
    await page.reload();
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  }

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
