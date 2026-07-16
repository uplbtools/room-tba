import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { openAppSidebar } from "../helpers/map-tools";
import { openRoom } from "../helpers/search";

test.describe("term and classes", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
  });

  test("term selector visible", async ({ page }) => {
    const sidebar = await openAppSidebar(page);
    await sidebar.getByRole("button", { name: /^classes$/i }).click();
    await expect(page.getByText(/All classes/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByRole("button", { name: /E2E 2nd Sem|academic term/i }).first(),
    ).toBeVisible({
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
