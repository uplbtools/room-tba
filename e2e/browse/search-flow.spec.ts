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
});

test.describe("building filters", () => {
  test("map tools flyout opens", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await page.getByRole("button", { name: /map tools/i }).click();
    await expect(
      page.getByRole("dialog", { name: /map tools/i }),
    ).toBeVisible();
  });
});
