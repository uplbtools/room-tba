import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { buildingPinFilterButton } from "../helpers/filters";

test.describe("building type filters", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
  });

  test("All filter selected by default", async ({ page }) => {
    const allChip = buildingPinFilterButton(page, /^All,\s*\d+\s*pins/i);
    await expect(allChip).toBeVisible();
    await expect(allChip).toHaveAttribute("aria-pressed", "true");
  });

  test("Class building filter toggles", async ({ page }) => {
    const classChip = buildingPinFilterButton(
      page,
      /^Class Building,\s*\d+\s*pins/i,
    );
    await classChip.click();
    await expect(classChip).toHaveAttribute("aria-pressed", "true");
  });

  test("UP dorms filter toggles", async ({ page }) => {
    const dormChip = buildingPinFilterButton(
      page,
      /^UP Managed Dorm,\s*\d+\s*pins/i,
    );
    await dormChip.click();
    await expect(dormChip).toHaveAttribute("aria-pressed", "true");
  });
});
