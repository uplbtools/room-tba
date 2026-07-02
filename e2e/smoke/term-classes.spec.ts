import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { openRoom } from "../helpers/search";

test.describe("term and classes", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
  });

  test("term selector visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: /sem|term|1252/i }).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("room panel shows classes section for seeded room", async ({ page }) => {
    await openRoom(page);
    await expect(page.getByText(/E2E 101|E2E Course/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
