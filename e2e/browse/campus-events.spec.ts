import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";

test.describe("campus events", () => {
  test("events browse reachable", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    const eventsChip = page.getByRole("button", { name: /events/i }).first();
    await expect(eventsChip).toBeVisible();
    await eventsChip.click();
    await expect(page.getByText(/event/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
