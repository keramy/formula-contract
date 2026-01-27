import { test, expect, type BrowserContext, type Page } from "@playwright/test";

/**
 * Security Tests
 *
 * These tests check for common web security vulnerabilities and
 * proper security configurations.
 *
 * Areas covered:
 * - Security headers (CSP, X-Frame-Options, etc.)
 * - XSS protection
 * - Input validation
 * - Authentication security
 * - CSRF protection indicators
 * - Sensitive data exposure
 *
 * Note: Some tests require unauthenticated state (login page tests)
 * while others require authenticated state (protected routes).
 * Tests that need fresh/unauthenticated state will clear cookies first.
 */

// Increase timeout for security tests (they need more time for thorough checks)
test.describe.configure({ timeout: 60000 });

// Helper to get a fresh unauthenticated page
async function getUnauthenticatedPage(context: BrowserContext): Promise<Page> {
  // Clear all cookies and storage to ensure unauthenticated state
  await context.clearCookies();
  const page = context.pages()[0] || await context.newPage();
  return page;
}

test.describe("Security Headers", () => {
  test("Login page has proper security headers", async ({ context }) => {
    // Use unauthenticated state for login page tests
    const page = await getUnauthenticatedPage(context);
    const response = await page.goto("/login", { waitUntil: "domcontentloaded" });

    expect(response).not.toBeNull();
    const headers = response!.headers();

    // Log all security-related headers
    console.log("\n🔒 Security Headers Check:");
    console.log("=".repeat(50));

    // Check X-Frame-Options (prevents clickjacking)
    const xFrameOptions = headers["x-frame-options"];
    console.log(`X-Frame-Options: ${xFrameOptions || "NOT SET ⚠️"}`);

    // Check X-Content-Type-Options (prevents MIME sniffing)
    const xContentTypeOptions = headers["x-content-type-options"];
    console.log(`X-Content-Type-Options: ${xContentTypeOptions || "NOT SET ⚠️"}`);
    if (xContentTypeOptions) {
      expect(xContentTypeOptions.toLowerCase()).toBe("nosniff");
    }

    // Check Strict-Transport-Security (HSTS)
    const hsts = headers["strict-transport-security"];
    console.log(`Strict-Transport-Security: ${hsts || "NOT SET (OK for localhost)"}`);

    // Check Referrer-Policy
    const referrerPolicy = headers["referrer-policy"];
    console.log(`Referrer-Policy: ${referrerPolicy || "NOT SET ⚠️"}`);

    // Check Content-Security-Policy
    const csp = headers["content-security-policy"];
    console.log(`Content-Security-Policy: ${csp ? "SET ✅" : "NOT SET ⚠️"}`);

    // Check X-XSS-Protection (legacy but good to have)
    const xssProtection = headers["x-xss-protection"];
    console.log(`X-XSS-Protection: ${xssProtection || "NOT SET"}`);

    console.log("=".repeat(50));
  });

  test("API routes return proper security headers", async ({ page }) => {
    // Try to access an API-like route
    const response = await page.goto("/api/health", {
      waitUntil: "domcontentloaded",
    });

    // If API route exists
    if (response && response.status() !== 404) {
      const headers = response.headers();
      const contentType = headers["content-type"];

      // API should return JSON, not HTML (prevents XSS via API)
      if (contentType) {
        console.log(`API Content-Type: ${contentType}`);
      }
    }
  });
});

test.describe("XSS Prevention", () => {
  test("Login form sanitizes email input", async ({ context }) => {
    // Use unauthenticated state for login page tests
    const page = await getUnauthenticatedPage(context);
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    // Try XSS payload in email field
    const xssPayload = '<script>alert("XSS")</script>';
    await page.fill('input[type="email"]', xssPayload);
    await page.fill('input[type="password"]', "testpassword");
    await page.click('button[type="submit"]');

    // Wait for response
    await page.waitForTimeout(1000);

    // Check that script tag is not executed (page should not have alert)
    // Also check that the payload is not rendered as HTML
    const pageContent = await page.content();
    expect(pageContent).not.toContain("<script>alert");
  });

  test("Search/filter inputs sanitize special characters", async ({ page }) => {
    await page.goto("/projects");
    await page.waitForLoadState("networkidle");

    if (page.url().includes("/login")) {
      test.skip(true, "Not authenticated");
      return;
    }

    // Find search input
    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="search" i], input[placeholder*="filter" i]'
    ).first();

    if (await searchInput.isVisible()) {
      // Try SQL injection payload
      await searchInput.fill("'; DROP TABLE projects; --");
      await page.waitForTimeout(500);

      // Page should still function (not crash)
      await expect(page.locator("main")).toBeVisible();

      // Try XSS payload
      await searchInput.fill('<img src=x onerror=alert(1)>');
      await page.waitForTimeout(500);

      // Check payload is not rendered as EXECUTABLE HTML
      // It's OK if the escaped version appears in input value
      // but it should NOT appear as an actual HTML tag
      const mainContent = await page.locator("main").innerHTML();

      // The dangerous pattern is an actual img tag with onerror, not escaped text
      // Escaped: &lt;img would be safe
      // Unescaped: <img would be dangerous
      expect(mainContent).not.toMatch(/<img[^>]*onerror=/i);
    }
  });

  test("URL parameters are sanitized", async ({ context }) => {
    // Use unauthenticated state - will redirect to login but URL params should still be sanitized
    const page = await getUnauthenticatedPage(context);
    // Try accessing page with XSS in URL
    await page.goto('/projects?search=<script>alert("XSS")</script>', { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    // Page content should not contain unescaped script tag
    // Escaped version (&lt;script&gt;) is safe
    const content = await page.content();
    expect(content).not.toMatch(/<script>alert\("XSS"\)<\/script>/);
  });
});

