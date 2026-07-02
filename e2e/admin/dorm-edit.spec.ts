import { test } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { loginAsAdmin, logout } from "../helpers/auth";
import { fillAndSaveEditorField, openEntityEditor } from "../helpers/editor";
import { openDorm } from "../helpers/search";

test.describe("dorm edit", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test("admin edits dorm directions", async ({ page }) => {
    await openDorm(page);
    await openEntityEditor(page, "dorm");
    await fillAndSaveEditorField(
      page,
      "dorm-description-editor",
      `E2E dorm description ${Date.now()}`,
    );
  });
});
