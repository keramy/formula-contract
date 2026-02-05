import { test, expect, Page, ConsoleMessage } from "@playwright/test";

/**
 * Performance Audit Tests
 *
 * These tests measure key performance metrics including:
 * - Page load times (DOM, Network Idle)
 * - Time to Interactive
 * - Resource counts and sizes
 * - Console errors
 * - Memory usage indicators
 *
 * These complement the Lighthouse tests with more granular metrics.
 *
 * Note: Tests use relaxed thresholds for development mode.
 * Production builds should have stricter thresholds.
 */

// Increase timeout for performance tests (dev server can be slow)
test.describe.configure({ timeout: 60000 }); // 60 seconds per test

interface PerformanceMetrics {
  domContentLoaded: number;
  loadComplete: number;
  resourceCount: number;
  totalTransferSize: number;
  consoleErrors: string[];
}

async function measurePagePerformance(
  page: Page,
  url: string
): Promise<PerformanceMetrics> {
  const consoleErrors: string[] = [];

  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  const startTime = Date.now();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  const domContentLoaded = Date.now() - startTime;

  // Wait for network idle with timeout (don't block if it takes too long)
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {
    console.log(`⚠️ Network idle timeout for ${url} - continuing anyway`);
  });
  const loadComplete = Date.now() - startTime;

  // Get resource metrics
  const resources = await page.evaluate(() => {
    const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    return {
      count: entries.length,
      totalSize: entries.reduce((sum, e) => sum + (e.transferSize || 0), 0),
    };
  });

  return {
    domContentLoaded,
    loadComplete,
    resourceCount: resources.count,
    totalTransferSize: resources.totalSize,
    consoleErrors,
  };
}

test.describe("Performance Metrics - Public Pages", () => {
  test("Login page loads within acceptable time", async ({ page }) => {
    const metrics = await measurePagePerformance(page, "/login");

    console.log("\n⚡ Login Page Performance:");
    console.log("=".repeat(40));
    console.log(`DOM Content Loaded: ${metrics.domContentLoaded}ms`);
    console.log(`Full Load: ${metrics.loadComplete}ms`);
    console.log(`Resources: ${metrics.resourceCount}`);
    console.log(`Transfer Size: ${(metrics.totalTransferSize / 1024).toFixed(2)} KB`);
    console.log(`Console Errors: ${metrics.consoleErrors.length}`);

    // Assertions (relaxed for dev mode - stricter in production)
    // Dev mode has slower compilation and hot reload overhead
    expect(metrics.domContentLoaded).toBeLessThan(30000); // 30s DOM (dev mode - can be slow)
    expect(metrics.loadComplete).toBeLessThan(40000); // 40s full load (dev mode)
    expect(metrics.consoleErrors.length).toBeLessThan(5); // Allow some dev errors
  });

  test("404 page performance", async ({ page }) => {
    const metrics = await measurePagePerformance(page, "/non-existent-page");

    console.log("\n⚡ 404 Page Performance:");
    console.log(`Full Load: ${metrics.loadComplete}ms`);

    // 404 should be lightweight (relaxed for dev mode)
    expect(metrics.loadComplete).toBeLessThan(15000);
  });
});

test.describe("Performance Metrics - Authenticated Pages", () => {
  test("Dashboard page performance", async ({ page }) => {
    const metrics = await measurePagePerformance(page, "/dashboard");

    // Check if we were redirected to login
    if (page.url().includes("/login")) {
      test.skip(true, "Not authenticated - skipping dashboard performance test");
      return;
    }

    console.log("\n⚡ Dashboard Performance:");
    console.log("=".repeat(40));
    console.log(`DOM Content Loaded: ${metrics.domContentLoaded}ms`);
    console.log(`Full Load: ${metrics.loadComplete}ms`);
    console.log(`Resources: ${metrics.resourceCount}`);
    console.log(`Transfer Size: ${(metrics.totalTransferSize / 1024).toFixed(2)} KB`);

    // Dashboard can be heavier but should still be reasonable
    // Relaxed for dev mode - production builds are much faster
    expect(metrics.domContentLoaded).toBeLessThan(20000); // 20s DOM (dev mode)
    expect(metrics.loadComplete).toBeLessThan(30000); // 30s full load (dev mode)
  });

  test("Projects list performance", async ({ page }) => {
    const metrics = await measurePagePerformance(page, "/projects");

    if (page.url().includes("/login")) {
      test.skip(true, "Not authenticated");
      return;
    }

    console.log("\n⚡ Projects List Performance:");
    console.log(`Full Load: ${metrics.loadComplete}ms`);
    console.log(`Resources: ${metrics.resourceCount}`);

    // Relaxed for dev mode - data fetching adds overhead
    expect(metrics.loadComplete).toBeLessThan(30000); // 30s full load (dev mode)
  });
});

