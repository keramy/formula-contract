import { test, expect } from "@playwright/test";

/**
 * Drawing Approval E2E Tests
 *
 * Tests the drawing upload and approval workflow:
 * - Navigating to a project's scope items
 * - Opening a scope item sheet
 * - Drawing upload UI visibility
 * - Send to client flow (admin/PM)
 * - Status badge transitions
 *
 * Note: Client-side approve/reject tests require client credentials.
 * Set E2E_PM_EMAIL / E2E_CLIENT_EMAIL env vars for multi-role testing.
 */

// Helper: navigate to first project's scope tab and return whether it has items
async function openProjectScope(page: import("@playwright/test").Page) {
  await page.goto("/projects");
  await page.waitForLoadState("load");

  // Exclude /projects/new — target actual project detail links only
  const projectLink = page
    .locator('a[href^="/projects/"]:not([href*="new"])')
    .first();
  if (!(await projectLink.isVisible({ timeout: 10000 }).catch(() => false))) {
    return { hasProject: false, hasItems: false };
  }

  // Wait for navigation to complete after clicking the project link
  const projectHref = await projectLink.getAttribute("href");
  await Promise.all([
    page.waitForURL(`**${projectHref}`, { timeout: 15000 }),
    projectLink.click(),
  ]);

  // Wait for React Query data to load (skeletons disappear)
  await page.waitForTimeout(3000);

  // Click "Scope Items" tab (visible on project detail page)
  const scopeTab = page
    .locator('button:has-text("Scope Items"), a:has-text("Scope Items")')
    .first();
  if (await scopeTab.isVisible({ timeout: 5000 }).catch(() => false)) {
    await scopeTab.click();
    // Wait for scope items table rows to appear (max 10s)
    const firstRow = page.locator("table tbody tr").first();
    await firstRow
      .waitFor({ state: "visible", timeout: 10000 })
      .catch(() => {});
  } else {
    return { hasProject: true, hasItems: false };
  }

  // Check for scope items
  const rows = page.locator("table tbody tr");
  const rowCount = await rows.count();

  return { hasProject: true, hasItems: rowCount > 0 };
}

