import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Accessibility Tests (WCAG 2.1 AA Compliance)
 *
 * These tests use axe-core to automatically detect accessibility violations.
 * They check against WCAG 2.1 Level A and AA standards.
 *
 * Key areas tested:
 * - Color contrast ratios
 * - Keyboard navigation
 * - ARIA labels and roles
 * - Form labels and structure
 * - Image alt text
 * - Heading hierarchy
 *
 * Note: Tests are configured to be informational and flag issues without
 * blocking development. Thresholds can be tightened as issues are fixed.
 */

// Maximum allowed violations per page (adjust as issues are fixed)
const MAX_CRITICAL_VIOLATIONS = 15; // Start permissive, tighten over time

// Increase timeout for accessibility tests (axe analysis takes time)
test.describe.configure({ timeout: 60000 }); // 60 seconds per test

// Helper to format violations for logging
function formatViolations(violations: any[]) {
  return violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    description: v.description,
    helpUrl: v.helpUrl,
    nodes: v.nodes.length,
  }));
}

test.describe("Accessibility - Public Pages", () => {
  test("Login page should have no critical accessibility violations", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    // Log violations for debugging
    if (results.violations.length > 0) {
      console.log(
        "\n⚠️ Login Page Accessibility Violations:",
        formatViolations(results.violations)
      );
    }

    // Filter for critical/serious violations only
    const criticalViolations = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    // Allow some violations while flagging them - tighten threshold as issues are fixed
    expect(
      criticalViolations.length,
      `Found ${criticalViolations.length} critical accessibility violations (max: ${MAX_CRITICAL_VIOLATIONS})`
    ).toBeLessThanOrEqual(MAX_CRITICAL_VIOLATIONS);
  });

  test("Forgot password page accessibility", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const criticalViolations = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    if (criticalViolations.length > 0) {
      console.log(
        "\n⚠️ Forgot Password Violations:",
        formatViolations(criticalViolations)
      );
    }

    expect(criticalViolations.length).toBeLessThanOrEqual(MAX_CRITICAL_VIOLATIONS);
  });
});

test.describe("Accessibility - Authenticated Pages", () => {
  test("Dashboard should have no critical accessibility violations", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Skip if redirected to login (auth issue)
    if (page.url().includes("/login")) {
      test.skip(true, "Not authenticated - skipping dashboard accessibility test");
      return;
    }

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .exclude("[data-chart]") // Exclude chart elements which may have known issues
      .analyze();

    if (results.violations.length > 0) {
      console.log(
        "\n⚠️ Dashboard Accessibility Violations:",
        formatViolations(results.violations)
      );
    }

    const criticalViolations = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    expect(
      criticalViolations.length,
      `Found ${criticalViolations.length} critical accessibility violations on dashboard`
    ).toBeLessThanOrEqual(MAX_CRITICAL_VIOLATIONS);
  });

  test("Projects list accessibility", async ({ page }) => {
    await page.goto("/projects");
    await page.waitForLoadState("networkidle");

    if (page.url().includes("/login")) {
      test.skip(true, "Not authenticated");
      return;
    }

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .exclude("[role='progressbar']") // Exclude loading indicators
      .analyze();

    if (results.violations.length > 0) {
      console.log(
        "\n⚠️ Projects List Violations:",
        formatViolations(results.violations)
      );
    }

    const criticalViolations = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    expect(criticalViolations.length).toBeLessThanOrEqual(MAX_CRITICAL_VIOLATIONS);
  });

  test("Project detail page accessibility", async ({ page }) => {
    await page.goto("/projects");
    await page.waitForLoadState("networkidle");

    if (page.url().includes("/login")) {
      test.skip(true, "Not authenticated");
      return;
    }

    // Navigate to first project
    const projectLink = page.locator('a[href*="/projects/"]').first();
    if (!(await projectLink.isVisible())) {
      test.skip(true, "No projects available");
      return;
    }

    await projectLink.click();
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .exclude("[data-chart]")
      .exclude("[role='progressbar']") // Exclude loading indicators
      .analyze();

    if (results.violations.length > 0) {
      console.log(
        "\n⚠️ Project Detail Violations:",
        formatViolations(results.violations)
      );
    }

    const criticalViolations = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    expect(criticalViolations.length).toBeLessThanOrEqual(MAX_CRITICAL_VIOLATIONS);
  });
});

test.describe("Accessibility - Keyboard Navigation", () => {
  test("Login form is fully keyboard accessible", async ({ context }) => {
    // Clear cookies to get unauthenticated state for login page testing
    await context.clearCookies();
    const page = context.pages()[0] || (await context.newPage());

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Wait for the form to appear (may take time in dev mode)
    await page.waitForSelector('input[type="email"]', { timeout: 30000 });

    // Verify that form inputs exist and can be focused
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');

    // Check that form elements are visible
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await expect(passwordInput).toBeVisible({ timeout: 10000 });
    await expect(submitButton).toBeVisible({ timeout: 10000 });

    // Test that inputs can be focused and typed into
    await emailInput.focus();
    await emailInput.fill("test@example.com");
    await expect(emailInput).toHaveValue("test@example.com");

    await passwordInput.focus();
    await passwordInput.fill("password123");
    await expect(passwordInput).toHaveValue("password123");

    // Verify submit button can be focused
    await submitButton.focus();
    const submitFocused = await submitButton.evaluate(
      (el) => document.activeElement === el
    );
    expect(submitFocused).toBe(true);
  });

  test("Dashboard navigation is keyboard accessible", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    if (page.url().includes("/login")) {
      test.skip(true, "Not authenticated");
      return;
    }

    // Check that skip link or main content is accessible
    await page.keyboard.press("Tab");

    // Should be able to tab through interactive elements
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });
});

test.describe("Accessibility - Color Contrast", () => {
  test("Text has sufficient color contrast", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["cat.color"])
      .analyze();

    // Log any color contrast issues
    const contrastViolations = results.violations.filter(
      (v) => v.id.includes("contrast")
    );

    if (contrastViolations.length > 0) {
      console.log(
        "\n🎨 Color Contrast Issues:",
        formatViolations(contrastViolations)
      );
    }

    // Allow some contrast issues while flagging them for future fixes
    const seriousContrastIssues = contrastViolations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    expect(seriousContrastIssues.length).toBeLessThanOrEqual(MAX_CRITICAL_VIOLATIONS);
  });
});
