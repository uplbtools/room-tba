import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { openCampusDirectory } from "../helpers/map-tools";

test.describe("campus events", () => {
  test("events browse reachable", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await openCampusDirectory(page, "events");
    await expect(page.getByText(/event/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