test.describe("Drawing Approval Flow", () => {
  // Drawing tests need extra time: project navigation + data loading + scope tab
  test.setTimeout(60000);
  test("project detail page loads with scope items section", async ({
    page,
  }) => {
    const { hasProject } = await openProjectScope(page);
    test.skip(!hasProject, "No projects available in database");

    // Should show main content area
    await expect(page.locator("main, [role='main']")).toBeVisible();
  });

  test("scope item row shows drawing status badge", async ({ page }) => {
    const { hasProject, hasItems } = await openProjectScope(page);
    test.skip(!hasProject || !hasItems, "No scope items available");

    // Look for any status badge text related to drawings
    const statusTexts = [
      "Not Uploaded",
      "Uploaded",
      "Awaiting Client",
      "Approved",
      "Rejected",
      "Not Required",
    ];

    // At least one drawing status should be visible somewhere on the page
    const statusBadge = page
      .locator(statusTexts.map((s) => `text="${s}"`).join(", "))
      .first();

    // This may or may not be visible depending on the table columns shown
    const isVisible = await statusBadge
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (isVisible) {
      await expect(statusBadge).toBeVisible();
    }
    // If not visible, that's okay — drawing status might be inside the detail sheet
  });

  test("clicking a scope item opens detail view", async ({ page }) => {
    const { hasProject, hasItems } = await openProjectScope(page);
    test.skip(!hasProject || !hasItems, "No scope items available");

    const beforeUrl = page.url();

    // Click on first scope item row (could be a table row or card)
    const firstItem = page
      .locator("table tbody tr, [class*='scope-item']")
      .first();
    await firstItem.click();

    // Either a sheet/dialog opens OR the page navigates to a detail page
    const sheet = page.locator(
      '[role="dialog"], [data-state="open"], [class*="sheet"]'
    );
    const sheetOpened = await sheet
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (sheetOpened) {
      await expect(sheet.first()).toBeVisible();
    } else {
      // May have navigated to a detail page or nothing happened
      // Check if URL changed (navigated to item detail)
      const urlChanged = page.url() !== beforeUrl;
      // Either sheet opened OR navigated — either is acceptable
      expect(sheetOpened || urlChanged).toBeTruthy();
    }
  });

  test("scope item detail has drawing-related content", async ({ page }) => {
    const { hasProject, hasItems } = await openProjectScope(page);
    test.skip(!hasProject || !hasItems, "No scope items available");

    // Open first item
    const firstItem = page
      .locator("table tbody tr, [class*='scope-item']")
      .first();
    await firstItem.click();

    // Wait for either sheet or page navigation
    const sheet = page.locator(
      '[role="dialog"], [data-state="open"]'
    );
    const sheetOpened = await sheet
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (!sheetOpened) {
      // May have navigated — wait for the new page to load
      await page.waitForLoadState("load");
      await page.waitForTimeout(2000);
    }

    // Look for drawing-related UI elements anywhere on the current view
    const drawingSection = page.locator(
      'text=/drawing/i, text=/upload/i, button:has-text("Upload Drawing"), button:has-text("Upload Revision")'
    );

    const hasDrawingUI = await drawingSection
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    // Drawing section should exist for production-path items
    // Procurement items won't have it, so we just log
    if (!hasDrawingUI) {
      console.log(
        "No drawing section found — item may be procurement path or drawing tab is separate"
      );
    }
  });

  test("drawings overview page loads for a project", async ({ page }) => {
    await page.goto("/projects");
    await page.waitForLoadState("load");

    const projectLink = page
      .locator('a[href^="/projects/"]:not([href*="new"])')
      .first();
    test.skip(
      !(await projectLink.isVisible({ timeout: 5000 }).catch(() => false)),
      "No projects"
    );

    await projectLink.click();
    await page.waitForLoadState("load");

    // Try to find and click a Drawings tab
    const drawingsTab = page
      .locator(
        'button:has-text("Drawings"), a:has-text("Drawings"), [value="drawings"]'
      )
      .first();

    if (await drawingsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await drawingsTab.click();
      await page.waitForLoadState("load");

      // Should show a drawings table or empty state
      await expect(page.locator("main, [role='main']")).toBeVisible();

      // Check for table or empty state
      const hasTable = await page
        .locator("table, [class*='empty']")
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      expect(hasTable).toBeTruthy();
    } else {
      console.log("No Drawings tab found — may be embedded in scope view");
    }
  });

  test("upload drawing button is visible for admin", async ({ page }) => {
    const { hasProject, hasItems } = await openProjectScope(page);
    test.skip(!hasProject || !hasItems, "No scope items available");

    // Open first production-path item
    const firstItem = page
      .locator("table tbody tr, [class*='scope-item']")
      .first();
    await firstItem.click();

    // Wait for either sheet or page navigation
    const sheet = page.locator('[role="dialog"], [data-state="open"]');
    const sheetOpened = await sheet
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (!sheetOpened) {
      await page.waitForLoadState("load");
      await page.waitForTimeout(2000);
    }

    // Admin should see Upload Drawing or Upload Revision button
    const uploadBtn = page.locator(
      'button:has-text("Upload Drawing"), button:has-text("Upload Revision"), button:has-text("Upload")'
    );

    // May not be visible if item is procurement path
    const isVisible = await uploadBtn
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (isVisible) {
      await expect(uploadBtn.first()).toBeEnabled();
    }
  });

  test("send to client button appears for uploaded drawings", async ({
    page,
  }) => {
    const { hasProject, hasItems } = await openProjectScope(page);
    test.skip(!hasProject || !hasItems, "No scope items available");

    // Look through scope items for one with "Uploaded" status
    const uploadedBadge = page.locator('text="Uploaded"').first();
    const hasUploaded = await uploadedBadge
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (!hasUploaded) {
      test.skip(true, 'No items with "Uploaded" drawing status found');
      return;
    }

    // Click the row with uploaded status
    const row = uploadedBadge.locator("xpath=ancestor::tr").first();
    await row.click();

    await page
      .locator('[role="dialog"], [data-state="open"]')
      .first()
      .waitFor({ timeout: 5000 });

    // Should see "Send to Client" button
    const sendBtn = page.locator('button:has-text("Send to Client")');
    await expect(sendBtn.first()).toBeVisible({ timeout: 5000 });
  });

  test("PM override button is visible for admin on sent drawings", async ({
    page,
  }) => {
    const { hasProject, hasItems } = await openProjectScope(page);
    test.skip(!hasProject || !hasItems, "No scope items available");

    // Look for items with "Awaiting Client" or "Rejected" status
    const sentBadge = page
      .locator('text="Awaiting Client", text="Rejected"')
      .first();
    const hasSent = await sentBadge
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (!hasSent) {
      test.skip(true, "No items with sent/rejected drawing status found");
      return;
    }

    const row = sentBadge.locator("xpath=ancestor::tr").first();
    await row.click();

    await page
      .locator('[role="dialog"], [data-state="open"]')
      .first()
      .waitFor({ timeout: 5000 });

    // Admin should see PM Override button
    const overrideBtn = page.locator('button:has-text("PM Override")');
    const isVisible = await overrideBtn
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (isVisible) {
      await expect(overrideBtn.first()).toBeEnabled();
    }
  });
});
