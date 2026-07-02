import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { E2E_FIXTURES } from "../../scripts/e2e-reset-db";

test.describe("search flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
  });

  test("search building opens side panel", async ({ page }) => {
    const search = page.getByPlaceholder("Search campus");
    await search.fill(E2E_FIXTURES.buildingName);
    await page
      .getByRole("option", { name: new RegExp(E2E_FIXTURES.buildingName, "i") })
      .first()
      .click({ timeout: 15_000 });
    await expect(
      page.getByText(E2E_FIXTURES.buildingName).first(),
    ).toBeVisible();
  });

  test("search room opens room panel", async ({ page }) => {
    await page.getByPlaceholder("Search campus").fill(E2E_FIXTURES.roomCode);
    await page
      .getByRole("option", { name: new RegExp(E2E_FIXTURES.roomCode, "i") })
      .first()
      .click({ timeout: 15_000 });
    await expect(page.getByText(E2E_FIXTURES.roomCode).first()).toBeVisible();
  });

  test("search updates location for building", async ({ page }) => {
    await page.getByPlaceholder("Search campus").fill(E2E_FIXTURES.buildingName);
    await page
      .getByRole("option", { name: new RegExp(E2E_FIXTURES.buildingName, "i") })
      .first()
      .click({ timeout: 15_000 });
    await expect(page).toHaveURL(/building/i, { timeout: 10_000 });
  });
});
