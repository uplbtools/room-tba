import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { loginAsAdmin, logout } from "../helpers/auth";
import { fillAndSaveEditorField, openEntityEditor } from "../helpers/editor";
import { openRoom } from "../helpers/search";

test.describe("room edit", () => {
  test("guest sees read-only room without editor form", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await openRoom(page);
    await expect(page.locator(".entity-editor-panel")).toHaveCount(0);
  });

  test("admin can save room directions", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await loginAsAdmin(page);
    await openRoom(page);
    await openEntityEditor(page, "room");
    await fillAndSaveEditorField(
      page,
      "room-directions-editor",
      `E2E updated directions ${Date.now()}`,
    );
    await logout(page);
  });
});
