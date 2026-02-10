import { test, expect } from "@playwright/test";

async function openFirstProjectTimeline(page: import("@playwright/test").Page): Promise<boolean> {
  await page.goto("/projects");
  await page.waitForLoadState("networkidle");

  const projectLink = page.locator('a[href^="/projects/"]').first();
  if (!(await projectLink.isVisible())) {
    return false;
  }

  await projectLink.click();
  await page.waitForLoadState("networkidle");

  // Prefer direct timeline link if present
  const timelineLink = page.locator('a[href*="/timeline"]').first();
  if (await timelineLink.isVisible()) {
    await timelineLink.click();
    await page.waitForLoadState("networkidle");
    return /\/timeline/.test(page.url());
  }

  // Fallback: timeline tab/button
  const timelineTab = page
    .locator('button:has-text("Timeline"), a:has-text("Timeline")')
    .first();
  if (await timelineTab.isVisible()) {
    await timelineTab.click();
    await page.waitForLoadState("networkidle");
    return true;
  }

  return false;
}

test.describe("Gantt Timeline", () => {
  test("can open timeline page and create a task", async ({ page }) => {
    const opened = await openFirstProjectTimeline(page);
    test.skip(!opened, "No project/timeline available");

    await expect(page.locator("main, [role='main']")).toBeVisible();

    const addButton = page.locator('button:has-text("Add Task"), button:has-text("Add Item")').first();
    await expect(addButton).toBeVisible();
    await addButton.click();

    const sheetTitle = page.locator('text=/Add Timeline Item/i');
    await expect(sheetTitle).toBeVisible();

    const taskName = `E2E Task ${Date.now()}`;
    await page.getByLabel("Name *").fill(taskName);
    await page.getByLabel("Start Date *").fill("2026-02-10");
    await page.getByLabel("End Date *").fill("2026-02-12");

    await page.getByRole("button", { name: /Add to Timeline/i }).click();

    await expect(page.locator(`text=${taskName}`).first()).toBeVisible();
  });

  test("double-click on a row opens edit sheet", async ({ page }) => {
    const opened = await openFirstProjectTimeline(page);
    test.skip(!opened, "No project/timeline available");

    const firstRowName = page.locator('button[title="Double-click to edit"]').first();
    if (!(await firstRowName.isVisible())) {
      test.skip(true, "No editable timeline rows available");
    }

    await firstRowName.dblclick();
    await expect(page.locator('text=/Edit Timeline Item/i')).toBeVisible();
  });
});
