import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";

const SAMPLE_SCHEDULE = JSON.stringify([
  {
    course_code: "E2E 101",
    section: "AB",
    type: "LEC",
    schedule: ["MWF 8-9"],
  },
]);

test.describe("schedule import @advisory", () => {
  test("paste JSON and import in map tools", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await page.getByRole("button", { name: /map tools/i }).click();

    const scheduleTab = page.getByRole("tab", { name: /schedule/i });
    if (await scheduleTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await scheduleTab.click();
    }

    const textarea = page.locator("#schedule-import-paste");
    if (await textarea.isVisible({ timeout: 5000 }).catch(() => false)) {
      await textarea.fill(SAMPLE_SCHEDULE);
      await page.getByRole("button", { name: /import|match/i }).first().click();
      await expect(page.locator(".schedule-import-panel")).toBeVisible();
    }
  });
});
