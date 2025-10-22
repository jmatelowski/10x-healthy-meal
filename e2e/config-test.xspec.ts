import { test, expect } from "@playwright/test";

test.describe("Configuration Test", () => {
  test("should verify Playwright setup with basic page operations", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator('header a[href="/"]')).toHaveText("HealthyMeal");
  });
});
