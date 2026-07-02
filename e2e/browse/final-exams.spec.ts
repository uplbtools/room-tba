import { test, expect } from "@playwright/test";
import { campusSearchBox, waitForAppBoot } from "../helpers/app";
import { searchSuggestions } from "../helpers/search";

test.describe("final exams", () => {
  test("final exam suggestion for seeded course", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await campusSearchBox(page).fill("E2E 101");
    const finalExam = searchSuggestions(page).getByRole("button", {
      name: /final|exam|E2E 101/i,
    });
    await expect(finalExam.first()).toBeVisible({ timeout: 15_000 });
  });
});
