import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { loginAsContributor, logout } from "../helpers/users";
import { openRoom } from "../helpers/search";

test.describe("contributor proposals", () => {
  test("contributor can open suggest an edit on room", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await loginAsContributor(page);
    await openRoom(page);
    const suggest = page.getByRole("button", { name: /suggest an edit/i });
    await expect(suggest.first()).toBeVisible({ timeout: 10_000 });
    await logout(page);
  });

  test("admin sees review queue after contributor proposal", async () => {
    test.skip(true, "Requires stable proposal UI flow — covered in integration");
  });
});
