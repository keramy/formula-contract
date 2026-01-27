import { defineConfig, devices } from "@playwright/test";
import path from "path";

/**
 * Playwright Configuration for Formula Contract
 *
 * Test Structure:
 * 1. setup - Authenticates once and saves session
 * 2. chromium - Runs authenticated tests using saved session
 * 3. accessibility - Runs accessibility audits with axe-core
 * 4. security - Runs security tests
 * 5. lighthouse - Runs performance audits (separate project)
 *
 * Usage:
 * - npm run test:e2e           - Run all E2E tests
 * - npm run test:e2e:ui        - Run with Playwright UI
 * - npm run test:accessibility - Run only accessibility tests
 * - npm run test:security      - Run only security tests
 * - npm run lighthouse         - Run only Lighthouse audits
 */

const authFile = path.join(__dirname, ".auth/user.json");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["list"],
    // JSON reporter for CI integration
    ...(process.env.CI ? [["json", { outputFile: "test-results.json" }] as const] : []),
  ],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },
  projects: [
    // Setup project - runs first to authenticate
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    // Main functional tests - uses authenticated state
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: authFile,
      },
      dependencies: ["setup"],
      testMatch: /^(?!.*lighthouse).*\.spec\.ts$/,
      testIgnore: /.*\.setup\.ts/,
    },
    // Accessibility tests - uses authenticated state
    {
      name: "accessibility",
      use: {
        ...devices["Desktop Chrome"],
        storageState: authFile,
      },
      dependencies: ["setup"],
      testMatch: /accessibility\.spec\.ts/,
    },
    // Security tests - some tests need auth, some don't
    {
      name: "security",
      use: {
        ...devices["Desktop Chrome"],
        storageState: authFile,
      },
      dependencies: ["setup"],
      testMatch: /security\.spec\.ts/,
    },
    // Performance audit tests
    {
      name: "performance",
      use: {
        ...devices["Desktop Chrome"],
        storageState: authFile,
      },
      dependencies: ["setup"],
      testMatch: /performance-audit\.spec\.ts/,
    },
    // Lighthouse audits - separate project (uses its own browser instance)
    {
      name: "lighthouse",
      testMatch: /.*lighthouse.*\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
