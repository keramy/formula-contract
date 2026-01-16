import { test } from "@playwright/test";
import { playAudit } from "playwright-lighthouse";
import { chromium } from "playwright";

/**
 * Lighthouse Performance Audit Tests
 *
 * These tests measure Core Web Vitals and performance metrics
 * for key pages in the Formula Contract application.
 *
 * Metrics tracked:
 * - Performance: Overall performance score
 * - First Contentful Paint (FCP): When first content appears
 * - Largest Contentful Paint (LCP): When main content loads
 * - Total Blocking Time (TBT): How long page is unresponsive
 * - Cumulative Layout Shift (CLS): Visual stability
 */

// Thresholds for performance metrics (0-100 scale)
const THRESHOLDS = {
  performance: 50, // Target: 80+, starting with baseline
  accessibility: 70,
  "best-practices": 70,
  seo: 70,
};

test.describe("Lighthouse Performance Audits", () => {
  test.setTimeout(120000); // 2 minutes per test

  test("Login page performance", async () => {
    // Launch browser with remote debugging enabled (required for Lighthouse)
    const browser = await chromium.launch({
      args: ["--remote-debugging-port=9222"],
    });

    const page = await browser.newPage();
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });

    // Run Lighthouse audit
    const result = await playAudit({
      page,
      port: 9222,
      thresholds: THRESHOLDS,
      reports: {
        formats: { html: true, json: true },
        name: "login-page",
        directory: "./lighthouse-reports",
      },
    });

    console.log("\n📊 Login Page Lighthouse Results:");
    console.log("==================================");
    console.log(`Performance: ${result.lhr.categories.performance.score * 100}`);
    console.log(`Accessibility: ${result.lhr.categories.accessibility.score * 100}`);
    console.log(`Best Practices: ${result.lhr.categories["best-practices"].score * 100}`);
    console.log(`SEO: ${result.lhr.categories.seo.score * 100}`);

    // Log Core Web Vitals
    const audits = result.lhr.audits;
    console.log("\n⚡ Core Web Vitals:");
    console.log(`First Contentful Paint: ${audits["first-contentful-paint"]?.displayValue || "N/A"}`);
    console.log(`Largest Contentful Paint: ${audits["largest-contentful-paint"]?.displayValue || "N/A"}`);
    console.log(`Total Blocking Time: ${audits["total-blocking-time"]?.displayValue || "N/A"}`);
    console.log(`Cumulative Layout Shift: ${audits["cumulative-layout-shift"]?.displayValue || "N/A"}`);
    console.log(`Speed Index: ${audits["speed-index"]?.displayValue || "N/A"}`);

    await browser.close();
  });

  test("Dashboard page performance (requires auth mock)", async () => {
    // Note: This test would require authentication
    // For now, we test the public login page
    // In production, you'd use saved auth state

    const browser = await chromium.launch({
      args: ["--remote-debugging-port=9223"],
    });

    const page = await browser.newPage();

    // Try to access dashboard (will redirect to login if not authenticated)
    await page.goto("http://localhost:3000/dashboard", { waitUntil: "networkidle" });

    const result = await playAudit({
      page,
      port: 9223,
      thresholds: {
        performance: 40, // Lower threshold since redirect might affect it
        accessibility: 60,
        "best-practices": 60,
        seo: 50,
      },
      reports: {
        formats: { html: true, json: true },
        name: "dashboard-page",
        directory: "./lighthouse-reports",
      },
    });

    console.log("\n📊 Dashboard/Login Redirect Lighthouse Results:");
    console.log("================================================");
    console.log(`Performance: ${result.lhr.categories.performance.score * 100}`);
    console.log(`Accessibility: ${result.lhr.categories.accessibility.score * 100}`);
    console.log(`Best Practices: ${result.lhr.categories["best-practices"].score * 100}`);
    console.log(`SEO: ${result.lhr.categories.seo.score * 100}`);

    await browser.close();
  });
});
