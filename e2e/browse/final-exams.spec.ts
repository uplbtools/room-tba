import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";

test.describe("final exams", () => {
  test("final exam suggestion for seeded course", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await page.getByPlaceholder("Search campus").fill("E2E 101");
    const finalExam = page.getByRole("option", { name: /final|exam|E2E 101/i });
    await expect(finalExam.first()).toBeVisible({ timeout: 15_000 });
  });
});
