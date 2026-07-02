import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { openBuilding, openRoom } from "../helpers/search";
import { E2E_FIXTURES } from "../../scripts/e2e-reset-db";

test.describe("search flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
  });

  test("search building opens side panel", async ({ page }) => {
    await openBuilding(page);
    await expect(
      page.getByText(E2E_FIXTURES.buildingName).first(),
    ).toBeVisible();
  });

  test("search room opens room panel", async ({ page }) => {
    await openRoom(page);
    await expect(page.getByText(E2E_FIXTURES.roomCode).first()).toBeVisible();
  });

  test("search updates location for building", async ({ page, isMobile }) => {
    await openBuilding(page);
    await expect(
      page.getByText(E2E_FIXTURES.buildingName).first(),
    ).toBeVisible();
    if (isMobile) return;
    await page.waitForURL(/building/i, { timeout: 20_000 });
    await expect(page).toHaveURL(/building/i);
  });
});
