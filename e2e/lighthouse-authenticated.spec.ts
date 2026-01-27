import { test } from "@playwright/test";
import { playAudit } from "playwright-lighthouse";
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

/**
 * Lighthouse Performance Audits for Authenticated Pages
 *
 * These tests run Lighthouse audits on pages that require authentication.
 * We load the saved auth state and then run the audits.
 *
 * Key pages tested:
 * - Dashboard (main landing page after login)
 * - Projects list
 * - Project detail (if projects exist)
 */

const AUTH_FILE = path.join(__dirname, "../.auth/user.json");

// Check if auth file exists
const hasAuthState = () => {
  try {
    return fs.existsSync(AUTH_FILE);
  } catch {
    return false;
  }
};

test.describe("Lighthouse - Authenticated Pages", () => {
  test.setTimeout(180000); // 3 minutes per test

  test.skip(!hasAuthState(), "Skipping - no auth state available");

  test("Dashboard performance audit", async () => {
    const browser = await chromium.launch({
      args: ["--remote-debugging-port=9224"],
    });

    const context = await browser.newContext({
      storageState: AUTH_FILE,
    });

    const page = await context.newPage();

    // Navigate to dashboard
    await page.goto("http://localhost:3000/dashboard", {
      waitUntil: "networkidle",
    });

    // Verify we're on dashboard (not redirected to login)
    if (page.url().includes("login")) {
      console.log("⚠️ Redirected to login - auth state may be expired");
      await browser.close();
      return;
    }

    const result = await playAudit({
      page,
      port: 9224,
      thresholds: {
        performance: 40,
        accessibility: 70,
        "best-practices": 70,
        seo: 60,
      },
      reports: {
        formats: { html: true, json: true },
        name: "dashboard-authenticated",
        directory: "./lighthouse-reports",
      },
    });

    console.log("\n📊 Dashboard (Authenticated) Lighthouse Results:");
    console.log("=================================================");
    console.log(`Performance: ${(result.lhr.categories.performance?.score ?? 0) * 100}`);
    console.log(`Accessibility: ${(result.lhr.categories.accessibility?.score ?? 0) * 100}`);
    console.log(`Best Practices: ${(result.lhr.categories["best-practices"]?.score ?? 0) * 100}`);
    console.log(`SEO: ${(result.lhr.categories.seo?.score ?? 0) * 100}`);

    // Core Web Vitals
    const audits = result.lhr.audits;
    console.log("\n⚡ Core Web Vitals:");
    console.log(`First Contentful Paint: ${audits["first-contentful-paint"]?.displayValue || "N/A"}`);
    console.log(`Largest Contentful Paint: ${audits["largest-contentful-paint"]?.displayValue || "N/A"}`);
    console.log(`Total Blocking Time: ${audits["total-blocking-time"]?.displayValue || "N/A"}`);
    console.log(`Cumulative Layout Shift: ${audits["cumulative-layout-shift"]?.displayValue || "N/A"}`);
    console.log(`Speed Index: ${audits["speed-index"]?.displayValue || "N/A"}`);

    await browser.close();
  });

  test("Projects list performance audit", async () => {
    const browser = await chromium.launch({
      args: ["--remote-debugging-port=9225"],
    });

    const context = await browser.newContext({
      storageState: AUTH_FILE,
    });

    const page = await context.newPage();

    await page.goto("http://localhost:3000/projects", {
      waitUntil: "networkidle",
    });

    if (page.url().includes("login")) {
      console.log("⚠️ Redirected to login - auth state may be expired");
      await browser.close();
      return;
    }

    const result = await playAudit({
      page,
      port: 9225,
      thresholds: {
        performance: 40,
        accessibility: 70,
        "best-practices": 70,
        seo: 60,
      },
      reports: {
        formats: { html: true, json: true },
        name: "projects-list",
        directory: "./lighthouse-reports",
      },
    });

    console.log("\n📊 Projects List Lighthouse Results:");
    console.log("=====================================");
    console.log(`Performance: ${(result.lhr.categories.performance?.score ?? 0) * 100}`);
    console.log(`Accessibility: ${(result.lhr.categories.accessibility?.score ?? 0) * 100}`);
    console.log(`Best Practices: ${(result.lhr.categories["best-practices"]?.score ?? 0) * 100}`);
    console.log(`SEO: ${(result.lhr.categories.seo?.score ?? 0) * 100}`);

    const audits = result.lhr.audits;
    console.log("\n⚡ Core Web Vitals:");
    console.log(`First Contentful Paint: ${audits["first-contentful-paint"]?.displayValue || "N/A"}`);
    console.log(`Largest Contentful Paint: ${audits["largest-contentful-paint"]?.displayValue || "N/A"}`);
    console.log(`Total Blocking Time: ${audits["total-blocking-time"]?.displayValue || "N/A"}`);

    await browser.close();
  });

  test("Project detail page performance audit", async () => {
    const browser = await chromium.launch({
      args: ["--remote-debugging-port=9226"],
    });

    const context = await browser.newContext({
      storageState: AUTH_FILE,
    });

    const page = await context.newPage();

    // First get a project ID from the projects list
    await page.goto("http://localhost:3000/projects", {
      waitUntil: "networkidle",
    });

    if (page.url().includes("login")) {
      console.log("⚠️ Redirected to login - auth state may be expired");
      await browser.close();
      return;
    }

    // Find first project link
    const projectLink = page.locator('a[href*="/projects/"]').first();

    if (!(await projectLink.isVisible())) {
      console.log("⚠️ No projects found - skipping project detail audit");
      await browser.close();
      return;
    }

    // Navigate to project detail
    await projectLink.click();
    await page.waitForLoadState("networkidle");

    const result = await playAudit({
      page,
      port: 9226,
      thresholds: {
        performance: 30, // Lower threshold for complex page
        accessibility: 70,
        "best-practices": 70,
        seo: 50,
      },
      reports: {
        formats: { html: true, json: true },
        name: "project-detail",
        directory: "./lighthouse-reports",
      },
    });

    console.log("\n📊 Project Detail Page Lighthouse Results:");
    console.log("==========================================");
    console.log(`Performance: ${(result.lhr.categories.performance?.score ?? 0) * 100}`);
    console.log(`Accessibility: ${(result.lhr.categories.accessibility?.score ?? 0) * 100}`);
    console.log(`Best Practices: ${(result.lhr.categories["best-practices"]?.score ?? 0) * 100}`);
    console.log(`SEO: ${(result.lhr.categories.seo?.score ?? 0) * 100}`);

    const audits = result.lhr.audits;
    console.log("\n⚡ Core Web Vitals:");
    console.log(`First Contentful Paint: ${audits["first-contentful-paint"]?.displayValue || "N/A"}`);
    console.log(`Largest Contentful Paint: ${audits["largest-contentful-paint"]?.displayValue || "N/A"}`);
    console.log(`Total Blocking Time: ${audits["total-blocking-time"]?.displayValue || "N/A"}`);
    console.log(`Cumulative Layout Shift: ${audits["cumulative-layout-shift"]?.displayValue || "N/A"}`);

    // This is the critical page - log bundle size info
    console.log("\n📦 Bundle Analysis:");
    console.log(`Total Size: ${audits["total-byte-weight"]?.displayValue || "N/A"}`);
    console.log(`Unused JS: ${audits["unused-javascript"]?.displayValue || "N/A"}`);
    console.log(`Unused CSS: ${audits["unused-css-rules"]?.displayValue || "N/A"}`);

    await browser.close();
  });
});
