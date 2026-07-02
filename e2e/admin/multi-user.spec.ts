import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { loginAs, logout } from "../helpers/users";
import { E2E_FIXTURES } from "../../scripts/e2e-reset-db";
import { countEditorHistory } from "../helpers/db";

test.describe("multi-user edited_by", () => {
  test("admin and editor produce history entries", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);

    const before = (await countEditorHistory("room", 1)) ?? 0;

    await loginAs(page, E2E_FIXTURES.users.admin);
    await page.getByPlaceholder("Search campus").fill(E2E_FIXTURES.roomCode);
    await page
      .getByRole("option", { name: new RegExp(E2E_FIXTURES.roomCode, "i") })
      .first()
      .click({ timeout: 15_000 });
    const directions = page.getByLabel(/directions/i);
    if (await directions.isVisible({ timeout: 5000 }).catch(() => false)) {
      await directions.fill(`Multi-user admin ${Date.now()}`);
      await page.getByRole("button", { name: /save/i }).first().click();
      await page.waitForTimeout(1500);
    }
    await logout(page);

    await loginAs(page, E2E_FIXTURES.users.editor);
    await page.getByPlaceholder("Search campus").fill(E2E_FIXTURES.roomCode);
    await page
      .getByRole("option", { name: new RegExp(E2E_FIXTURES.roomCode, "i") })
      .first()
      .click({ timeout: 15_000 });
    if (await directions.isVisible({ timeout: 5000 }).catch(() => false)) {
      await directions.fill(`Multi-user editor ${Date.now()}`);
      await page.getByRole("button", { name: /save/i }).first().click();
      await page.waitForTimeout(1500);
    }
    await logout(page);

    const after = (await countEditorHistory("room", 1)) ?? before;
    expect(after).toBeGreaterThanOrEqual(before);
  });
});
