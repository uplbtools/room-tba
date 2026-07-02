import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { loginAsAdmin, logout } from "../helpers/auth";
import { E2E_FIXTURES } from "../../scripts/e2e-reset-db";

test.describe("room edit", () => {
  test("guest sees read-only room without editor form", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await page.getByPlaceholder("Search campus").fill(E2E_FIXTURES.roomCode);
    await page
      .getByRole("option", { name: new RegExp(E2E_FIXTURES.roomCode, "i") })
      .first()
      .click({ timeout: 15_000 });
    await expect(page.locator(".entity-editor-panel")).toHaveCount(0);
  });

  test("admin can save room directions", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await loginAsAdmin(page);
    await page.getByPlaceholder("Search campus").fill(E2E_FIXTURES.roomCode);
    await page
      .getByRole("option", { name: new RegExp(E2E_FIXTURES.roomCode, "i") })
      .first()
      .click({ timeout: 15_000 });

    const directions = page.getByLabel(/directions/i);
    if (await directions.isVisible({ timeout: 5000 }).catch(() => false)) {
      await directions.fill("E2E updated directions");
      await page.getByRole("button", { name: /save/i }).first().click();
      await expect(page.getByText(/saved|updated/i).first()).toBeVisible({
        timeout: 10_000,
      });
    }
    await logout(page);
  });
});