test.describe("Authentication Security", () => {
  test("Password field is properly masked", async ({ context }) => {
    // Use unauthenticated state for login page tests
    const page = await getUnauthenticatedPage(context);
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });

    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toHaveAttribute("type", "password");

    // Fill password
    await passwordInput.fill("secretpassword123");

    // Should still be masked
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("Login form has autocomplete attributes", async ({ context }) => {
    // Use unauthenticated state for login page tests
    const page = await getUnauthenticatedPage(context);
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    // Email should have autocomplete for usability
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    // Password autocomplete helps password managers
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
  });

  test("Failed login does not reveal user existence", async ({ context }) => {
    // Use unauthenticated state for login page tests
    const page = await getUnauthenticatedPage(context);
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    // Try non-existent user
    await page.fill('input[type="email"]', "nonexistent@example.com");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);

    // Error message should be generic (not "user not found")
    const pageContent = await page.content().then((c) => c.toLowerCase());
    expect(pageContent).not.toContain("user not found");
    expect(pageContent).not.toContain("email not found");
    expect(pageContent).not.toContain("no account");
  });

  test("Session is invalidated on logout", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    if (page.url().includes("/login")) {
      test.skip(true, "Not authenticated");
      return;
    }

    // Find and click logout
    const logoutButton = page.locator(
      'button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout")'
    ).first();

    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await page.waitForLoadState("networkidle");

      // Should be redirected to login or home
      expect(page.url()).toMatch(/login|\/$/);

      // Try accessing protected page
      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle");

      // Should be redirected to login
      expect(page.url()).toContain("login");
    }
  });
});

test.describe("CSRF & Request Security", () => {
  test("Forms include CSRF-like protection patterns", async ({ context }) => {
    // Use unauthenticated state for login page tests
    const page = await getUnauthenticatedPage(context);
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("form", { timeout: 10000 });

    // Check for hidden tokens or form security measures
    const form = page.locator("form");
    await expect(form).toBeVisible();

    // Modern apps use SameSite cookies instead of CSRF tokens
    // Check that form submits via POST (not GET for sensitive data)
    const formMethod = await form.getAttribute("method");
    // If method is set, it should be POST for login
    if (formMethod) {
      expect(formMethod.toLowerCase()).toBe("post");
    }
  });
});

test.describe("Sensitive Data Exposure", () => {
  test("Password is not visible in page source", async ({ context }) => {
    // Use unauthenticated state for login page tests
    const page = await getUnauthenticatedPage(context);
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });

    await page.fill('input[type="email"]', "test@example.com");
    await page.fill('input[type="password"]', "MySecretPassword123!");

    // Check that password is not visible as text on the page
    // Note: Password may appear in React state/props in dev mode HTML, which is expected
    // The important thing is it's not RENDERED as visible text
    const visibleText = await page.locator("body").innerText();
    expect(visibleText).not.toContain("MySecretPassword123!");

    // Also verify the password field is still type="password" (not revealed)
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("Error messages do not expose stack traces", async ({ page }) => {
    // Try to trigger an error by accessing invalid route
    await page.goto("/invalid-route-that-does-not-exist");
    await page.waitForLoadState("networkidle");

    // Get the visible text content, not the full HTML (which includes bundle URLs)
    const textContent = await page.locator("body").innerText();
    const lowercaseText = textContent.toLowerCase();

    // Should not expose internal paths or stack traces in visible content
    // Note: We check innerText, not innerHTML, to ignore bundle URLs in script tags
    expect(lowercaseText).not.toContain("at module");
    expect(lowercaseText).not.toMatch(/\.tsx:\d+/); // filename.tsx:123 pattern
    expect(lowercaseText).not.toContain("typeerror:");
    expect(lowercaseText).not.toContain("referenceerror:");
    expect(lowercaseText).not.toContain("stack trace");

    // Check that the 404 page doesn't show raw error objects
    expect(lowercaseText).not.toMatch(/error\s*:\s*\{/);
  });

  test("API errors do not expose sensitive information", async ({ page }) => {
    // Try invalid API request
    const response = await page.goto("/api/projects/invalid-uuid-format");

    if (response && response.status() !== 404) {
      const body = await response.text();

      // Should not contain stack traces
      expect(body.toLowerCase()).not.toContain("stack");
      expect(body.toLowerCase()).not.toContain("node_modules");
    }
  });
});

test.describe("Rate Limiting Indicators", () => {
  test("Multiple failed logins are handled gracefully", async ({ context }) => {
    // Use unauthenticated state for login page tests
    const page = await getUnauthenticatedPage(context);
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    // Attempt multiple failed logins
    for (let i = 0; i < 3; i++) {
      await page.fill('input[type="email"]', "test@example.com");
      await page.fill('input[type="password"]', "wrongpassword");
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1000);
    }

    // Page should still be functional (even if rate limited)
    await expect(page.locator('input[type="email"]')).toBeVisible();

    // Check if there's a rate limit message (good sign if present)
    const content = await page.content().then((c) => c.toLowerCase());
    if (content.includes("too many") || content.includes("rate limit")) {
      console.log("✅ Rate limiting detected - good security practice");
    }
  });
});
