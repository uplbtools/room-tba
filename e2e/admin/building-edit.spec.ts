import { test } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { loginAsAdmin, logout } from "../helpers/auth";
import {
  expandEditorMoreFields,
  fillAndSaveEditorField,
  openEntityEditor,
} from "../helpers/editor";
import { openBuilding } from "../helpers/search";

test.describe("entity panel edits", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test("admin edits building directions", async ({ page }) => {
    await openBuilding(page);
    await openEntityEditor(page, "building");
    await expandEditorMoreFields(page);
    await fillAndSaveEditorField(
      page,
      "building-directions-editor",
      `E2E building directions ${Date.now()}`,
    );
  });
});