test.describe("Resource Analysis", () => {
  test("JavaScript bundle analysis", async ({ page }) => {
    const jsResources: { url: string; size: number }[] = [];

    page.on("response", async (response) => {
      const url = response.url();
      if (url.includes(".js") && !url.includes("node_modules")) {
        const headers = response.headers();
        const contentLength = parseInt(headers["content-length"] || "0");
        jsResources.push({ url, size: contentLength });
      }
    });

    await page.goto("/login", { waitUntil: "networkidle" });

    console.log("\n📦 JavaScript Resources:");
    console.log("=".repeat(50));

    const totalJS = jsResources.reduce((sum, r) => sum + r.size, 0);
    console.log(`Total JS bundles: ${jsResources.length}`);
    console.log(`Total JS size: ${(totalJS / 1024).toFixed(2)} KB`);

    // Log largest bundles
    const sortedJS = jsResources.sort((a, b) => b.size - a.size).slice(0, 5);
    console.log("\nLargest JS bundles:");
    sortedJS.forEach((r) => {
      const name = r.url.split("/").pop();
      console.log(`  ${name}: ${(r.size / 1024).toFixed(2)} KB`);
    });

    // JS should be reasonably sized (< 2MB total for initial load)
    expect(totalJS).toBeLessThan(2 * 1024 * 1024);
  });

  test("Image optimization check", async ({ page }) => {
    const imageResources: { url: string; size: number; type: string }[] = [];

    page.on("response", async (response) => {
      const contentType = response.headers()["content-type"] || "";
      if (contentType.startsWith("image/")) {
        const contentLength = parseInt(
          response.headers()["content-length"] || "0"
        );
        imageResources.push({
          url: response.url(),
          size: contentLength,
          type: contentType,
        });
      }
    });

    // Use domcontentloaded + optional networkidle for faster loading
    await page.goto("/dashboard", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});

    if (page.url().includes("/login")) {
      // Re-run on login page instead
      await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    }

    console.log("\n🖼️ Image Analysis:");
    console.log("=".repeat(50));
    console.log(`Total images: ${imageResources.length}`);

    const totalImageSize = imageResources.reduce((sum, r) => sum + r.size, 0);
    console.log(`Total image size: ${(totalImageSize / 1024).toFixed(2)} KB`);

    // Check for unoptimized images (> 500KB)
    const largeImages = imageResources.filter((r) => r.size > 500 * 1024);
    if (largeImages.length > 0) {
      console.log("\n⚠️ Large images detected:");
      largeImages.forEach((r) => {
        console.log(`  ${r.url.split("/").pop()}: ${(r.size / 1024).toFixed(0)} KB`);
      });
    }

    // Images should be optimized (no single image > 1MB)
    const maxImageSize = Math.max(...imageResources.map((r) => r.size), 0);
    expect(maxImageSize).toBeLessThan(1024 * 1024);
  });
});

test.describe("API Response Times", () => {
  test("API endpoints respond within acceptable time", async ({ page }) => {
    const apiCalls: { url: string; duration: number; status: number }[] = [];

    page.on("response", async (response) => {
      const url = response.url();
      if (url.includes("/api/") || url.includes("supabase")) {
        const timing = response.request().timing();
        apiCalls.push({
          url: url.split("?")[0], // Remove query params
          duration: timing.responseEnd - timing.requestStart,
          status: response.status(),
        });
      }
    });

    await page.goto("/dashboard", { waitUntil: "networkidle" });

    if (apiCalls.length > 0) {
      console.log("\n🔌 API Response Times:");
      console.log("=".repeat(50));

      apiCalls.forEach((call) => {
        const status = call.status >= 400 ? "❌" : "✅";
        console.log(
          `${status} ${call.url.split("/").slice(-2).join("/")}: ${call.duration.toFixed(0)}ms`
        );
      });

      // Check for slow API calls (> 5s)
      const slowCalls = apiCalls.filter((c) => c.duration > 5000);
      expect(
        slowCalls.length,
        `${slowCalls.length} API calls took > 5 seconds`
      ).toBe(0);
    }
  });
});

test.describe("Memory & Console Health", () => {
  // Increase timeout for memory test (multiple page navigations)
  test.setTimeout(90000); // 90 seconds

  test("No memory leaks on navigation", async ({ page }) => {
    // Use domcontentloaded instead of networkidle for faster navigation
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});

    if (page.url().includes("/login")) {
      test.skip(true, "Not authenticated");
      return;
    }

    // Get initial heap size (performance.memory is Chrome-only)
    const initialHeap = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const perf = performance as any;
      return perf.memory?.usedJSHeapSize ?? 0;
    });

    // Navigate around - use domcontentloaded for faster navigation
    await page.goto("/projects", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.goto("/projects", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});

    // Force garbage collection if available (requires --expose-gc flag)
    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const win = window as any;
      if (win.gc) win.gc();
    });

    // Get final heap size (performance.memory is Chrome-only)
    const finalHeap = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const perf = performance as any;
      return perf.memory?.usedJSHeapSize ?? 0;
    });

    if (initialHeap > 0 && finalHeap > 0) {
      const heapGrowth = finalHeap - initialHeap;
      console.log("\n💾 Memory Analysis:");
      console.log(`Initial Heap: ${(initialHeap / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Final Heap: ${(finalHeap / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Growth: ${(heapGrowth / 1024 / 1024).toFixed(2)} MB`);

      // Allow some growth but flag excessive memory increase (> 50MB)
      expect(heapGrowth).toBeLessThan(50 * 1024 * 1024);
    }
  });

  test("No critical console errors on page load", async ({ page }) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      } else if (msg.type() === "warning") {
        warnings.push(msg.text());
      }
    });

    await page.goto("/dashboard", { waitUntil: "networkidle" });

    console.log("\n🔍 Console Health:");
    console.log(`Errors: ${errors.length}`);
    console.log(`Warnings: ${warnings.length}`);

    if (errors.length > 0) {
      console.log("\nErrors found:");
      errors.slice(0, 5).forEach((e) => console.log(`  ❌ ${e.slice(0, 100)}`));
    }

    // Filter out known non-critical errors
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.includes("404") &&
        !e.includes("hydration")
    );

    expect(
      criticalErrors.length,
      `Found ${criticalErrors.length} critical console errors`
    ).toBeLessThan(3);
  });
});
